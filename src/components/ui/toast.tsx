"use client";

export function Toast({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <div className="fixed right-4 top-4 z-50 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-sm">
      {message}
    </div>
  );
}
