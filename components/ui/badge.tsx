import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "outline" | "premium"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "border-transparent bg-marrom-madeira text-creme-gastronomico",
    success: "border-transparent bg-verde-oliva/20 text-verde-oliva border border-verde-oliva/50",
    warning: "border-transparent bg-ambar-premium/20 text-ambar-premium border border-ambar-premium/50",
    danger: "border-transparent bg-vermelho-brasa/20 text-vermelho-brasa border border-vermelho-brasa/50",
    info: "border-transparent bg-laranja-fogo/20 text-laranja-fogo border border-laranja-fogo/50",
    outline: "text-creme-gastronomico border-marrom-madeira",
    premium: "border-transparent bg-gradient-to-r from-ambar-premium to-laranja-fogo text-preto-carvao font-bold shadow-md shadow-laranja-fogo/20",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
