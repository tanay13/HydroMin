import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	orderEntrySchema,
	bottleSizes,
	bottlePrices,
	type OrderEntry,
} from "@shared/schema";
import { format } from "date-fns";

interface OrderFormProps {
	onSuccess: () => void;
}

export default function OrderForm({ onSuccess }: OrderFormProps) {
	const { toast } = useToast();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showForm, setShowForm] = useState(false);

	const form = useForm<OrderEntry>({
		resolver: zodResolver(orderEntrySchema),
		defaultValues: {
			customerName: "",
			entryTime: new Date().toISOString().split("T")[0],
			notes: "",
			items: [
				{
					bottleSize: "250ML",
					quantity: 0,
					pricePerUnit: bottlePrices["250ML"],
				},
			],
		},
	});

	const onSubmit = async (data: OrderEntry) => {
		try {
			setIsSubmitting(true);
			await apiRequest("POST", "/api/orders", data);

			toast({
				title: "Success",
				description: "Order created successfully",
			});

			onSuccess();
			setShowForm(false);
			form.reset();
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to create order",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const addItem = () => {
		const items = form.getValues("items");
		form.setValue("items", [
			...items,
			{
				bottleSize: "250ML",
				quantity: 0,
				pricePerUnit: bottlePrices["250ML"],
			},
		]);
	};

	const removeItem = (index: number) => {
		const items = form.getValues("items");
		form.setValue(
			"items",
			items.filter((_, i) => i !== index)
		);
	};

	return (
		<Dialog open={showForm} onOpenChange={setShowForm}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Create New Order</DialogTitle>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="customerName"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Customer Name</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="entryTime"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Entry Time</FormLabel>
									<FormControl>
										<Input
											type="datetime-local"
											{...field}
											value={
												field.value
													? format(new Date(field.value), "yyyy-MM-dd'T'HH:mm")
													: ""
											}
											onChange={(e) =>
												field.onChange(new Date(e.target.value).toISOString())
											}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="notes"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Notes</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="space-y-4">
							<div className="flex justify-between items-center">
								<h3 className="text-lg font-medium">Order Items</h3>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={addItem}
								>
									Add Item
								</Button>
							</div>

							{form.watch("items").map((_, index) => (
								<div key={index} className="grid grid-cols-4 gap-4 items-end">
									<FormField
										control={form.control}
										name={`items.${index}.bottleSize`}
										render={({ field }) => (
											<FormItem>
												<FormLabel>Bottle Size</FormLabel>
												<Select
													onValueChange={field.onChange}
													defaultValue={field.value}
												>
													<FormControl>
														<SelectTrigger>
															<SelectValue placeholder="Select size" />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														{bottleSizes.map((size) => (
															<SelectItem key={size} value={size}>
																{size}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name={`items.${index}.quantity`}
										render={({ field }) => (
											<FormItem>
												<FormLabel>Quantity</FormLabel>
												<FormControl>
													<Input
														type="number"
														{...field}
														onChange={(e) =>
															field.onChange(Number(e.target.value))
														}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name={`items.${index}.pricePerUnit`}
										render={({ field }) => (
											<FormItem>
												<FormLabel>Price per Unit (₹)</FormLabel>
												<FormControl>
													<Input
														type="number"
														step="0.01"
														{...field}
														onChange={(e) =>
															field.onChange(Number(e.target.value))
														}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<Button
										type="button"
										variant="destructive"
										size="sm"
										onClick={() => removeItem(index)}
									>
										Remove
									</Button>
								</div>
							))}
						</div>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setShowForm(false)}
								disabled={isSubmitting}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? "Creating..." : "Create Order"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
