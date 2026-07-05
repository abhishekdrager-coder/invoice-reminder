import type { Metadata } from "next";

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function buildMetadata(input: {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
}) : Metadata {
  const url = new URL(input.path ?? "/", getSiteUrl()).toString();

  return {
    title: input.title,
    description: input.description,
    keywords: input.keywords,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      siteName: "Invoice Copilot",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
    },
  };
}
