import { db } from "./db";
import * as schema from "@shared/schema";
import { hashPassword } from "./auth";

async function setupDatabase() {
	console.log("Setting up database schema...");

	try {
		// Create tables based on schema - use simple queries to avoid potential issues
		console.log("Creating tables if they do not exist...");

		// Create users table
		await db.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL PRIMARY KEY,
        "username" TEXT NOT NULL UNIQUE,
        "email" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'inventory',
        "created_by" INTEGER,
        "entry_time" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

		// Create inventory table
		await db.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS "inventory" (
        "id" SERIAL PRIMARY KEY,
        "bottle_size" TEXT NOT NULL,
        "total_quantity" INTEGER NOT NULL,
        "in_stock" INTEGER NOT NULL,
        "sold_quantity" INTEGER NOT NULL DEFAULT 0,
        "price_per_unit" NUMERIC(10, 2) NOT NULL,
        "entry_time" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

		// Create orders table
		await db.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS "orders" (
        "id" SERIAL PRIMARY KEY,
        "order_number" TEXT NOT NULL UNIQUE,
        "customer_name" TEXT NOT NULL,
        "order_date" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "status" TEXT NOT NULL DEFAULT 'in_progress',
        "notes" TEXT,
        "total" NUMERIC(10, 2) NOT NULL,
        "entry_time" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

		// Create order_items table
		await db.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS "order_items" (
        "id" SERIAL PRIMARY KEY,
        "order_id" INTEGER NOT NULL,
        "bottle_size" TEXT NOT NULL,
        "quantity" INTEGER NOT NULL,
        "price_per_unit" NUMERIC(10, 2) NOT NULL,
        "subtotal" NUMERIC(10, 2) NOT NULL,
        "entry_time" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

		// Create dashboard_stats table
		await db.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS "dashboard_stats" (
        "id" SERIAL PRIMARY KEY,
        "total_orders" INTEGER NOT NULL DEFAULT 0,
        "pending_orders" INTEGER NOT NULL DEFAULT 0,
        "total_sales" NUMERIC(10, 2) NOT NULL DEFAULT '0',
        "inventory_value" NUMERIC(10, 2) NOT NULL DEFAULT '0',
        "entry_time" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "last_updated" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

		console.log("Tables created successfully!");

		try {
			// Insert default inventory data
			console.log("Checking for existing inventory data...");
			const existingInventory = await db.select().from(schema.inventory);

			if (existingInventory.length === 0) {
				console.log("No inventory data found. Inserting default data...");
				await db.insert(schema.inventory).values([
					{
						bottleSize: "250ML",
						totalQuantity: 5000,
						inStock: 3450,
						soldQuantity: 1550,
						pricePerUnit: "2.5",
						entryTime: new Date(),
					},
					{
						bottleSize: "500ML",
						totalQuantity: 4000,
						inStock: 2120,
						soldQuantity: 1880,
						pricePerUnit: "4.0",
						entryTime: new Date(),
					},
					{
						bottleSize: "1L",
						totalQuantity: 3000,
						inStock: 780,
						soldQuantity: 2220,
						pricePerUnit: "7.0",
						entryTime: new Date(),
					},
				]);
				console.log("Default inventory data inserted!");
			} else {
				console.log(
					"Existing inventory data found, skipping default data insertion."
				);
			}
		} catch (error) {
			console.error("Error inserting inventory data:", error);
			// Continue with setup rather than stopping completely
		}

		try {
			// Check for existing users
			console.log("Checking for existing users...");
			const existingUsers = await db.select().from(schema.users);

			if (existingUsers.length === 0) {
				console.log("No users found. Creating default admin user...");
				// Hash the admin password
				const hashedPassword = await hashPassword("password123");

				await db.insert(schema.users).values({
					username: "admin",
					email: "admin@example.com",
					password: hashedPassword,
					name: "System Administrator",
					role: "admin",
					createdAt: new Date(),
					updatedAt: new Date(),
				});

				// Also create a regular user
				const userPassword = await hashPassword("password123");
				await db.insert(schema.users).values({
					username: "user",
					email: "user@example.com",
					password: userPassword,
					name: "Regular User",
					role: "inventory",
					createdAt: new Date(),
					updatedAt: new Date(),
				});

				console.log(
					"Default users created! (admin/user with password: password123)"
				);
			} else {
				console.log("Existing users found, skipping default user creation.");
			}
		} catch (error) {
			console.error("Error creating users:", error);
			// Continue with setup rather than stopping completely
		}

		try {
			// Initialize dashboard stats if not exists
			console.log("Checking for dashboard stats...");
			const stats = await db.select().from(schema.dashboardStats);

			if (stats.length === 0) {
				console.log("No dashboard stats found. Initializing...");
				await db.insert(schema.dashboardStats).values({
					id: 1,
					totalOrders: 0,
					pendingOrders: 0,
					totalSales: "0.00",
					inventoryValue: "0.00",
					lastUpdated: new Date(),
				});
				console.log("Dashboard stats initialized!");
			}
		} catch (error) {
			console.error("Error setting up dashboard stats:", error);
			// Continue with setup rather than stopping completely
		}

		console.log("Database setup completed successfully!");
	} catch (error) {
		console.error("Error setting up database:", error);
		throw error;
	}
}

// Expose the setup function
export { setupDatabase };
