import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary",
        success: "bg-green-50 text-success",
        warning: "bg-amber-50 text-warning",
        error: "bg-red-50 text-error",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  status?: string;
}

export function StatusBadge({
  className,
  variant,
  status,
  ...props
}: StatusBadgeProps) {
  // Determine variant based on status if not explicitly set
  let badgeVariant = variant;
  
  if (!badgeVariant && status) {
    switch (status.toLowerCase()) {
      case "completed":
        badgeVariant = "success";
        break;
      case "in_progress":
        badgeVariant = "warning";
        break;
      default:
        badgeVariant = "default";
    }
  }
  
  // Format the display text
  const displayText = status ? status.replace('_', ' ') : "";
  
  return (
    <span className={cn(statusBadgeVariants({ variant: badgeVariant }), className)} {...props}>
      {displayText || props.children}
    </span>
  );
}
