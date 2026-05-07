import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/toaster";
import { ScrollToTop } from "@/components/shared/scroll-to-top";

export const metadata: Metadata = {
  title: "Traqify | Store Management Platform",
  description:
    "Traqify is a multi-tenant store management platform built for modern retail teams. Manage products, inventory, orders, and your entire team from one dashboard.",
  keywords: ["store management", "inventory", "POS", "retail", "multi-tenant", "SaaS"],
  openGraph: {
    title: "Traqify | Store Management Platform",
    description: "Manage your entire retail operation from one dashboard.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Jost:ital,wght@0,100..900;1,100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          {children}
          <Toaster />
          <ScrollToTop />
        </AuthProvider>
      </body>
    </html>
  );
}
