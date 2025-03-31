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
  Line
} from "recharts";

// Conversion rate from USD to INR (Indian Rupee)
const USD_TO_INR = 83.5; // 1 USD = 83.5 INR (approximate conversion rate)

// Function to convert USD to INR
const convertToRupees = (amountInUSD: number): number => {
  return amountInUSD * USD_TO_INR;
};

import { Skeleton } from "@/components/ui/skeleton";

type TimeRange = "weekly" | "monthly" | "yearly";

export default function Sales() {
  const [timeRange, setTimeRange] = useState<TimeRange>("weekly");
  
  // Fetch sales data
  const { data, isLoading } = useQuery({
    queryKey: ['/api/sales'],
  });
  
  // Chart colors
  const COLORS = ['#0078D4', '#2B88D8', '#50E6FF'];
  
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
  
  // Format data for charts and convert to rupees
  const salesTrendData = Object.entries(salesByDate).map(([date, value]) => ({
    date,
    sales: convertToRupees(value)
  })).sort((a, b) => a.date.localeCompare(b.date));
  
  // For the pie chart
  const pieData = salesByBottleSize.map(item => ({
    name: item.bottleSize,
    value: convertToRupees(item.revenue)
  }));
  
  // For the bar chart
  const barData = salesByBottleSize.map(item => ({
    name: item.bottleSize,
    sold: item.soldQuantity,
    revenue: convertToRupees(item.revenue)
  }));
  
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-base font-semibold text-neutral-500">
                  Sales Revenue by Product
                </CardTitle>
                <div className="flex space-x-2">
                  <button 
                    className={`px-3 py-1 text-sm rounded-md ${timeRange === 'weekly' ? 'bg-primary text-white' : 'text-neutral-500 hover:bg-neutral-100'}`}
                    onClick={() => setTimeRange('weekly')}
                  >
                    Weekly
                  </button>
                  <button 
                    className={`px-3 py-1 text-sm rounded-md ${timeRange === 'monthly' ? 'bg-primary text-white' : 'text-neutral-500 hover:bg-neutral-100'}`}
                    onClick={() => setTimeRange('monthly')}
                  >
                    Monthly
                  </button>
                  <button 
                    className={`px-3 py-1 text-sm rounded-md ${timeRange === 'yearly' ? 'bg-primary text-white' : 'text-neutral-500 hover:bg-neutral-100'}`}
                    onClick={() => setTimeRange('yearly')}
                  >
                    Yearly
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={barData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" />
                        <YAxis yAxisId="left" orientation="left" stroke="#0078D4" />
                        <YAxis yAxisId="right" orientation="right" stroke="#50E6FF" />
                        <Tooltip formatter={(value, name) => {
                          if (name === 'revenue') return [`₹${Number(value).toLocaleString()}`, 'Revenue'];
                          return [value, 'Bottles Sold'];
                        }} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="sold" name="Bottles Sold" fill="#0078D4" />
                        <Bar yAxisId="right" dataKey="revenue" name="Revenue" fill="#50E6FF" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div>
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
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Revenue']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="by-product" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {salesByBottleSize.map((item, index) => (
              <Card key={item.bottleSize}>
                <CardHeader className="pb-2 pt-4 px-5 border-b border-neutral-200">
                  <CardTitle className="text-base font-semibold text-neutral-500">
                    {item.bottleSize} Bottles
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Units Sold</p>
                      <p className="text-2xl font-semibold">{item.soldQuantity.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Revenue</p>
                      <p className="text-2xl font-semibold text-primary">
                        ₹{item.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="pt-4">
                      <div className="h-32">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: "Sold", value: item.soldQuantity },
                                { name: "In Stock", value: salesByBottleSize.reduce((acc, curr) => {
                                  if (curr.bottleSize === item.bottleSize) return acc;
                                  return acc + curr.soldQuantity;
                                }, 0) }
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={30}
                              outerRadius={50}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              <Cell fill={COLORS[index % COLORS.length]} />
                              <Cell fill="#e5e7eb" />
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="trends" className="mt-6">
          <Card>
            <CardHeader className="pb-2 pt-4 px-5 border-b border-neutral-200">
              <CardTitle className="text-base font-semibold text-neutral-500">
                Sales Trend Over Time
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={salesTrendData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }} 
                      tickFormatter={(date) => {
                        const d = new Date(date);
                        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }} 
                      tickFormatter={(value) => `₹${value.toLocaleString()}`} 
                    />
                    <Tooltip 
                      formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Sales']}
                      labelFormatter={(label) => {
                        const d = new Date(label);
                        return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#0078D4" 
                      activeDot={{ r: 8 }}
                      strokeWidth={2}
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
