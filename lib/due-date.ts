// แปลงข้อความวันส่งแบบไทยให้เป็นวันที่จริง
// ใช้ตัวเดียวกันทั้งแชท ปฏิทิน และการเรียงลำดับ เพื่อไม่ให้แต่ละที่เข้าใจไม่ตรงกัน

export const THAI_MONTHS_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

export const THAI_MONTHS_FULL = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const MONTH_INDEX: Record<string, number> = {
  "ม.ค.": 0,
  "ก.พ.": 1,
  "มี.ค.": 2,
  "เม.ย.": 3,
  "พ.ค.": 4,
  "มิ.ย.": 5,
  "ก.ค.": 6,
  "ส.ค.": 7,
  "ก.ย.": 8,
  "ต.ค.": 9,
  "พ.ย.": 10,
  "ธ.ค.": 11,
  "มกราคม": 0,
  "กุมภาพันธ์": 1,
  "มีนาคม": 2,
  "เมษายน": 3,
  "พฤษภาคม": 4,
  "มิถุนายน": 5,
  "กรกฎาคม": 6,
  "สิงหาคม": 7,
  "กันยายน": 8,
  "ตุลาคม": 9,
  "พฤศจิกายน": 10,
  "ธันวาคม": 11,
};

const MONTH_PATTERN =
  "ม\\.ค\\.|ก\\.พ\\.|มี\\.ค\\.|เม\\.ย\\.|พ\\.ค\\.|มิ\\.ย\\.|ก\\.ค\\.|ส\\.ค\\.|ก\\.ย\\.|ต\\.ค\\.|พ\\.ย\\.|ธ\\.ค\\.|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม";

const WEEKDAYS: { name: string; day: number }[] = [
  { name: "อาทิตย์", day: 0 },
  { name: "จันทร์", day: 1 },
  { name: "อังคาร", day: 2 },
  { name: "พุธ", day: 3 },
  { name: "พฤหัสบดี", day: 4 },
  { name: "พฤหัส", day: 4 },
  { name: "ศุกร์", day: 5 },
  { name: "เสาร์", day: 6 },
];

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function daysBetween(from: Date, to: Date) {
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  return Math.round((b - a) / 86400000);
}

// งานเก่าให้ยึดวันที่สร้างงานเป็นหลัก จะได้ไม่เลื่อนตามวันนี้ทุกครั้งที่เปิดแอป
export function anchorDate(
  createdAt?: string | number | Date | null,
): Date {
  if (createdAt === undefined || createdAt === null || createdAt === "") {
    return startOfDay(new Date());
  }
  if (createdAt instanceof Date) {
    return Number.isNaN(createdAt.getTime())
      ? startOfDay(new Date())
      : startOfDay(createdAt);
  }
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime()) ? startOfDay(new Date()) : startOfDay(date);
}

// รองรับปี พ.ศ. และปีสองหลัก เช่น 69 = 2569
function toGregorianYear(year: number) {
  if (year > 2400) return year - 543;
  if (year < 100) return year > 50 ? 1957 + year : 2000 + year;
  return year;
}

function safeDate(year: number, month: number, day: number): Date | null {
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  const date = new Date(year, month, day);
  if (date.getDate() !== day) return null;
  return date;
}

function clampMonth(date: Date, addMonths: number) {
  const year = date.getFullYear();
  const month = date.getMonth() + addMonths;
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(date.getDate(), lastDay));
}

// วันที่ไม่มีปี ถ้าเลยมาไกลมากแล้วให้ถือว่าเป็นปีหน้า เช่น พ.ย. พิมพ์ 12 ม.ค.
function rollForward(date: Date, anchor: Date, hasYear: boolean) {
  if (hasYear) return date;
  if (daysBetween(date, anchor) > 180) {
    return new Date(date.getFullYear() + 1, date.getMonth(), date.getDate());
  }
  return date;
}

export function resolveDue(
  due: string | null | undefined,
  anchor: Date = new Date(),
): Date | null {
  if (!due) return null;
  const text = due.replace(/\s+/g, " ").trim();
  if (!text || text.includes("ไม่ระบุ")) return null;

  const base = startOfDay(anchor);

  const iso = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return safeDate(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }

  if (/มะรืน/.test(text)) return addDays(base, 2);
  if (/พรุ่งนี้/.test(text)) return addDays(base, 1);
  if (/(^|[^\d])วันนี้/.test(text) || /^today$/i.test(text)) return base;

  const inDays = text.match(/อีก\s*(\d+)\s*วัน/);
  if (inDays) return addDays(base, Number(inDays[1]));

  const inWeeks = text.match(/อีก\s*(\d+)\s*สัปดาห์/);
  if (inWeeks) return addDays(base, Number(inWeeks[1]) * 7);

  const inMonths = text.match(/อีก\s*(\d+)\s*เดือน/);
  if (inMonths) return clampMonth(base, Number(inMonths[1]));

  if (/สิ้นเดือน/.test(text)) {
    return new Date(base.getFullYear(), base.getMonth() + 1, 0);
  }

  if (/ต้นเดือนหน้า/.test(text)) {
    return new Date(base.getFullYear(), base.getMonth() + 1, 1);
  }

  if (/เดือนหน้า/.test(text)) return clampMonth(base, 1);

  if (
    /สัปดาห์หน้า|สัปดาห์ถัดไป|วีคหน้า/.test(text) ||
    /(?:^|[^น])อาทิตย์หน้า/.test(text)
  ) {
    const delta = (8 - base.getDay()) % 7 || 7;
    return addDays(base, delta);
  }

  const numeric = text.match(
    /(?:^|[^\d])(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?(?!\d)/,
  );
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]) - 1;
    const hasYear = Boolean(numeric[3]);
    const year = hasYear
      ? toGregorianYear(Number(numeric[3]))
      : base.getFullYear();
    const date = safeDate(year, month, day);
    if (date) return rollForward(date, base, hasYear);
  }

  const thaiDate = text.match(
    new RegExp(
      `(?:^|[^\\d])(\\d{1,2})\\s*(${MONTH_PATTERN})\\s*(?:พ\\.?\\s*ศ\\.?|ค\\.?\\s*ศ\\.?)?\\s*(\\d{2,4})?`,
    ),
  );
  if (thaiDate) {
    const day = Number(thaiDate[1]);
    const month = MONTH_INDEX[thaiDate[2]];
    const hasYear = Boolean(thaiDate[3]);
    const year = hasYear
      ? toGregorianYear(Number(thaiDate[3]))
      : base.getFullYear();
    const date = safeDate(year, month, day);
    if (date) return rollForward(date, base, hasYear);
  }

  for (const weekday of WEEKDAYS) {
    const match = text.match(
      new RegExp(`วัน${weekday.name}\\s*(หน้า|นี้|ถัดไป)?`),
    );
    if (!match) continue;

    let delta = (weekday.day - base.getDay() + 7) % 7;
    if (match[1] === "หน้า" || match[1] === "ถัดไป") {
      delta = delta === 0 ? 7 : delta + 7;
    }
    return addDays(base, delta);
  }

  return null;
}

// ใช้กับงานที่บันทึกไว้แล้ว ให้ยึดวันสร้างงาน ไม่ใช่วันนี้
export function taskDueDate(
  task: { due: string; createdAt?: string | number | null },
  today: Date = new Date(),
): Date | null {
  return resolveDue(task.due, anchorDate(task.createdAt ?? today));
}

export function formatDueDate(date: Date, today: Date = new Date()) {
  const sameYear = date.getFullYear() === today.getFullYear();
  const suffix = sameYear ? "" : ` ${date.getFullYear() + 543}`;
  return `${date.getDate()} ${THAI_MONTHS_SHORT[date.getMonth()]}${suffix}`;
}

// วันที่แบบอ่านง่ายและไม่กำกวม ใช้ตอนบันทึกงานใหม่หรือแก้วันส่ง
export function canonicalDue(due: string, anchor: Date = new Date()) {
  const date = resolveDue(due, anchor);
  return date ? formatDueDate(date, startOfDay(anchor)) : null;
}

export function describeDue(date: Date, today: Date = new Date()) {
  const diff = daysBetween(today, date);
  if (diff === 0) return "วันนี้";
  if (diff === 1) return "พรุ่งนี้";
  if (diff === 2) return "มะรืนนี้";
  if (diff === -1) return "เมื่อวานนี้";
  if (diff < 0) return `เลยกำหนด ${Math.abs(diff)} วัน`;
  return `อีก ${diff} วัน`;
}

export function dueWithHint(due: string, today: Date = new Date()) {
  const date = resolveDue(due, today);
  if (!date) return due;
  const hint = describeDue(date, today);
  if (hint === "วันนี้" || hint === "พรุ่งนี้" || hint === "มะรืนนี้") {
    return `${due} (${hint})`;
  }
  return due;
}

export function isUrgentDue(due: string, today: Date = new Date()) {
  const date = resolveDue(due, today);
  if (!date) return false;
  const diff = daysBetween(today, date);
  return diff >= 0 && diff <= 2;
}

export function isTaskUrgent(
  task: { due: string; createdAt?: string | number | null },
  today: Date = new Date(),
) {
  const date = taskDueDate(task, today);
  if (!date) return false;
  const diff = daysBetween(today, date);
  return diff >= 0 && diff <= 2;
}

// คำตอบสั้น ๆ ตอนบอทถามวันส่ง เช่น "30/11", "วันที่ 30", "ศุกร์หน้า", "สิ้นเดือน"
export function parseDueAnswer(text: string, today: Date = new Date()) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return null;

  if (/ไม่รู้|ยังไม่รู้|ไม่มี|ไม่แน่ใจ|ยังไม่กำหนด|แล้วแต่/.test(clean)) {
    return { kind: "unknown" as const, date: null, label: "ยังไม่ระบุวันส่ง" };
  }

  const direct = resolveDue(clean, today);
  if (direct) {
    return {
      kind: "date" as const,
      date: direct,
      label: formatDueDate(direct, today),
    };
  }

  // "วันที่ 30" ไม่บอกเดือน ให้ใช้เดือนนี้ ถ้าเลยไปแล้วใช้เดือนหน้า
  const dayOnly = clean.match(/^(?:วันที่\s*)?(\d{1,2})(?:\s*ที่)?$/);
  if (dayOnly) {
    const day = Number(dayOnly[1]);
    const base = startOfDay(today);
    let date = safeDate(base.getFullYear(), base.getMonth(), day);
    if (!date || date < base) {
      date = safeDate(base.getFullYear(), base.getMonth() + 1, day);
    }
    if (date) {
      return {
        kind: "date" as const,
        date,
        label: formatDueDate(date, today),
      };
    }
  }

  // "สิ้นเดือนนี้" / "ต้นเดือนหน้า" ถูกจับไปแล้วใน resolveDue
  return null;
}
