import type { Metadata } from "next";
import Link from "next/link";

import { PLAN_ORDER, PLAN_CONFIG } from "@/config/plans";
import { buildMetadata, getSiteUrl } from "@/lib/seo";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = buildMetadata({
  title: "Automated Invoice Reminders for Faster Payments",
  description: "Create invoices, automate reminders, and recover payments faster with Invoice Copilot.",
  path: "/",
  keywords: ["invoice reminders", "invoice automation", "accounts receivable", "payment follow-up"],
});

const features = [
  {
    title: "Automated reminder workflows",
    description: "Schedule pre-due and overdue nudges that go out exactly when they should.",
  },
  {
    title: "AI tone control",
    description: "Rewrite follow-ups to sound polite, neutral, or firm without losing the facts.",
  },
  {
    title: "Reply-aware collections",
    description: "Capture client replies, detect intent, and stop reminders when payment is confirmed.",
  },
];

export default function HomePage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Invoice Copilot",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: getSiteUrl(),
    description: "Create invoices, automate reminders, and recover payments faster.",
    offers: PLAN_ORDER.map((planId) => {
      const plan = PLAN_CONFIG[planId];
      return {
        "@type": "Offer",
        name: plan.name,
        price: plan.priceMonthly,
        priceCurrency: "USD",
      };
    }),
  };

  return (
    <main className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <section className="mx-auto flex max-w-7xl flex-col gap-14 px-6 py-20 lg:flex-row lg:items-center lg:px-8">
        <div className="max-w-3xl flex-1">
          <div className="mb-4 inline-flex rounded-full border border-blue-200 bg-blue-50 px-4 py-1 text-sm font-medium text-blue-700">
            Invoice Copilot for freelancers and finance teams
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-slate-950 sm:text-6xl">
            Stop chasing payments. Start getting paid.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Centralize invoices, automate reminder sequences, and keep every payment follow-up on-brand with AI-assisted tone rewriting.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/signup" className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-soft transition hover:bg-blue-700">
              Start free
            </Link>
            <Link href="#pricing" className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white">
              View pricing
            </Link>
          </div>
          <div className="mt-10 grid gap-4 text-sm text-slate-600 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-soft">Automated reminder scheduling</div>
            <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-soft">Stripe-powered subscriptions</div>
            <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-soft">Supabase-backed auth and data</div>
          </div>
        </div>
        <div className="flex-1 rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
          <div className="rounded-2xl bg-slate-950 p-6 text-white">
            <p className="text-sm text-slate-300">Recovered this month</p>
            <p className="mt-2 text-4xl font-bold">$18,420</p>
            <p className="mt-3 text-sm text-slate-300">12 invoices moved from overdue to paid with automated follow-ups.</p>
          </div>
          <div className="mt-6 space-y-4">
            {[
              ["Day -2", "Friendly heads-up before due date"],
              ["Day 0", "Due today reminder"],
              ["Day +3", "Follow-up with updated tone"],
              ["Day +7", "Escalation with payment request"],
            ].map(([label, copy]) => (
              <div key={label} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                <div>
                  <p className="font-semibold text-slate-900">{label}</p>
                  <p className="text-sm text-slate-500">{copy}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">Queued</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">Features</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-950">Everything you need to run collections like a pro</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
              <h3 className="text-xl font-semibold text-slate-950">{feature.title}</h3>
              <p className="mt-3 text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">Pricing</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-950">Choose a plan that fits your payment volume</h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {PLAN_ORDER.map((planId) => {
            const plan = PLAN_CONFIG[planId];
            return (
              <div key={plan.id} className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-semibold text-slate-950">{plan.name}</h3>
                  {plan.id === "starter" ? (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">Popular</span>
                  ) : null}
                </div>
                <p className="mt-3 text-slate-600">{plan.description}</p>
                <p className="mt-6 text-4xl font-bold text-slate-950">
                  {plan.priceMonthly === 0 ? "Free" : `${formatCurrency(plan.priceMonthly)}`}
                  {plan.priceMonthly > 0 ? <span className="text-base font-medium text-slate-500">/month</span> : null}
                </p>
                <ul className="mt-6 space-y-3 text-sm text-slate-600">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-blue-600" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className="mt-8 inline-flex rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800">
                  Get started
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20 lg:px-8">
        <div className="rounded-[2rem] bg-slate-950 px-8 py-12 text-center text-white shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-200">Ready to automate collections?</p>
          <h2 className="mt-3 text-4xl font-bold">Launch a smarter invoice reminder workflow today.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300">
            Connect Supabase, Stripe, Resend, and OpenAI to turn manual follow-ups into a reliable revenue system.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/signup" className="rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-100">
              Create account
            </Link>
            <Link href="/login" className="rounded-xl border border-white/20 px-5 py-3 font-semibold text-white transition hover:bg-white/10">
              Log in
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-sm text-slate-500 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p>© {new Date().getFullYear()} Invoice Copilot. Recover revenue without awkward follow-ups.</p>
          <div className="flex gap-4">
            <Link href="/login">Login</Link>
            <Link href="/signup">Start free today</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
