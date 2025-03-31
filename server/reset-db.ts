import { db } from "./db";
import * as schema from "@shared/schema";
import { hashPassword } from "./auth";

async function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tableExists(tableName: string): Promise<boolean> {
	const result = await db.execute(/* sql */ `
		SELECT EXISTS (
			SELECT FROM information_schema.tables 
			WHERE table_schema = 'public' 
			AND table_name = '${tableName}'
		);
	`);
	return result.rows[0].exists as boolean;
}

async function resetDatabase() {
	console.log("Dropping existing tables...");

	try {
		// First, drop all foreign key constraints
		await db.execute(/* sql */ `
			DO $$ 
			DECLARE
				r RECORD;
			BEGIN
				FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
					EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
				END LOOP;
			END $$;
		`);

		// Wait for tables to be dropped
		await sleep(1000);

		// Verify tables are dropped
		const tables = [
			"order_items",
			"orders",
			"inventory",
			"dashboard_stats",
			"users",
		];
		for (const table of tables) {
			if (await tableExists(table)) {
				throw new Error(`Table ${table} still exists after drop operation`);
			}
		}

		console.log("Creating tables with new schema...");

		// Create users table
		await db.execute(/* sql */ `
			CREATE TABLE "users" (
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
			CREATE TABLE "inventory" (
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
			CREATE TABLE "orders" (
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
			CREATE TABLE "order_items" (
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
			CREATE TABLE "dashboard_stats" (
				"id" SERIAL PRIMARY KEY,
				"total_orders" INTEGER NOT NULL DEFAULT 0,
				"pending_orders" INTEGER NOT NULL DEFAULT 0,
				"total_sales" NUMERIC(10, 2) NOT NULL DEFAULT '0',
				"inventory_value" NUMERIC(10, 2) NOT NULL DEFAULT '0',
				"entry_time" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
				"last_updated" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
			)
		`);

		// Add foreign key constraints
		await db.execute(/* sql */ `
			ALTER TABLE "order_items" 
			ADD CONSTRAINT "fk_order_items_order_id" 
			FOREIGN KEY ("order_id") 
			REFERENCES "orders"("id") 
			ON DELETE CASCADE;
		`);

		console.log("Tables created successfully!");

		// Create default admin user
		const hashedPassword = await hashPassword("password123");
		await db.insert(schema.users).values({
			username: "admin",
			email: "admin@example.com",
			password: hashedPassword,
			name: "System Administrator",
			role: "admin",
			entryTime: new Date(),
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		console.log(
			"Default admin user created! (admin@example.com / password123)"
		);

		// Initialize dashboard stats
		await db.insert(schema.dashboardStats).values({
			id: 1,
			totalOrders: 0,
			pendingOrders: 0,
			totalSales: "0.00",
			inventoryValue: "0.00",
			entryTime: new Date(),
			lastUpdated: new Date(),
		});

		console.log("Database reset completed successfully!");
	} catch (error) {
		console.error("Error resetting database:", error);
		throw error;
	}
}

// Run the reset function
resetDatabase()
	.then(() => {
		console.log("Database reset completed");
		process.exit(0);
	})
	.catch((error) => {
		console.error("Failed to reset database:", error);
		process.exit(1);
	});
