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
		id: number;
		bottleSize: string;
		totalQuantity: number;
		inStock: number;
		soldQuantity: number;
		pricePerUnit: string;
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

	type OrdersData = Record<string, Record<string, number>>;

	// Update the queries to use selectedDate instead of startDate/endDate
	const { data: inventory, isLoading: inventoryLoading } = useQuery<
		InventoryItem[]
	>({
		queryKey: ["/api/inventory/history", dateParams],
		queryFn: async () => {
			const response = await fetch(`/api/inventory/history${dateParams}`);
			const data = await response.json();
			return Array.isArray(data) ? data : [];
		},
		enabled:
			reportType === "inventory" && !!selectedDate.start && !!selectedDate.end,
	});

	const { data: sales, isLoading: salesLoading } = useQuery<SalesData>({
		queryKey: ["/api/sales", dateParams],
		queryFn: () => fetch(`/api/sales${dateParams}`).then((res) => res.json()),
		enabled:
			reportType === "sales" && !!selectedDate.start && !!selectedDate.end,
	});

	const { data: ordersData, isLoading: ordersLoading } = useQuery<OrdersData>({
		queryKey: ["/api/orders", dateParams],
		queryFn: () => fetch(`/api/orders${dateParams}`).then((res) => res.json()),
		enabled:
			reportType === "orders" && !!selectedDate.start && !!selectedDate.end,
	});

	// Transform the orders data to match expected format
	const orders: OrdersData = ordersData || {};

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
										<TableHead>Total Quantity</TableHead>
										<TableHead>In Stock</TableHead>
										<TableHead>Sold</TableHead>
										<TableHead>Stock Level %</TableHead>
										<TableHead className="text-right">Value</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{inventoryLoading ? (
										<TableRow>
											<TableCell colSpan={6} className="text-center py-4">
												Loading...
											</TableCell>
										</TableRow>
									) : !inventory || inventory.length === 0 ? (
										<TableRow>
											<TableCell colSpan={6} className="text-center py-4">
												No inventory data found for the selected period
											</TableCell>
										</TableRow>
									) : (
										<>
											{inventory.map((item: InventoryItem) => {
												const stockPercentage = Math.round(
													(item.inStock / item.totalQuantity) * 100
												);
												const value = Number(item.pricePerUnit) * item.inStock;

												return (
													<TableRow key={item.id}>
														<TableCell className="font-medium">
															{item.bottleSize}
														</TableCell>
														<TableCell>
															{item.totalQuantity.toLocaleString()}
														</TableCell>
														<TableCell>
															{item.inStock.toLocaleString()}
														</TableCell>
														<TableCell>
															{item.soldQuantity.toLocaleString()}
														</TableCell>
														<TableCell>
															<span
																className={
																	stockPercentage < 30
																		? "text-warning font-medium"
																		: ""
																}
															>
																{stockPercentage}%
															</span>
														</TableCell>
														<TableCell className="text-right">
															₹
															{value.toLocaleString(undefined, {
																minimumFractionDigits: 2,
																maximumFractionDigits: 2,
															})}
														</TableCell>
													</TableRow>
												);
											})}

											<TableRow>
												<TableCell colSpan={5} className="font-bold">
													Total
												</TableCell>
												<TableCell className="text-right font-bold">
													₹
													{inventory
														.reduce(
															(sum: number, item: InventoryItem) =>
																sum + Number(item.pricePerUnit) * item.inStock,
															0
														)
														.toLocaleString(undefined, {
															minimumFractionDigits: 2,
															maximumFractionDigits: 2,
														})}
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
							{orders && Object.keys(orders).length > 0 ? (
								<div className="space-y-8">
									{Object.entries(orders).map(([customerName, bottleSizes]) => (
										<div
											key={customerName}
											className="bg-neutral-50 p-4 rounded-md"
										>
											<h3 className="text-lg font-semibold mb-3">
												Customer: {customerName}
											</h3>
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>Bottle Size</TableHead>
														<TableHead className="text-right">
															Quantity
														</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{Object.entries(
														bottleSizes as Record<string, number>
													).map(([bottleSize, quantity]) => (
														<TableRow key={bottleSize}>
															<TableCell className="font-medium">
																{bottleSize}
															</TableCell>
															<TableCell className="text-right">
																{quantity}
															</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										</div>
									))}
								</div>
							) : (
								<div className="text-center p-8">
									<p className="text-muted-foreground">
										No order data available for the selected period.
									</p>
									<p className="text-sm mt-2">
										Please select a date range to see bottle orders by customer.
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
