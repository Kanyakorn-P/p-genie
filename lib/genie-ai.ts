export type AiTask = {
  title: string;
  subject: string;
  due: string;
  urgent: boolean;
};

export type AiResult = {
  tasks: AiTask[];
  reply: string;
  folders: string[];
};

export type AiMode = "economy" | "balanced" | "smart";

// ถามพี่จินนี่ (Gemini) ผ่าน API ในแอป ถ้าพลาดคืน null ให้ไปใช้กฎในเครื่องแทน
export async function askGenie(
  text: string,
  folders: string[],
  mode: AiMode = "economy",
): Promise<AiResult | null> {
  try {
    const res = await fetch("/api/genie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, folders, mode }),
      signal: AbortSignal.timeout(28000),
    });

    if (!res.ok) return null;

    const json = (await res.json()) as Partial<AiResult>;
    if (!Array.isArray(json.tasks)) return null;

    return {
      tasks: json.tasks,
      reply: typeof json.reply === "string" ? json.reply : "",
      folders: Array.isArray(json.folders)
        ? json.folders.filter((f): f is string => typeof f === "string")
        : [],
    };
  } catch {
    return null;
  }
}
