import { db } from "./db";
import * as schema from "../shared/schema";
import { hashPassword } from "./auth";
import { sql } from "drizzle-orm";

async function initializeDatabase() {
	console.log("Database environment variables available:", {
		DB_HOST: process.env.DB_HOST ? "Set" : "Not Set",
		DB_PORT: process.env.DB_PORT ? "Set" : "Not Set",
		DB_USER: process.env.DB_USER ? "Set" : "Not Set",
		DB_NAME: process.env.DB_NAME ? "Set" : "Not Set",
	});

	console.log("Using MySQL database storage");
	console.log("Attempting to connect to MySQL database...");

	try {
		// Drop existing tables
		console.log("Dropping existing tables...");
		await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
		await db.execute(sql`DROP TABLE IF EXISTS users`);
		await db.execute(sql`DROP TABLE IF EXISTS inventory`);
		await db.execute(sql`DROP TABLE IF EXISTS inventory_track`);
		await db.execute(sql`DROP TABLE IF EXISTS orders`);
		await db.execute(sql`DROP TABLE IF EXISTS order_items`);
		await db.execute(sql`DROP TABLE IF EXISTS dashboard_stats`);
		await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);

		// Create all tables
		console.log("Creating database tables...");
		await db.execute(sql`
			CREATE TABLE users (
				id INT AUTO_INCREMENT PRIMARY KEY,
				username VARCHAR(255) NOT NULL UNIQUE,
				email VARCHAR(255) NOT NULL UNIQUE,
				password VARCHAR(255) NOT NULL,
				name VARCHAR(255) NOT NULL,
				role ENUM('admin', 'manager', 'inventory') NOT NULL,
				created_by INT,
				entry_time DATETIME NOT NULL,
				created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				FOREIGN KEY (created_by) REFERENCES users(id)
			)
		`);

		await db.execute(sql`
			CREATE TABLE inventory (
				id INT AUTO_INCREMENT PRIMARY KEY,
				bottle_size ENUM('250ML', '500ML', '1L') NOT NULL UNIQUE,
				total_quantity INT NOT NULL DEFAULT 0,
				in_stock INT NOT NULL DEFAULT 0,
				sold_quantity INT NOT NULL DEFAULT 0,
				price_per_unit DECIMAL(10,2) NOT NULL,
				entry_time DATETIME NOT NULL,
				created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
			)
		`);

		await db.execute(sql`
			CREATE TABLE inventory_track (
				id INT AUTO_INCREMENT PRIMARY KEY,
				bottle_size ENUM('250ML', '500ML', '1L') NOT NULL,
				total_quantity INT NOT NULL,
				in_stock INT NOT NULL,
				sold_quantity INT NOT NULL DEFAULT 0,
				price_per_unit DECIMAL(10,2) NOT NULL,
				entry_time DATETIME NOT NULL,
				created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
			)
		`);

		await db.execute(sql`
			CREATE TABLE orders (
				id INT AUTO_INCREMENT PRIMARY KEY,
				order_number VARCHAR(255) NOT NULL UNIQUE,
				customer_name VARCHAR(255) NOT NULL,
				order_date DATETIME NOT NULL,
				status ENUM('pending', 'in_progress', 'completed', 'cancelled') NOT NULL,
				notes TEXT,
				total DECIMAL(10,2) NOT NULL,
				entry_time DATETIME NOT NULL,
				created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
			)
		`);

		await db.execute(sql`
			CREATE TABLE order_items (
				id INT AUTO_INCREMENT PRIMARY KEY,
				order_id INT NOT NULL,
				bottle_size ENUM('250ML', '500ML', '1L') NOT NULL,
				quantity INT NOT NULL,
				price_per_unit DECIMAL(10,2) NOT NULL,
				subtotal DECIMAL(10,2) NOT NULL,
				entry_time DATETIME NOT NULL,
				created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
			)
		`);

		await db.execute(sql`
			CREATE TABLE dashboard_stats (
				id INT AUTO_INCREMENT PRIMARY KEY,
				total_orders INT NOT NULL DEFAULT 0,
				pending_orders INT NOT NULL DEFAULT 0,
				total_sales DECIMAL(10,2) NOT NULL DEFAULT 0,
				inventory_value DECIMAL(10,2) NOT NULL DEFAULT 0,
				entry_time DATETIME NOT NULL,
				created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
			)
		`);

		// Create indexes
		await db.execute(sql`CREATE INDEX idx_orders_date ON orders(order_date)`);
		await db.execute(
			sql`CREATE INDEX idx_order_items_order_id ON order_items(order_id)`
		);
		await db.execute(
			sql`CREATE INDEX idx_inventory_track_bottle_size ON inventory_track(bottle_size)`
		);
		await db.execute(
			sql`CREATE INDEX idx_inventory_track_entry_time ON inventory_track(entry_time)`
		);

		// Create admin user
		console.log("Creating admin user...");
		const hashedPassword = await hashPassword("password123");
		await db.insert(schema.users).values({
			username: "admin",
			email: "admin@example.com",
			password: hashedPassword,
			name: "System Administrator",
			role: "admin",
			entryTime: new Date(),
		});

		const [adminUser] = await db
			.select()
			.from(schema.users)
			.where(sql`username = 'admin'`);
		console.log("Admin user created successfully:", adminUser);

		console.log("Database initialization completed successfully!");
	} catch (error) {
		console.error("Error during database initialization:", error);
		throw error;
	}
}

// Execute initialization
initializeDatabase()
	.then(() => {
		console.log("Database initialization completed!");
		process.exit(0);
	})
	.catch((error) => {
		console.error("Database initialization failed:", error);
		process.exit(1);
	});
