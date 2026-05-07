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
  "Retail",
  "Food & Beverage",
  "Fashion & Apparel",
  "Electronics",
  "Health & Beauty",
  "Home & Furniture",
  "Automotive",
  "Agriculture",
  "Manufacturing",
  "Wholesale",
  "Technology & IT",
  "Software & SaaS",
  "Logistics & Delivery",
  "Financial Services",
  "Education",
  "Healthcare & Pharmacy",
  "Construction & Real Estate",
  "Media & Entertainment",
  "Hospitality & Tourism",
  "Printing & Stationery",
  "Cleaning & Laundry",
  "Sports & Fitness",
  "Telecommunications",
  "Consulting & Professional Services",
  "Non-profit & NGO",
  "Other",
];

export const ORG_SIZE_OPTIONS = [
  "1-5 employees",
  "6-20 employees",
  "21-50 employees",
  "51-200 employees",
  "200+ employees",
];
