import * as React from "react";

import { cn } from "@/lib/utils";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, className, id, children, ...props },
  ref,
) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="block space-y-2" htmlFor={selectId}>
      {label ? <span className="text-sm font-medium text-slate-700">{label}</span> : null}
      <select
        ref={ref}
        id={selectId}
        className={cn(
          "w-full rounded-2xl border border-[var(--border-strong)] bg-white/85 px-4 py-3.5 text-slate-900 outline-none transition shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand)]/10",
          error ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100" : "",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error ? <span className="text-sm text-rose-600">{error}</span> : null}
    </label>
  );
});
