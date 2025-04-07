import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { type Request, type Response, type NextFunction } from "express";
import { storage } from "./storage.js";
import { type User, type UserRole } from "../shared/schema.js";
import { db } from "./db.js";
import { users } from "../shared/schema.js";
import { eq } from "drizzle-orm";

// Secret key for JWT - load from environment variable
const JWT_SECRET =
	process.env["JWT_SECRET"] || "water-bottle-inventory-jwt-secret";
const TOKEN_EXPIRY = "24h"; // Token expires in 24 hours

// Interface for JWT payload
interface JwtPayload {
	id: number;
	username: string;
	email: string;
	role: string;
	name: string;
}

// Hash a password
export async function hashPassword(password: string): Promise<string> {
	const salt = await bcrypt.genSalt(10);
	return bcrypt.hash(password, salt);
}

// Compare password with hashed password
export async function comparePassword(
	password: string,
	hash: string
): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

// Generate JWT token
export async function generateToken(user: User): Promise<string> {
	const payload: JwtPayload = {
		id: user.id,
		username: user.username,
		email: user.email,
		role: user.role,
		name: user.name,
	};
	return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

// Verify JWT token
export async function verifyToken(token: string): Promise<JwtPayload> {
	return new Promise((resolve, reject) => {
		jwt.verify(token, JWT_SECRET, (err, decoded) => {
			if (err) {
				reject(err);
			} else {
				resolve(decoded as JwtPayload);
			}
		});
	});
}

// Middleware to authenticate requests
export function authenticate(req: Request, res: Response, next: NextFunction) {
	const token = req.headers.authorization?.split(" ")[1];

	if (!token) {
		res.status(401).json({ message: "No token provided" });
		return;
	}

	verifyToken(token)
		.then(async (decodedToken) => {
			const user = await getUserById(decodedToken.id);
			if (!user) {
				res.status(401).json({ message: "Invalid token" });
				return;
			}
			(req as any).user = user;
			next();
		})
		.catch((err) => {
			console.error("Token verification error:", err);
			res.status(401).json({ message: "Invalid token" });
		});
}

// Middleware to check user role
export function authorize(allowedRoles: UserRole[]) {
	return function middleware(
		req: Request,
		res: Response,
		next: NextFunction
	): void {
		if (!(req as any).user) {
			res.status(401).json({ message: "Authentication required" });
			return;
		}

		const userRole = (req as any).user.role;

		if (!allowedRoles.includes(userRole as UserRole)) {
			res.status(403).json({ message: "Insufficient permissions" });
			return;
		}

		next();
	};
}

// Get current authenticated user
export async function getCurrentUser(req: Request): Promise<User | undefined> {
	const user = (req as any).user;
	if (!user) return undefined;
	return user;
}

// Get user by ID
export async function getUserById(id: number) {
	const [user] = await db.select().from(users).where(eq(users.id, id));
	return user;
}

// Helper function to check user role
export function requireRole(role: string) {
	return function middleware(
		req: Request,
		res: Response,
		next: NextFunction
	): void {
		if (!(req as any).user) {
			res.status(401).json({ message: "Authentication required" });
			return;
		}

		if ((req as any).user.role !== role) {
			res.status(403).json({ message: "Insufficient permissions" });
			return;
		}

		next();
	};
}
