"use client";

import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            color: "#0f172a",
          },
        }}
      />
    </>
  );
}
