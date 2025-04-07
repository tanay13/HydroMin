import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer } from "vite";
import type { ViteDevServer } from "vite";
import { nanoid } from "nanoid";
import { type Server } from "http";
import viteConfig from "../vite.config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function log(message: string, source = "express") {
	const formattedTime = new Date().toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		second: "2-digit",
		hour12: true,
	});

	console.log(`${formattedTime} [${source}] ${message}`);
}

export async function createViteDevServer(
	app: express.Application
): Promise<ViteDevServer> {
	const viteServer = await createServer({
		server: { middlewareMode: true },
		appType: "custom",
		root: path.resolve(__dirname, "../client"),
	});

	app.use(viteServer.middlewares);
	return viteServer;
}

export async function setupViteMiddleware(
	app: express.Application
): Promise<ViteDevServer | void> {
	if (process.env["NODE_ENV"] === "production") {
		app.use(express.static(path.resolve(__dirname, "../public")));
	} else {
		return await createViteDevServer(app);
	}
}

export async function setupVite(app: Express, server: Server) {
	const serverOptions = {
		middlewareMode: true,
		hmr: { server },
		allowedHosts: ["localhost"],
	};

	const vite = await createServer({
		...viteConfig,
		configFile: false,
		server: serverOptions,
		appType: "custom",
	});

	app.use(vite.middlewares);
	app.use("*", async (req, res, next) => {
		const url = req.originalUrl;

		try {
			const clientTemplate = path.resolve(
				__dirname,
				"..",
				"client",
				"index.html"
			);

			// always reload the index.html file from disk incase it changes
			let template = await fs.promises.readFile(clientTemplate, "utf-8");
			template = template.replace(
				`src="/src/main.tsx"`,
				`src="/src/main.tsx?v=${nanoid()}"`
			);
			const page = await vite.transformIndexHtml(url, template);
			res.status(200).set({ "Content-Type": "text/html" }).end(page);
		} catch (e) {
			vite.ssrFixStacktrace(e as Error);
			next(e);
		}
	});
}

export function serveStatic(app: Express) {
	// In production, __dirname is in dist/server, so we look for the public directory
	const distPath = path.resolve(__dirname, "../public");

	if (!fs.existsSync(distPath)) {
		throw new Error(
			`Could not find the build directory at:\n${distPath}\nMake sure to build the client first`
		);
	}

	app.use(express.static(distPath));

	// fall through to index.html if the file doesn't exist
	app.use("*", (_req, res) => {
		res.sendFile(path.resolve(distPath, "index.html"));
	});
}
