"use client";

import { useEffect } from "react";

type Props = {
  placement: "dashboard_top" | "dashboard_side" | "invoices_top";
};

async function track(placement: string, eventType: "impression" | "click") {
  await fetch("/api/ads/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ placement, eventType }),
  });
}

export function AdSlot({ placement }: Props) {
  useEffect(() => {
    void track(placement, "impression");
  }, [placement]);

  return (
    <a
      href="https://example.com/sponsor"
      target="_blank"
      rel="noopener noreferrer"
      data-testid={`ad-slot-${placement}`}
      onClick={() => {
        void track(placement, "click");
      }}
      className="block rounded-lg border border-dashed border-amber-400 bg-amber-50 p-4 text-sm text-amber-900"
    >
      <p className="font-semibold">Sponsored</p>
      <p className="mt-1">Ad slot: {placement}. Replace with ad network code later.</p>
    </a>
  );
}
