import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { type Order, type OrderWithItems } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Search } from "lucide-react";

// Conversion rate from USD to INR (Indian Rupee)
const USD_TO_INR = 83.5; // 1 USD = 83.5 INR (approximate conversion rate)

// Function to convert USD to INR
const convertToRupees = (amountInUSD: number): number => {
  return amountInUSD * USD_TO_INR;
};

interface OrderListProps {
  orders: OrderWithItems[];
  isLoading: boolean;
}

export default function OrderList({ orders, isLoading }: OrderListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchTerm === "" || 
                          order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  const { mutate: updateStatus } = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: number, newStatus: "in_progress" | "completed" }) => {
      return apiRequest("PATCH", `/api/orders/${orderId}/status`, { status: newStatus });
    },
    onMutate: async ({ orderId, newStatus }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/orders'] });
      
      // Snapshot the previous value
      const previousOrders = queryClient.getQueryData(['/api/orders']);
      
      // Optimistically update orders
      queryClient.setQueryData(['/api/orders'], (old: OrderWithItems[] = []) => {
        return old.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        );
      });
      
      return { previousOrders };
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Order updated",
        description: `Order status changed to ${variables.newStatus.replace('_', ' ')}.`,
      });
      
      // Invalidate and refetch
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/orders'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/sales'] })
      ]);
    },
    onError: (err, variables, context) => {
      // Revert the optimistic update
      if (context?.previousOrders) {
        queryClient.setQueryData(['/api/orders'], context.previousOrders);
      }
      toast({
        title: "Error",
        description: "Failed to update order status. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const updateOrderStatus = (orderId: number, newStatus: "in_progress" | "completed") => {
    updateStatus({ orderId, newStatus });
  };
  
  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-5 border-b border-neutral-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-lg font-semibold text-neutral-500">Orders</CardTitle>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-auto"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-5">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Order ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Bottle Details</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount (₹)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-4 py-4 text-right"><Skeleton className="h-8 w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-4 text-sm text-neutral-500">{order.orderNumber}</td>
                    <td className="px-4 py-4 text-sm font-medium">{order.customerName}</td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">
                      {format(new Date(order.orderDate), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      {order.items && order.items.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {order.items.map((item, index) => (
                            <span key={index} className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-primary/10 text-primary">
                              {item.bottleSize} ({item.quantity} bottles)
                            </span>
                          ))}
                          <span className="text-xs text-muted-foreground mt-1">
                            Total: {order.items.reduce((sum, item) => sum + item.quantity, 0)} bottles
                          </span>
                        </div>
                      ) : "-"}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-4 text-sm">
                      ₹{convertToRupees(Number(order.total)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {order.status === "in_progress" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-sm border-green-100 text-success hover:bg-green-50 hover:text-success"
                          onClick={() => updateOrderStatus(order.id, "completed")}
                        >
                          Mark Completed
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-sm border-amber-100 text-warning hover:bg-amber-50 hover:text-warning"
                          onClick={() => updateOrderStatus(order.id, "in_progress")}
                        >
                          Reopen
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No orders found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
