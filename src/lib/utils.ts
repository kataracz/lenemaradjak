import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function sortByDateDesc(
  a: { publishedAt: string },
  b: { publishedAt: string },
): number {
  return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
}
