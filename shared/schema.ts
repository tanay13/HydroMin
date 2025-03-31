import {
	pgTable,
	text,
	serial,
	integer,
	numeric,
	timestamp,
} from "drizzle-orm/pg-core";
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
export const users = pgTable("users", {
	id: serial("id").primaryKey(),
	username: text("username").notNull().unique(),
	email: text("email").notNull().unique(),
	password: text("password").notNull(),
	name: text("name").notNull(),
	role: text("role").notNull().default("inventory"),
	createdBy: integer("created_by"),
	entryTime: timestamp("entry_time").notNull().defaultNow(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const inventory = pgTable("inventory", {
	id: serial("id").primaryKey(),
	bottleSize: text("bottle_size").notNull(),
	totalQuantity: integer("total_quantity").notNull(),
	inStock: integer("in_stock").notNull(),
	soldQuantity: integer("sold_quantity").notNull().default(0),
	pricePerUnit: numeric("price_per_unit", {
		precision: 10,
		scale: 2,
	}).notNull(),
	entryTime: timestamp("entry_time").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const orders = pgTable("orders", {
	id: serial("id").primaryKey(),
	orderNumber: text("order_number").notNull().unique(),
	customerName: text("customer_name").notNull(),
	orderDate: timestamp("order_date").notNull(),
	status: text("status").notNull().default("in_progress"),
	notes: text("notes"),
	total: numeric("total", { precision: 10, scale: 2 }).notNull(),
	entryTime: timestamp("entry_time").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
	id: serial("id").primaryKey(),
	orderId: integer("order_id").notNull(),
	bottleSize: text("bottle_size").notNull(),
	quantity: integer("quantity").notNull(),
	pricePerUnit: numeric("price_per_unit", {
		precision: 10,
		scale: 2,
	}).notNull(),
	subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
	entryTime: timestamp("entry_time").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const dashboardStats = pgTable("dashboard_stats", {
	id: serial("id").primaryKey(),
	totalOrders: integer("total_orders").notNull().default(0),
	pendingOrders: integer("pending_orders").notNull().default(0),
	totalSales: numeric("total_sales", { precision: 10, scale: 2 })
		.notNull()
		.default("0"),
	inventoryValue: numeric("inventory_value", { precision: 10, scale: 2 })
		.notNull()
		.default("0"),
	entryTime: timestamp("entry_time").notNull().defaultNow(),
	lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

// Type Definitions
export type User = typeof users.$inferSelect;
export type Inventory = typeof inventory.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type DashboardStats = typeof dashboardStats.$inferSelect;

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
