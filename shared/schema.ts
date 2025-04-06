import {
	mysqlTable,
	varchar,
	int,
	decimal,
	datetime,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm/sql";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Bottle Sizes
export const bottleSizes = ["250ML", "500ML", "1L"] as const;
export const bottleSizeSchema = z.enum(bottleSizes);
export type BottleSize = z.infer<typeof bottleSizeSchema>;

// User roles
export const userRoles = [
	"admin",
	"manager",
	"marketing",
	"inventory",
] as const;
export const userRoleSchema = z.enum(userRoles);
export type UserRole = z.infer<typeof userRoleSchema>;

// Bottle Prices (default prices in rupees)
export const bottlePrices: Record<BottleSize, number> = {
	"250ML": 2.5,
	"500ML": 4.0,
	"1L": 7.0,
};

// Order Status
export const orderStatuses = ["in_progress", "completed"] as const;
export const orderStatusSchema = z.enum(orderStatuses);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

// Database Table Definitions
export const users = mysqlTable("users", {
	id: int("id").autoincrement().primaryKey(),
	username: varchar("username", { length: 255 }).notNull().unique(),
	email: varchar("email", { length: 255 }).notNull().unique(),
	password: varchar("password", { length: 255 }).notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	role: varchar("role", { length: 50 }).notNull().default("inventory"),
	createdBy: int("created_by"),
	entryTime: datetime("entry_time")
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
	createdAt: datetime("created_at")
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
	updatedAt: datetime("updated_at")
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
});

export const inventory = mysqlTable("inventory", {
	id: int("id").autoincrement().primaryKey(),
	bottleSize: varchar("bottle_size", {
		length: 10,
		enum: ["250ML", "500ML", "1L"],
	}).notNull(),
	totalQuantity: int("total_quantity").notNull(),
	inStock: int("in_stock").notNull(),
	soldQuantity: int("sold_quantity").notNull().default(0),
	pricePerUnit: decimal("price_per_unit", {
		precision: 10,
		scale: 2,
	}).notNull(),
	entryTime: datetime("entry_time").notNull(),
	createdAt: datetime("created_at")
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
	updatedAt: datetime("updated_at")
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
});

export const inventoryTrack = mysqlTable("inventory_track", {
	id: int("id").autoincrement().primaryKey(),
	bottleSize: varchar("bottle_size", {
		length: 10,
		enum: ["250ML", "500ML", "1L"],
	}).notNull(),
	totalQuantity: int("total_quantity").notNull(),
	inStock: int("in_stock").notNull(),
	soldQuantity: int("sold_quantity").notNull().default(0),
	pricePerUnit: decimal("price_per_unit", {
		precision: 10,
		scale: 2,
	}).notNull(),
	entryTime: datetime("entry_time").notNull(),
	createdAt: datetime("created_at")
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
});

export const orders = mysqlTable("orders", {
	id: int("id").autoincrement().primaryKey(),
	orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
	customerName: varchar("customer_name", { length: 255 }).notNull(),
	orderDate: datetime("order_date").notNull(),
	status: varchar("status", { length: 20 }).notNull().default("in_progress"),
	notes: varchar("notes", { length: 1000 }),
	total: decimal("total", { precision: 10, scale: 2 }).notNull(),
	entryTime: datetime("entry_time").notNull(),
	createdAt: datetime("created_at")
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
});

export const orderItems = mysqlTable("order_items", {
	id: int("id").autoincrement().primaryKey(),
	orderId: int("order_id").notNull(),
	bottleSize: varchar("bottle_size", { length: 10 }).notNull(),
	quantity: int("quantity").notNull(),
	pricePerUnit: decimal("price_per_unit", {
		precision: 10,
		scale: 2,
	}).notNull(),
	subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
	entryTime: datetime("entry_time").notNull(),
	createdAt: datetime("created_at")
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
});

export const dashboardStats = mysqlTable("dashboard_stats", {
	id: int("id").autoincrement().primaryKey(),
	totalOrders: int("total_orders").notNull().default(0),
	pendingOrders: int("pending_orders").notNull().default(0),
	totalSales: decimal("total_sales", { precision: 10, scale: 2 })
		.notNull()
		.default("0"),
	inventoryValue: decimal("inventory_value", { precision: 10, scale: 2 })
		.notNull()
		.default("0"),
	entryTime: datetime("entry_time")
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
	updatedAt: datetime("updated_at")
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
});

// Type Definitions
export type User = typeof users.$inferSelect;
export type Inventory = typeof inventory.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type DashboardStats = typeof dashboardStats.$inferSelect;
export type InventoryTrack = typeof inventoryTrack.$inferSelect;
export type InsertInventoryTrack = typeof inventoryTrack.$inferInsert;

// User Schema with Drizzle
export const insertUserSchema = createInsertSchema(users).pick({
	username: true,
	email: true,
	password: true,
	name: true,
	role: true,
	createdBy: true,
	entryTime: true,
});

// Authentication Schemas
export const loginSchema = z.object({
	email: z.string().email("Please enter a valid email address"),
	password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
	username: z.string().min(3, "Username must be at least 3 characters"),
	email: z.string().email("Please enter a valid email address"),
	password: z.string().min(6, "Password must be at least 6 characters"),
	name: z.string().min(1, "Full name is required"),
});

export const createUserSchema = z.object({
	username: z.string().min(3, "Username must be at least 3 characters"),
	email: z.string().email("Please enter a valid email address"),
	password: z.string().min(6, "Password must be at least 6 characters"),
	name: z.string().min(1, "Full name is required"),
	role: userRoleSchema,
});

// Inventory Schema with Drizzle
export const insertInventorySchema = createInsertSchema(inventory).pick({
	bottleSize: true,
	totalQuantity: true,
	inStock: true,
	pricePerUnit: true,
	entryTime: true,
});

// Order Schema with Drizzle
export const insertOrderSchema = createInsertSchema(orders).pick({
	customerName: true,
	orderDate: true,
	status: true,
	notes: true,
	total: true,
	entryTime: true,
});

// Order Item Schema with Drizzle
export const insertOrderItemSchema = createInsertSchema(orderItems).pick({
	orderId: true,
	bottleSize: true,
	quantity: true,
	pricePerUnit: true,
	subtotal: true,
	entryTime: true,
});

// Insert Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

// Auth Types
export type LoginCredentials = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
export type CreateUserData = z.infer<typeof createUserSchema>;

// Order with items
export type OrderWithItems = Order & {
	items: OrderItem[];
};

// Order Entry Schema (for frontend form validation)
export const orderItemEntrySchema = z.object({
	bottleSize: bottleSizeSchema,
	quantity: z.number().int().positive(),
	pricePerUnit: z.number().positive(),
});

export const orderEntrySchema = z.object({
	customerName: z.string().min(1, "Customer name is required"),
	orderDate: z.string().or(z.date()),
	notes: z.string().optional(),
	items: z.array(orderItemEntrySchema).min(1, "At least one item is required"),
});

export type OrderItemEntry = z.infer<typeof orderItemEntrySchema>;
export type OrderEntry = z.infer<typeof orderEntrySchema>;

// Inventory Entry Schema (for frontend form validation)
export const inventoryEntrySchema = z.object({
	bottleSize: bottleSizeSchema,
	quantity: z.number().int().positive(),
	pricePerUnit: z.number().positive(),
	entryTime: z.string().or(z.date()),
});

export type InventoryEntry = z.infer<typeof inventoryEntrySchema>;
