import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
};

export function Button({ className, variant = "primary", ...props }: Props) {
  return (
    <button
      className={clsx(
        "rounded-md px-4 py-2 text-sm font-medium transition",
        variant === "primary" && "bg-sky-600 text-white hover:bg-sky-700",
        variant === "secondary" && "bg-stone-200 text-stone-900 hover:bg-stone-300",
        variant === "danger" && "bg-rose-600 text-white hover:bg-rose-700",
        className,
      )}
      {...props}
    />
  );
}
