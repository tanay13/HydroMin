import { db } from "./db.js";
import * as schema from "@shared/schema.js";
import { hashPassword } from "./auth.js";

async function setupDatabase() {
	console.log("Setting up database schema...");

	try {
		// Drop existing tables and their dependencies first
		await db.execute(/* sql */ `
			DO $$ 
			DECLARE 
				r RECORD;
			BEGIN
				-- Drop all tables in the public schema
				FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
					EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
				END LOOP;

				-- Drop all sequences in the public schema
				FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
					EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequence_name) || ' CASCADE';
				END LOOP;
			END $$;
		`);

		// Create users table
		await db.execute(/* sql */ `
			CREATE TABLE users (
				id SERIAL PRIMARY KEY,
				username TEXT NOT NULL UNIQUE,
				email TEXT NOT NULL UNIQUE,
				password TEXT NOT NULL,
				name TEXT NOT NULL,
				role TEXT NOT NULL,
				created_by INTEGER,
				entry_time TIMESTAMP WITH TIME ZONE NOT NULL,
				created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
				updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
			);
		`);

		// Create admin user
		const hashedPassword = await hashPassword("password123");
		await db.insert(schema.users).values({
			username: "admin",
			email: "admin@example.com",
			password: hashedPassword,
			name: "System Administrator",
			role: "admin",
			entryTime: new Date(),
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		console.log("Database setup completed successfully!");
	} catch (error) {
		console.error("Error setting up database:", error);
		throw error;
	}
}

// Expose the setup function
export { setupDatabase };
