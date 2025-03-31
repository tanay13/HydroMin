import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardOverview from "@/components/dashboard/DashboardOverview";
import RecentOrders from "@/components/dashboard/RecentOrders";
import InventorySummary from "@/components/dashboard/InventorySummary";
import SalesAnalytics from "@/components/dashboard/SalesAnalytics";
import OrderForm from "@/components/orders/OrderForm";
import InventoryForm from "@/components/inventory/InventoryForm";
import { queryClient } from "@/lib/queryClient";

export default function Dashboard() {
  const [showInventoryForm, setShowInventoryForm] = useState(false);
  
  // Fetch dashboard data
  const { data, isLoading } = useQuery({
    queryKey: ['/api/dashboard'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  // Fetch sales data
  const { data: salesData, isLoading: isLoadingSales } = useQuery({
    queryKey: ['/api/sales'],
  });
  
  // Handle success after form submission
  const handleFormSuccess = () => {
    // Invalidate queries to refresh the data
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
    queryClient.invalidateQueries({ queryKey: ['/api/sales'] });
  };
  
  return (
    <div className="space-y-6">
      <DashboardOverview 
        isLoading={isLoading} 
        stats={data?.stats || { totalOrders: 0, pendingOrders: 0, totalSales: 0, inventoryValue: 0 }}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentOrders 
          orders={data?.recentOrders || []} 
          isLoading={isLoading}
        />
        
        <InventorySummary 
          inventory={data?.inventory || []} 
          isLoading={isLoading}
          onAddInventory={() => setShowInventoryForm(true)}
        />
      </div>
      
      <SalesAnalytics 
        salesByBottleSize={salesData?.salesByBottleSize || []}
        salesByDate={salesData?.salesByDate || {}}
        isLoading={isLoadingSales}
      />
      
      <OrderForm onSuccess={handleFormSuccess} />
      
      <InventoryForm 
        open={showInventoryForm}
        onClose={() => setShowInventoryForm(false)}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
