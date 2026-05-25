import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeDate(dateVal: any): Date {
  if (!dateVal) return new Date();
  if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? new Date() : dateVal;
  if (typeof dateVal === 'string') {
    // Fix Python/SQL datetime format "YYYY-MM-DD HH:MM:SS" missing the 'T'
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(dateVal)) {
      dateVal = dateVal.replace(' ', 'T');
    }
    // Append Z if no timezone is specified to prevent local time shifting bugs if intended as UTC,
    // but usually just adding T fixes the "Invalid Date" in Safari/Firefox
  }
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? new Date() : d;
}
