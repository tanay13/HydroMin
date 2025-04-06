import { db } from "./db.js";
import {
	users,
	inventory,
	orders,
	inventoryTrack,
	bottleSizes,
	orderStatuses,
	insertUserSchema,
	insertInventorySchema,
	insertOrderSchema,
} from "@shared/schema.js";
import { hashPassword } from "./auth.js";

async function initializeDatabase() {
	console.log("Environment variables:");
	console.log({
		DB_HOST: process.env["DB_HOST"] ? "Set" : "Not Set",
		DB_PORT: process.env["DB_PORT"] ? "Set" : "Not Set",
		DB_USER: process.env["DB_USER"] ? "Set" : "Not Set",
		DB_NAME: process.env["DB_NAME"] ? "Set" : "Not Set",
	});

	try {
		const now = new Date();

		// Create initial admin user
		const adminPassword = await hashPassword("admin");
		const adminUser = insertUserSchema.parse({
			username: "admin",
			email: "admin@example.com",
			password: adminPassword,
			name: "System Administrator",
			role: "admin",
			entryTime: now,
		});
		await db.insert(users).values(adminUser);

		console.log("Created admin user");

		// Create initial merchant user
		const merchantPassword = await hashPassword("merchant");
		const merchantUser = insertUserSchema.parse({
			username: "merchant",
			email: "merchant@example.com",
			password: merchantPassword,
			name: "Merchant User",
			role: "inventory",
			entryTime: now,
		});
		await db.insert(users).values(merchantUser);

		console.log("Created merchant user");

		// Create initial inventory items
		const inventoryItems = [
			{
				bottleSize: bottleSizes[2], // "1L"
				totalQuantity: 50,
				inStock: 50,
				pricePerUnit: "7.0",
				entryTime: now,
			},
			{
				bottleSize: bottleSizes[1], // "500ML"
				totalQuantity: 75,
				inStock: 75,
				pricePerUnit: "4.0",
				entryTime: now,
			},
			{
				bottleSize: bottleSizes[0], // "250ML"
				totalQuantity: 100,
				inStock: 100,
				pricePerUnit: "2.5",
				entryTime: now,
			},
		].map((item) => insertInventorySchema.parse(item));

		await db.insert(inventory).values(inventoryItems);

		console.log("Created initial inventory items");

		// Create initial orders
		const orderItems = [
			{
				orderNumber: "ORD-001",
				customerName: "Test Customer 1",
				orderDate: now,
				status: orderStatuses[1], // "completed"
				total: "35.0",
				entryTime: now,
			},
			{
				orderNumber: "ORD-002",
				customerName: "Test Customer 2",
				orderDate: now,
				status: orderStatuses[1], // "completed"
				total: "20.0",
				entryTime: now,
			},
		];

		await db.insert(orders).values(orderItems);

		console.log("Created initial orders");

		// Create initial inventory tracking entries
		const trackingItems = [
			{
				bottleSize: bottleSizes[2], // "1L"
				totalQuantity: 50,
				inStock: 45,
				soldQuantity: 5,
				pricePerUnit: "7.0",
				entryTime: now,
			},
			{
				bottleSize: bottleSizes[1], // "500ML"
				totalQuantity: 75,
				inStock: 67,
				soldQuantity: 8,
				pricePerUnit: "4.0",
				entryTime: now,
			},
			{
				bottleSize: bottleSizes[0], // "250ML"
				totalQuantity: 100,
				inStock: 100,
				soldQuantity: 0,
				pricePerUnit: "2.5",
				entryTime: now,
			},
		];

		await db.insert(inventoryTrack).values(trackingItems);

		console.log("Created initial inventory tracking entries");

		console.log("Database initialization completed successfully");
	} catch (error) {
		console.error("Error initializing database:", error);
		throw error;
	}
}

initializeDatabase()
	.then(() => {
		console.log("Database initialization completed");
		process.exit(0);
	})
	.catch((error) => {
		console.error("Database initialization failed:", error);
		process.exit(1);
	});
