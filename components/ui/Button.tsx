"use client";

import React, { forwardRef } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost" | "emerald" | "amber";
  size?: "sm" | "md" | "lg" | "xl" | "icon";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-[#3E000C]/40 disabled:opacity-40 disabled:pointer-events-none cursor-pointer select-none active:scale-[0.98]";

    const variantStyles = {
      primary:
        "bg-[#3E000C] text-[#FFECD1] hover:bg-[#520010] shadow-xs font-semibold border border-[#3E000C]",
      secondary:
        "bg-[#FFFFFF]/80 hover:bg-[#FFFFFF] text-[#3E000C] border border-[#3E000C]/20 hover:border-[#3E000C]/40 shadow-xs",
      danger:
        "bg-rose-900 text-[#FFECD1] hover:bg-rose-800 border border-rose-800 shadow-xs",
      emerald:
        "bg-[#3E000C] text-[#FFECD1] hover:bg-[#520010] border border-[#3E000C] shadow-xs font-semibold",
      amber:
        "bg-[#3E000C]/10 text-[#3E000C] hover:bg-[#3E000C]/20 border border-[#3E000C]/25 shadow-xs font-semibold",
      outline:
        "border border-[#3E000C]/25 hover:border-[#3E000C]/60 hover:bg-[#3E000C]/5 text-[#3E000C] bg-transparent",
      ghost:
        "hover:bg-[#3E000C]/8 text-[#3E000C]/75 hover:text-[#3E000C]",
    };

    const sizeStyles = {
      sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
      md: "h-9.5 px-4 text-xs font-medium gap-2 rounded-xl",
      lg: "h-11 px-5 text-sm font-medium gap-2.5 rounded-xl",
      xl: "h-12 px-6 text-sm font-semibold gap-2.5 rounded-2xl",
      icon: "h-9 w-9 p-0 rounded-xl",
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled || isLoading ? 1 : 1.01 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
            <span>Processing...</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </motion.button>
    );
  }
);

Button.displayName = "Button";
