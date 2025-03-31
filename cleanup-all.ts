import { db } from "./server/db";
import { inventory, orders, orderItems, dashboardStats } from "./shared/schema";
import { eq, sql } from "drizzle-orm";

async function cleanupAll() {
	try {
		console.log("Starting database cleanup...");

		// Clean up order_items first (due to foreign key constraints)
		console.log("Cleaning up order_items table...");
		await db.delete(orderItems);
		console.log("order_items table cleaned");

		// Clean up orders
		console.log("Cleaning up orders table...");
		await db.delete(orders);
		console.log("orders table cleaned");

		// Clean up inventory
		console.log("Cleaning up inventory table...");
		await db.delete(inventory);
		console.log("inventory table cleaned");

		// Reset dashboard stats
		console.log("Resetting dashboard stats...");
		await db
			.update(dashboardStats)
			.set({
				totalOrders: 0,
				pendingOrders: 0,
				totalSales: "0.00",
				inventoryValue: "0.00",
				lastUpdated: new Date(),
			})
			.where(eq(dashboardStats.id, 1));
		console.log("dashboard stats reset");

		console.log("Cleanup completed successfully!");
	} catch (error) {
		console.error("Error during cleanup:", error);
	} finally {
		process.exit(0);
	}
}

// Run the cleanup
cleanupAll();
