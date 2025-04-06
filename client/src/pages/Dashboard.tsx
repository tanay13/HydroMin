import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
	DashboardStats,
	Order,
	Inventory,
	OrderWithItems,
} from "@shared/schema";
import DashboardOverview from "@/components/dashboard/DashboardOverview";
import RecentOrders from "@/components/dashboard/RecentOrders";
import InventorySummary from "@/components/dashboard/InventorySummary";
import SalesAnalytics from "@/components/dashboard/SalesAnalytics";
import OrderForm from "@/components/orders/OrderForm";
import { apiRequest } from "@/lib/queryClient";

interface DashboardData {
	stats: {
		totalOrders: number;
		pendingOrders: number;
		totalSales: number;
		inventoryValue: number;
	};
	recentOrders: OrderWithItems[];
	inventory: Inventory[];
	salesByBottleSize: Array<{
		bottleSize: string;
		soldQuantity: number;
		revenue: number;
	}>;
	salesByDate: Record<string, number>;
}

export default function Dashboard() {
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [showInventoryForm, setShowInventoryForm] = useState(false);

	const { data, isLoading } = useQuery<DashboardData>({
		queryKey: ["dashboard"],
		queryFn: async () => {
			const [stats, recentOrders, inventory, salesData] = await Promise.all([
				apiRequest("GET", "/api/dashboard/stats").then((res) => res.json()),
				apiRequest("GET", "/api/orders/recent").then((res) => res.json()),
				apiRequest("GET", "/api/inventory").then((res) => res.json()),
				apiRequest("GET", "/api/sales/by-bottle-size").then((res) =>
					res.json()
				),
			]);

			return {
				stats: {
					totalOrders: Number(stats.totalOrders),
					pendingOrders: Number(stats.pendingOrders),
					totalSales: Number(stats.totalSales),
					inventoryValue: Number(stats.inventoryValue),
				},
				recentOrders: await Promise.all(
					recentOrders.map(async (order: Order) => {
						const items = await apiRequest(
							"GET",
							`/api/orders/${order.id}/items`
						).then((res) => res.json());
						return {
							...order,
							items,
						};
					})
				),
				inventory,
				salesByBottleSize: salesData,
				salesByDate: {},
			};
		},
	});

	const handleFormSuccess = () => {
		setIsFormOpen(false);
		setShowInventoryForm(false);
	};

	if (isLoading) {
		return <div>Loading...</div>;
	}

	return (
		<div className="space-y-6">
			<DashboardOverview
				stats={
					data?.stats || {
						totalOrders: 0,
						pendingOrders: 0,
						totalSales: 0,
						inventoryValue: 0,
					}
				}
				isLoading={isLoading}
			/>
			<RecentOrders orders={data?.recentOrders || []} isLoading={isLoading} />
			<InventorySummary
				inventory={data?.inventory || []}
				isLoading={isLoading}
				onAddInventory={() => setShowInventoryForm(true)}
			/>
			<SalesAnalytics
				salesByBottleSize={data?.salesByBottleSize || []}
				salesByDate={data?.salesByDate || {}}
				isLoading={isLoading}
			/>
			<OrderForm
				open={isFormOpen}
				onClose={() => setIsFormOpen(false)}
				onSuccess={handleFormSuccess}
			/>
		</div>
	);
}
