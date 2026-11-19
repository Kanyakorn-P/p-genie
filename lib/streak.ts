// ไฟรายวัน (daily check-in streak) เก็บไว้ในเครื่องผู้ใช้
// ใช้เวลาไทยเป็นหลักเหมือนส่วนอื่นของแอป เพื่อไม่ให้วันเพี้ยนตอนเที่ยงคืน

export type FireData = {
  last: string; // วันที่เติมไฟล่าสุด รูปแบบ YYYY-MM-DD (เวลาไทย)
  streak: number; // จำนวนวันติดกัน
  best: number; // สถิติสูงสุด
  total: number; // เติมไฟทั้งหมดกี่ครั้ง
};

const FIRE_KEY = "p-genie-fire-v1";
const FIRE_EVENT = "p-genie-fire";

const EMPTY_FIRE: FireData = { last: "", streak: 0, best: 0, total: 0 };

function dateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function fireTodayKey() {
  return dateKey(new Date());
}

// วันก่อนหน้าของคีย์ YYYY-MM-DD (คำนวณแบบ UTC เพื่อไม่โดน timezone กวน)
function dayBefore(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate(),
  )}`;
}

export function readFire(): FireData {
  try {
    const raw = window.localStorage.getItem(FIRE_KEY);
    if (!raw) return EMPTY_FIRE;
    const parsed = JSON.parse(raw) as Partial<FireData>;
    return {
      last: typeof parsed.last === "string" ? parsed.last : "",
      streak: Number(parsed.streak) || 0,
      best: Number(parsed.best) || 0,
      total: Number(parsed.total) || 0,
    };
  } catch {
    return EMPTY_FIRE;
  }
}

// อ่านค่าเดิมซ้ำ ๆ ต้องได้ object เดิม (useSyncExternalStore ใช้เทียบว่าเปลี่ยนไหม)
let snapshotRaw: string | null = null;
let snapshotData: FireData = EMPTY_FIRE;

export function getFireSnapshot(): FireData {
  const raw = window.localStorage.getItem(FIRE_KEY) ?? "";
  if (raw !== snapshotRaw) {
    snapshotRaw = raw;
    snapshotData = raw ? readFire() : EMPTY_FIRE;
  }
  return snapshotData;
}

export function getFireServerSnapshot(): FireData {
  return EMPTY_FIRE;
}

export function subscribeFire(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(FIRE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(FIRE_EVENT, onChange);
  };
}

export function checkedInToday(data: FireData = readFire()) {
  return data.last === fireTodayKey();
}

// ไฟยังไม่ขาดถ้าเติมล่าสุดเมื่อวาน (วันนี้ยังเติมต่อได้)
export function activeStreak(data: FireData = readFire()) {
  const today = fireTodayKey();
  if (data.last === today) return data.streak;
  if (data.last === dayBefore(today)) return data.streak;
  return 0;
}

export function checkInFire(): {
  data: FireData;
  already: boolean;
  streakBefore: number;
} {
  const data = readFire();
  const today = fireTodayKey();

  if (data.last === today) {
    return { data, already: true, streakBefore: data.streak };
  }

  const streak = data.last === dayBefore(today) ? data.streak + 1 : 1;
  const next: FireData = {
    last: today,
    streak,
    best: Math.max(data.best, streak),
    total: data.total + 1,
  };

  try {
    window.localStorage.setItem(FIRE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(FIRE_EVENT));
  } catch {
    // เก็บไม่ได้ก็ยังนับในหน่วยความจำได้
  }

  const result = { data: next, already: false, streakBefore: data.streak };
  return result;
}
