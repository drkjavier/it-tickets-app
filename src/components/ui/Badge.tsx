"use client";

import { forwardRef } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "outline";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = "default", className = "", children, ...props }, ref) => {
    const variants: Record<BadgeVariant, string> = {
      default: "bg-secondary text-secondary-foreground",
      success: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
      warning: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
      danger: "bg-red-500/10 text-red-600 border border-red-500/20",
      info: "bg-blue-500/10 text-blue-600 border border-blue-500/20",
      outline: "bg-transparent text-foreground border border-border",
    };

    return (
      <span
        ref={ref}
        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${variants[variant]} ${className}`}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export { Badge };
export type { BadgeProps, BadgeVariant };
