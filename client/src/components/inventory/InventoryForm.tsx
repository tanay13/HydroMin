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
	inventoryEntrySchema,
	bottleSizes,
	bottlePrices,
	type InventoryEntry,
} from "@shared/schema";
import { format } from "date-fns";

interface InventoryFormProps {
	open: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

export default function InventoryForm({
	open,
	onClose,
	onSuccess,
}: InventoryFormProps) {
	const { toast } = useToast();
	const [isSubmitting, setIsSubmitting] = useState(false);

	const form = useForm<InventoryEntry>({
		resolver: zodResolver(inventoryEntrySchema),
		defaultValues: {
			bottleSize: "250ML",
			quantity: 0,
			pricePerUnit: bottlePrices["250ML"],
			entryTime: new Date().toISOString().split("T")[0],
		},
	});

	const onSubmit = async (data: InventoryEntry) => {
		try {
			setIsSubmitting(true);
			await apiRequest("/api/inventory", {
				method: "POST",
				body: JSON.stringify({
					...data,
					totalQuantity: data.quantity,
					inStock: data.quantity,
				}),
			});

			toast({
				title: "Success",
				description: "Inventory added successfully",
			});

			onSuccess();
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to add inventory",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add New Inventory</DialogTitle>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="bottleSize"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Bottle Size</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select bottle size" />
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
							name="quantity"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Quantity</FormLabel>
									<FormControl>
										<Input
											type="number"
											{...field}
											onChange={(e) => field.onChange(Number(e.target.value))}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="pricePerUnit"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Price per Unit (₹)</FormLabel>
									<FormControl>
										<Input
											type="number"
											step="0.01"
											{...field}
											onChange={(e) => field.onChange(Number(e.target.value))}
										/>
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

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={onClose}
								disabled={isSubmitting}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? "Adding..." : "Add Inventory"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
