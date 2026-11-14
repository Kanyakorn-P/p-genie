import { NextResponse } from "next/server";

type GenieTask = {
  title: string;
  subject: string;
  due: string;
  urgent: boolean;
};

type GenieResult = {
  tasks: GenieTask[];
  reply: string;
};

const FALLBACK_MODELS = ["gemini-3.8-flash", "gemini-2.5-flash"];

const ATTEMPT_TIMEOUT_MS = 8000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ถาม Google ว่าตอนนี้มีรุ่นไหนใช้ได้บ้าง (รุ่นเก่าถูกปิดไปเรื่อย ๆ)
let modelCache: { names: string[]; at: number } | null = null;

async function pickModels(key: string): Promise<string[]> {
  if (modelCache && Date.now() - modelCache.at < 10 * 60 * 1000) {
    return modelCache.names;
  }

  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models?pageSize=100",
      {
        headers: { "x-goog-api-key": key },
        signal: AbortSignal.timeout(6000),
      },
    );

    if (res.ok) {
      const json = (await res.json()) as {
        models?: { name?: string; supportedGenerationMethods?: string[] }[];
      };
      const names = (json.models ?? [])
        .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m) => (m.name ?? "").replace(/^models\//, ""))
        .filter((m) => m.includes("flash") && !m.includes("thinking"));
      if (names.length > 0) {
        modelCache = { names: names.slice(0, 4), at: Date.now() };
        return modelCache.names;
      }
    }
  } catch {
    // ใช้ลิสต์สำรองต่อ
  }

  return FALLBACK_MODELS;
}

const SYSTEM_PROMPT = `You are "พี่จินนี่" (P' Genie), a friendly Thai study buddy inside a homework to-do app.
Your job: read what the student typed (usually Thai, sometimes messy or with typos) and turn it into homework items.

Rules:
- Reply in casual Thai, like an older friend. Warm, short, no em dashes, no formal words.
- Split into separate tasks when the student mentions several homeworks in one message.
- title: what the homework is, short and clear, keep important details (page, chapter, exercise numbers).
- subject: pick the school subject. Prefer one of the student's folders if it fits. Common values: คณิต, ไทย, อังกฤษ, วิทยาศาสตร์, ฟิสิกส์, เคมี, ชีววิทยา, สังคม, อื่นๆ.
- due: copy the deadline wording from the message (วันนี้, พรุ่งนี้, มะรืนนี้, วันศุกร์, สัปดาห์หน้า, 12 ม.ค. ...). If there is no deadline, use "ยังไม่ระบุวันส่ง".
- urgent: true only when due is วันนี้, พรุ่งนี้ or มะรืนนี้.
- If the message is not about homework (greeting, question, complaint), return an empty tasks list and just answer them in reply.
- Never invent homework that the student did not mention.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    tasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          subject: { type: "string" },
          due: { type: "string" },
          urgent: { type: "boolean" },
        },
        required: ["title", "subject", "due", "urgent"],
      },
    },
    reply: { type: "string" },
  },
  required: ["tasks", "reply"],
};

function cleanTask(raw: unknown): GenieTask | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  const title = typeof t.title === "string" ? t.title.trim() : "";
  if (!title) return null;
  const subject =
    typeof t.subject === "string" && t.subject.trim()
      ? t.subject.trim()
      : "อื่นๆ";
  const due =
    typeof t.due === "string" && t.due.trim()
      ? t.due.trim()
      : "ยังไม่ระบุวันส่ง";
  return {
    title: title.slice(0, 120),
    subject: subject.slice(0, 40),
    due: due.slice(0, 40),
    urgent: t.urgent === true,
  };
}

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "ยังไม่ได้ใส่ GEMINI_API_KEY" }, { status: 503 });
  }

  let body: { text?: unknown; folders?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "อ่านข้อความไม่ได้" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim().slice(0, 800) : "";
  if (!text) {
    return NextResponse.json({ error: "ยังไม่มีข้อความ" }, { status: 400 });
  }

  const folders = Array.isArray(body.folders)
    ? body.folders
        .filter((f): f is string => typeof f === "string" && f.trim().length > 0)
        .slice(0, 20)
    : [];

  const folderLine =
    folders.length > 0
      ? `The student already made these folders: ${folders.join(", ")}. Use one of them when it fits.`
      : "The student has no folders yet, so use plain subject names.";

  const payload = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [
      {
        role: "user",
        parts: [{ text: `${folderLine}\n\nข้อความจากนักเรียน: ${text}` }],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  let lastError = "ต่อ Gemini ไม่ได้";
  const startedAt = Date.now();
  const BUDGET_MS = 15000;
  const models = await pickModels(key);

  // ลองรุ่นที่เบากว่า + ลองซ้ำอีกรอบ เผื่อ Google ตอบ 503 เพราะคนใช้เยอะ
  for (let round = 0; round < 2; round += 1) {
    for (const model of models) {
      if (Date.now() - startedAt > BUDGET_MS) {
        return NextResponse.json(
          { error: lastError || "Gemini ตอบช้าเกินไป" },
          { status: 504 },
        );
      }

      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": key,
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
          },
        );

        if (!res.ok) {
          lastError = `${model}: ${res.status} ${(await res.text()).slice(0, 160)}`;
          continue;
        }

        const json = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const raw = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!raw) {
          lastError = `${model}: ไม่มีคำตอบกลับมา`;
          continue;
        }

        const parsed = JSON.parse(raw) as { tasks?: unknown; reply?: unknown };
        const tasks = Array.isArray(parsed.tasks)
          ? parsed.tasks.map(cleanTask).filter((t): t is GenieTask => t !== null)
          : [];
        const reply =
          typeof parsed.reply === "string" && parsed.reply.trim()
            ? parsed.reply.trim().slice(0, 400)
            : "";

        const result: GenieResult = { tasks: tasks.slice(0, 8), reply };
        return NextResponse.json(result);
      } catch (error) {
        lastError = error instanceof Error ? error.message : "ต่อ Gemini ไม่ได้";
      }
    }

    if (round === 0) await sleep(600);
  }

  return NextResponse.json({ error: lastError }, { status: 502 });
}
