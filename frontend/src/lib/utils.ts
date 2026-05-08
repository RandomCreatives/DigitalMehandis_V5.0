import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "ETB"): string {
  return new Intl.NumberFormat("en-ET", { style: "currency", currency, minimumFractionDigits: 2 }).format(amount);
}

export function formatNumber(n: number, decimals = 3): string {
  return n.toFixed(decimals);
}
