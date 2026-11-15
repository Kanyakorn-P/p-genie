import { NextResponse } from "next/server";
import { formatDueDate, resolveDue, daysBetween } from "@/lib/due-date";

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

// เวลาที่ไทยอาจต่างจากเซิร์ฟเวอร์ ต้องยึดวันที่ไทยเป็นหลัก
function bangkokToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return new Date(get("year"), get("month") - 1, get("day"));
}

function thaiDateLine(today: Date) {
  const weekday = new Intl.DateTimeFormat("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(today);
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return `Today is ${weekday} (${iso} Gregorian, ${today.getFullYear() + 543} BE).`;
}

const SYSTEM_PROMPT = `You are "พี่จินนี่" (P' Genie), a friendly Thai study buddy and personal task helper. The app is mainly for homework, but it can also keep the student's everyday to-dos.
Your job: understand what the student typed (usually Thai, sometimes messy or with typos), answer questions from their saved list, and create tasks only when they clearly want to remember or do something.

Rules:
- Reply in casual Thai, like an older friend. Warm, short, no em dashes, no formal words.
- First decide the intent: casual conversation, homework, everyday to-do, folder action, or question about saved tasks. Never turn casual conversation into a task.
- Homework remains the main use case. Record a homework task when there is an actual assignment, study task, exam, exercise, or clear request to record it. Also record other concrete actions such as appointments, errands, chores, calls, payments, and activities when the student asks to remember them or clearly gives a future task.
- Do not turn a vague intention, wish, question, or casual plan into a task unless the student clearly wants it saved. For example, "อย่าลืมซื้อยาเย็นนี้", "ช่วยจดนัดหมอฟันวันศุกร์", and "พรุ่งนี้ต้องจ่ายค่าไฟ" are tasks; "อยากไปเที่ยวจัง" and "พรุ่งนี้อากาศเป็นไง" are not.
- A vague message like "มีการบ้านเพิ่ม" or "มีงานเพิ่ม" should ask for details, not become a task.
- Split into separate tasks when the student mentions several assignments or actions in one message.
- title: what the task is, short and clear. Keep important homework details (page, chapter, exercise numbers); keep appointment times, places, and other useful details for everyday tasks.
- subject: for homework, pick the school subject. Use the full Thai name, never an abbreviation: คณิต, ไทย, อังกฤษ, วิทยาศาสตร์, ฟิสิกส์, เคมี, ชีววิทยา, สังคม. For a non-homework task use "งานทั่วไป", unless one of the student's existing folders clearly fits. Prefer an existing folder when appropriate.
- Understand Thai school slang: ฟิ or ฟิสิกส์ = ฟิสิกส์, เลข or คณิต = คณิต, ชีวะ or ชีวะวิทยา = ชีววิทยา, อิ๊ง or อังกฤษ = อังกฤษ, วิทย์ = วิทยาศาสตร์, สังคมศึกษา = สังคม, ไทย = ไทย, เคมี = เคมี.
- Correct common typos and speech-to-text mistakes: ฟิสิก, ฟิสิกส์, ฟิ = ฟิสิกส์; คณิด, คณิต = คณิต; วิท, วิทย์ = วิทยาศาสตร์; ชีวะ = ชีววิทยา; การบ้านน = การบ้าน. Keep the intended meaning instead of copying the typo into the task.
- Understand topic clues: เซล or เซลล์ means ชีววิทยา, even when the student says วิทย์. For example, งานวิทย์เรื่องเซลล์ must go to ชีววิทยา.
- The current date in Thailand is included with every message. Always use it to work out relative dates.
- Check weekday names against the real calendar. If today is Sunday 15 November 2026, then วันพรุ่งนี้ is Monday 16 November 2026 and วันศุกร์ is Friday 20 November 2026.
- due: copy the deadline wording from the message (วันนี้, พรุ่งนี้, มะรืนนี้, วันศุกร์, สัปดาห์หน้า, 12 ม.ค., 30/11 ...). If there is no date, use "ยังไม่ระบุกำหนด". For appointments, keep the time in the title as well because the calendar stores dates, not times.
- When the student gives a specific date, make sure day and month are not swapped. 30/11 means 30 November, never 3 November. If the year is missing and that month already passed this year, assume next year.
- The student may type with typos, no spaces, or speech-to-text errors. Read the closest intended word instead of copying the mistake.
- urgent: true only when due is วันนี้, พรุ่งนี้ or มะรืนนี้.
- Words about weather, body, mood, or feelings such as ร้อน, หนาว, หิว, งง, เบื่อ, เหนื่อย, เครียด, ปวดหัว are conversation unless the student clearly connects them to homework.
- folders: list of folder names that should exist in the app. For homework, include the subject of every homework task. For everyday tasks, use the existing folder if it fits; otherwise use the single shared folder name "งานทั่วไป" so household errands do not create many separate folders. If the student asks to organise tasks into folders, add those names too. Never repeat a name already in the student's folder list.
- Do not create a folder named อื่นๆ.
- If the message is not asking to save/do a task (greeting, question, complaint, casual conversation), return an empty tasks list and just answer in reply.
- If the same task already appears in the saved list, do not add it again. Say it is already recorded.
- Never invent tasks, dates, times, or homework that the student did not mention.

Examples:
- "ฟิสิกหน้า 45 ส่งพรุ่งนี้" -> one task: title "ทำแบบฝึกหัดหน้า 45", subject "ฟิสิกส์", due "พรุ่งนี้".
- "คณิตส่ง 30/11" -> one task, due "30/11". 30/11 is 30 November, never 3 November.
- "สอบกลางภาควิทย์วันที่ 12 ม.ค." said in November -> the exam is next year, keep due "12 ม.ค.".
- "งานชีวะเรื่องเซลล์ส่งวันศุกร์" -> subject "ชีววิทยา", due "วันศุกร์".
- "อย่าลืมซื้อยาเย็นนี้" -> one everyday task with subject "งานทั่วไป", due "วันนี้"; keep "ซื้อยา" in the title.
- "ช่วยจดนัดหมอฟันวันศุกร์ 4 โมง" -> one task, subject "งานทั่วไป", due "วันศุกร์", title includes "4 โมง".
- "พรุ่งนี้ต้องจ่ายค่าไฟ" -> one task, subject "งานทั่วไป", due "พรุ่งนี้".
- "อยากไปเที่ยวจัง" -> no tasks; reply conversationally.
- "เหนื่อยจัง" / "มีการบ้านเพิ่ม" -> no tasks, reply with a short friendly line or ask what the homework is.
- "งานอะไรบ้าง" / "พรุ่งนี้มีอะไรต้องทำ" -> no new tasks, answer using the saved tasks list.`;

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
      : "งานทั่วไป";
  if (subject === "อื่นๆ") subject = "งานทั่วไป";
  if (
    subject === "วิทยาศาสตร์" &&
    /เซล(?:ล์)?/.test(title)
  ) {
    subject = "ชีววิทยา";
  }
  const due =
    typeof t.due === "string" && t.due.trim()
      ? t.due.trim()
      : "ยังไม่ระบุกำหนด";
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

  let body: { text?: unknown; folders?: unknown; mode?: unknown; tasks?: unknown };
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
      : 'The student has no folders yet. Use school subjects for homework and "งานทั่วไป" for everyday tasks.';

  const taskList = Array.isArray(body.tasks)
    ? body.tasks
        .filter((item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object",
        )
        .slice(0, 30)
        .map((item) => ({
          title: typeof item.title === "string" ? item.title.slice(0, 100) : "",
          subject:
            typeof item.subject === "string" ? item.subject.slice(0, 40) : "",
          due: typeof item.due === "string" ? item.due.slice(0, 40) : "",
          done: item.done === true,
        }))
        .filter((item) => item.title.length > 0)
    : [];

  const taskLine =
    taskList.length > 0
      ? `The student's saved tasks and homework right now: ${taskList
          .map(
            (task) =>
              `${task.subject}: ${task.title} (due ${task.due}${task.done ? ", done" : ""})`,
          )
          .join(" | ")}. Use this list when answering questions about their homework, tasks, counts, or what is due. Never invent items that are not in this list.`
      : "The student has no saved tasks yet.";

  const today = bangkokToday();
  const dateLine = thaiDateLine(today);

  const payload = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${dateLine}\n${folderLine}\n${taskLine}\n\nข้อความจากนักเรียน: ${text}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 500,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  let lastError = "ต่อ Gemini ไม่ได้";
  const startedAt = Date.now();
  const BUDGET_MS = 16000;
  const attemptTimeout = ATTEMPT_TIMEOUT_MS;
  const quickRequest =
    text.length <= 90 &&
    !/(และ|กับ|หลาย|แยก|โฟลเดอร์|ช่วยจัด|ช่วยคิด|อะไรบ้าง|ไหนบ้าง)/.test(text);
  // ประหยัด = Lite ก่อนถ้างานง่าย, งานยากข้ามไป Flash
  // สมดุล = Flash ก่อนแล้วถอยลงมา Lite
  const models =
    mode === "balanced"
      ? ["gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-flash-lite-latest"]
      : quickRequest
        ? ["gemini-flash-lite-latest", "gemini-flash-latest", "gemini-3.1-flash-lite"]
        : ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-3.1-flash-lite"];

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
            signal: AbortSignal.timeout(attemptTimeout),
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

        // ข้อความเดียวและมีวันที่ชัดเจน ให้ใช้ตัวแปลงวันที่ในเครื่องยืนยันอีกชั้น
        // กันโมเดลสลับวันกับเดือน หรืออ่านวันที่พลาด
        const mentionsDue =
          /(ส่ง|กำหนด|ภายใน|ก่อน|เดดไลน์|deadline|วันที่|สอบ|อีก\s*\d+\s*(วัน|สัปดาห์|เดือน)|วันนี้|เช้านี้|บ่ายนี้|เย็นนี้|คืนนี้|พรุ่งนี้|มะรืน|สัปดาห์หน้า|อาทิตย์หน้า|เดือนหน้า)/.test(
            text,
          ) || /^\s*\d{1,2}\s*\/\s*\d{1,2}/.test(text);
        if (tasks.length === 1 && mentionsDue) {
          const date = resolveDue(text, today);
          if (date) {
            const diff = daysBetween(today, date);
            tasks[0].due = formatDueDate(date, today);
            tasks[0].urgent = diff >= 0 && diff <= 2;
          } else if (!tasks[0].due.includes("ไม่ระบุ")) {
            const modelDate = resolveDue(tasks[0].due, today);
            if (modelDate) {
              tasks[0].due = formatDueDate(modelDate, today);
              const diff = daysBetween(today, modelDate);
              tasks[0].urgent = diff >= 0 && diff <= 2;
            }
          }
        }
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
        return NextResponse.json(result, {
          headers: { "x-genie-model": model, "x-genie-mode": mode },
        });
      } catch (error) {
        lastError = error instanceof Error ? error.message : "ต่อ Gemini ไม่ได้";
      }
    }

    if (round === 0) await sleep(600);
  }

  return NextResponse.json({ error: lastError }, { status: 502 });
}
