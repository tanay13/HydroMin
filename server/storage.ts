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
} from "../shared/schema";
import { db } from "./db";
import { eq, desc, count, sum, sql } from "drizzle-orm";
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

	async createUser(insertUser: InsertUser): Promise<User> {
		const [user] = await db
			.insert(users)
			.values({
				...insertUser,
				updatedAt: new Date(),
			})
			.returning();
		return user;
	}

	async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
		const [updatedUser] = await db
			.update(users)
			.set({
				...data,
				updatedAt: new Date(),
			})
			.where(eq(users.id, id))
			.returning();

		return updatedUser;
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

	async createInventory(data: InsertInventory) {
		const result = await db
			.insert(inventory)
			.values({
				...data,
				soldQuantity: 0,
			})
			.returning();
		await this.updateDashboardStats();
		return result[0];
	}

	async updateInventory(
		id: number,
		data: Partial<Inventory>
	): Promise<Inventory | undefined> {
		const [existingItem] = await db
			.select()
			.from(inventory)
			.where(eq(inventory.id, id));

		if (!existingItem) {
			return undefined;
		}

		// Calculate soldQuantity if inStock or totalQuantity changed
		let soldQuantity = existingItem.soldQuantity;
		if (data.inStock !== undefined || data.totalQuantity !== undefined) {
			const totalQuantity = data.totalQuantity ?? existingItem.totalQuantity;
			const inStock = data.inStock ?? existingItem.inStock;
			soldQuantity = totalQuantity - inStock;
		}

		const [updatedInventory] = await db
			.update(inventory)
			.set({
				...data,
				soldQuantity,
				updatedAt: new Date(),
			})
			.where(eq(inventory.id, id))
			.returning();

		await this.updateDashboardStats();
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

	async createOrder(data: InsertOrder) {
		const orderNumber = await this.generateOrderNumber();
		const result = await db
			.insert(orders)
			.values({
				...data,
				orderNumber,
			})
			.returning();
		await this.updateDashboardStats();
		return result[0];
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

	async createOrderItem(data: InsertOrderItem) {
		const result = await db.insert(orderItems).values(data).returning();
		return result[0];
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
				db.select({ sum: sql<number>`coalesce(sum(total), 0)` }).from(orders),
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
				lastUpdated: new Date(),
			})
			.onConflictDoUpdate({
				target: dashboardStats.id,
				set: {
					totalOrders: totalOrders[0].count,
					pendingOrders: pendingOrders[0].count,
					totalSales: totalSales[0].sum.toString(),
					inventoryValue: inventoryValue[0].sum.toString(),
					entryTime: new Date(),
					lastUpdated: new Date(),
				},
			});

		return this.getDashboardStats();
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
		const [lastOrder] = await db
			.select({ id: orders.id })
			.from(orders)
			.orderBy(desc(orders.id))
			.limit(1);

		const nextId = lastOrder ? lastOrder.id + 1 : 1;
		return `ORD-${String(nextId).padStart(4, "0")}`;
	}

	async updateInventoryQuantity(
		bottleSize: BottleSize,
		quantity: number,
		type: "add" | "remove"
	) {
		const result = await db
			.update(inventory)
			.set({
				inStock:
					type === "add"
						? sql`in_stock + ${quantity}`
						: sql`in_stock - ${quantity}`,
				soldQuantity:
					type === "remove"
						? sql`sold_quantity + ${quantity}`
						: sql`sold_quantity`,
			})
			.where(eq(inventory.bottleSize, bottleSize))
			.returning();
		await this.updateDashboardStats();
		return result[0];
	}
}

// MemStorage implementation
class MemStorage implements IStorage {
	private users: User[] = [];
	private inventory: Inventory[] = [];
	private orders: Order[] = [];
	private orderItems: OrderItem[] = [];
	private dashboardStats: DashboardStats | null = null;
	private nextUserId = 1;
	private nextInventoryId = 1;
	private nextOrderId = 1;
	private nextOrderItemId = 1;

	constructor() {
		this.initializeWithSampleData();
	}

	// User operations
	async getUser(id: number): Promise<User | undefined> {
		return this.users.find((user) => user.id === id);
	}

	async getUserByUsername(username: string): Promise<User | undefined> {
		return this.users.find((user) => user.username === username);
	}

	async getUserByEmail(email: string): Promise<User | undefined> {
		return this.users.find((user) => user.email === email);
	}

	async getAllUsers(): Promise<User[]> {
		return [...this.users];
	}

	async createUser(user: InsertUser): Promise<User> {
		const newUser: User = {
			id: this.nextUserId++,
			username: user.username,
			email: user.email,
			password: user.password,
			name: user.name,
			role: user.role || "inventory",
			createdBy: user.createdBy || null,
			entryTime: new Date(),
			createdAt: new Date(),
			updatedAt: new Date(),
		};
		this.users.push(newUser);
		return newUser;
	}

	async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
		const index = this.users.findIndex((user) => user.id === id);
		if (index === -1) return undefined;

		const updatedUser = {
			...this.users[index],
			...data,
			updatedAt: new Date(),
		};

		this.users[index] = updatedUser;
		return updatedUser;
	}

	async deleteUser(id: number): Promise<boolean> {
		const index = this.users.findIndex((user) => user.id === id);
		if (index === -1) return false;

		this.users.splice(index, 1);
		return true;
	}

	// Inventory operations
	async getAllInventory(): Promise<Inventory[]> {
		return [...this.inventory];
	}

	async getInventoryByBottleSize(
		bottleSize: BottleSize
	): Promise<Inventory | undefined> {
		return this.inventory.find((item) => item.bottleSize === bottleSize);
	}

	async createInventory(inventory: InsertInventory): Promise<Inventory> {
		const soldQuantity = inventory.totalQuantity - inventory.inStock;

		const newInventory: Inventory = {
			id: this.nextInventoryId++,
			bottleSize: inventory.bottleSize,
			totalQuantity: inventory.totalQuantity,
			inStock: inventory.inStock,
			pricePerUnit: inventory.pricePerUnit,
			soldQuantity,
			entryTime: inventory.entryTime,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		this.inventory.push(newInventory);
		await this.updateDashboardStats();
		return newInventory;
	}

	async updateInventory(
		id: number,
		data: Partial<Inventory>
	): Promise<Inventory | undefined> {
		const index = this.inventory.findIndex((item) => item.id === id);
		if (index === -1) return undefined;

		const existingItem = this.inventory[index];

		// Calculate soldQuantity if inStock or totalQuantity changed
		let soldQuantity = existingItem.soldQuantity;
		if (data.inStock !== undefined || data.totalQuantity !== undefined) {
			const totalQuantity = data.totalQuantity ?? existingItem.totalQuantity;
			const inStock = data.inStock ?? existingItem.inStock;
			soldQuantity = totalQuantity - inStock;
		}

		const updatedInventory: Inventory = {
			...existingItem,
			...data,
			soldQuantity,
			updatedAt: new Date(),
		};

		this.inventory[index] = updatedInventory;
		await this.updateDashboardStats();
		return updatedInventory;
	}

	// Order operations
	async getAllOrders(): Promise<Order[]> {
		return [...this.orders];
	}

	async getOrderById(id: number): Promise<Order | undefined> {
		return this.orders.find((order) => order.id === id);
	}

	async getOrderWithItems(id: number): Promise<OrderWithItems | undefined> {
		const order = this.orders.find((order) => order.id === id);
		if (!order) return undefined;

		const items = this.orderItems.filter((item) => item.orderId === id);

		return {
			...order,
			items,
		};
	}

	async getRecentOrders(limit: number = 5): Promise<Order[]> {
		return [...this.orders]
			.sort(
				(a, b) =>
					new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
			)
			.slice(0, limit);
	}

	async createOrder(order: InsertOrder): Promise<Order> {
		const id = this.nextOrderId++;
		const orderNumber = `ORD-${String(id).padStart(4, "0")}`;

		const newOrder: Order = {
			id,
			orderNumber,
			customerName: order.customerName,
			orderDate: new Date(order.orderDate),
			status: order.status || "in_progress",
			notes: order.notes || null,
			total: order.total,
			entryTime: new Date(order.entryTime),
			createdAt: new Date(),
		};

		this.orders.push(newOrder);
		await this.updateDashboardStats();
		return newOrder;
	}

	async updateOrderStatus(
		id: number,
		status: OrderStatus
	): Promise<Order | undefined> {
		const index = this.orders.findIndex((order) => order.id === id);
		if (index === -1) return undefined;

		const updatedOrder = {
			...this.orders[index],
			status,
		};

		this.orders[index] = updatedOrder;
		await this.updateDashboardStats();
		return updatedOrder;
	}

	// Order Item operations
	async getOrderItemsByOrderId(orderId: number): Promise<OrderItem[]> {
		return this.orderItems.filter((item) => item.orderId === orderId);
	}

	async createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
		const newOrderItem: OrderItem = {
			id: this.nextOrderItemId++,
			orderId: orderItem.orderId,
			bottleSize: orderItem.bottleSize,
			quantity: orderItem.quantity,
			pricePerUnit: orderItem.pricePerUnit,
			subtotal: orderItem.subtotal,
			entryTime: new Date(orderItem.entryTime),
			createdAt: new Date(),
		};

		this.orderItems.push(newOrderItem);

		// Update inventory
		const inventoryItem = this.inventory.find(
			(item) => item.bottleSize === orderItem.bottleSize
		);
		if (inventoryItem) {
			const newInStock = Math.max(
				0,
				inventoryItem.inStock - orderItem.quantity
			);
			const newSoldQuantity = inventoryItem.soldQuantity + orderItem.quantity;

			await this.updateInventory(inventoryItem.id, {
				inStock: newInStock,
				soldQuantity: newSoldQuantity,
			});
		}

		return newOrderItem;
	}

	// Dashboard stats
	async getDashboardStats(): Promise<DashboardStats> {
		if (this.dashboardStats) {
			return this.dashboardStats;
		}

		return this.updateDashboardStats();
	}

	async updateDashboardStats(): Promise<DashboardStats> {
		const totalOrders = this.orders.length;
		const pendingOrders = this.orders.filter(
			(order) => order.status === "in_progress"
		).length;

		const totalSales = this.orders
			.filter((order) => order.status === "completed")
			.reduce((sum, order) => sum + Number(order.total), 0);

		const inventoryValue = this.inventory.reduce(
			(sum, item) => sum + Number(item.pricePerUnit) * item.inStock,
			0
		);

		const stats: DashboardStats = {
			id: 1,
			totalOrders,
			pendingOrders,
			totalSales: String(totalSales),
			inventoryValue: String(inventoryValue),
			entryTime: new Date(),
			lastUpdated: new Date(),
		};

		this.dashboardStats = stats;
		return stats;
	}

	private initializeWithSampleData(): void {
		// Create admin user
		this.createUser({
			username: "admin",
			email: "admin@example.com",
			password: "password",
			name: "John Doe",
			role: "admin",
		});

		// Create inventory items
		this.createInventory({
			bottleSize: "250ML",
			totalQuantity: 5000,
			inStock: 3450,
			pricePerUnit: "1.25",
			entryTime: new Date(),
		});

		this.createInventory({
			bottleSize: "500ML",
			totalQuantity: 4000,
			inStock: 2120,
			pricePerUnit: "2.5",
			entryTime: new Date(),
		});

		this.createInventory({
			bottleSize: "1L",
			totalQuantity: 3000,
			inStock: 780,
			pricePerUnit: "3.75",
			entryTime: new Date(),
		});

		// Create sample orders
		this.createOrder({
			customerName: "Acme Inc.",
			orderDate: new Date("2023-08-15"),
			status: "in_progress",
			total: "450",
			notes: "Regular monthly order",
			entryTime: new Date(),
		}).then((order1) => {
			this.createOrderItem({
				orderId: order1.id,
				bottleSize: "500ML",
				quantity: 100,
				pricePerUnit: "2.5",
				subtotal: "250",
				entryTime: new Date(),
			});

			this.createOrderItem({
				orderId: order1.id,
				bottleSize: "1L",
				quantity: 50,
				pricePerUnit: "4",
				subtotal: "200",
				entryTime: new Date(),
			});
		});

		this.createOrder({
			customerName: "TechCore Ltd",
			orderDate: new Date("2023-08-14"),
			status: "completed",
			total: "1205.5",
			notes: "Quarterly bulk order",
			entryTime: new Date(),
		}).then((order2) => {
			this.createOrderItem({
				orderId: order2.id,
				bottleSize: "250ML",
				quantity: 500,
				pricePerUnit: "1.25",
				subtotal: "625",
				entryTime: new Date(),
			});

			this.createOrderItem({
				orderId: order2.id,
				bottleSize: "500ML",
				quantity: 230,
				pricePerUnit: "2.5",
				subtotal: "575",
				entryTime: new Date(),
			});

			this.createOrderItem({
				orderId: order2.id,
				bottleSize: "1L",
				quantity: 5,
				pricePerUnit: "3.75",
				subtotal: "18.75",
				entryTime: new Date(),
			});
		});

		this.createOrder({
			customerName: "Hydration Plus",
			orderDate: new Date("2023-08-13"),
			status: "completed",
			total: "630.25",
			notes: "Special event order",
			entryTime: new Date(),
		}).then((order3) => {
			this.createOrderItem({
				orderId: order3.id,
				bottleSize: "250ML",
				quantity: 200,
				pricePerUnit: "1.25",
				subtotal: "250",
				entryTime: new Date(),
			});

			this.createOrderItem({
				orderId: order3.id,
				bottleSize: "500ML",
				quantity: 150,
				pricePerUnit: "2.5",
				subtotal: "375",
				entryTime: new Date(),
			});
		});

		this.createOrder({
			customerName: "GreenWater Co.",
			orderDate: new Date("2023-08-12"),
			status: "in_progress",
			total: "875",
			notes: "Rush order - deliver ASAP",
			entryTime: new Date(),
		}).then((order4) => {
			this.createOrderItem({
				orderId: order4.id,
				bottleSize: "1L",
				quantity: 200,
				pricePerUnit: "3.75",
				subtotal: "750",
				entryTime: new Date(),
			});

			this.createOrderItem({
				orderId: order4.id,
				bottleSize: "250ML",
				quantity: 100,
				pricePerUnit: "1.25",
				subtotal: "125",
				entryTime: new Date(),
			});
		});
	}
}

// Initialize database storage immediately - no in-memory fallback
const storage = new DatabaseStorage();
console.log("Using PostgreSQL database storage");

// First run the database setup to create tables and schema
setupDatabase()
	.then(() => {
		console.log("Database schema setup completed successfully");
		// Then initialize with sample data
		return storage.initializeWithSampleData();
	})
	.then(() => {
		console.log("Database initialized with sample data");
	})
	.catch((error: unknown) => {
		// Log error but don't fall back to in-memory
		console.error(
			"Error initializing database:",
			error instanceof Error ? error.message : String(error)
		);
		// Throw error to terminate application if database fails
		throw new Error(
			"Failed to initialize database - application cannot continue"
		);
	});

// Export the storage instance
export { storage };
