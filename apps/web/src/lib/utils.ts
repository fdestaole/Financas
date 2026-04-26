import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatBRL = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === "") return "R$ 0,00";
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return "R$ 0,00";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export const formatDate = (date: string | Date): string => {
  const d = typeof date === "string" ? new Date(date + (date.length === 10 ? "T12:00:00" : "")) : date;
  return d.toLocaleDateString("pt-BR");
};

export const todayISO = (): string => new Date().toISOString().slice(0, 10);

export const monthYYYYMM = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
