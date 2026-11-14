import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Task } from "./data";

const LOCAL_TASKS = "p-genie-tasks-v1";
const LOCAL_OWNER = "p-genie-owner-v1";

let client: SupabaseClient | null | undefined;

export function ownerToken() {
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

export function getSupabase(): SupabaseClient | null {
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

export type AccountUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  provider: string | null;
};

function firstString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

export function toAccountUser(
  user:
    | {
        id: string;
        email?: string | null;
        user_metadata?: Record<string, unknown>;
        app_metadata?: Record<string, unknown>;
      }
    | null
    | undefined,
): AccountUser | null {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  const name = firstString(
    meta.full_name,
    meta.name,
    meta.display_name,
    meta.preferred_username,
    meta.user_name,
    meta.custom_claims && (meta.custom_claims as Record<string, unknown>).name,
  );
  // Google ส่ง avatar_url / picture, Discord ส่ง avatar_url
  const avatarUrl = firstString(meta.avatar_url, meta.picture, meta.avatar);
  const provider = firstString(user.app_metadata?.provider);
  return { id: user.id, email: user.email ?? null, name, avatarUrl, provider };
}

// ล็อกอินด้วย Google หรือ LINE ครั้งแรกจะสมัครบัญชีให้เลย
let providerCache: Record<string, boolean> | null = null;

// เช็กก่อนว่าผู้ให้บริการล็อกอินถูกเปิดใน Supabase แล้วหรือยัง
export async function enabledProviders(): Promise<Record<string, boolean>> {
  if (providerCache) return providerCache;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return {};

  try {
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
    });
    const json = (await res.json()) as { external?: Record<string, boolean> };
    providerCache = json.external ?? {};
  } catch {
    providerCache = {};
  }

  return providerCache;
}

export async function signInWith(
  provider: "google" | "discord",
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return "ยังไม่ได้ตั้งค่า Supabase";

  const enabled = await enabledProviders();
  if (!enabled[provider]) return "provider is not enabled";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}${window.location.pathname}`,
      skipBrowserRedirect: true,
    },
  });

  if (error) return error.message;
  if (!data?.url) return "เปิดหน้าล็อกอินไม่สำเร็จ";

  window.location.assign(data.url);
  return null;
}

export async function signOutNow(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function currentUserId(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

// งานที่จดไว้ตอนยังไม่ล็อกอิน ย้ายเข้าบัญชีให้อัตโนมัติครั้งแรก
export async function claimGuestData(userId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const token = ownerToken();
  await supabase
    .from("tasks")
    .update({ user_id: userId })
    .eq("owner_token", token)
    .is("user_id", null);

  await supabase
    .from("folders")
    .update({ user_id: userId })
    .eq("owner_token", token)
    .is("user_id", null);
}

function readLocal(): Task[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_TASKS);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Task[]) : [];
  } catch {
    return [];
  }
}function writeLocal(tasks: Task[]) {
  try {
    window.localStorage.setItem(LOCAL_TASKS, JSON.stringify(tasks));
  } catch {
    // พื้นที่เก็บเต็ม ไม่เป็นไร ยังใช้หน้านี้ต่อได้
  }
}

export async function listTasks(): Promise<Task[]> {
  const supabase = getSupabase();
  if (!supabase) return readLocal();

  const { data, error } = await supabase
    .from("tasks")
    .select("id,title,subject,due,urgent,done,created_at")
    .order("created_at", { ascending: false });

  if (error || !data) return readLocal();

  return data.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    subject: String(row.subject),
    due: String(row.due),
    createdAt: String(row.created_at),
    urgent: Boolean(row.urgent),
    done: Boolean(row.done),
  }));
}

export async function addTasks(tasks: Task[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    writeLocal([...tasks, ...readLocal()]);
    return;
  }

  const token = ownerToken();
  const userId = await currentUserId();
  const { error } = await supabase.from("tasks").insert(
    tasks.map((t) => ({
      id: t.id,
      owner_token: token,
      user_id: userId,
      title: t.title,
      subject: t.subject,
      due: t.due,
      urgent: t.urgent ?? false,
      done: t.done,
    })),
  );

  // ยังไม่ได้รัน setup.sql หรือเน็ตหลุด เก็บสำรองในเครื่องไว้ก่อน งานจะไม่หาย
  if (error) writeLocal([...tasks, ...readLocal()]);
}

export async function setTaskDone(id: string, done: boolean): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    writeLocal(readLocal().map((t) => (t.id === id ? { ...t, done } : t)));
    return;
  }

  await supabase.from("tasks").update({ done }).eq("id", id);
}

export async function updateTaskDue(
  id: string,
  due: string,
  urgent: boolean,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    writeLocal(
      readLocal().map((t) => (t.id === id ? { ...t, due, urgent } : t)),
    );
    return;
  }

  await supabase.from("tasks").update({ due, urgent }).eq("id", id);
}

export async function deleteTask(id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    writeLocal(readLocal().filter((t) => t.id !== id));
    return;
  }

  await supabase.from("tasks").delete().eq("id", id);
}

// เปลี่ยนชื่อวิชาในการบ้านทั้งหมด เมื่อผู้ใช้แก้ชื่อโฟลเดอร์
export async function renameTaskSubject(
  oldName: string,
  newName: string,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    writeLocal(
      readLocal().map((t) =>
        t.subject === oldName ? { ...t, subject: newName } : t,
      ),
    );
    return;
  }

  await supabase
    .from("tasks")
    .update({ subject: newName })
    .eq("subject", oldName);
}
