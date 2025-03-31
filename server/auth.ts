import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { User, UserRole } from '@shared/schema';

// Secret key for JWT - load from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'water-bottle-inventory-jwt-secret';
const TOKEN_EXPIRY = '24h'; // Token expires in 24 hours

// Interface for JWT payload
interface JwtPayload {
  userId: number;
  username: string;
  email: string;
  role: string;
}

// Hash a password
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Compare password with hashed password
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Generate JWT token
export function generateToken(user: User): string {
  const payload: JwtPayload = {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

// Verify JWT token
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    return null;
  }
}

// Middleware to authenticate requests
export function authenticate(req: Request, res: Response, next: NextFunction) {
  // Get token from header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  // Verify token
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
  
  // Attach user to request for use in route handlers
  (req as any).user = decoded;
  next();
}

// Middleware to check user role
export function authorize(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const userRole = (req as any).user.role;
    
    if (!allowedRoles.includes(userRole as UserRole)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    next();
  };
}

// Get current authenticated user
export async function getCurrentUser(req: Request): Promise<User | undefined> {
  const user = (req as any).user;
  if (!user) return undefined;
  
  return storage.getUser(user.userId);
}