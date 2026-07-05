import type { Metadata } from "next";

import { Providers } from "@/app/providers";
import { PublicTopBar } from "@/components/layout/PublicTopBar";
import { getSiteUrl } from "@/lib/seo";
import "@/app/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Invoice Copilot",
    template: "%s | Invoice Copilot",
  },
  description: "Automate invoice follow-ups, recover cash faster, and keep your client communications polished.",
  applicationName: "Invoice Copilot",
  category: "finance",
  authors: [{ name: "Invoice Copilot" }],
  creator: "Invoice Copilot",
  publisher: "Invoice Copilot",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Invoice Copilot",
    description: "Automate invoice follow-ups, recover cash faster, and keep your client communications polished.",
    url: "/",
    siteName: "Invoice Copilot",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Invoice Copilot",
    description: "Automate invoice follow-ups, recover cash faster, and keep your client communications polished.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <PublicTopBar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
