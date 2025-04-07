"use strict";
import { UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import shadcnThemeJson from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";
import runtimeErrorModal from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function createConfig(): Promise<UserConfig> {
	const plugins = [react(), runtimeErrorModal(), shadcnThemeJson()];

	if (
		process.env["NODE_ENV"] !== "production" &&
		process.env["REPL_ID"] !== undefined
	) {
		const cartographer = (await import("@replit/vite-plugin-cartographer"))
			.cartographer;
		plugins.push(cartographer());
	}

	return {
		plugins,
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "client", "src"),
				"@shared": path.resolve(__dirname, "shared"),
			},
			extensions: [".ts", ".tsx", ".js", ".jsx"],
		},
		root: path.resolve(__dirname, "client"),
		build: {
			outDir: "../dist/public",
			emptyOutDir: true,
		},
	};
}

export default createConfig();
