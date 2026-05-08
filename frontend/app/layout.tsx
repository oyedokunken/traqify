import type { Metadata } from "next";
import { Jost } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/toaster";
import { ScrollToTop } from "@/components/shared/scroll-to-top";

const jost = Jost({ subsets: ["latin"], display: "swap", variable: "--font-jost" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://traqify.vercel.app"),
  title: "Traqify | Store Management Platform",
  description:
    "Traqify is a multi-tenant store management platform built for modern retail teams. Manage products, inventory, orders, and your entire team from one dashboard.",
  keywords: ["store management", "inventory", "POS", "retail", "multi-tenant", "SaaS"],
  openGraph: {
    title: "Traqify | Store Management Platform",
    description: "Manage your entire retail operation from one dashboard.",
    type: "website",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Traqify Store Management Platform" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Traqify | Store Management Platform",
    description: "Manage your entire retail operation from one dashboard.",
    images: ["/og.jpg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jost.variable}>
      <body className={jost.className}>
        <AuthProvider>
          {children}
          <Toaster />
          <ScrollToTop />
        </AuthProvider>
      </body>
    </html>
  );
}
