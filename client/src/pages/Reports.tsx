import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Button } from "@/components/ui/button";
import { Printer, Download, Search } from "lucide-react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";

// Conversion rate from USD to INR (Indian Rupee)
const USD_TO_INR = 83.5; // 1 USD = 83.5 INR (approximate conversion rate)

// Function to convert USD to INR
const convertToRupees = (amountInUSD: number): number => {
	return amountInUSD * USD_TO_INR;
};

type ReportType = "inventory" | "sales" | "orders";

export default function Reports() {
	const queryClient = useQueryClient();
	const [reportType, setReportType] = useState<ReportType>("inventory");
	const [startDate, setStartDate] = useState<Date>();
	const [endDate, setEndDate] = useState<Date>();
	const [selectedDate, setSelectedDate] = useState<{
		start?: Date;
		end?: Date;
	}>({});
	const [startDateOpen, setStartDateOpen] = useState<boolean>(false);
	const [endDateOpen, setEndDateOpen] = useState<boolean>(false);

	// Update selectedDate when a user selects a date
	useEffect(() => {
		if (startDate) {
			setSelectedDate((prev) => ({ ...prev, start: startDate }));
		}
	}, [startDate]);

	useEffect(() => {
		if (endDate) {
			setSelectedDate((prev) => ({ ...prev, end: endDate }));
		}
	}, [endDate]);

	// Apply date filter only when user explicitly submits the filter
	const dateParams =
		selectedDate.start && selectedDate.end
			? // Add one day to end date to make it inclusive (end of day)
			  `?start=${selectedDate.start.toISOString()}&end=${
					selectedDate.end ? addDays(selectedDate.end, 1).toISOString() : ""
			  }`
			: "";

	// Handler for applying date filters
	const applyDateFilter = () => {
		if (startDate && endDate) {
			// Close date pickers when apply is clicked
			setStartDateOpen(false);
			setEndDateOpen(false);
		}
	};

	// Define types for our API responses
	interface InventoryItem {
		bottleSize: string;
		totalQuantity: number;
	}

	interface SalesData {
		salesByBottleSize: Array<{
			bottleSize: string;
			soldQuantity: number;
			revenue: number;
		}>;
		totalSales: number;
		salesByDate: Record<string, number>;
	}

	interface OrderData {
		merchant: string;
		total_quantity: number;
		total_sales: number;
	}

	type OrdersData = OrderData[];

	// Update the queries to use selectedDate instead of startDate/endDate
	const { data: inventory = [], isLoading: inventoryLoading } = useQuery<
		InventoryItem[]
	>({
		queryKey: ["/api/inventory/history", selectedDate],
		queryFn: async () => {
			const dateParams =
				selectedDate.start && selectedDate.end
					? `?start=${selectedDate.start.toISOString()}&end=${selectedDate.end.toISOString()}`
					: "";
			const response = await apiRequest(
				"GET",
				`/api/inventory/history${dateParams}`
			);
			const data = await response.json();
			return Array.isArray(data) ? data : [];
		},
		enabled: !!selectedDate.start && !!selectedDate.end,
	});

	const { data: sales, isLoading: salesLoading } = useQuery<SalesData>({
		queryKey: ["/api/sales", dateParams],
		queryFn: async () => {
			const response = await apiRequest("GET", `/api/sales${dateParams}`);
			const data = await response.json();
			return data;
		},
		enabled:
			reportType === "sales" && !!selectedDate.start && !!selectedDate.end,
	});

	const { data: ordersData, isLoading: ordersLoading } = useQuery<OrdersData>({
		queryKey: ["/api/orders", dateParams],
		queryFn: async () => {
			const response = await apiRequest("GET", `/api/orders${dateParams}`);
			const data = await response.json();
			return data;
		},
		enabled:
			reportType === "orders" && !!selectedDate.start && !!selectedDate.end,
	});

	// Transform the orders data to match expected format
	const orders: OrdersData = ordersData || [];

	// Generate report date information
	const today = new Date();
	const reportDate = format(today, "MMMM d, yyyy");

	// Generate dynamic report title
	const getReportTitle = () => {
		switch (reportType) {
			case "inventory":
				return "Inventory Status Report";
			case "sales":
				return "Sales Performance Report";
			case "orders":
				return "Order Summary Report";
			default:
				return "Report";
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<h1 className="text-2xl font-bold text-neutral-700">Reports</h1>

				<div className="flex flex-col sm:flex-row gap-3">
					<div className="flex gap-2">
						<Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
							<PopoverTrigger asChild>
								<Button variant="outline">
									{selectedDate.start
										? format(selectedDate.start, "MMM d, yyyy")
										: "Start Date"}
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-auto p-0" sideOffset={5}>
								<div className="p-2">
									<Calendar
										mode="single"
										selected={startDate}
										onSelect={setStartDate}
										initialFocus
									/>
								</div>
							</PopoverContent>
						</Popover>

						<Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
							<PopoverTrigger asChild>
								<Button variant="outline">
									{selectedDate.end
										? format(selectedDate.end, "MMM d, yyyy")
										: "End Date"}
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-auto p-0" sideOffset={5}>
								<div className="p-2">
									<Calendar
										mode="single"
										selected={endDate}
										onSelect={setEndDate}
										initialFocus
									/>
								</div>
							</PopoverContent>
						</Popover>

						<Button
							onClick={applyDateFilter}
							disabled={!startDate || !endDate}
							className="gap-1"
						>
							<Search className="h-4 w-4" />
							Apply Filter
						</Button>
					</div>
				</div>
			</div>

			<Tabs
				defaultValue="inventory"
				onValueChange={(value) => setReportType(value as ReportType)}
			>
				<TabsList>
					<TabsTrigger value="inventory">Inventory</TabsTrigger>
					<TabsTrigger value="sales">Sales</TabsTrigger>
					<TabsTrigger value="orders">Orders</TabsTrigger>
				</TabsList>

				<Card className="mt-6">
					<CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5 border-b border-neutral-200">
						<div>
							<CardTitle className="text-lg font-semibold text-neutral-500">
								{getReportTitle()}
							</CardTitle>
							<p className="text-sm text-muted-foreground">
								Generated on {reportDate}
							</p>
							{selectedDate.start && selectedDate.end && (
								<p className="text-sm text-muted-foreground">
									Period: {format(selectedDate.start, "MMM d, yyyy")} -{" "}
									{format(selectedDate.end, "MMM d, yyyy")}
								</p>
							)}
						</div>

						<div className="flex space-x-2">
							<Button variant="outline" size="sm" className="gap-1">
								<Printer className="h-4 w-4" />
								<span className="hidden sm:inline">Print</span>
							</Button>
							<Button variant="outline" size="sm" className="gap-1">
								<Download className="h-4 w-4" />
								<span className="hidden sm:inline">Export</span>
							</Button>
						</div>
					</CardHeader>

					<CardContent className="p-5">
						<TabsContent value="inventory" className="mt-0">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Bottle Size</TableHead>
										<TableHead>Total Produced</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{inventoryLoading ? (
										<TableRow>
											<TableCell colSpan={2} className="text-center">
												Loading...
											</TableCell>
										</TableRow>
									) : inventory.length === 0 ? (
										<TableRow>
											<TableCell colSpan={2} className="text-center">
												No inventory data found for the selected date range
											</TableCell>
										</TableRow>
									) : (
										<>
											{inventory.map((item: InventoryItem) => (
												<TableRow key={item.bottleSize}>
													<TableCell className="font-medium">
														{item.bottleSize}
													</TableCell>
													<TableCell>
														{(item.totalQuantity || 0).toLocaleString()}
													</TableCell>
												</TableRow>
											))}

											<TableRow>
												<TableCell className="font-bold">
													Total Bottles Produced
												</TableCell>
												<TableCell className="font-bold">
													{(
														inventory.reduce(
															(sum: number, item: InventoryItem) =>
																sum + (item.totalQuantity || 0),
															0
														) || 0
													).toLocaleString()}
												</TableCell>
											</TableRow>
										</>
									)}
								</TableBody>
							</Table>
						</TabsContent>

						<TabsContent value="sales" className="mt-0">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Bottle Size</TableHead>
										<TableHead>Sold Quantity</TableHead>
										<TableHead>Price Per Unit</TableHead>
										<TableHead className="text-right">Revenue</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{sales?.salesByBottleSize?.map((item) => (
										<TableRow key={item.bottleSize}>
											<TableCell className="font-medium">
												{item.bottleSize}
											</TableCell>
											<TableCell>
												{item.soldQuantity.toLocaleString()}
											</TableCell>
											<TableCell>
												₹{(item.revenue / item.soldQuantity).toFixed(2)}
											</TableCell>
											<TableCell className="text-right">
												₹
												{item.revenue.toLocaleString(undefined, {
													minimumFractionDigits: 2,
													maximumFractionDigits: 2,
												})}
											</TableCell>
										</TableRow>
									))}

									{sales?.salesByBottleSize &&
										sales.salesByBottleSize.length > 0 && (
											<TableRow>
												<TableCell colSpan={3} className="font-bold">
													Total
												</TableCell>
												<TableCell className="text-right font-bold">
													₹
													{sales.salesByBottleSize
														.reduce(
															(sum: number, item) => sum + item.revenue,
															0
														)
														.toLocaleString(undefined, {
															minimumFractionDigits: 2,
															maximumFractionDigits: 2,
														})}
												</TableCell>
											</TableRow>
										)}
								</TableBody>
							</Table>
						</TabsContent>

						<TabsContent value="orders" className="mt-0">
							{orders && orders.length > 0 ? (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Merchant</TableHead>
											<TableHead className="text-right">
												Total Quantity
											</TableHead>
											<TableHead className="text-right">
												Total Sales (₹)
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{orders.map((order: OrderData) => (
											<TableRow key={order.merchant}>
												<TableCell className="font-medium">
													{order.merchant}
												</TableCell>
												<TableCell className="text-right">
													{order.total_quantity.toLocaleString()}
												</TableCell>
												<TableCell className="text-right">
													₹
													{Number(order.total_sales).toLocaleString(undefined, {
														minimumFractionDigits: 2,
														maximumFractionDigits: 2,
													})}
												</TableCell>
											</TableRow>
										))}
										<TableRow>
											<TableCell className="font-bold">Total</TableCell>
											<TableCell className="text-right font-bold">
												{orders
													.reduce((sum, order) => {
														const quantity = Number(order.total_quantity);
														return sum + (isNaN(quantity) ? 0 : quantity);
													}, 0)
													.toLocaleString()}
											</TableCell>
											<TableCell className="text-right font-bold">
												₹
												{orders
													.reduce((sum, order) => {
														const sales = Number(order.total_sales);
														return sum + (isNaN(sales) ? 0 : sales);
													}, 0)
													.toLocaleString(undefined, {
														minimumFractionDigits: 2,
														maximumFractionDigits: 2,
													})}
											</TableCell>
										</TableRow>
									</TableBody>
								</Table>
							) : (
								<div className="text-center p-8">
									<p className="text-muted-foreground">
										No order data available for the selected period.
									</p>
									<p className="text-sm mt-2">
										Please select a date range to see merchant-wise sales data.
									</p>
								</div>
							)}
						</TabsContent>
					</CardContent>
				</Card>
			</Tabs>
		</div>
	);
}
