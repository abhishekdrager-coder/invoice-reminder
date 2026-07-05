"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
};

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-[linear-gradient(135deg,#0f6cbd_0%,#0b4f8a_100%)] text-white shadow-[0_14px_28px_-18px_rgba(15,108,189,0.8)] hover:brightness-110",
  secondary: "border border-[var(--border-strong)] bg-white/80 text-slate-700 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.25)] hover:bg-white",
  ghost: "text-slate-700 hover:bg-slate-100/80",
  danger: "bg-[linear-gradient(135deg,#e11d48_0%,#be123c_100%)] text-white shadow-[0_14px_28px_-18px_rgba(225,29,72,0.75)] hover:brightness-110",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", loading = false, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/30",
        variants[variant],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? "Please wait..." : children}
    </button>
  );
});
