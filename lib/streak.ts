// ไฟรายวัน (daily check-in streak) เก็บไว้ในเครื่องผู้ใช้และซิงก์ลง Supabase
// ใช้เวลาไทยเป็นหลักเหมือนส่วนอื่นของแอป เพื่อไม่ให้วันเพี้ยนตอนเที่ยงคืน

export type FireData = {
  last: string; // วันที่เติมไฟล่าสุด รูปแบบ YYYY-MM-DD (เวลาไทย)
  streak: number; // จำนวนวันติดกัน
  best: number; // สถิติสูงสุด
  total: number; // เติมไฟทั้งหมดกี่ครั้ง
  color: string; // สีไฟปัจจุบัน (hex โดยไม่มี #)
  frozen: boolean; // ถูกล็อกสตรีค (freeze)
  userId?: string; // IDผู้ใช้ Supabase (ถ้ามีจะใช้ซิงก์ข้ามเครื่อง)
};

// ค่าเริ่มต้นสำหรับ localStorage / ยังไม่ล็อกอิน
const EMPTY_FIRE: FireData = {
  last: "",
  streak: 0,
  best: 0,
  total: 0,
  color: "fec12e", // เหลืองอ่อน
  frozen: false,
};

// สีไฟตามสถิติ (เพื่อฟีล TikTok)
const FIRE_COLORS = [
  "fec12e", // เหลืองอ่อน (default)
  "f6ad22", // ส้ม
  "fb923c", // pink
  "ec4899", // pink deep
  "3b82f6", // blue
  "10b981", // green
  "8b5cf6", // purple
];

export const FIRE_KEY = "p-genie-fire-v1";
export const FIRE_EVENT = "p-genie-fire";

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

// ---------- localStorage ----------
export function readFire(): FireData {
  try {
    const raw = window.localStorage.getItem(FIRE_KEY);
    if (!raw) return { ...EMPTY_FIRE, color: "fec12e", frozen: false };
    const parsed = JSON.parse(raw) as Partial<FireData>;
    return {
      last: typeof parsed.last === "string" ? parsed.last : "",
      streak: Number(parsed.streak) || 0,
      best: Number(parsed.best) || 0,
      total: Number(parsed.total) || 0,
      color: typeof parsed.color === "string" ? parsed.color : "fec12e",
      frozen: typeof parsed.frozen === "boolean" ? parsed.frozen : false,
    };
  } catch {
    return { ...EMPTY_FIRE, color: "fec12e", frozen: false };
  }
}

// อ่านค่าเดิมซ้ำ ๆ ต้องได้ object เดิม
let snapshotRaw: string | null = null;
let snapshotData: FireData = { ...EMPTY_FIRE };

export function getFireSnapshot(): FireData {
  const raw = window.localStorage.getItem(FIRE_KEY) ?? "";
  if (raw !== snapshotRaw) {
    snapshotRaw = raw;
    snapshotData = raw ? readFire() : { ...EMPTY_FIRE, color: "fec12e", frozen: false };
  }
  return snapshotData;
}

// ---------- Supabase sync (เบื้องต้น) ----------
let supabase: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
// let subscribedUsers: Set<string> = new Set(); // ไม่ได้ใช้ เก็บไว้ใน DailyFire เอง

export function initSupabase(supabaseInstance: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  supabase = supabaseInstance;
}

export function setUserId(userId: string) {
  // บันทึก userId ลง localStorage เพื่อให้ streak.ts ใช้ร่วมกับ localStorage ได้
  try {
    window.localStorage.setItem("p-genie-user-id", userId);
  } catch {}
}

export function getUserId(): string | null {
  try {
    return window.localStorage.getItem("p-genie-user-id");
  } catch {
    return null;
  }
}

// อัปเดตสถิติลง Supabase (insert-only, RLS จะจัดการ)
export async function syncFireToSupabase(fireData: FireData) {
  if (!supabase) return;
  const userId = fireData.userId || getUserId();
  if (!userId) {
    // ถ้ายังไม่ล็อกอินเก็บแค่ localStorage
    try {
      window.localStorage.setItem(FIRE_KEY, JSON.stringify(fireData));
      window.dispatchEvent(new Event(FIRE_EVENT));
    } catch {}
    return;
  }

  const { error } = await supabase
    .from("fire_streak")
    .upsert(
      {
        user_id: userId,
        last: fireData.last,
        streak: fireData.streak,
        best: fireData.best,
        total: fireData.total,
        color: fireData.color,
        frozen: fireData.frozen,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) {
    console.error("❌ syncFireToSupabase error:", error.message);
    // Fallback เก็บ localStorage
    try {
      window.localStorage.setItem(FIRE_KEY, JSON.stringify(fireData));
      window.dispatchEvent(new Event(FIRE_EVENT));
    } catch {}
  } else {
    // อัปเดต localStorage เพื่อให้ UI เร็วขึ้น
    try {
      window.localStorage.setItem(FIRE_KEY, JSON.stringify(fireData));
      window.dispatchEvent(new Event(FIRE_EVENT));
    } catch {}
  }
}

// ---------- เหตุการณ์ ----------
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

// เติมไฟ (ลงทั้ง localStorage และ Supabase ถ้ามี)
export function checkInFire(): {
  data: FireData;
  already: boolean;
  streakBefore: number;
} {
  const data = readFire();
  const today = fireTodayKey();

  // ถ้าฟรีซ (ล็อกสตรีค) ไม่ให้สตรีคดับ แต่ยังนับสถิติได้
  if (data.frozen && data.last !== today && data.last !== dayBefore(today)) {
    // สตรีคฟรีซไม่ถูกเคลียร์ แต่ไม่นับวันใหม่ เพิ่ม total ใส่ได้เฉพาะเมื่อกดเอง
    return {
      data,
      already: false, // ไม่ถือว่า "เติมซ้ำวันเดียวกัน" เพราะวันเปลี่ยนแล้ว
      streakBefore: data.streak,
    };
  }

  if (data.last === today) {
    return { data, already: true, streakBefore: data.streak };
  }

  // คำนวณสตรีคใหม่
  let streak: number;
  if (data.last === dayBefore(today)) {
    // ต่อเนื่องจากเมื่อวาน
    streak = data.streak + 1;
    // ถ้าไม่ได้ฟรีซ ก็อัปเดต best
    if (!data.frozen) {
      // สามารถอัปเดต best ได้
    }
  } else {
    // ขาดวัน หรือ ฟรีซเพิ่งจะจบไป ก็เริ่มใหม่
    streak = 1;
  }

  const best = data.best;
  const next: FireData = {
    last: today,
    streak,
    best: Math.max(best, streak),
    total: data.total + 1,
    color: FIRE_COLORS[Math.min(streak - 1, FIRE_COLORS.length - 1)],
    frozen: data.frozen,
  };

  // เก็กลงเครื่องและซิงก์ข้ามเครื่อง
  syncFireToSupabase(next);

  return { data: next, already: false, streakBefore: data.streak };
}

// เติมไฟแบบไม่ลง localStorage (สำหรับทดสอบหรือกรณีเบราว์เซอร์บล็อก)
export function chargeInMemory(data: FireData): FireData {
  const today = fireTodayKey();
  const streak = data.last === dayBefore(today) ? data.streak + 1 : 1;
  return {
    last: today,
    streak,
    best: Math.max(data.best, streak),
    total: data.total + 1,
    color: FIRE_COLORS[Math.min(streak - 1, FIRE_COLORS.length - 1)],
    frozen: data.frozen,
  };
}

// subscribe และอัปเดต UI เมื่อมีการเปลี่ยนแปลงจากอีกระบบ
export function subscribeFire(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(FIRE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(FIRE_EVENT, onChange);
  };
}

// สตรีคฟรีซ: ล็อกสตรีคให้ไม่ดับเมื่อขาดวัน (สามารถเปิด/ปิดได้จากหน้าแต่ละวัน)
export function toggleFreeze(currentData: FireData): FireData {
  const next: FireData = {
    ...currentData,
    frozen: !currentData.frozen,
  };
  try {
    window.localStorage.setItem(FIRE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(FIRE_EVENT));
  } catch {}
  return next;
}