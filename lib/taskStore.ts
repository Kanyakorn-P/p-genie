import type { Task } from "./data";

const KEY = "p-genie-tasks-v1";

let cached: string | null = null;
const listeners = new Set<() => void>();

export function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function getSnapshot(): string {
  if (cached === null) {
    try {
      cached = window.localStorage.getItem(KEY) ?? "[]";
    } catch {
      cached = "[]";
    }
  }
  return cached;
}

export function getServerSnapshot(): string {
  return "[]";
}

export function saveTasks(tasks: Task[]) {
  const raw = JSON.stringify(tasks);
  cached = raw;
  try {
    window.localStorage.setItem(KEY, raw);
  } catch {
    // พื้นที่เก็บเต็มหรือถูกปิดไว้ ยังใช้แอปต่อได้ในหน้านี้
  }
  listeners.forEach((listener) => listener());
}
