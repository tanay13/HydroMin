import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import InventoryList from "@/components/inventory/InventoryList";
import InventoryForm from "@/components/inventory/InventoryForm";
import { queryClient } from "@/lib/queryClient";

export default function Inventory() {
  const [showInventoryForm, setShowInventoryForm] = useState(false);
  
  // Fetch inventory data
  const { data: inventory, isLoading, refetch } = useQuery({
    queryKey: ['/api/inventory'],
    refetchOnMount: true
  });
  
  // Handle success after form submission
  const handleFormSuccess = async () => {
    // Invalidate and refetch queries to refresh the data
    await queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
    await queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
    
    // Force immediate refetch to get the latest data
    await refetch();
    
    // Close the form
    setShowInventoryForm(false);
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-700">Inventory Management</h1>
      
      <InventoryList 
        inventory={inventory || []} 
        isLoading={isLoading}
        onAddInventory={() => setShowInventoryForm(true)}
      />
      
      <InventoryForm 
        open={showInventoryForm}
        onClose={() => setShowInventoryForm(false)}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
