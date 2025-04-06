import {
	users,
	type User,
	type InsertUser,
	inventory,
	type Inventory,
	type InsertInventory,
	type BottleSize,
	orders,
	type Order,
	type InsertOrder,
	type OrderStatus,
	type OrderWithItems,
	orderItems,
	type OrderItem,
	type InsertOrderItem,
	dashboardStats,
	type DashboardStats,
	OrderItemEntry,
	OrderEntry,
	inventoryTrack,
	type InventoryTrack,
	type InsertInventoryTrack,
} from "../shared/schema";
import { db } from "./db";
import { eq, desc, count, sum, sql, and, gte, lte } from "drizzle-orm";
import { setupDatabase } from "./db-setup";

// Interface for storage operations
export interface IStorage {
	// User operations
	getUser(id: number): Promise<User | undefined>;
	getUserByUsername(username: string): Promise<User | undefined>;
	getUserByEmail(email: string): Promise<User | undefined>;
	getAllUsers(): Promise<User[]>;
	createUser(user: InsertUser): Promise<User>;
	updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
	deleteUser(id: number): Promise<boolean>;

	// Inventory operations
	getAllInventory(): Promise<Inventory[]>;
	getInventoryByBottleSize(
		bottleSize: BottleSize
	): Promise<Inventory | undefined>;
	createInventory(inventory: InsertInventory): Promise<Inventory>;
	updateInventory(
		id: number,
		data: Partial<Inventory>
	): Promise<Inventory | undefined>;

	// Order operations
	getAllOrders(): Promise<Order[]>;
	getOrderById(id: number): Promise<Order | undefined>;
	getOrderWithItems(id: number): Promise<OrderWithItems | undefined>;
	getRecentOrders(limit?: number): Promise<Order[]>;
	createOrder(order: InsertOrder): Promise<Order>;
	updateOrderStatus(
		id: number,
		status: OrderStatus
	): Promise<Order | undefined>;

	// Order Item operations
	getOrderItemsByOrderId(orderId: number): Promise<OrderItem[]>;
	createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem>;

	// Dashboard stats
	getDashboardStats(): Promise<DashboardStats>;
	updateDashboardStats(): Promise<DashboardStats>;

	// Inventory tracking operations
	getInventoryTrackByDateRange(
		startDate: Date,
		endDate: Date
	): Promise<InventoryTrack[]>;
	createInventoryTrack(data: InsertInventoryTrack): Promise<InventoryTrack>;

	// New method
	getInventoryHistory(
		startDate?: Date,
		endDate?: Date
	): Promise<Array<{ bottleSize: string; totalQuantity: number }>>;
}

// DatabaseStorage implementation for PostgreSQL
export class DatabaseStorage implements IStorage {
	// User operations
	async getUser(id: number): Promise<User | undefined> {
		const [user] = await db.select().from(users).where(eq(users.id, id));
		return user;
	}

	async getUserByUsername(username: string): Promise<User | undefined> {
		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.username, username));
		return user;
	}

	async getUserByEmail(email: string): Promise<User | undefined> {
		const [user] = await db.select().from(users).where(eq(users.email, email));
		return user;
	}

	async getAllUsers(): Promise<User[]> {
		return await db.select().from(users);
	}

	async createUser(data: InsertUser): Promise<User> {
		await db.insert(users).values(data);
		const result = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
		const id = (result as any)[0][0].id;
		const [user] = await db.select().from(users).where(eq(users.id, id));
		return user;
	}

	async updateUser(id: number, data: Partial<InsertUser>): Promise<User> {
		await db.update(users).set(data).where(eq(users.id, id));
		const [user] = await db.select().from(users).where(eq(users.id, id));
		return user;
	}

	async deleteUser(id: number): Promise<boolean> {
		try {
			const result = await db.delete(users).where(eq(users.id, id));

			return true;
		} catch (error) {
			console.error("Error deleting user:", error);
			return false;
		}
	}

	// Inventory operations
	async getAllInventory(): Promise<Inventory[]> {
		return await db.select().from(inventory);
	}

	async getInventoryByBottleSize(
		bottleSize: BottleSize
	): Promise<Inventory | undefined> {
		const [item] = await db
			.select()
			.from(inventory)
			.where(eq(inventory.bottleSize, bottleSize));
		return item;
	}

	async createInventory(data: InsertInventory): Promise<Inventory> {
		await db.insert(inventory).values(data);
		const result = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
		const id = (result as any)[0][0].id;
		const [inv] = await db.select().from(inventory).where(eq(inventory.id, id));

		// Create inventory track record
		await db.insert(inventoryTrack).values({
			bottleSize: data.bottleSize,
			totalQuantity: data.totalQuantity,
			inStock: data.inStock,
			soldQuantity: 0,
			pricePerUnit: data.pricePerUnit,
			entryTime: data.entryTime,
		});

		return inv;
	}

	async updateInventory(
		id: number,
		data: Partial<InsertInventory>
	): Promise<Inventory | undefined> {
		// First get the current inventory to get the bottle size
		const [currentInventory] = await db
			.select()
			.from(inventory)
			.where(eq(inventory.id, id));

		if (!currentInventory) {
			return undefined;
		}

		// Calculate the quantity added
		const quantityAdded = data.totalQuantity
			? data.totalQuantity - currentInventory.totalQuantity
			: 0;

		// Update the inventory
		await db.update(inventory).set(data).where(eq(inventory.id, id));
		const [updatedInventory] = await db
			.select()
			.from(inventory)
			.where(eq(inventory.id, id));

		if (updatedInventory && quantityAdded > 0) {
			// Create a new inventory track record with the quantity added
			await db.insert(inventoryTrack).values({
				bottleSize: currentInventory.bottleSize,
				totalQuantity: quantityAdded,
				inStock: data.inStock ?? currentInventory.inStock,
				soldQuantity: 0,
				pricePerUnit: data.pricePerUnit ?? currentInventory.pricePerUnit,
				entryTime: new Date(),
			});
		}

		return updatedInventory;
	}

	// Order operations
	async getAllOrders(): Promise<Order[]> {
		return await db.select().from(orders);
	}

	async getOrderById(id: number): Promise<Order | undefined> {
		const [order] = await db.select().from(orders).where(eq(orders.id, id));
		return order;
	}

	async getOrderWithItems(id: number): Promise<OrderWithItems | undefined> {
		const [order] = await db.select().from(orders).where(eq(orders.id, id));

		if (!order) {
			return undefined;
		}

		const items = await db
			.select()
			.from(orderItems)
			.where(eq(orderItems.orderId, id));

		return {
			...order,
			items,
		};
	}

	async getRecentOrders(limit: number = 5): Promise<Order[]> {
		return await db
			.select()
			.from(orders)
			.orderBy(desc(orders.orderDate))
			.limit(limit);
	}

	async createOrder(data: InsertOrder): Promise<Order> {
		const orderNumber = await this.generateOrderNumber();
		await db.execute(sql`
			INSERT INTO orders (
				order_number,
				customer_name,
				order_date,
				status,
				notes,
				total,
				entry_time
			) VALUES (
				${orderNumber},
				${data.customerName},
				${data.orderDate},
				${data.status || "in_progress"},
				${data.notes},
				${data.total},
				${data.entryTime}
			)
		`);
		const [order] = await db
			.select()
			.from(orders)
			.where(eq(orders.orderNumber, orderNumber));
		return order;
	}

	async updateOrderStatus(orderId: number, status: OrderStatus) {
		const result = await db
			.update(orders)
			.set({ status })
			.where(eq(orders.id, orderId))
			.returning();
		await this.updateDashboardStats();
		return result[0];
	}

	// Order Item operations
	async getOrderItemsByOrderId(orderId: number): Promise<OrderItem[]> {
		return await db
			.select()
			.from(orderItems)
			.where(eq(orderItems.orderId, orderId));
	}

	async createOrderItem(data: InsertOrderItem): Promise<OrderItem> {
		await db.insert(orderItems).values(data);
		const result = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
		const id = (result as any)[0][0].id;
		const [item] = await db
			.select()
			.from(orderItems)
			.where(eq(orderItems.id, id));
		return item;
	}

	// Dashboard stats
	async getDashboardStats(): Promise<DashboardStats> {
		// First check if stats already exist
		const [existingStats] = await db
			.select()
			.from(dashboardStats)
			.where(eq(dashboardStats.id, 1));

		if (existingStats) {
			return existingStats;
		}

		// If not, calculate and create them
		return this.updateDashboardStats();
	}

	async updateDashboardStats(): Promise<DashboardStats> {
		const [totalOrders, pendingOrders, totalSales, inventoryValue] =
			await Promise.all([
				db.select({ count: sql<number>`count(*)` }).from(orders),
				db
					.select({ count: sql<number>`count(*)` })
					.from(orders)
					.where(eq(orders.status, "in_progress")),
				db
					.select({ sum: sql<number>`coalesce(sum(total_amount), 0)` })
					.from(orders),
				db
					.select({
						sum: sql<number>`coalesce(sum(in_stock * price_per_unit), 0)`,
					})
					.from(inventory),
			]);

		await db
			.insert(dashboardStats)
			.values({
				id: 1,
				totalOrders: totalOrders[0].count,
				pendingOrders: pendingOrders[0].count,
				totalSales: totalSales[0].sum.toString(),
				inventoryValue: inventoryValue[0].sum.toString(),
				entryTime: new Date(),
				updatedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: dashboardStats.id,
				set: {
					totalOrders: totalOrders[0].count,
					pendingOrders: pendingOrders[0].count,
					totalSales: totalSales[0].sum.toString(),
					inventoryValue: inventoryValue[0].sum.toString(),
					entryTime: new Date(),
					updatedAt: new Date(),
				},
			});

		return this.getDashboardStats();
	}

	// Inventory tracking operations
	async getInventoryTrackByDateRange(
		startDate: Date,
		endDate: Date
	): Promise<InventoryTrack[]> {
		return await db
			.select()
			.from(inventoryTrack)
			.where(
				and(
					gte(inventoryTrack.entryTime, startDate),
					lte(inventoryTrack.entryTime, endDate)
				)
			)
			.orderBy(desc(inventoryTrack.entryTime));
	}

	async createInventoryTrack(
		data: InsertInventoryTrack
	): Promise<InventoryTrack> {
		const entryTime = new Date();
		await db.execute(sql`
			INSERT INTO inventory_track (
				bottle_size,
				total_quantity,
				in_stock,
				sold_quantity,
				price_per_unit,
				entry_time
			) VALUES (
				${data.bottleSize},
				${data.totalQuantity},
				${data.inStock},
				${data.soldQuantity},
				${data.pricePerUnit},
				${entryTime}
			)
		`);
		const [track] = await db
			.select()
			.from(inventoryTrack)
			.where(
				sql`${inventoryTrack.bottleSize} = ${data.bottleSize} AND ${inventoryTrack.entryTime} = ${entryTime}`
			)
			.orderBy(desc(inventoryTrack.id))
			.limit(1);
		return track;
	}

	// Initialize with sample data if needed
	async initializeWithSampleData(): Promise<void> {
		try {
			// Check if there's already data in the database
			const [existingUser] = await db.select().from(users);

			if (existingUser) {
				// Data already exists, no need to initialize
				console.log("Database already has data, skipping initialization");
				return;
			}

			console.log("Initializing database with sample data...");

			// Create admin user
			await this.createUser({
				username: "admin",
				email: "admin@example.com",
				password: "password",
				name: "John Doe",
				role: "admin",
			});

			// Create inventory items
			await this.createInventory({
				bottleSize: "250ML",
				totalQuantity: 5000,
				inStock: 3450,
				pricePerUnit: "1.25",
				entryTime: new Date(),
			});

			await this.createInventory({
				bottleSize: "500ML",
				totalQuantity: 4000,
				inStock: 2120,
				pricePerUnit: "2.5",
				entryTime: new Date(),
			});

			await this.createInventory({
				bottleSize: "1L",
				totalQuantity: 3000,
				inStock: 780,
				pricePerUnit: "3.75",
				entryTime: new Date(),
			});

			// Create sample orders
			const order1 = await this.createOrder({
				customerName: "Acme Inc.",
				orderDate: new Date("2023-08-15"),
				status: "in_progress",
				total: "450",
				notes: "Regular monthly order",
				entryTime: new Date(),
			});

			await this.createOrderItem({
				orderId: order1.id,
				bottleSize: "500ML",
				quantity: 100,
				pricePerUnit: "2.5",
				subtotal: "250",
				entryTime: new Date(),
			});

			await this.createOrderItem({
				orderId: order1.id,
				bottleSize: "1L",
				quantity: 50,
				pricePerUnit: "4",
				subtotal: "200",
				entryTime: new Date(),
			});

			const order2 = await this.createOrder({
				customerName: "TechCore Ltd",
				orderDate: new Date("2023-08-14"),
				status: "completed",
				total: "1205.5",
				notes: "Quarterly bulk order",
				entryTime: new Date(),
			});

			await this.createOrderItem({
				orderId: order2.id,
				bottleSize: "250ML",
				quantity: 500,
				pricePerUnit: "1.25",
				subtotal: "625",
				entryTime: new Date(),
			});

			await this.createOrderItem({
				orderId: order2.id,
				bottleSize: "500ML",
				quantity: 230,
				pricePerUnit: "2.5",
				subtotal: "575",
				entryTime: new Date(),
			});

			await this.createOrderItem({
				orderId: order2.id,
				bottleSize: "1L",
				quantity: 5,
				pricePerUnit: "3.75",
				subtotal: "18.75",
				entryTime: new Date(),
			});

			const order3 = await this.createOrder({
				customerName: "Hydration Plus",
				orderDate: new Date("2023-08-13"),
				status: "completed",
				total: "630.25",
				notes: "Special event order",
				entryTime: new Date(),
			});

			await this.createOrderItem({
				orderId: order3.id,
				bottleSize: "250ML",
				quantity: 200,
				pricePerUnit: "1.25",
				subtotal: "250",
				entryTime: new Date(),
			});

			await this.createOrderItem({
				orderId: order3.id,
				bottleSize: "500ML",
				quantity: 150,
				pricePerUnit: "2.5",
				subtotal: "375",
				entryTime: new Date(),
			});

			const order4 = await this.createOrder({
				customerName: "GreenWater Co.",
				orderDate: new Date("2023-08-12"),
				status: "in_progress",
				total: "875",
				notes: "Rush order - deliver ASAP",
				entryTime: new Date(),
			});

			await this.createOrderItem({
				orderId: order4.id,
				bottleSize: "1L",
				quantity: 200,
				pricePerUnit: "3.75",
				subtotal: "750",
				entryTime: new Date(),
			});

			await this.createOrderItem({
				orderId: order4.id,
				bottleSize: "250ML",
				quantity: 100,
				pricePerUnit: "1.25",
				subtotal: "125",
				entryTime: new Date(),
			});

			console.log("Sample data initialization complete!");

			// Update dashboard stats
			await this.updateDashboardStats();
		} catch (error) {
			console.error("Error initializing database with sample data:", error);
		}
	}

	private async generateOrderNumber(): Promise<string> {
		const date = new Date();
		const year = date.getFullYear().toString().slice(-2);
		const month = (date.getMonth() + 1).toString().padStart(2, "0");
		const day = date.getDate().toString().padStart(2, "0");
		const random = Math.floor(Math.random() * 10000)
			.toString()
			.padStart(4, "0");
		return `ORD-${year}${month}${day}-${random}`;
	}

	async getInventoryHistory(
		startDate?: Date,
		endDate?: Date
	): Promise<Array<{ bottleSize: string; totalQuantity: number }>> {
		const result = await db.execute(sql`
			SELECT 
				bottle_size as bottleSize,
				COALESCE(SUM(total_quantity), 0) as totalQuantity
			FROM inventory_track
			${
				startDate && endDate
					? sql`WHERE entry_time BETWEEN ${startDate} AND ${endDate}`
					: sql``
			}
			GROUP BY bottle_size
			ORDER BY bottle_size
		`);
		return (result as any)[0] as Array<{
			bottleSize: string;
			totalQuantity: number;
		}>;
	}

	async updateInventoryQuantity(
		bottleSize: BottleSize,
		quantity: number,
		type: "add" | "remove"
	) {
		const [currentInventory] = await db
			.select()
			.from(inventory)
			.where(eq(inventory.bottleSize, bottleSize));

		if (!currentInventory) {
			throw new Error(`No inventory found for bottle size: ${bottleSize}`);
		}

		const newInStock =
			type === "add"
				? currentInventory.inStock + quantity
				: currentInventory.inStock - quantity;

		if (newInStock < 0) {
			throw new Error(
				`Cannot remove ${quantity} bottles. Only ${currentInventory.inStock} in stock.`
			);
		}

		await db.execute(sql`
			UPDATE inventory
			SET in_stock = ${newInStock}
			WHERE bottle_size = ${bottleSize}
		`);
	}

	async updateOrder(id: number, data: Partial<InsertOrder>): Promise<Order> {
		const updates = Object.entries(data)
			.map(([key, value]) => sql.raw(`${key} = ${value}`))
			.join(", ");

		await db.execute(sql`
			UPDATE orders
			SET ${sql.raw(updates)}
			WHERE id = ${id}
		`);
		const [order] = await db.select().from(orders).where(eq(orders.id, id));
		return order;
	}

	async updateDashboardStats(): Promise<void> {
		const stats = await this.getDashboardStats();
		await db.execute(sql`
			INSERT INTO dashboard_stats (
				total_orders,
				pending_orders,
				total_sales,
				inventory_value,
				entry_time,
				updated_at
			) VALUES (
				${stats.totalOrders},
				${stats.pendingOrders},
				${stats.totalSales},
				${stats.inventoryValue},
				${new Date()},
				${new Date()}
			) ON DUPLICATE KEY UPDATE
				total_orders = VALUES(total_orders),
				pending_orders = VALUES(pending_orders),
				total_sales = VALUES(total_sales),
				inventory_value = VALUES(inventory_value),
				updated_at = VALUES(updated_at)
		`);
	}
}

// Initialize database storage immediately - no in-memory fallback
const storage = new DatabaseStorage();
console.log("Using MySQL database storage");

// Export the storage instance
export { storage };
