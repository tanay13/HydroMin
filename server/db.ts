import { createPool } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "@shared/schema";
import dotenv from "dotenv";

// Ensure environment variables are loaded
dotenv.config();

// Use environment variables for database connection
const host = process.env.DB_HOST || "localhost";
const port = parseInt(process.env.DB_PORT || "3306");
const user = process.env.DB_USER || "root";
const password = process.env.DB_PASSWORD || "password";
const database = process.env.DB_NAME || "water_bottle_inventory";

// Log environment variables (except sensitive ones)
console.log("Database environment variables available:", {
	DB_HOST: host ? "Set" : "Not set",
	DB_PORT: port ? "Set" : "Not set",
	DB_USER: user ? "Set" : "Not set",
	DB_PASSWORD: password ? "Set (hidden)" : "Not set",
	DB_NAME: database ? "Set" : "Not set",
});

let pool: ReturnType<typeof createPool>;
let db: ReturnType<typeof drizzle>;

try {
	console.log(
		"Using DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, and DB_NAME for connection"
	);

	// Create the connection pool
	pool = createPool({
		host,
		port,
		user,
		password,
		database,
		waitForConnections: true,
		connectionLimit: 10,
		queueLimit: 0,
	});

	console.log("Attempting to connect to MySQL database...");

	// Create Drizzle ORM instance
	db = drizzle(pool, { schema, mode: "default" });
} catch (error: any) {
	console.error("Failed to initialize database connection:", error.message);
	console.error(
		"CRITICAL ERROR: Unable to connect to the database. The application requires a valid MySQL connection."
	);
	process.exit(1);
}

export { pool, db };
