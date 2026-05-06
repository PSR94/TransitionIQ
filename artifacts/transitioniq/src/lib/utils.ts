import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, decimals = 0): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
}

export function capitalize(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700 border border-slate-200",
    pending: "bg-slate-100 text-slate-700 border border-slate-200",
    invited: "bg-blue-100 text-blue-800 border border-blue-200",
    invite_opened: "bg-blue-100 text-blue-800 border border-blue-200",
    intake_started: "bg-yellow-100 text-yellow-800 border border-yellow-200",
    intake_completed: "bg-amber-100 text-amber-800 border border-amber-200",
    recommendations_generated: "bg-violet-100 text-violet-800 border border-violet-200",
    consultant_review_needed: "bg-orange-100 text-orange-800 border border-orange-200",
    recommendations_released: "bg-teal-100 text-teal-800 border border-teal-200",
    plan_selected: "bg-green-100 text-green-800 border border-green-200",
    closed: "bg-slate-100 text-slate-600 border border-slate-200",
    generated: "bg-violet-100 text-violet-800 border border-violet-200",
    released: "bg-teal-100 text-teal-800 border border-teal-200",
    rejected: "bg-red-100 text-red-800 border border-red-200",
    approved: "bg-green-100 text-green-800 border border-green-200",
    request_regeneration: "bg-orange-100 text-orange-800 border border-orange-200",
  };
  return map[status] ?? "bg-slate-100 text-slate-700 border border-slate-200";
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: "Draft",
    pending: "Pending",
    invited: "Invited",
    invite_opened: "Invite Opened",
    intake_started: "Intake Started",
    intake_completed: "Intake Done",
    recommendations_generated: "Options Generated",
    consultant_review_needed: "Needs Review",
    recommendations_released: "Plans Ready",
    plan_selected: "Plan Selected",
    closed: "Closed",
    generated: "Options Generated",
    released: "Plans Ready",
    rejected: "Rejected",
    approved: "Approved",
    request_regeneration: "Regen. Requested",
  };
  return map[status] ?? capitalize(status);
}

export function metalColor(level: string): string {
  const map: Record<string, string> = {
    bronze: "text-amber-800 bg-amber-100 border border-amber-200",
    silver: "text-slate-700 bg-slate-100 border border-slate-300",
    gold: "text-yellow-800 bg-yellow-100 border border-yellow-200",
    platinum: "text-blue-800 bg-blue-100 border border-blue-200",
    catastrophic: "text-red-800 bg-red-100 border border-red-200",
  };
  return map[level] ?? "text-slate-700 bg-slate-100";
}

export function shortStatus(status: string): string {
  const map: Record<string, string> = {
    draft: "Draft",
    pending: "Pending",
    invited: "Invited",
    invite_opened: "Opened",
    intake_started: "Intake",
    intake_completed: "Intake",
    recommendations_generated: "Options",
    consultant_review_needed: "Review",
    recommendations_released: "Released",
    plan_selected: "Selected",
    closed: "Closed",
  };
  return map[status] ?? status.slice(0, 7);
}
