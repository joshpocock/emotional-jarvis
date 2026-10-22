// Jarvis's long-term memory: things you told it to keep, saved to data/memory.json so they survive a restart.
// Read from disk every turn, so you can also edit the file by hand.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

export type Memory = { kind: "preference" | "person" | "fact"; text: string; at: string };

const FILE = join(process.cwd(), "data", "memory.json");

export function memories(): Memory[] {
  if (!existsSync(FILE)) return [];
  try {
    const list = JSON.parse(readFileSync(FILE, "utf8"));
    return Array.isArray(list) ? list : [];
  } catch {
    console.warn("data/memory.json isn't valid JSON, so Jarvis is ignoring it");
    return [];
  }
}

function save(list: Memory[]) {
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(list, null, 2) + "\n");
}

export function remember(kind: Memory["kind"], text: string): Memory | null {
  const list = memories();
  if (list.some((m) => m.text.toLowerCase() === text.toLowerCase())) return null;
  const m: Memory = { kind, text, at: new Date().toISOString() };
  save([...list, m]);
  return m;
}

// Forget every memory containing the phrase. Returns what was removed.
export function forget(match: string): Memory[] {
  if (!match.trim()) return [];
  const list = memories();
  const hit = (m: Memory) => m.text.toLowerCase().includes(match.toLowerCase());
  const gone = list.filter(hit);
  if (gone.length) save(list.filter((m) => !hit(m)));
  return gone;
}
