// Your business data. Jarvis only states facts from data/business.json, and the dashboard shows the same file.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export type Business = {
  owner: string;
  business: string;
  today: { revenue_this_week: number; revenue_last_week: number; new_leads: number; open_support_tickets: number };
  calendar: { time: string; title: string; day?: string }[];
  tasks: { title: string; promised: string; status: string }[];
  alerts: { severity: string; text: string }[];
  contacts?: { name: string; company: string; email: string }[];
};

export function businessJson(): string {
  return readFileSync(join(process.cwd(), "data", "business.json"), "utf8");
}

export function business(): Business {
  return JSON.parse(businessJson());
}
