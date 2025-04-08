import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { type OrderWithItems } from "@shared/schema";
import { format } from "date-fns";

// Conversion rate from USD to INR (Indian Rupee)
const USD_TO_INR = 83.5; // 1 USD = 83.5 INR (approximate conversion rate)

// Function to convert USD to INR
const convertToRupees = (amountInUSD: number): number => {
	return amountInUSD * USD_TO_INR;
};

interface RecentOrdersProps {
	orders: OrderWithItems[];
	isLoading: boolean;
}

export default function RecentOrders({ orders, isLoading }: RecentOrdersProps) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5 border-b border-neutral-200">
				<CardTitle className="text-base font-semibold text-neutral-500">
					Recent Orders
				</CardTitle>
				<Link href="/orders">
					<a className="text-sm text-primary hover:underline">View All</a>
				</Link>
			</CardHeader>

			<CardContent className="p-5">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-neutral-200">
						<thead>
							<tr>
								<th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Order ID
								</th>
								<th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Customer
								</th>
								<th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Bottle Sizes
								</th>
								<th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Status
								</th>
								<th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Amount (₹)
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-neutral-200">
							{isLoading
								? Array(4)
										.fill(0)
										.map((_, i) => (
											<tr key={i}>
												<td className="px-3 py-3">
													<Skeleton className="h-4 w-16" />
												</td>
												<td className="px-3 py-3">
													<Skeleton className="h-4 w-24" />
												</td>
												<td className="px-3 py-3">
													<Skeleton className="h-4 w-16" />
												</td>
												<td className="px-3 py-3">
													<Skeleton className="h-4 w-16" />
												</td>
												<td className="px-3 py-3">
													<Skeleton className="h-4 w-16" />
												</td>
											</tr>
										))
								: orders.map((order) => (
										<tr key={order.id}>
											<td className="px-3 py-3 text-sm text-neutral-500">
												{order.orderNumber}
											</td>
											<td className="px-3 py-3 text-sm">
												{order.customerName}
											</td>
											<td className="px-3 py-3 text-sm">
												{order.items && order.items.length > 0 ? (
													<div className="flex flex-wrap gap-1">
														{order.items.map((item, index) => (
															<span
																key={index}
																className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary"
															>
																{item.bottleSize}
															</span>
														))}
													</div>
												) : (
													"-"
												)}
											</td>
											<td className="px-3 py-3 text-sm">
												<StatusBadge status={order.status} />
											</td>
											<td className="px-3 py-3 text-sm">
												₹
												{Number(order.total).toLocaleString(undefined, {
													minimumFractionDigits: 2,
													maximumFractionDigits: 2,
												})}
											</td>
										</tr>
								  ))}
						</tbody>
					</table>
				</div>
			</CardContent>
		</Card>
	);
}
