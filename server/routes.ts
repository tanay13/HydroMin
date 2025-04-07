import express, {
	type Express,
	Request,
	Response,
	NextFunction,
} from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { db, pool } from "./db.js";
import {
	bottleSizeSchema,
	orderStatusSchema,
	userRoleSchema,
	insertInventorySchema,
	inventoryEntrySchema,
	insertOrderSchema,
	orderEntrySchema,
	orderItemEntrySchema,
	loginSchema,
	registerSchema,
	createUserSchema,
	type User,
} from "../shared/schema.js";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import {
	authenticate,
	authorize,
	hashPassword,
	comparePassword,
	generateToken,
	getCurrentUser,
} from "./auth.js";
import { type RowDataPacket } from "mysql2";

// Add type for inventory entry
interface InventoryEntry {
	bottleSize: string;
	totalQuantity: number;
}

// Add type for order item
interface OrderItem {
	quantity: number;
	pricePerUnit: number;
	bottleSize: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
	const apiRouter = express.Router();

	// Dashboard stats endpoint
	apiRouter.get(
		"/dashboard",
		authenticate,
		async (req: Request, res: Response) => {
			try {
				const stats = await storage.getDashboardStats();
				const recentOrders = await storage.getRecentOrders(5);
				const inventory = await storage.getAllInventory();

				res.json({
					stats,
					recentOrders,
					inventory,
				});
			} catch (error) {
				console.error("Error fetching dashboard data:", error);
				res.status(500).json({ message: "Failed to fetch dashboard data" });
			}
		}
	);

	// Inventory history endpoint
	apiRouter.get(
		"/inventory/history",
		authenticate,
		async (req: Request, res: Response) => {
			try {
				const { start, end } = req.query;
				console.log("Inventory History API received request with params:", {
					start,
					end,
				});

				const startDate = start ? new Date(start as string) : undefined;
				const endDate = end ? new Date(end as string) : undefined;

				const inventoryHistory = await storage.getInventoryHistory(
					startDate,
					endDate
				);
				console.log(
					"Found",
					inventoryHistory.length,
					"inventory track entries"
				);

				// Group inventory data by bottle size and calculate totals
				const groupedData = inventoryHistory.reduce(
					(acc: Record<string, any>, entry) => {
						const bottleSize = entry.bottleSize;

						if (!acc[bottleSize]) {
							acc[bottleSize] = {
								bottleSize: bottleSize,
								totalQuantity: 0,
							};
						}

						// Add the totalQuantity to the total for this bottle size
						acc[bottleSize].totalQuantity += Number(entry.totalQuantity);

						return acc;
					},
					{}
				);

				// Convert grouped data to array and sort by bottle size
				const result = Object.values(groupedData).sort((a: any, b: any) =>
					a.bottleSize.localeCompare(b.bottleSize)
				);

				console.log("Grouped inventory data:", result);
				res.json(result);
			} catch (error) {
				console.error("Error fetching inventory history:", error);
				res.status(500).json({ message: "Failed to fetch inventory history" });
			}
		}
	);

	// Regular inventory endpoint
	apiRouter.get(
		"/inventory",
		authenticate,
		async (req: Request, res: Response) => {
			try {
				const inventory = await storage.getAllInventory();
				res.json(inventory);
			} catch (error) {
				console.error("Error fetching inventory:", error);
				res.status(500).json({ message: "Failed to fetch inventory" });
			}
		}
	);

	apiRouter.post(
		"/inventory",
		authenticate,
		authorize(["admin", "inventory", "manager"]),
		async (req: Request, res: Response) => {
			try {
				const validatedData = inventoryEntrySchema.parse(req.body);

				// Check if inventory for this bottle size already exists
				const existingInventory = await storage.getInventoryByBottleSize(
					validatedData.bottleSize
				);

				if (existingInventory) {
					// Update existing inventory
					const newTotalQuantity =
						existingInventory.totalQuantity + validatedData.quantity;
					const newInStock = existingInventory.inStock + validatedData.quantity;

					const updatedInventory = await storage.updateInventory(
						existingInventory.id,
						{
							totalQuantity: newTotalQuantity,
							inStock: newInStock,
							pricePerUnit: String(validatedData.pricePerUnit),
							entryTime: new Date(validatedData.entryTime),
						}
					);

					res.json(updatedInventory);
				} else {
					// Create new inventory
					const newInventory = await storage.createInventory({
						bottleSize: validatedData.bottleSize,
						totalQuantity: validatedData.quantity,
						inStock: validatedData.quantity,
						pricePerUnit: String(validatedData.pricePerUnit),
						entryTime: new Date(validatedData.entryTime),
					});

					res.status(201).json(newInventory);
				}

				// Update dashboard stats
				await storage.updateDashboardStats();
			} catch (error) {
				if (error instanceof z.ZodError) {
					const validationError = fromZodError(error);
					res.status(400).json({ message: validationError.message });
				} else {
					console.error("Error creating/updating inventory:", error);
					res
						.status(500)
						.json({ message: "Failed to create/update inventory" });
				}
			}
		}
	);

	apiRouter.put(
		"/inventory/:id",
		authenticate,
		authorize(["admin", "inventory", "manager"]),
		async (req: Request, res: Response): Promise<Response> => {
			try {
				const id = parseInt(req.params.id ?? "");
				if (isNaN(id)) {
					return res.status(400).json({ message: "Invalid ID format" });
				}
				const data = req.body;

				const updatedInventory = await storage.updateInventory(id, data);

				if (!updatedInventory) {
					return res.status(404).json({ message: "Inventory not found" });
				}

				// Update dashboard stats
				await storage.updateDashboardStats();
				return res.json(updatedInventory);
			} catch (error) {
				console.error("Error updating inventory:", error);
				return res.status(500).json({ message: "Failed to update inventory" });
			}
		}
	);

	// Order endpoints
	apiRouter.get(
		"/orders",
		authenticate,
		async (req: Request, res: Response) => {
			try {
				const { start, end } = req.query;

				console.log(`Orders API received request with params:`, { start, end });

				if (start && end) {
					const startDate = new Date(start as string);
					const endDate = new Date(end as string);

					// Format dates for direct inclusion in query
					const formattedStartDate = startDate.toISOString().split("T")[0];
					const formattedEndDate = endDate.toISOString().split("T")[0];

					console.log(`Formatted dates for query:`, {
						formattedStartDate,
						formattedEndDate,
					});

					// Use MySQL-compatible date comparison
					const query = `
          SELECT 
            o.customer_name as merchant,
            SUM(oi.quantity) as total_quantity,
            SUM(oi.quantity * oi.price_per_unit) as total_sales
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE DATE(o.order_date) >= DATE(?)
            AND DATE(o.order_date) <= DATE(?)
          GROUP BY o.customer_name
          ORDER BY total_sales DESC`;

					const [result] = await pool.execute<RowDataPacket[]>(query, [
						formattedStartDate,
						formattedEndDate,
					]);
					res.json(result);
				} else {
					const orders = await storage.getAllOrders();
					res.json(orders);
				}
			} catch (error) {
				console.error("Error fetching orders:", error);
				res.status(500).json({ message: "Failed to fetch orders" });
			}
		}
	);

	apiRouter.get(
		"/orders/:id",
		authenticate,
		async (req: Request, res: Response): Promise<Response> => {
			try {
				const id = parseInt(req.params.id ?? "");
				if (isNaN(id)) {
					return res.status(400).json({ message: "Invalid ID format" });
				}
				const order = await storage.getOrderWithItems(id);

				if (!order) {
					return res.status(404).json({ message: "Order not found" });
				}

				return res.json(order);
			} catch (error) {
				console.error("Error fetching order:", error);
				return res.status(500).json({ message: "Failed to fetch order" });
			}
		}
	);

	apiRouter.post(
		"/orders",
		authenticate,
		authorize(["admin", "manager"]),
		async (req: Request, res: Response) => {
			try {
				const orderData = orderEntrySchema.parse(req.body);

				// Create the order
				const order = await storage.createOrder({
					orderNumber: generateOrderNumber(),
					customerName: orderData.customerName,
					orderDate: new Date(orderData.orderDate),
					status: "in_progress",
					notes: orderData.notes,
					total: String(
						orderData.items.reduce(
							(sum, item) => sum + item.quantity * item.pricePerUnit,
							0
						)
					),
					entryTime: new Date(),
				});

				// Create order items
				for (const item of orderData.items) {
					await storage.createOrderItem({
						orderId: order.id,
						bottleSize: item.bottleSize,
						quantity: item.quantity,
						pricePerUnit: String(item.pricePerUnit),
						subtotal: String(item.quantity * item.pricePerUnit),
						entryTime: new Date(),
					});

					// Update inventory
					await storage.updateInventoryQuantity(
						item.bottleSize,
						item.quantity,
						"remove"
					);
				}

				// Update dashboard stats
				await storage.updateDashboardStats();

				res.status(201).json(order);
			} catch (error) {
				if (error instanceof z.ZodError) {
					const validationError = fromZodError(error);
					res.status(400).json({ message: validationError.message });
				} else {
					console.error("Error creating order:", error);
					res.status(500).json({ message: "Failed to create order" });
				}
			}
		}
	);

	apiRouter.put(
		"/orders/:id",
		authenticate,
		authorize(["admin", "manager"]),
		async (req: Request, res: Response): Promise<Response> => {
			try {
				const id = parseInt(req.params.id ?? "");
				if (isNaN(id)) {
					return res.status(400).json({ message: "Invalid ID format" });
				}
				const data = req.body;

				const updatedOrder = await storage.updateOrder(id, data);

				if (!updatedOrder) {
					return res.status(404).json({ message: "Order not found" });
				}

				// Update dashboard stats
				await storage.updateDashboardStats();
				return res.json(updatedOrder);
			} catch (error) {
				console.error("Error updating order:", error);
				return res.status(500).json({ message: "Failed to update order" });
			}
		}
	);

	// Sales data endpoints
	apiRouter.get("/sales", authenticate, async (req: Request, res: Response) => {
		try {
			const { start, end } = req.query;
			let filteredOrders: Array<{
				id: number;
				orderNumber?: string;
				customerName: string;
				orderDate: string | Date;
				status: string;
				notes?: string | null;
				total: string;
				createdAt?: string | Date;
			}> = [];
			let filteredSales: Array<{
				bottleSize: string;
				soldQuantity: number;
				revenue: number;
			}> = [];

			console.log(`Sales API received request with params:`, { start, end });

			if (start && end) {
				// Format dates for direct inclusion in query
				const startDate = new Date(start as string);
				const endDate = new Date(end as string);
				const formattedStartDate = startDate.toISOString().split("T")[0];
				const formattedEndDate = endDate.toISOString().split("T")[0];

				console.log(`Formatted dates for query:`, {
					formattedStartDate,
					formattedEndDate,
				});

				// 1. First get orders in date range
				const ordersQuery = `
          SELECT * FROM orders
          WHERE DATE(order_date) >= DATE(?)
          AND DATE(order_date) <= DATE(?)
        `;

				console.log(`Executing orders query: ${ordersQuery}`);

				const [ordersResult] = await pool.execute<RowDataPacket[]>(
					ordersQuery,
					[formattedStartDate, formattedEndDate]
				);
				console.log(`Query returned ${ordersResult.length} orders`);

				filteredOrders = ordersResult.map((row: any) => ({
					id: row.id,
					orderNumber: row.order_number,
					customerName: row.customer_name,
					orderDate: row.order_date,
					status: row.status,
					notes: row.notes,
					total: row.total,
					createdAt: row.created_at,
				}));

				// 2. Get order items for the filtered orders
				if (filteredOrders.length > 0) {
					const orderIds = filteredOrders
						.map((order: any) => order.id)
						.join(",");
					const itemsQuery = `
            SELECT 
              oi.bottle_size,
              SUM(oi.quantity) as quantity,
              oi.price_per_unit
            FROM order_items oi
            WHERE oi.order_id IN (${orderIds})
            GROUP BY oi.bottle_size, oi.price_per_unit
          `;

					console.log(`Executing order items query: ${itemsQuery}`);

					const [itemsResult] = await pool.execute<RowDataPacket[]>(itemsQuery);
					console.log(
						`Query returned ${itemsResult.length} bottle sizes with sales`
					);

					// Create filtered sales data based on the items sold in this date range
					filteredSales = itemsResult.map((row: any) => {
						const quantity = parseInt(row.quantity);
						const pricePerUnit = parseFloat(row.price_per_unit);
						return {
							bottleSize: row.bottle_size,
							soldQuantity: quantity,
							revenue: pricePerUnit * quantity,
						};
					});
				}
			} else {
				console.log("No date params, returning all orders and sales");
				filteredOrders = await storage.getAllOrders();

				// For default view without date filters, use the sales from inventory
				const inventory = await storage.getAllInventory();
				filteredSales = inventory.map((item) => ({
					bottleSize: item.bottleSize,
					soldQuantity: item.soldQuantity,
					revenue: Number(item.pricePerUnit) * item.soldQuantity,
				}));
			}

			// If no filtered sales were found in the date range, return empty sales data
			const salesByBottleSize = filteredSales.length > 0 ? filteredSales : [];

			// Calculate total sales from the filtered data
			const totalSales = salesByBottleSize.reduce(
				(sum, item) => sum + item.revenue,
				0
			);

			// Calculate sales trend (simplified) from the filtered orders
			const completedOrders = filteredOrders.filter(
				(order: any) => order.status === "completed"
			);
			const salesByDate = completedOrders.reduce(
				(acc: Record<string, number>, order: any) => {
					const date = new Date(order.orderDate).toISOString().split("T")[0];
					if (date) {
						acc[date] = (acc[date] || 0) + Number(order.total);
					}
					return acc;
				},
				{} as Record<string, number>
			);

			res.json({
				salesByBottleSize,
				totalSales,
				salesByDate,
			});
		} catch (error) {
			console.error("Error fetching sales data:", error);
			res.status(500).json({ message: "Failed to fetch sales data" });
		}
	});

	// Mount API router
	// Authentication routes
	apiRouter.post(
		"/auth/login",
		async (req: Request, res: Response): Promise<Response> => {
			try {
				const loginData = loginSchema.parse(req.body);
				const user = await storage.getUserByEmail(loginData.email);

				if (!user) {
					return res.status(401).json({ message: "Invalid credentials" });
				}

				const isValidPassword = await comparePassword(
					loginData.password,
					user.password
				);

				if (!isValidPassword) {
					return res.status(401).json({ message: "Invalid credentials" });
				}

				// Generate token with user data
				const token = await generateToken(user);

				// Send response with user data (excluding password)
				return res.json({
					token,
					user: {
						id: user.id,
						username: user.username,
						email: user.email,
						name: user.name,
						role: user.role,
					},
				});
			} catch (error) {
				console.error("Login error:", error);
				return res.status(500).json({ message: "Login failed" });
			}
		}
	);

	apiRouter.post(
		"/auth/register",
		authenticate,
		authorize(["admin"]),
		async (req: Request, res: Response): Promise<Response> => {
			try {
				const registerData = registerSchema.parse(req.body);
				const hashedPassword = await hashPassword(registerData.password);
				const currentUser = await getCurrentUser(req);
				const createdBy = currentUser ? currentUser.id : null;

				const user = await storage.createUser({
					username: registerData.username,
					email: registerData.email,
					password: hashedPassword,
					name: registerData.name,
					role: "inventory",
					createdBy,
					entryTime: new Date(),
				});

				return res.status(201).json({ ...user, password: undefined });
			} catch (error) {
				if (error instanceof z.ZodError) {
					const validationError = fromZodError(error);
					return res.status(400).json({ message: validationError.message });
				} else {
					console.error("Error creating user:", error);
					return res.status(500).json({ message: "Failed to create user" });
				}
			}
		}
	);

	// User management routes (admin only)
	apiRouter.get(
		"/users",
		authenticate,
		authorize(["admin"]),
		async (req: Request, res: Response) => {
			try {
				const users = await storage.getAllUsers();
				// Remove sensitive information before sending
				const sanitizedUsers = users.map(({ password, ...user }) => user);
				res.json(sanitizedUsers);
			} catch (error) {
				console.error("Error fetching users:", error);
				res.status(500).json({ message: "Failed to fetch users" });
			}
		}
	);

	apiRouter.post(
		"/users",
		authenticate,
		authorize(["admin"]),
		async (req: Request, res: Response): Promise<Response> => {
			try {
				const validatedData = createUserSchema.parse(req.body);

				// Check if email already exists
				const existingUserByEmail = await storage.getUserByEmail(
					validatedData.email
				);
				if (existingUserByEmail) {
					return res.status(400).json({ message: "Email already in use" });
				}

				// Check if username already exists
				const existingUserByUsername = await storage.getUserByUsername(
					validatedData.username
				);
				if (existingUserByUsername) {
					return res.status(400).json({ message: "Username already in use" });
				}

				// Hash the password before storing it
				const hashedPassword = await hashPassword(validatedData.password);

				// Get current user from JWT token
				const currentUser = await getCurrentUser(req);

				if (!currentUser) {
					return res.status(401).json({ message: "Authentication required" });
				}

				// Create user with specified role
				const user = await storage.createUser({
					username: validatedData.username,
					email: validatedData.email,
					password: hashedPassword,
					name: validatedData.name,
					role: validatedData.role,
					createdBy: currentUser.id,
				});

				// Return user data (excluding password)
				const { password, ...userData } = user;
				return res.status(201).json(userData);
			} catch (error) {
				if (error instanceof z.ZodError) {
					const validationError = fromZodError(error);
					return res.status(400).json({ message: validationError.message });
				} else {
					console.error("Error creating user:", error);
					return res.status(500).json({ message: "Failed to create user" });
				}
			}
		}
	);

	apiRouter.get(
		"/users/:id",
		authenticate,
		authorize(["admin"]),
		async (req: Request, res: Response): Promise<Response> => {
			try {
				const id = parseInt(req.params.id ?? "");
				if (isNaN(id)) {
					return res.status(400).json({ message: "Invalid ID format" });
				}
				const user = await storage.getUser(id);

				if (!user) {
					return res.status(404).json({ message: "User not found" });
				}

				// Remove sensitive information before sending
				const { password, ...userData } = user;
				return res.json(userData);
			} catch (error) {
				console.error("Error fetching user:", error);
				return res.status(500).json({ message: "Failed to fetch user" });
			}
		}
	);

	apiRouter.put(
		"/users/:id",
		authenticate,
		authorize(["admin"]),
		async (req: Request, res: Response): Promise<Response> => {
			try {
				const id = parseInt(req.params.id ?? "");
				if (isNaN(id)) {
					return res.status(400).json({ message: "Invalid ID format" });
				}
				const data = req.body;

				// Check if user exists
				const existingUser = await storage.getUser(id);
				if (!existingUser) {
					return res.status(404).json({ message: "User not found" });
				}

				// If email is being changed, check if it's already in use
				if (data.email && data.email !== existingUser.email) {
					const existingUserByEmail = await storage.getUserByEmail(data.email);
					if (existingUserByEmail) {
						return res.status(400).json({ message: "Email already in use" });
					}
				}

				// If username is being changed, check if it's already in use
				if (data.username && data.username !== existingUser.username) {
					const existingUserByUsername = await storage.getUserByUsername(
						data.username
					);
					if (existingUserByUsername) {
						return res.status(400).json({ message: "Username already in use" });
					}
				}

				// Check if role is valid
				if (data.role) {
					try {
						userRoleSchema.parse(data.role);
					} catch (error) {
						return res.status(400).json({ message: "Invalid role" });
					}
				}

				// Hash password if it's being updated
				let updatedData = { ...data, updatedAt: new Date() };
				if (data.password) {
					updatedData.password = await hashPassword(data.password);
				}

				// Update user
				const updatedUser = await storage.updateUser(id, updatedData);

				if (!updatedUser) {
					return res.status(404).json({ message: "User not found" });
				}

				// Remove sensitive information before sending
				const { password, ...userData } = updatedUser;
				return res.json(userData);
			} catch (error) {
				console.error("Error updating user:", error);
				return res.status(500).json({ message: "Failed to update user" });
			}
		}
	);

	apiRouter.delete(
		"/users/:id",
		authenticate,
		authorize(["admin"]),
		async (req: Request, res: Response): Promise<Response> => {
			try {
				const id = parseInt(req.params.id ?? "");
				if (isNaN(id)) {
					return res.status(400).json({ message: "Invalid ID format" });
				}

				// Check if user exists
				const existingUser = await storage.getUser(id);
				if (!existingUser) {
					return res.status(404).json({ message: "User not found" });
				}

				// Prevent deleting the last admin user
				if (existingUser.role === "admin") {
					const allUsers = await storage.getAllUsers();
					const adminCount = allUsers.filter(
						(user) => user.role === "admin"
					).length;

					if (adminCount <= 1) {
						return res
							.status(400)
							.json({ message: "Cannot delete the last admin user" });
					}
				}

				// Delete user
				const success = await storage.deleteUser(id);

				if (!success) {
					return res.status(500).json({ message: "Failed to delete user" });
				}

				return res.json({ message: "User deleted successfully" });
			} catch (error) {
				console.error("Error deleting user:", error);
				return res.status(500).json({ message: "Failed to delete user" });
			}
		}
	);

	// Get current user profile
	apiRouter.get(
		"/auth/me",
		authenticate,
		async (req: Request, res: Response): Promise<Response> => {
			try {
				const user = await getCurrentUser(req);

				if (!user) {
					return res.status(404).json({ message: "User not found" });
				}

				// Remove sensitive information before sending
				const { password, ...userData } = user;
				return res.json(userData);
			} catch (error) {
				console.error("Error fetching user profile:", error);
				return res
					.status(500)
					.json({ message: "Failed to fetch user profile" });
			}
		}
	);

	// Protected endpoints
	// Utility endpoint to clean up duplicate inventory entries (admin only)
	apiRouter.post(
		"/admin/cleanup-inventory",
		authenticate,
		authorize(["admin"]),
		async (req: Request, res: Response) => {
			try {
				await db.execute(/* sql */ `
        WITH unique_inventory AS (
          SELECT MIN(id) as id
          FROM inventory
          GROUP BY bottle_size
        )
        DELETE FROM inventory 
        WHERE id NOT IN (SELECT id FROM unique_inventory);
      `);

				const inventory = await storage.getAllInventory();
				return res.json({
					message: "Duplicate inventory entries removed",
					inventory,
				});
			} catch (error) {
				console.error("Error cleaning up inventory:", error);
				return res
					.status(500)
					.json({ message: "Failed to clean up inventory" });
			}
		}
	);

	app.use("/api", apiRouter);

	const httpServer = createServer(app);
	return httpServer;
}

function generateOrderNumber() {
	return `ORD-${Date.now()}`; // Example: Generates a unique order number based on the current timestamp
}
