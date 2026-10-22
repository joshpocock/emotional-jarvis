// What Jarvis can do, not just say: email a client, move a meeting, tick off a task.
// Changes live in memory (restart the server to get data/business.json back).
// The outbox is a demo: emails land on the dashboard. Wire sendEmail() to your email provider to send for real.
import type Anthropic from "@anthropic-ai/sdk";
import { business, type Business } from "./business";

// actions_taken is Jarvis's own record of what it did this session; it sees it with the rest of the data.
type State = Business & {
  outbox: { to: string; subject: string; body: string; at: string }[];
  actions_taken: string[];
};

const g = globalThis as unknown as { __jarvisState?: State };
export function state(): State {
  return (g.__jarvisState ??= { ...business(), outbox: [], actions_taken: [] });
}
export function resetState() {
  g.__jarvisState = { ...business(), outbox: [], actions_taken: [] };
}

const find = <T extends { title: string }>(items: T[], match: string) =>
  items.find((i) => i.title.toLowerCase().includes(match.toLowerCase()));

export const tools: Anthropic.Tool[] = [
  {
    name: "send_email",
    description: "Send an email for the owner, e.g. a payment reminder to a client. Use the contact's email from the business data.",
    input_schema: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient email address" },
        subject: { type: "string" },
        body: { type: "string", description: "Short, friendly, signed by the owner" },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "move_event",
    description: "Move a calendar event to a new time today, or to another day such as 'tomorrow'.",
    input_schema: {
      type: "object",
      properties: {
        title_contains: { type: "string", description: "A word or phrase from the event title" },
        new_time: { type: "string", description: "24-hour time like 15:00" },
        new_day: { type: "string", description: "Leave empty for today, or e.g. 'tomorrow'" },
      },
      required: ["title_contains", "new_time"],
    },
  },
  {
    name: "complete_task",
    description: "Mark one of the owner's promised tasks as done.",
    input_schema: {
      type: "object",
      properties: { title_contains: { type: "string", description: "A word or phrase from the task title" } },
      required: ["title_contains"],
    },
  },
];

export type Done = { action: string; detail: string };

// Run one tool call against the live state and say what happened.
export function runTool(name: string, input: Record<string, string>): { result: string; done?: Done } {
  const out = act(name, input);
  if (out.done) state().actions_taken.push(`${out.done.action}: ${out.done.detail}`);
  return out;
}

function act(name: string, input: Record<string, string>): { result: string; done?: Done } {
  const s = state();
  if (name === "send_email") {
    s.outbox.unshift({ to: input.to, subject: input.subject, body: input.body, at: new Date().toISOString() });
    return { result: `Sent to ${input.to}.`, done: { action: "Email sent", detail: `${input.subject} → ${input.to}` } };
  }
  if (name === "move_event") {
    const e = find(s.calendar, input.title_contains);
    if (!e) return { result: `No event matching "${input.title_contains}".` };
    e.time = input.new_time;
    e.day = input.new_day || undefined;
    s.calendar.sort((a, b) => Number(!!a.day) - Number(!!b.day) || a.time.localeCompare(b.time));
    const when = input.new_day ? `${input.new_day} ${input.new_time}` : input.new_time;
    return { result: `Moved "${e.title}" to ${when}.`, done: { action: "Meeting moved", detail: `${e.title} → ${when}` } };
  }
  if (name === "complete_task") {
    const t = find(s.tasks, input.title_contains);
    if (!t) return { result: `No task matching "${input.title_contains}".` };
    t.status = "done";
    return { result: `Marked "${t.title}" as done.`, done: { action: "Task done", detail: t.title } };
  }
  return { result: `Unknown tool ${name}.` };
}
