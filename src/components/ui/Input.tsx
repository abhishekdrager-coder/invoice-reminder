import * as React from "react";

import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className, id, ...props },
  ref,
) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="block space-y-2" htmlFor={inputId}>
      {label ? <span className="text-sm font-medium text-slate-700">{label}</span> : null}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
          error ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100" : "",
          className,
        )}
        {...props}
      />
      {error ? <span className="text-sm text-rose-600">{error}</span> : null}
    </label>
  );
});
