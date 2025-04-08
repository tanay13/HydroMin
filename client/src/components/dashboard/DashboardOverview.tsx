import {
	ArrowDown,
	ArrowUp,
	Clock,
	FileText,
	Package,
	IndianRupee,
	Banknote,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Conversion rate from USD to INR (Indian Rupee)
const USD_TO_INR = 83.5; // 1 USD = 83.5 INR (approximate conversion rate)

// Function to convert USD to INR
const convertToRupees = (amountInUSD: number): number => {
	return amountInUSD * USD_TO_INR;
};

interface StatCardProps {
	title: string;
	value: string | number;
	icon: React.ReactNode;
	changePercent: number;
	isLoading?: boolean;
}

function StatCard({
	title,
	value,
	icon,
	changePercent,
	isLoading,
}: StatCardProps) {
	const isPositive = changePercent >= 0;

	return (
		<Card>
			<CardContent className="p-5">
				<div className="flex items-start justify-between">
					<div>
						<p className="text-muted-foreground text-sm">{title}</p>
						{isLoading ? (
							<Skeleton className="h-8 w-24 mt-1" />
						) : (
							<h3 className="text-2xl font-semibold mt-1">{value}</h3>
						)}
					</div>
					<div
						className={`p-2 rounded-md ${
							title === "Total Orders"
								? "bg-blue-50 text-primary"
								: title === "Pending Orders"
								? "bg-amber-50 text-warning"
								: title === "Total Sales"
								? "bg-green-50 text-success"
								: "bg-purple-50 text-purple-600"
						}`}
					>
						{icon}
					</div>
				</div>
				<div className="flex items-center mt-3 text-xs">
					<span
						className={`flex items-center ${
							isPositive ? "text-success" : "text-error"
						}`}
					>
						{isPositive ? (
							<ArrowUp className="h-3 w-3 mr-1" />
						) : (
							<ArrowDown className="h-3 w-3 mr-1" />
						)}
						{Math.abs(changePercent)}%
					</span>
					<span className="text-muted-foreground ml-2">vs last month</span>
				</div>
			</CardContent>
		</Card>
	);
}

interface DashboardOverviewProps {
	isLoading: boolean;
	stats: {
		totalOrders: number;
		pendingOrders: number;
		totalSales: number;
		inventoryValue: number;
	};
}

export default function DashboardOverview({
	isLoading,
	stats,
}: DashboardOverviewProps) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
			<StatCard
				title="Total Orders"
				value={stats.totalOrders}
				icon={<FileText className="h-5 w-5" />}
				changePercent={12}
				isLoading={isLoading}
			/>

			<StatCard
				title="Pending Orders"
				value={stats.pendingOrders}
				icon={<Clock className="h-5 w-5" />}
				changePercent={8}
				isLoading={isLoading}
			/>

			<StatCard
				title="Total Sales"
				value={`₹${stats.totalSales.toLocaleString()}`}
				icon={<IndianRupee className="h-5 w-5" />}
				changePercent={15}
				isLoading={isLoading}
			/>

			<StatCard
				title="Inventory Value"
				value={`₹${stats.inventoryValue.toLocaleString()}`}
				icon={<Package className="h-5 w-5" />}
				changePercent={-3}
				isLoading={isLoading}
			/>
		</div>
	);
}
