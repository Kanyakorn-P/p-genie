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
  folders: string[];
};

const ATTEMPT_TIMEOUT_MS = 6000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const SYSTEM_PROMPT = `You are "พี่จินนี่" (P' Genie), a friendly Thai study buddy inside a homework to-do app.
Your job: read what the student typed (usually Thai, sometimes messy or with typos) and turn it into homework items.

Rules:
- Reply in casual Thai, like an older friend. Warm, short, no em dashes, no formal words.
- First decide the intent: casual conversation, homework entry, folder action, or question about existing homework. Never turn casual conversation into a task.
- Treat a message as homework only when it contains an actual assignment, study task, exam, exercise, or clear request to record work. A vague message like "มีการบ้านเพิ่ม" should ask for details, not become a task.
- Split into separate tasks when the student mentions several homeworks in one message.
- title: what the homework is, short and clear, keep important details (page, chapter, exercise numbers).
- subject: pick the school subject. Use the full Thai name, never an abbreviation: คณิต, ไทย, อังกฤษ, วิทยาศาสตร์, ฟิสิกส์, เคมี, ชีววิทยา, สังคม, อื่นๆ. Prefer one of the student's folders when it fits.
- Understand Thai school slang: ฟิ or ฟิสิกส์ = ฟิสิกส์, เลข or คณิต = คณิต, ชีวะ or ชีวะวิทยา = ชีววิทยา, อิ๊ง or อังกฤษ = อังกฤษ, วิทย์ = วิทยาศาสตร์, สังคมศึกษา = สังคม, ไทย = ไทย, เคมี = เคมี.
- Correct common typos and speech-to-text mistakes: ฟิสิก, ฟิสิกส์, ฟิ = ฟิสิกส์; คณิด, คณิต = คณิต; วิท, วิทย์ = วิทยาศาสตร์; ชีวะ = ชีววิทยา; การบ้านน = การบ้าน. Keep the intended meaning instead of copying the typo into the task.
- Understand topic clues: เซล or เซลล์ means ชีววิทยา, even when the student says วิทย์. For example, งานวิทย์เรื่องเซลล์ must go to ชีววิทยา.
- due: copy the deadline wording from the message (วันนี้, พรุ่งนี้, มะรืนนี้, วันศุกร์, สัปดาห์หน้า, 12 ม.ค., 30/11 ...). If there is no deadline, use "ยังไม่ระบุวันส่ง".
- urgent: true only when due is วันนี้, พรุ่งนี้ or มะรืนนี้.
- Words about weather, body, mood, or feelings such as ร้อน, หนาว, หิว, งง, เบื่อ, เหนื่อย, เครียด, ปวดหัว are conversation unless the student clearly connects them to homework.
- folders: list of folder names that should exist in the app. Always include the subject of every task you return. If the student asks to organise or separate their homework into folders, add those folder names too. If the student mentions a folder that is not in their current list, add it. Use the same full Thai subject names. Never repeat a name that is already in the student's folder list.
- Do not create a folder named อื่นๆ.
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
    folders: { type: "array", items: { type: "string" } },
  },
  required: ["tasks", "reply", "folders"],
};

const SUBJECT_EXACT: Record<string, string> = {
  ภาษาไทย: "ไทย",
  ภาษาอังกฤษ: "อังกฤษ",
  คณิตศาสตร์: "คณิต",
  สังคมศึกษา: "สังคม",
  เลข: "คณิต",
  อิ๊ง: "อังกฤษ",
  ชีวะ: "ชีววิทยา",
  วิทย์: "วิทยาศาสตร์",
  ฟิ: "ฟิสิกส์",
};

function normalizeSubjectName(name: string) {
  return SUBJECT_EXACT[name] ?? name;
}

function cleanTask(raw: unknown): GenieTask | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  const title = typeof t.title === "string" ? t.title.trim() : "";
  if (!title) return null;
  let subject =
    typeof t.subject === "string" && t.subject.trim()
      ? normalizeSubjectName(t.subject.trim())
      : "อื่นๆ";
  if (
    subject === "วิทยาศาสตร์" &&
    /เซล(?:ล์)?/.test(title)
  ) {
    subject = "ชีววิทยา";
  }
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

  let body: { text?: unknown; folders?: unknown; mode?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "อ่านข้อความไม่ได้" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim().slice(0, 800) : "";
  if (!text) {
    return NextResponse.json({ error: "ยังไม่มีข้อความ" }, { status: 400 });
  }
  const mode = body.mode === "balanced" ? "balanced" : "economy";

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
      maxOutputTokens: 300,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  let lastError = "ต่อ Gemini ไม่ได้";
  const startedAt = Date.now();
  const BUDGET_MS = 15000;
  const quickRequest =
    text.length <= 90 &&
    !/(และ|กับ|หลาย|แยก|โฟลเดอร์|ช่วยจัด|ช่วยคิด|อะไรบ้าง|ไหนบ้าง)/.test(text);
  // งานสั้นใช้ Lite ให้ไว งานหลายเงื่อนไขใช้รุ่นเต็มให้เข้าใจแม่นกว่า
  const models =
    mode === "balanced"
      ? ["gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-flash-lite-latest"]
      : quickRequest
        ? ["gemini-flash-lite-latest", "gemini-flash-latest", "gemini-3.1-flash-lite"]
        : ["gemini-flash-lite-latest", "gemini-flash-latest", "gemini-3.1-flash-lite"];

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

        const parsed = JSON.parse(raw) as {
          tasks?: unknown;
          reply?: unknown;
          folders?: unknown;
        };
        const tasks = Array.isArray(parsed.tasks)
          ? parsed.tasks.map(cleanTask).filter((t): t is GenieTask => t !== null)
          : [];
        const reply =
          typeof parsed.reply === "string" && parsed.reply.trim()
            ? parsed.reply.trim().slice(0, 400)
            : "";

        const folders = Array.isArray(parsed.folders)
          ? [
              ...new Set(
                parsed.folders
                  .filter((f): f is string => typeof f === "string")
                  .map((f) => normalizeSubjectName(f.trim().slice(0, 40)))
                  .filter((f) => f.length > 0 && f !== "อื่นๆ"),
              ),
            ].slice(0, 6)
          : [];

        const result: GenieResult = { tasks: tasks.slice(0, 8), reply, folders };
        return NextResponse.json(result);
      } catch (error) {
        lastError = error instanceof Error ? error.message : "ต่อ Gemini ไม่ได้";
      }
    }

    if (round === 0) await sleep(600);
  }

  return NextResponse.json({ error: lastError }, { status: 502 });
}
