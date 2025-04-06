import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { type Inventory } from "@shared/schema";
import { format } from "date-fns";
import { Package, AlertCircle } from "lucide-react";

interface InventoryListProps {
	inventory: Inventory[];
	isLoading: boolean;
	onAddInventory: () => void;
}

export default function InventoryList({
	inventory,
	isLoading,
	onAddInventory,
}: InventoryListProps) {
	return (
		<Card>
			<CardHeader className="pb-2 pt-4 px-5 border-b border-neutral-200">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<CardTitle className="text-lg font-semibold text-neutral-500">
						Inventory Management
					</CardTitle>
					<Button
						onClick={onAddInventory}
						className="bg-primary text-white hover:bg-secondary"
					>
						Add New Inventory
					</Button>
				</div>
			</CardHeader>

			<CardContent className="p-5">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{isLoading ? (
						Array(3)
							.fill(0)
							.map((_, i) => (
								<Card key={i} className="overflow-hidden">
									<CardContent className="p-0">
										<div className="p-5">
											<Skeleton className="h-6 w-24 mb-2" />
											<Skeleton className="h-10 w-36 mb-3" />
											<Skeleton className="h-2.5 w-full mb-2" />
											<div className="flex justify-between">
												<Skeleton className="h-4 w-20" />
												<Skeleton className="h-4 w-20" />
											</div>
										</div>
										<div className="bg-neutral-50 p-4 border-t border-neutral-100">
											<div className="flex justify-between">
												<Skeleton className="h-4 w-24" />
												<Skeleton className="h-4 w-24" />
											</div>
										</div>
									</CardContent>
								</Card>
							))
					) : inventory.length > 0 ? (
						inventory.map((item) => {
							const percentage = Math.round(
								(item.inStock / item.totalQuantity) * 100
							);
							const isLow = percentage < 30;

							return (
								<Card
									key={item.id}
									className={`overflow-hidden ${isLow ? "border-warning" : ""}`}
								>
									<CardContent className="p-0">
										<div className="p-5">
											<div className="flex items-center mb-1 text-sm font-medium text-muted-foreground">
												<Package className="h-4 w-4 mr-1" />
												{item.bottleSize} Water Bottles
											</div>
											<div className="flex items-center justify-between mb-3">
												<h3 className="text-2xl font-semibold">
													{item.inStock.toLocaleString()}
												</h3>
												{isLow && (
													<div className="flex items-center text-warning text-sm">
														<AlertCircle className="h-4 w-4 mr-1" />
														Low Stock
													</div>
												)}
											</div>
											<Progress
												value={percentage}
												className={`h-2.5 ${
													isLow ? "bg-warning/20" : "bg-neutral-200"
												}`}
											/>
											<div className="flex justify-between mt-2 text-xs text-muted-foreground">
												<span>In Stock: {item.inStock.toLocaleString()}</span>
												<span>{percentage}% remaining</span>
											</div>
										</div>
										<div className="bg-neutral-50 p-4 border-t border-neutral-100">
											<div className="grid grid-cols-2 gap-2 text-sm">
												{/* <div>
                          <div className="text-xs text-muted-foreground">Price</div>
                          <div className="font-medium">${Number(item.pricePerUnit).toFixed(2)}</div>
                        </div> */}
												<div>
													<div className="text-xs text-muted-foreground">
														Total Sold
													</div>
													<div className="font-medium">
														{item.soldQuantity.toLocaleString()}
													</div>
												</div>
												{/* <div>
                          <div className="text-xs text-muted-foreground">Total Value</div>
                          <div className="font-medium">${(Number(item.pricePerUnit) * item.inStock).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </div> */}
												<div>
													<div className="text-xs text-muted-foreground">
														Last Updated
													</div>
													<div className="font-medium">
														{format(new Date(item.updatedAt), "MMM d")}
													</div>
												</div>
											</div>
										</div>
									</CardContent>
								</Card>
							);
						})
					) : (
						<div className="col-span-3 text-center py-12">
							<div className="mx-auto w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
								<Package className="h-6 w-6 text-muted-foreground" />
							</div>
							<h3 className="text-lg font-medium mb-1">No inventory found</h3>
							<p className="text-muted-foreground mb-4">
								You haven't added any inventory yet.
							</p>
							<Button
								onClick={onAddInventory}
								className="bg-primary text-white hover:bg-secondary"
							>
								Add First Inventory
							</Button>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
