import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import dotenv from "dotenv";

// Ensure environment variables are loaded
dotenv.config();

// Use environment variables for database connection
const host = process.env["DB_HOST"] || "localhost";
const port = parseInt(process.env["DB_PORT"] || "3306");
const user = process.env["DB_USER"] || "root";
const password = process.env["DB_PASSWORD"] || "password";
const database = process.env["DB_NAME"] || "water_bottle_inventory";

// Log environment variables (except sensitive ones)
console.log("Database environment variables available:", {
	DB_HOST: host ? "Set" : "Not set",
	DB_PORT: port ? "Set" : "Not set",
	DB_USER: user ? "Set" : "Not set",
	DB_PASSWORD: password ? "Set (hidden)" : "Not set",
	DB_NAME: database ? "Set" : "Not set",
});

// Create the connection pool
const pool = mysql.createPool({
	host,
	port,
	user,
	password,
	database,
});

// Create the database instance
export const db = drizzle(pool);

// Export the pool for direct access if needed
export { pool };
