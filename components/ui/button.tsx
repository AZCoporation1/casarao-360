import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "premium"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    const variants = {
      default: "bg-vermelho-brasa text-white hover:bg-vermelho-brasa/90 shadow-lg shadow-vermelho-brasa/20",
      destructive: "bg-red-500 text-white hover:bg-red-600",
      outline: "border border-marrom-madeira bg-transparent hover:bg-marrom-madeira/20 text-creme-gastronomico",
      secondary: "bg-marrom-madeira text-creme-gastronomico hover:bg-marrom-madeira/80",
      ghost: "hover:bg-marrom-madeira/20 text-creme-gastronomico",
      link: "text-laranja-fogo underline-offset-4 hover:underline",
      premium: "bg-gradient-to-r from-ambar-premium to-laranja-fogo text-preto-carvao font-bold shadow-xl shadow-laranja-fogo/20 hover:opacity-90",
    };
    
    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3",
      lg: "h-12 rounded-md px-8 text-lg",
      icon: "h-10 w-10",
    };

    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-laranja-fogo focus-visible:ring-offset-2 focus-visible:ring-offset-preto-carvao disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
