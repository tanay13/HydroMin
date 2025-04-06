import { useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const loginSchema = z.object({
	email: z.string().email("Please enter a valid email address"),
	password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
	const [isLoading, setIsLoading] = useState(false);
	const [, navigate] = useLocation();
	const { toast } = useToast();
	const { login } = useAuth();

	const form = useForm<LoginFormValues>({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	});

	const onSubmit = async (data: LoginFormValues) => {
		setIsLoading(true);
		try {
			console.log("Attempting login with:", { email: data.email });

			const response = await fetch("/api/auth/login", {
				method: "POST",
				body: JSON.stringify(data),
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				credentials: "include",
				mode: "cors",
			});

			console.log("Login response status:", response.status);
			console.log(
				"Response headers:",
				Object.fromEntries(response.headers.entries())
			);

			// Try to parse the response as JSON
			let responseData;
			try {
				const responseText = await response.text();
				console.log("Raw response:", responseText);

				if (!responseText) {
					throw new Error("Empty response from server");
				}

				responseData = JSON.parse(responseText);
			} catch (parseError) {
				console.error("Failed to parse response as JSON:", parseError);
				throw new Error("Server returned an invalid response format");
			}

			if (!response.ok) {
				console.error("Login error response:", responseData);
				throw new Error(
					responseData.details ||
						responseData.message ||
						`Login failed with status ${response.status}`
				);
			}

			console.log("Login response received:", {
				hasToken: !!responseData.token,
				hasUser: !!responseData.user,
				userRole: responseData.user?.role,
			});

			if (responseData.token && responseData.user) {
				// Use the login function from AuthContext
				login(responseData.token, responseData.user);

				// Toast notification
				toast({
					title: "Login successful",
					description: `Welcome back, ${responseData.user.name}!`,
				});

				// Navigate to dashboard
				navigate("/");
			} else {
				console.error("Invalid login response structure:", responseData);
				throw new Error("Invalid response format from server");
			}
		} catch (error) {
			console.error("Login error:", error);
			toast({
				title: "Login failed",
				description:
					error instanceof Error
						? error.message
						: "An unexpected error occurred",
				variant: "destructive",
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="flex items-center justify-center min-h-screen bg-neutral-50">
			<Card className="w-full max-w-md mx-4">
				<CardHeader className="space-y-1">
					<CardTitle className="text-2xl font-bold text-center">
						Water Bottle Management System
					</CardTitle>
					<CardDescription className="text-center">
						Enter your credentials to sign in to your account
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Email</FormLabel>
										<FormControl>
											<Input placeholder="your.email@example.com" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="password"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Password</FormLabel>
										<FormControl>
											<Input
												type="password"
												placeholder="••••••••"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<Button type="submit" className="w-full" disabled={isLoading}>
								{isLoading ? "Signing in..." : "Sign In"}
							</Button>
						</form>
					</Form>

					<div className="mt-6 text-center text-sm text-gray-500">
						<p>Demo Credentials:</p>
						<p>Admin: admin@example.com / password123</p>
						<p>User: user@example.com / password123</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
