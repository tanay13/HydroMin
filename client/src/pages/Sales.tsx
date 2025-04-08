import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	BarChart,
	Bar,
	PieChart,
	Pie,
	Cell,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
	LineChart,
	Line,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";

// Conversion rate from USD to INR (Indian Rupee)
const USD_TO_INR = 83.5; // 1 USD = 83.5 INR (approximate conversion rate)

// Function to convert USD to INR
const convertToRupees = (amountInUSD: number): number => {
	return amountInUSD * USD_TO_INR;
};

type TimeRange = "weekly" | "monthly" | "yearly";

interface SalesData {
	salesByBottleSize: Array<{
		bottleSize: string;
		soldQuantity: number;
		revenue: number;
	}>;
	salesByDate: Record<string, number>;
}

export default function Sales() {
	const [timeRange, setTimeRange] = useState<TimeRange>("weekly");

	// Fetch sales data
	const { data, isLoading } = useQuery<SalesData>({
		queryKey: ["sales"],
		queryFn: async () => {
			const response = await apiRequest("GET", "/api/sales");
			return response.json();
		},
	});

	// Chart colors
	const COLORS = ["#0078D4", "#2B88D8", "#50E6FF"];

	if (isLoading) {
		return (
			<div className="space-y-6">
				<h1 className="text-2xl font-bold text-neutral-700">Sales Analytics</h1>

				<Card>
					<CardHeader className="pb-2 pt-4 px-5 border-b border-neutral-200">
						<CardTitle className="text-base font-semibold text-neutral-500">
							<Skeleton className="h-6 w-40" />
						</CardTitle>
					</CardHeader>
					<CardContent className="p-5">
						<div className="h-80">
							<Skeleton className="h-full w-full" />
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	const salesByBottleSize = data?.salesByBottleSize || [];
	const salesByDate = data?.salesByDate || {};

	// Format data for charts
	const salesTrendData = Object.entries(salesByDate)
		.map(([date, value]) => ({
			date,
			sales: Number(value),
		}))
		.sort((a, b) => a.date.localeCompare(b.date));

	// For the pie chart
	const pieData = salesByBottleSize.map(
		(item: { bottleSize: string; revenue: number }) => ({
			name: item.bottleSize,
			value: Number(item.revenue),
		})
	);

	// For the bar chart
	const barData = salesByBottleSize.map(
		(item: { bottleSize: string; soldQuantity: number; revenue: number }) => ({
			name: item.bottleSize,
			sold: item.soldQuantity,
			revenue: Number(item.revenue),
		})
	);

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-bold text-neutral-700">Sales Analytics</h1>

			<Tabs defaultValue="overview">
				<TabsList>
					<TabsTrigger value="overview">Sales Overview</TabsTrigger>
					<TabsTrigger value="by-product">By Product</TabsTrigger>
					<TabsTrigger value="trends">Sales Trends</TabsTrigger>
				</TabsList>

				<TabsContent value="overview" className="mt-6">
					<Card>
						<CardHeader className="pb-2 pt-4 px-5 border-b border-neutral-200">
							<CardTitle className="text-base font-semibold text-neutral-500">
								Sales by Product
							</CardTitle>
						</CardHeader>
						<CardContent className="p-5">
							<div className="h-80">
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={pieData}
											cx="50%"
											cy="50%"
											labelLine={false}
											outerRadius={80}
											fill="#8884d8"
											dataKey="value"
											label={({ name, percent }) =>
												`${name} ${(percent * 100).toFixed(0)}%`
											}
										>
											{pieData.map((entry, index) => (
												<Cell
													key={`cell-${index}`}
													fill={COLORS[index % COLORS.length]}
												/>
											))}
										</Pie>
										<Tooltip />
										<Legend />
									</PieChart>
								</ResponsiveContainer>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="by-product" className="mt-6">
					<Card>
						<CardHeader className="pb-2 pt-4 px-5 border-b border-neutral-200">
							<CardTitle className="text-base font-semibold text-neutral-500">
								Sales and Quantity by Product
							</CardTitle>
						</CardHeader>
						<CardContent className="p-5">
							<div className="h-80">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={barData}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="name" />
										<YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
										<YAxis
											yAxisId="right"
											orientation="right"
											stroke="#82ca9d"
										/>
										<Tooltip />
										<Legend />
										<Bar
											yAxisId="left"
											dataKey="sold"
											fill="#8884d8"
											name="Quantity Sold"
										/>
										<Bar
											yAxisId="right"
											dataKey="revenue"
											fill="#82ca9d"
											name="Revenue (₹)"
										/>
									</BarChart>
								</ResponsiveContainer>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="trends" className="mt-6">
					<Card>
						<CardHeader className="pb-2 pt-4 px-5 border-b border-neutral-200">
							<CardTitle className="text-base font-semibold text-neutral-500">
								Sales Trends
							</CardTitle>
						</CardHeader>
						<CardContent className="p-5">
							<div className="h-80">
								<ResponsiveContainer width="100%" height="100%">
									<LineChart data={salesTrendData}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="date" />
										<YAxis />
										<Tooltip />
										<Legend />
										<Line
											type="monotone"
											dataKey="sales"
											stroke="#8884d8"
											name="Sales (₹)"
										/>
									</LineChart>
								</ResponsiveContainer>
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
