"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const HIDDEN_PREFIXES = ["/dashboard", "/invoices", "/settings", "/api", "/auth/callback"];

const NAV_ITEMS = [
  { href: "/", label: "Homepage", match: ["/"] },
  { href: "/#features", label: "Features", match: ["/"] },
  { href: "/#pricing", label: "Pricing", match: ["/"] },
  { href: "/login", label: "Login", match: ["/login"] },
];

export function PublicTopBar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isHome = pathname === "/";

  if (!pathname || HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-[60] border-b border-white/30 bg-transparent backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-3 lg:px-8">
        <Link href="/" className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--brand-strong)]">
          Invoice Copilot
        </Link>
        <nav className="hidden items-center gap-2 text-sm font-medium text-slate-700 md:flex sm:gap-3">
          {NAV_ITEMS.map((item) => {
            const isActive = item.match.includes(pathname);
            const activeClass = isActive
              ? "bg-white/95 text-slate-950 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.8)]"
              : "hover:bg-white/80 hover:text-slate-950";

            return (
              <Link key={item.href} href={item.href} className={`rounded-full px-3 py-2 transition ${activeClass}`}>
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/signup"
            className="rounded-full bg-[linear-gradient(135deg,#0f6cbd_0%,#0b4f8a_100%)] px-4 py-2 font-semibold text-white shadow-[0_16px_28px_-20px_rgba(15,108,189,0.8)] transition hover:brightness-110"
          >
            Start free
          </Link>
        </nav>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-xl border border-[var(--border-strong)] bg-white/85 p-2 text-slate-700 transition hover:bg-white md:hidden"
          aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMenuOpen}
          aria-controls="public-mobile-nav"
          onClick={() => setIsMenuOpen((prev) => !prev)}
        >
          <span className="sr-only">Toggle navigation</span>
          <div className="flex w-5 flex-col gap-1.5">
            <span className={`h-0.5 rounded-full bg-current transition ${isMenuOpen ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`h-0.5 rounded-full bg-current transition ${isMenuOpen ? "opacity-0" : ""}`} />
            <span className={`h-0.5 rounded-full bg-current transition ${isMenuOpen ? "-translate-y-2 -rotate-45" : ""}`} />
          </div>
        </button>
        </div>

        <div id="public-mobile-nav" className={`${isMenuOpen ? "block" : "hidden"} border-t border-white/30 md:hidden`}>
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-6 py-3">
          {NAV_ITEMS.map((item) => {
            const isActive = item.match.includes(pathname) || (isHome && item.href.startsWith("/#"));
            const activeClass = isActive
              ? "bg-white text-slate-950 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.75)]"
              : "hover:bg-white/80 hover:text-slate-950";

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={`rounded-2xl px-3 py-2 text-sm font-medium text-slate-700 transition ${activeClass}`}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/signup"
            onClick={() => setIsMenuOpen(false)}
            className="mt-1 rounded-2xl bg-[linear-gradient(135deg,#0f6cbd_0%,#0b4f8a_100%)] px-4 py-2 text-center text-sm font-semibold text-white shadow-[0_16px_28px_-20px_rgba(15,108,189,0.8)] transition hover:brightness-110"
          >
            Start free
          </Link>
          </div>
        </div>
      </header>
      <div aria-hidden="true" className="h-[64px]" />
    </>
  );
}
