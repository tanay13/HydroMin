import express, {
	type Express,
	Request,
	Response,
	NextFunction,
} from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db, pool } from "./db";
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
} from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import {
	authenticate,
	authorize,
	hashPassword,
	comparePassword,
	generateToken,
	getCurrentUser,
} from "./auth";

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

				console.log(`Inventory History API received request with params:`, {
					start,
					end,
				});

				if (!start || !end) {
					console.log("Missing start or end date parameters");
					return res
						.status(400)
						.json({ message: "Start and end dates are required" });
				}

				const startDate = new Date(start as string);
				const endDate = new Date(end as string);

				// Format dates for direct inclusion in query
				const formattedStartDate = startDate.toISOString().split("T")[0];
				const formattedEndDate = endDate.toISOString().split("T")[0];

				console.log(`Formatted dates for query:`, {
					formattedStartDate,
					formattedEndDate,
				});

				// Query inventory items based on entryTime
				const query = `
        SELECT 
          i.id,
          i.bottle_size,
          i.total_quantity,
          i.in_stock,
          i.sold_quantity,
          i.price_per_unit,
          i.entry_time
        FROM inventory i
        WHERE i.entry_time::date >= '${formattedStartDate}'::date 
        AND i.entry_time::date <= '${formattedEndDate}'::date
        ORDER BY i.entry_time DESC
      `;

				console.log(`Executing query: ${query}`);

				const result = await db.execute(query);

				console.log(`Query returned ${result.rows.length} inventory items`);

				if (result.rows.length === 0) {
					// No inventory items in this period
					return res.json([]);
				}

				return res.json(result.rows);
			} catch (error) {
				console.error("Error fetching inventory history:", error);
				return res
					.status(500)
					.json({ message: "Error fetching inventory history" });
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
		async (req: Request, res: Response) => {
			try {
				const id = parseInt(req.params.id);
				const data = req.body;

				const updatedInventory = await storage.updateInventory(id, data);

				if (!updatedInventory) {
					return res.status(404).json({ message: "Inventory not found" });
				}

				res.json(updatedInventory);

				// Update dashboard stats
				await storage.updateDashboardStats();
			} catch (error) {
				console.error("Error updating inventory:", error);
				res.status(500).json({ message: "Failed to update inventory" });
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

					// Use direct string interpolation instead of parameter binding
					const query = `
          SELECT 
            oi.bottle_size, 
            SUM(oi.quantity) as total_quantity, 
            o.customer_name,
            o.order_date
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE o.order_date::date >= '${formattedStartDate}'::date
          AND o.order_date::date <= '${formattedEndDate}'::date
          GROUP BY oi.bottle_size, o.customer_name, o.order_date
          ORDER BY o.order_date
        `;

					console.log(`Executing query: ${query}`);

					const result = await db.execute(query);

					console.log(`Query returned ${result.rows.length} order records`);

					// Transform query results to include customer information
					const orderDetailsByCustomer: Record<string, any> = {};

					result.rows.forEach((row: any) => {
						const customerName = row.customer_name;
						const bottleSize = row.bottle_size;
						const quantity = parseInt(row.total_quantity);

						if (!orderDetailsByCustomer[customerName]) {
							orderDetailsByCustomer[customerName] = {};
						}

						orderDetailsByCustomer[customerName][bottleSize] = quantity;
					});

					return res.json(orderDetailsByCustomer);
				}

				// If no date range provided, return all orders with items
				const orders = await storage.getAllOrders();
				// For each order, get its items as well
				const ordersWithItems = await Promise.all(
					orders.map(async (order) => {
						const items = await storage.getOrderItemsByOrderId(order.id);
						return {
							...order,
							items,
						};
					})
				);
				res.json(ordersWithItems);
			} catch (error) {
				console.error("Error fetching orders:", error);
				res.status(500).json({ message: "Failed to fetch orders" });
			}
		}
	);

	apiRouter.get(
		"/orders/:id",
		authenticate,
		async (req: Request, res: Response) => {
			try {
				const id = parseInt(req.params.id);
				const order = await storage.getOrderWithItems(id);

				if (!order) {
					return res.status(404).json({ message: "Order not found" });
				}

				res.json(order);
			} catch (error) {
				console.error("Error fetching order:", error);
				res.status(500).json({ message: "Failed to fetch order" });
			}
		}
	);

	apiRouter.post(
		"/orders",
		authenticate,
		async (req: Request, res: Response) => {
			try {
				const validatedData = orderEntrySchema.parse(req.body);

				// Calculate total
				let total = 0;
				for (const item of validatedData.items) {
					total += item.quantity * item.pricePerUnit;
				}

				// Create order
				const order = await storage.createOrder({
					customerName: validatedData.customerName,
					orderDate: new Date(validatedData.orderDate),
					status: "in_progress",
					notes: validatedData.notes,
					total: String(total),
					entryTime: new Date(validatedData.orderDate),
				});

				// Create order items
				for (const item of validatedData.items) {
					const subtotal = item.quantity * item.pricePerUnit;
					await storage.createOrderItem({
						orderId: order.id,
						bottleSize: item.bottleSize,
						quantity: item.quantity,
						pricePerUnit: String(item.pricePerUnit),
						subtotal: String(subtotal),
						entryTime: new Date(validatedData.orderDate),
					});
				}

				// Get full order with items
				const fullOrder = await storage.getOrderWithItems(order.id);

				// Update dashboard stats
				await storage.updateDashboardStats();

				res.status(201).json(fullOrder);
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

	apiRouter.patch(
		"/orders/:id/status",
		authenticate,
		async (req: Request, res: Response) => {
			try {
				const id = parseInt(req.params.id);
				const { status } = req.body;

				// Validate status
				const validatedStatus = orderStatusSchema.parse(status);

				// Update order status
				const updatedOrder = await storage.updateOrderStatus(
					id,
					validatedStatus
				);

				if (!updatedOrder) {
					return res.status(404).json({ message: "Order not found" });
				}

				// Update dashboard stats
				await storage.updateDashboardStats();

				res.json(updatedOrder);
			} catch (error) {
				if (error instanceof z.ZodError) {
					const validationError = fromZodError(error);
					res.status(400).json({ message: validationError.message });
				} else {
					console.error("Error updating order status:", error);
					res.status(500).json({ message: "Failed to update order status" });
				}
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
          WHERE order_date::date >= '${formattedStartDate}'::date
          AND order_date::date <= '${formattedEndDate}'::date
        `;

				console.log(`Executing orders query: ${ordersQuery}`);

				const ordersResult = await db.execute(ordersQuery);
				console.log(`Query returned ${ordersResult.rows.length} orders`);

				filteredOrders = ordersResult.rows.map((row: any) => ({
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

					const itemsResult = await db.execute(itemsQuery);
					console.log(
						`Query returned ${itemsResult.rows.length} bottle sizes with sales`
					);

					// Create filtered sales data based on the items sold in this date range
					filteredSales = itemsResult.rows.map((row: any) => {
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
					acc[date] = (acc[date] || 0) + Number(order.total);
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
	apiRouter.post("/auth/login", async (req: Request, res: Response) => {
		try {
			const validatedData = loginSchema.parse(req.body);

			// Find user by email
			const user = await storage.getUserByEmail(validatedData.email);

			if (!user) {
				return res.status(401).json({ message: "Invalid email or password" });
			}

			// Check password using bcrypt
			const passwordIsValid = await comparePassword(
				validatedData.password,
				user.password
			);

			if (!passwordIsValid) {
				return res.status(401).json({ message: "Invalid email or password" });
			}

			// Generate JWT token
			const token = generateToken(user);

			// Return user data and token (excluding password)
			const { password, ...userData } = user;
			res.json({
				user: userData,
				token,
			});
		} catch (error) {
			if (error instanceof z.ZodError) {
				const validationError = fromZodError(error);
				res.status(400).json({ message: validationError.message });
			} else {
				console.error("Error during login:", error);
				res.status(500).json({ message: "Login failed" });
			}
		}
	});

	apiRouter.post("/auth/register", async (req: Request, res: Response) => {
		try {
			const validatedData = registerSchema.parse(req.body);

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

			// Create user with default role of "inventory"
			const user = await storage.createUser({
				username: validatedData.username,
				email: validatedData.email,
				password: hashedPassword,
				name: validatedData.name,
				role: "inventory",
			});

			// Generate token
			const token = generateToken(user);

			// Return user data and token (excluding password)
			const { password, ...userData } = user;
			res.status(201).json({
				user: userData,
				token,
			});
		} catch (error) {
			if (error instanceof z.ZodError) {
				const validationError = fromZodError(error);
				res.status(400).json({ message: validationError.message });
			} else {
				console.error("Error during registration:", error);
				res.status(500).json({ message: "Registration failed" });
			}
		}
	});

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
		async (req: Request, res: Response) => {
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
				res.status(201).json(userData);
			} catch (error) {
				if (error instanceof z.ZodError) {
					const validationError = fromZodError(error);
					res.status(400).json({ message: validationError.message });
				} else {
					console.error("Error creating user:", error);
					res.status(500).json({ message: "Failed to create user" });
				}
			}
		}
	);

	apiRouter.get(
		"/users/:id",
		authenticate,
		authorize(["admin"]),
		async (req: Request, res: Response) => {
			try {
				const id = parseInt(req.params.id);
				const user = await storage.getUser(id);

				if (!user) {
					return res.status(404).json({ message: "User not found" });
				}

				// Remove sensitive information before sending
				const { password, ...userData } = user;
				res.json(userData);
			} catch (error) {
				console.error("Error fetching user:", error);
				res.status(500).json({ message: "Failed to fetch user" });
			}
		}
	);

	apiRouter.put(
		"/users/:id",
		authenticate,
		authorize(["admin"]),
		async (req: Request, res: Response) => {
			try {
				const id = parseInt(req.params.id);
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
				res.json(userData);
			} catch (error) {
				console.error("Error updating user:", error);
				res.status(500).json({ message: "Failed to update user" });
			}
		}
	);

	apiRouter.delete(
		"/users/:id",
		authenticate,
		authorize(["admin"]),
		async (req: Request, res: Response) => {
			try {
				const id = parseInt(req.params.id);

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

				res.json({ message: "User deleted successfully" });
			} catch (error) {
				console.error("Error deleting user:", error);
				res.status(500).json({ message: "Failed to delete user" });
			}
		}
	);

	// Get current user profile
	apiRouter.get(
		"/auth/me",
		authenticate,
		async (req: Request, res: Response) => {
			try {
				const user = await getCurrentUser(req);

				if (!user) {
					return res.status(404).json({ message: "User not found" });
				}

				// Remove sensitive information before sending
				const { password, ...userData } = user;
				res.json(userData);
			} catch (error) {
				console.error("Error fetching user profile:", error);
				res.status(500).json({ message: "Failed to fetch user profile" });
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
