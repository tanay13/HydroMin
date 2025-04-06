import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { type Inventory } from "@shared/schema";
import { Plus } from "lucide-react";

interface InventorySummaryProps {
	inventory: Inventory[];
	isLoading: boolean;
	onAddInventory: () => void;
}

export default function InventorySummary({
	inventory,
	isLoading,
	onAddInventory,
}: InventorySummaryProps) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5 border-b border-neutral-200">
				<CardTitle className="text-base font-semibold text-neutral-500">
					Inventory Summary
				</CardTitle>
				<Link href="/inventory">
					<a className="text-sm text-primary hover:underline">
						Manage Inventory
					</a>
				</Link>
			</CardHeader>

			<CardContent className="p-5">
				<div className="space-y-5">
					{isLoading
						? Array(3)
								.fill(0)
								.map((_, i) => (
									<div key={i} className="space-y-1">
										<div className="flex justify-between mb-1">
											<Skeleton className="h-4 w-24" />
											<Skeleton className="h-4 w-24" />
										</div>
										<Skeleton className="h-2.5 w-full" />
										<div className="flex justify-between mt-1">
											<Skeleton className="h-3 w-20" />
											<Skeleton className="h-3 w-20" />
										</div>
									</div>
								))
						: inventory.map((item) => {
								const percentage = Math.round(
									(item.inStock / item.totalQuantity) * 100
								);
								const isLow = percentage < 30;

								return (
									<div key={item.id}>
										<div className="flex justify-between mb-1">
											<span className="text-sm font-medium">
												{item.bottleSize} Bottles
											</span>
											<span
												className={`text-sm ${
													isLow
														? "text-warning font-medium"
														: "text-muted-foreground"
												}`}
											>
												{item.inStock.toLocaleString()} /{" "}
												{item.totalQuantity.toLocaleString()}
											</span>
										</div>
										<Progress
											value={percentage}
											className={`h-2.5 ${
												isLow ? "bg-warning/20" : "bg-neutral-200"
											}`}
											style={
												{
													"--progress-indicator-color": isLow
														? "var(--warning)"
														: undefined,
												} as React.CSSProperties
											}
										/>
										<div className="flex justify-between mt-1 text-xs text-muted-foreground">
											<span>In Stock: {item.inStock.toLocaleString()}</span>
											<span>Sold: {item.soldQuantity.toLocaleString()}</span>
										</div>
									</div>
								);
						  })}
				</div>

				<div className="mt-6">
					<Button
						className="w-full bg-primary text-white hover:bg-secondary"
						onClick={onAddInventory}
					>
						<Plus className="h-4 w-4 mr-2" />
						Add New Inventory
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
