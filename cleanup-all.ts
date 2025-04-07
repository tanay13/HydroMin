import { db } from "./server/db.js";
import {
	inventory,
	orders,
	orderItems,
	dashboardStats,
} from "./shared/schema.js";
import { eq, sql } from "drizzle-orm";

async function cleanupAll() {
	try {
		console.log("Connecting to the database...");

		// Delete all records from each table
		await db.delete(orderItems);
		await db.delete(orders);
		await db.delete(inventory);
		await db.delete(dashboardStats);

		console.log("All data has been cleaned up!");
	} catch (error) {
		console.error("Error during cleanup:", error);
	} finally {
		process.exit(0);
	}
}

// Run the cleanup
cleanupAll();
