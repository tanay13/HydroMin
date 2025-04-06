"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryEntrySchema = exports.orderEntrySchema = exports.orderItemEntrySchema = exports.insertOrderItemSchema = exports.insertOrderSchema = exports.insertInventorySchema = exports.createUserSchema = exports.registerSchema = exports.loginSchema = exports.insertUserSchema = exports.dashboardStats = exports.orderItems = exports.orders = exports.inventoryTrack = exports.inventory = exports.users = exports.orderStatusSchema = exports.orderStatuses = exports.bottlePrices = exports.userRoleSchema = exports.userRoles = exports.bottleSizeSchema = exports.bottleSizes = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const sql_1 = require("drizzle-orm/sql");
const drizzle_zod_1 = require("drizzle-zod");
const zod_1 = require("zod");
// Bottle Sizes
exports.bottleSizes = ["250ML", "500ML", "1L"];
exports.bottleSizeSchema = zod_1.z.enum(exports.bottleSizes);
// User roles
exports.userRoles = [
    "admin",
    "manager",
    "marketing",
    "inventory",
];
exports.userRoleSchema = zod_1.z.enum(exports.userRoles);
// Bottle Prices (default prices in rupees)
exports.bottlePrices = {
    "250ML": 2.5,
    "500ML": 4.0,
    "1L": 7.0,
};
// Order Status
exports.orderStatuses = ["in_progress", "completed"];
exports.orderStatusSchema = zod_1.z.enum(exports.orderStatuses);
// Database Table Definitions
exports.users = (0, mysql_core_1.mysqlTable)("users", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    username: (0, mysql_core_1.varchar)("username", { length: 255 }).notNull().unique(),
    email: (0, mysql_core_1.varchar)("email", { length: 255 }).notNull().unique(),
    password: (0, mysql_core_1.varchar)("password", { length: 255 }).notNull(),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    role: (0, mysql_core_1.varchar)("role", { length: 50 }).notNull().default("inventory"),
    createdBy: (0, mysql_core_1.int)("created_by"),
    entryTime: (0, mysql_core_1.datetime)("entry_time")
        .notNull()
        .default((0, sql_1.sql) `CURRENT_TIMESTAMP`),
    createdAt: (0, mysql_core_1.datetime)("created_at")
        .notNull()
        .default((0, sql_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, mysql_core_1.datetime)("updated_at")
        .notNull()
        .default((0, sql_1.sql) `CURRENT_TIMESTAMP`),
});
exports.inventory = (0, mysql_core_1.mysqlTable)("inventory", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    bottleSize: (0, mysql_core_1.varchar)("bottle_size", {
        length: 10,
        enum: ["250ML", "500ML", "1L"],
    }).notNull(),
    totalQuantity: (0, mysql_core_1.int)("total_quantity").notNull(),
    inStock: (0, mysql_core_1.int)("in_stock").notNull(),
    soldQuantity: (0, mysql_core_1.int)("sold_quantity").notNull().default(0),
    pricePerUnit: (0, mysql_core_1.decimal)("price_per_unit", {
        precision: 10,
        scale: 2,
    }).notNull(),
    entryTime: (0, mysql_core_1.datetime)("entry_time").notNull(),
    createdAt: (0, mysql_core_1.datetime)("created_at")
        .notNull()
        .default((0, sql_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, mysql_core_1.datetime)("updated_at")
        .notNull()
        .default((0, sql_1.sql) `CURRENT_TIMESTAMP`),
});
exports.inventoryTrack = (0, mysql_core_1.mysqlTable)("inventory_track", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    bottleSize: (0, mysql_core_1.varchar)("bottle_size", {
        length: 10,
        enum: ["250ML", "500ML", "1L"],
    }).notNull(),
    totalQuantity: (0, mysql_core_1.int)("total_quantity").notNull(),
    inStock: (0, mysql_core_1.int)("in_stock").notNull(),
    soldQuantity: (0, mysql_core_1.int)("sold_quantity").notNull().default(0),
    pricePerUnit: (0, mysql_core_1.decimal)("price_per_unit", {
        precision: 10,
        scale: 2,
    }).notNull(),
    entryTime: (0, mysql_core_1.datetime)("entry_time").notNull(),
    createdAt: (0, mysql_core_1.datetime)("created_at")
        .notNull()
        .default((0, sql_1.sql) `CURRENT_TIMESTAMP`),
});
exports.orders = (0, mysql_core_1.mysqlTable)("orders", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    orderNumber: (0, mysql_core_1.varchar)("order_number", { length: 50 }).notNull().unique(),
    customerName: (0, mysql_core_1.varchar)("customer_name", { length: 255 }).notNull(),
    orderDate: (0, mysql_core_1.datetime)("order_date").notNull(),
    status: (0, mysql_core_1.varchar)("status", { length: 20 }).notNull().default("in_progress"),
    notes: (0, mysql_core_1.varchar)("notes", { length: 1000 }),
    total: (0, mysql_core_1.decimal)("total", { precision: 10, scale: 2 }).notNull(),
    entryTime: (0, mysql_core_1.datetime)("entry_time").notNull(),
    createdAt: (0, mysql_core_1.datetime)("created_at")
        .notNull()
        .default((0, sql_1.sql) `CURRENT_TIMESTAMP`),
});
exports.orderItems = (0, mysql_core_1.mysqlTable)("order_items", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    orderId: (0, mysql_core_1.int)("order_id").notNull(),
    bottleSize: (0, mysql_core_1.varchar)("bottle_size", { length: 10 }).notNull(),
    quantity: (0, mysql_core_1.int)("quantity").notNull(),
    pricePerUnit: (0, mysql_core_1.decimal)("price_per_unit", {
        precision: 10,
        scale: 2,
    }).notNull(),
    subtotal: (0, mysql_core_1.decimal)("subtotal", { precision: 10, scale: 2 }).notNull(),
    entryTime: (0, mysql_core_1.datetime)("entry_time").notNull(),
    createdAt: (0, mysql_core_1.datetime)("created_at")
        .notNull()
        .default((0, sql_1.sql) `CURRENT_TIMESTAMP`),
});
exports.dashboardStats = (0, mysql_core_1.mysqlTable)("dashboard_stats", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    totalOrders: (0, mysql_core_1.int)("total_orders").notNull().default(0),
    pendingOrders: (0, mysql_core_1.int)("pending_orders").notNull().default(0),
    totalSales: (0, mysql_core_1.decimal)("total_sales", { precision: 10, scale: 2 })
        .notNull()
        .default("0"),
    inventoryValue: (0, mysql_core_1.decimal)("inventory_value", { precision: 10, scale: 2 })
        .notNull()
        .default("0"),
    entryTime: (0, mysql_core_1.datetime)("entry_time")
        .notNull()
        .default((0, sql_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, mysql_core_1.datetime)("updated_at")
        .notNull()
        .default((0, sql_1.sql) `CURRENT_TIMESTAMP`),
});
// User Schema with Drizzle
exports.insertUserSchema = (0, drizzle_zod_1.createInsertSchema)(exports.users).pick({
    username: true,
    email: true,
    password: true,
    name: true,
    role: true,
    createdBy: true,
    entryTime: true,
});
// Authentication Schemas
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email("Please enter a valid email address"),
    password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
});
exports.registerSchema = zod_1.z.object({
    username: zod_1.z.string().min(3, "Username must be at least 3 characters"),
    email: zod_1.z.string().email("Please enter a valid email address"),
    password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
    name: zod_1.z.string().min(1, "Full name is required"),
});
exports.createUserSchema = zod_1.z.object({
    username: zod_1.z.string().min(3, "Username must be at least 3 characters"),
    email: zod_1.z.string().email("Please enter a valid email address"),
    password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
    name: zod_1.z.string().min(1, "Full name is required"),
    role: exports.userRoleSchema,
});
// Inventory Schema with Drizzle
exports.insertInventorySchema = (0, drizzle_zod_1.createInsertSchema)(exports.inventory).pick({
    bottleSize: true,
    totalQuantity: true,
    inStock: true,
    pricePerUnit: true,
    entryTime: true,
});
// Order Schema with Drizzle
exports.insertOrderSchema = (0, drizzle_zod_1.createInsertSchema)(exports.orders).pick({
    customerName: true,
    orderDate: true,
    status: true,
    notes: true,
    total: true,
    entryTime: true,
});
// Order Item Schema with Drizzle
exports.insertOrderItemSchema = (0, drizzle_zod_1.createInsertSchema)(exports.orderItems).pick({
    orderId: true,
    bottleSize: true,
    quantity: true,
    pricePerUnit: true,
    subtotal: true,
    entryTime: true,
});
// Order Entry Schema (for frontend form validation)
exports.orderItemEntrySchema = zod_1.z.object({
    bottleSize: exports.bottleSizeSchema,
    quantity: zod_1.z.number().int().positive(),
    pricePerUnit: zod_1.z.number().positive(),
});
exports.orderEntrySchema = zod_1.z.object({
    customerName: zod_1.z.string().min(1, "Customer name is required"),
    orderDate: zod_1.z.string().or(zod_1.z.date()),
    notes: zod_1.z.string().optional(),
    items: zod_1.z.array(exports.orderItemEntrySchema).min(1, "At least one item is required"),
});
// Inventory Entry Schema (for frontend form validation)
exports.inventoryEntrySchema = zod_1.z.object({
    bottleSize: exports.bottleSizeSchema,
    quantity: zod_1.z.number().int().positive(),
    pricePerUnit: zod_1.z.number().positive(),
    entryTime: zod_1.z.string().or(zod_1.z.date()),
});
