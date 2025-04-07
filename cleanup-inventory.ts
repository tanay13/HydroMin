import { db } from "./server/db.js";
import { inventory } from "./shared/schema.js";
import { eq, sql } from "drizzle-orm";

interface InventoryItem {
	id: number;
	bottleSize: string;
}

async function cleanupInventory() {
	try {
		console.log("Connecting to the database...");

		// First, let's check what we have in the inventory table
		const items = await db
			.select()
			.from(inventory)
			.orderBy(inventory.bottleSize);
		console.log("Current inventory items:", items);

		// Get unique bottle sizes
		const bottleSizes = [
			...new Set(items.map((item: InventoryItem) => item.bottleSize)),
		];
		console.log("Unique bottle sizes:", bottleSizes);

		// For each bottle size, keep only the one with the lowest ID
		for (const size of bottleSizes) {
			const itemsWithSameSize = items.filter(
				(item: InventoryItem) => item.bottleSize === size
			);

			if (itemsWithSameSize.length > 1) {
				console.log(`Found ${itemsWithSameSize.length} items for size ${size}`);

				// Sort by ID and keep the first one (lowest ID)
				const itemsToDelete = itemsWithSameSize
					.slice(1)
					.map((item: InventoryItem) => item.id);
				console.log(`Deleting items with IDs: ${itemsToDelete.join(", ")}`);

				// Delete all but the first item
				const result = await db
					.delete(inventory)
					.where(sql`id IN (${itemsToDelete.join(", ")})`);
				const deletedCount = (result as unknown as { affectedRows: number })
					.affectedRows;
				console.log(`Deleted ${deletedCount} items for size ${size}`);
			}
		}

		// Verify the cleanup
		const remainingItems = await db
			.select()
			.from(inventory)
			.orderBy(inventory.bottleSize);
		console.log("Remaining inventory items:", remainingItems);

		console.log("Cleanup completed successfully!");
	} catch (error) {
		console.error("Error during cleanup:", error);
	} finally {
		process.exit(0);
	}
}

// Run the cleanup
cleanupInventory();
