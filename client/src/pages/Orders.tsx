import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import OrderList from "@/components/orders/OrderList";
import OrderForm from "@/components/orders/OrderForm";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusIcon } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { OrderWithItems } from "@shared/schema";

export default function Orders() {
	const [activeTab, setActiveTab] = useState("all");

	// Fetch orders data
	const {
		data: orders,
		isLoading,
		refetch,
	} = useQuery<OrderWithItems[]>({
		queryKey: ["/api/orders"],
		refetchOnMount: true,
	});

	// Handle success after form submission
	const handleFormSuccess = async () => {
		// Invalidate and refetch queries to refresh the data
		await queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
		await queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
		await queryClient.invalidateQueries({ queryKey: ["/api/sales"] });

		// Force immediate refetch to get the latest data
		await refetch();

		// Switch to all orders tab
		setActiveTab("all");
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<h1 className="text-2xl font-bold text-neutral-700">
					Order Management
				</h1>
				<Button
					onClick={() => setActiveTab("new")}
					className="bg-primary text-white hover:bg-secondary"
				>
					<PlusIcon className="h-4 w-4 mr-2" />
					Create New Order
				</Button>
			</div>

			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList>
					<TabsTrigger value="all">All Orders</TabsTrigger>
					<TabsTrigger value="new">New Order</TabsTrigger>
				</TabsList>

				<TabsContent value="all" className="mt-6">
					<OrderList orders={orders || []} isLoading={isLoading} />
				</TabsContent>

				<TabsContent value="new" className="mt-6">
					<OrderForm
						onSuccess={handleFormSuccess}
						open={activeTab === "new"}
						onClose={() => setActiveTab("all")}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}
