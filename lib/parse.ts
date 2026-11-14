import { NO_SUBJECT } from "./data";

export type ParsedTask = {
  title: string;
  subject: string;
  due: string;
  urgent: boolean;
};

const SUBJECT_REGEX =
  /(ฟิสิกส์|ฟิ|ภาษาไทย|ไทย|คณิตศาสตร์|คณิต|เลข|สังคมศึกษา|สังคม|ภาษาอังกฤษ|อังกฤษ|อิ๊ง|ชีววิทยา|ชีวะ|วิทยาศาสตร์|วิทย์|เคมี)/g;

function toSubject(word: string): string {
  if (word.startsWith("ฟิ")) return "ฟิสิกส์";
  if (word.startsWith("คณิต") || word === "เลข") return "คณิต";
  if (word.includes("ไทย")) return "ไทย";
  if (word.includes("อังกฤษ") || word === "อิ๊ง") return "อังกฤษ";
  if (word.includes("สังคม")) return "สังคม";
  if (word.startsWith("ชีว")) return "ชีววิทยา";
  if (word.startsWith("วิทย")) return "วิทยาศาสตร์";
  if (word.includes("เคมี")) return "เคมี";
  return NO_SUBJECT;
}

const WEEKDAYS: Record<string, string> = {
  จันทร์: "วันจันทร์",
  อังคาร: "วันอังคาร",
  พุธ: "วันพุธ",
  พฤหัสบดี: "วันพฤหัสบดี",
  พฤหัส: "วันพฤหัสบดี",
  ศุกร์: "วันศุกร์",
  เสาร์: "วันเสาร์",
  อาทิตย์: "วันอาทิตย์",
};

type DueResult = { label: string; raw: string };

function detectDue(text: string): DueResult | null {
  const rules: { re: RegExp; label: (m: RegExpMatchArray) => string }[] = [
    { re: /มะรืนนี้|มะรืน/, label: () => "มะรืนนี้" },
    { re: /พรุ่งนี้/, label: () => "พรุ่งนี้" },
    { re: /วันนี้/, label: () => "วันนี้" },
    {
      re: /อีก\s*\d+\s*วัน/,
      label: (m) => m[0].replace(/\s+/g, " ").trim(),
    },
    {
      re: /\d{1,2}\s*(?:ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)/,
      label: (m) => m[0].replace(/\s+/g, " ").trim(),
    },
    {
      re: /\d{1,2}\s*(?:มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)/,
      label: (m) => m[0].replace(/\s+/g, " ").trim(),
    },
    { re: /สัปดาห์หน้า/, label: () => "สัปดาห์หน้า" },
    {
      re: /(?:วัน)?\s*(จันทร์|อังคาร|พุธ|พฤหัสบดี|พฤหัส|ศุกร์|เสาร์|อาทิตย์)\s*(หน้า|นี้)?/,
      label: (m) => {
        const base = WEEKDAYS[m[1]] ?? `วัน${m[1]}`;
        return `${base}${m[2] ?? ""}`;
      },
    },
  ];

  for (const rule of rules) {
    const m = text.match(rule.re);
    if (m) return { label: rule.label(m), raw: m[0] };
  }
  return null;
}

function cleanTitle(raw: string, subject: string, due: DueResult | null) {
  let t = raw;
  if (due) t = t.replace(due.raw, " ");
  t = t.replace(SUBJECT_REGEX, " ");
  t = t.replace(/ส่ง/g, " ");
  t = t.replace(/^[\s,]*(และ|กับ|ส่วน|ทำ|จด|การบ้าน|งาน|ช่วย|ให้)+[\s,]*/g, "");
  t = t.replace(/[.,;:!?()"'“”]+/g, " ");
  t = t.replace(/\s+/g, " ").trim();

  if (!t) return subject === NO_SUBJECT ? "การบ้าน" : `การบ้าน${subject}`;
  if (/^หน้า\s*\d/.test(t)) t = `การบ้าน${t}`;
  if (/^\d/.test(t)) t = `การบ้าน ${t}`;
  return t.length > 90 ? `${t.slice(0, 88)}…` : t;
}

export function parseTasks(input: string): ParsedTask[] {
  const text = input.replace(/\r/g, " ").trim();
  if (text.length < 2) return [];

  const chunks = text
    .split(/[,;\n|+]|และ/)
    .map((c) => c.trim())
    .filter((c) => c.length > 1);

  const tasks: ParsedTask[] = [];

  for (const chunk of chunks.length > 0 ? chunks : [text]) {
    const matches = [...chunk.matchAll(SUBJECT_REGEX)];
    const segments: { subject: string; text: string }[] = [];

    if (matches.length === 0) {
      segments.push({ subject: NO_SUBJECT, text: chunk });
    } else {
      matches.forEach((m, i) => {
        const start = m.index ?? 0;
        const end =
          i + 1 < matches.length
            ? (matches[i + 1].index ?? chunk.length)
            : chunk.length;
        let part = chunk.slice(start, end);
        if (i === 0 && start > 0) part = `${chunk.slice(0, start)} ${part}`;
        segments.push({ subject: toSubject(m[0]), text: part });
      });
    }

    for (const segment of segments) {
      const due = detectDue(segment.text);
      tasks.push({
        title: cleanTitle(segment.text, segment.subject, due),
        subject: segment.subject,
        due: due?.label ?? "ยังไม่ระบุวันส่ง",
        urgent: due ? ["วันนี้", "พรุ่งนี้", "มะรืนนี้"].includes(due.label) : false,
      });
    }
  }

  return tasks;
}
