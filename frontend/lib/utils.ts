import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "NGN"): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

export const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  CASHIER: "Cashier",
  AUDITOR: "Auditor",
};

export const INDUSTRY_OPTIONS = [
  "Agriculture",
  "Automotive",
  "Cleaning & Laundry",
  "Consulting & Professional Services",
  "Construction & Real Estate",
  "Education",
  "Electronics",
  "Fashion & Apparel",
  "Financial Services",
  "Food & Beverage",
  "Health & Beauty",
  "Healthcare & Pharmacy",
  "Home & Furniture",
  "Hospitality & Tourism",
  "Logistics & Delivery",
  "Manufacturing",
  "Media & Entertainment",
  "Non-profit & NGO",
  "Printing & Stationery",
  "Retail",
  "Software & SaaS",
  "Sports & Fitness",
  "Technology & IT",
  "Telecommunications",
  "Wholesale",
  "Other",
];

export const ORG_SIZE_OPTIONS = [
  "1-5 employees",
  "6-20 employees",
  "21-50 employees",
  "51-200 employees",
  "200+ employees",
];
