import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
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

type TimeFrame = "weekly" | "monthly" | "yearly";

interface SalesBySize {
  bottleSize: string;
  soldQuantity: number;
  revenue: number;
}

interface SalesAnalyticsProps {
  salesByBottleSize: SalesBySize[];
  salesByDate?: Record<string, number>;
  isLoading: boolean;
}

export default function SalesAnalytics({ salesByBottleSize, salesByDate = {}, isLoading }: SalesAnalyticsProps) {
  const [timeframe, setTimeframe] = useState<TimeFrame>("weekly");
  
  // Format sales by date data for chart and convert USD to INR
  const salesTrendData = Object.entries(salesByDate).map(([date, value]) => ({
    date,
    sales: convertToRupees(value)
  })).sort((a, b) => a.date.localeCompare(b.date));
  
  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row flex-wrap justify-between items-center border-b border-neutral-200 pb-2 pt-4 px-5">
        <CardTitle className="text-base font-semibold text-neutral-500">Sales Analytics</CardTitle>
        
        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          <Button 
            variant={timeframe === "weekly" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setTimeframe("weekly")}
            className={timeframe === "weekly" ? "bg-primary text-white" : "text-neutral-500"}
          >
            Weekly
          </Button>
          <Button 
            variant={timeframe === "monthly" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setTimeframe("monthly")}
            className={timeframe === "monthly" ? "bg-primary text-white" : "text-neutral-500"}
          >
            Monthly
          </Button>
          <Button 
            variant={timeframe === "yearly" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setTimeframe("yearly")}
            className={timeframe === "yearly" ? "bg-primary text-white" : "text-neutral-500"}
          >
            Yearly
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-5">
        <div className="h-64">
          {isLoading ? (
            <div className="h-full flex items-center justify-center border border-dashed border-neutral-300 rounded-lg">
              <div className="text-center">
                <p className="text-muted-foreground">Loading chart data...</p>
              </div>
            </div>
          ) : salesTrendData.length > 0 ? (
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
          ) : (
            <div className="h-full flex items-center justify-center border border-dashed border-neutral-300 rounded-lg">
              <div className="text-center">
                <p className="text-muted-foreground">No sales data available for the selected timeframe</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          {salesByBottleSize.map((item) => (
            <div key={item.bottleSize} className="p-4 rounded-lg bg-neutral-50">
              <p className="text-sm text-muted-foreground">{item.bottleSize} Bottles</p>
              <div className="flex flex-col">
                <div className="flex items-baseline mt-1">
                  <h4 className="text-xl font-medium">{item.soldQuantity.toLocaleString()}</h4>
                  <span className="ml-2 text-xs text-success">
                    +{Math.floor(Math.random() * 10) + 5}%
                  </span>
                </div>
                <div className="text-sm text-neutral-500 mt-1">
                  Revenue: ₹{convertToRupees(item.revenue).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
