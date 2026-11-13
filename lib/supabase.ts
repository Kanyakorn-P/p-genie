import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Task } from "./data";

const LOCAL_TASKS = "p-genie-tasks-v1";
const LOCAL_OWNER = "p-genie-owner-v1";

let client: SupabaseClient | null | undefined;

function ownerToken() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("room");
    if (fromUrl) {
      window.localStorage.setItem(LOCAL_OWNER, fromUrl);
      return fromUrl;
    }

    let token = window.localStorage.getItem(LOCAL_OWNER);
    if (!token) {
      token = crypto.randomUUID();
      window.localStorage.setItem(LOCAL_OWNER, token);
    }
    return token;
  } catch {
    return "local-only";
  }
}

function getClient() {
  if (client !== undefined) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (typeof window === "undefined" || !url || !key) {
    client = null;
    return client;
  }

  client = createClient(url, key, {
    global: { headers: { "x-owner-token": ownerToken() } },
  });
  return client;
}

function readLocal(): Task[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_TASKS);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Task[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(tasks: Task[]) {
  try {
    window.localStorage.setItem(LOCAL_TASKS, JSON.stringify(tasks));
  } catch {
    // พื้นที่เก็บเต็ม ไม่เป็นไร ยังใช้หน้านี้ต่อได้
  }
}

export async function listTasks(): Promise<Task[]> {
  const supabase = getClient();
  if (!supabase) return readLocal();

  const { data, error } = await supabase
    .from("tasks")
    .select("id,title,subject,due,urgent,done")
    .order("created_at", { ascending: false });

  if (error || !data) return readLocal();

  return data.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    subject: row.subject as Task["subject"],
    due: String(row.due),
    urgent: Boolean(row.urgent),
    done: Boolean(row.done),
  }));
}

export async function addTasks(tasks: Task[]): Promise<void> {
  const supabase = getClient();
  if (!supabase) {
    writeLocal([...tasks, ...readLocal()]);
    return;
  }

  const token = ownerToken();
  await supabase.from("tasks").insert(
    tasks.map((t) => ({
      id: t.id,
      owner_token: token,
      title: t.title,
      subject: t.subject,
      due: t.due,
      urgent: t.urgent ?? false,
      done: t.done,
    })),
  );
}

export async function setTaskDone(id: string, done: boolean): Promise<void> {
  const supabase = getClient();
  if (!supabase) {
    writeLocal(readLocal().map((t) => (t.id === id ? { ...t, done } : t)));
    return;
  }

  await supabase.from("tasks").update({ done }).eq("id", id);
}

export async function deleteTask(id: string): Promise<void> {
  const supabase = getClient();
  if (!supabase) {
    writeLocal(readLocal().filter((t) => t.id !== id));
    return;
  }

  await supabase.from("tasks").delete().eq("id", id);
}
