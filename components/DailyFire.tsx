"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  activeStreak,
  checkInFire,
  checkedInToday,
  getFireSnapshot,
  readFire,
  type FireData,
  FIRE_KEY,
  FIRE_EVENT,
  subscribeFire,
} from "@/lib/streak";
import { IconClose } from "./ui-icons";

const MILESTONES = [3, 7, 14, 30];
const DAY_LABELS = ["1", "2", "3", "4", "5", "6", "7"];

export function DailyFire({
  ready,
  paused = false,
}: {
  ready: boolean;
  paused?: boolean;
}) {
  const data = useSyncExternalStore(
    subscribeFire,
    getFireSnapshot,
    () => ({
      last: "",
      streak: 0,
      best: 0,
      total: 0,
      color: "fec12e",
      frozen: false,
    }),
  );
  const [open, setOpen] = useState(false);
  const [justCharged, setJustCharged] = useState(false);
  const prompted = useRef(false);
  const animationRef = useRef<HTMLDivElement>(null);

  // ชวนเติมไฟวันละครั้งหลังโหลดหน้าเสร็จ (ไม่เด้งทับหน้าแนะนำ)
  useEffect(() => {
    if (!ready || prompted.current || paused) return;
    if (checkedInToday(data)) {
      prompted.current = true;
      return;
    }
    prompted.current = true;
    const timer = window.setTimeout(() => setOpen(true), 900);
    return () => window.clearTimeout(timer);
  }, [ready, paused, data]);

  // ตอน prerender ยังไม่รู้ "วันนี้" ของผู้ใช้ เลยรอให้พร้อมก่อนค่อยคำนวณ
  const streak = ready ? activeStreak(data) : 0;
  const checked = ready ? checkedInToday(data) : false;
  const cycleDay = Math.min(streak, 7);
  const nextSlot = checked ? cycleDay : Math.min(cycleDay + 1, 7);
  const visible = open && !paused;

  // ฟังก์ชันเฉลิมฉลอง (เสียง + แอนิเมชัน)
  const playCelebration = () => {
    // 1. เรียกเสียงป๊๊ป (ถ้าเบราว์เซอร์อนุญาต)
    try {
      // $FlowFixMe - AudioContext อาจเป็น undefined ในบางสภาพแวดล้อม
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 880; // A5
      gainNode.gain.value = 0.3;
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch {
      // เบราว์เซอร์อาจบล็อกเสียงตอน prerender ให้ข้ามไป
    }

    // 2. แอนิเมชันกระบอกไฟพอง
    try {
      const canvasRef = animationRef.current;
      if (!canvasRef) return;
      const canvas = document.createElement("canvas");
      canvas.width = canvasRef.clientWidth || 100;
      canvas.height = canvasRef.clientHeight || 100;
      canvasRef.appendChild(canvas);

      const ctx = canvas.getContext("2d")!;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      let radius = 10;
      const particles: {
        x: number;
        y: number;
        vx: number;
        vy: number;
        color: string;
        size: number;
      }[] = [];

      // สร้างอนุภาคระเบิด
      for (let i = 0; i < 20; i++) {
        const angle = (Math.PI * 2 * i) / 20;
        const speed = 2 + Math.random() * 3;
        particles.push({
          x: centerX,
          y: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: data.color,
          size: 2 + Math.random() * 4,
        });
      }

      const frame = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        radius += 2;
        ctx.strokeStyle = "#f6ad22";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();

        particles.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.96;
          p.vy *= 0.96;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
          ctx.fill();
        });

        const anyOutside =
          radius < canvas.width &&
          particles.some(
            (p) =>
              p.x > 0 &&
              p.x < canvas.width &&
              p.y > 0 &&
              p.y < canvas.height,
          );
        if (anyOutside) {
          requestAnimationFrame(frame);
        } else {
          try {
            canvasRef.removeChild(canvas);
          } catch {}
        }
      };

      requestAnimationFrame(frame);
    } catch {
      // ข้ามไปหาก Canvas ไม่รองรับ
    }
  };

  function charge() {
    const result = checkInFire();
    if (!result.already) {
      setJustCharged(true);
      playCelebration();
    }
  }

  // เมื่อจบแอนิเมชันแล้วให้รีเซ็ต justCharged
  useEffect(() => {
    if (justCharged && animationRef.current) {
      // รอให้แอนิเมชันค่อนค้างสักครู่แล้วค่อยรีเซ็ต
      const timeout = setTimeout(() => setJustCharged(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [justCharged]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setJustCharged(false);
          setOpen(true);
        }}
        aria-label="เติมไฟรายวัน"
        title="เติมไฟรายวัน"
        className="focus-ring relative flex h-9 items-center gap-1 rounded-full border border-line bg-paper px-2.5 text-navy transition hover:border-blue"
      >
        <span
          className={`text-[15px] leading-none transition ${
            checked ? "" : "grayscale"
          }`}
        >
          🔥
        </span>
        <span className="font-mali hidden min-w-[10px] text-[12px] font-bold sm:inline">
          {ready ? streak : "–"}
        </span>
        {ready && !checked && (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red ring-2 ring-paper" />
        )}
      </button>

      {visible && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 px-3 pb-3 backdrop-blur-[2px] sm:items-center sm:pb-0">
          <button
            aria-label="ปิดหน้าต่างเติมไฟ"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="fire-title"
            className="soft-shadow relative z-10 w-full max-w-[380px] rounded-3xl border border-line bg-paper p-5 text-center"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="ปิด"
              className="focus-ring absolute right-3 top-3 rounded-full p-1 text-muted transition hover:bg-cream hover:text-navy"
            >
              <IconClose size={16} />
            </button>

            <div
              className={`relative mx-auto mt-3 grid h-[104px] w-[104px] place-items-center rounded-full transition ${
                checked
                  ? `bg-${data.color}-soft ring-4 ring-${data.color}/40`
                  : "bg-cream-deep"
              }`}
            >
              <span
                className={`select-none text-[56px] leading-none transition-all duration-500 ${
                  checked
                    ? `scale-110 drop-shadow-[0_8px_16px_rgba(${data.color},0.45)]`
                    : `scale-95 opacity-60`
                }`}
              >
                🔥
              </span>
              {justCharged && (
                <span className="absolute -right-1 top-1 animate-bounce rounded-full bg-red px-2 py-0.5 text-[12px] font-bold text-paper">
                  +1
                </span>
              )}
            </div>

            <h2
              id="fire-title"
              className="font-mali mt-4 text-[20px] font-bold text-navy"
            >
              {checked ? "วันนี้เติมไฟแล้ว" : "เติมไฟรายวัน"}
            </h2>
            <p className="mt-0.5 text-[12px] text-muted">
              {checked
                ? "พรุ่งนี้กลับมาต่อไฟอีกนะ"
                : "เข้ามากดเติมไฟวันละครั้ง ไฟจะไม่ดับ"}
            </p>

            <p className="font-mali mt-3 text-[34px] font-bold leading-none text-navy">
              {streak} <span className="text-[16px] font-semibold">วันติด</span>
            </p>

            {/* สถานะสตรีคฟรีซ */}
            {data.frozen && (
              <p className="mt-2 text-[10px] text-yellow/70">
                <span className="font-semibold text-yellow-400">🔒 สตรีคฟรีซ</span>
                <span className="ml-1">สตรีคคงที่แม้จะขาดวัน</span>
              </p>
            )}

            <div className="mt-4 grid grid-cols-7 gap-1">
              {DAY_LABELS.map((label, index) => {
                const day = index + 1;
                const lit = day <= cycleDay;
                const isNext = !checked && day === nextSlot;
                return (
                  <div
                    key={day}
                    className={`rounded-xl px-0.5 py-1.5 transition ${
                      lit
                        ? `bg-${data.color}-soft`
                        : isNext
                          ? "border border-dashed border-yellow bg-paper"
                          : "bg-cream"
                    }`}
                  >
                    <span className="block text-[12px] leading-4">
                      {lit ? "🔥" : isNext ? "+" : "·"}
                    </span>
                    <span
                      className={`block text-[9px] font-semibold ${
                        lit || isNext ? "text-navy" : "text-muted"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {MILESTONES.map((milestone) => {
                const reached = data.best >= milestone;
                return (
                  <span
                    key={milestone}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      reached ? `bg-${data.color}-soft text-navy` : "bg-cream text-muted"
                    }`}
                  >
                    {reached ? "✓ " : ""}
                    {milestone} วัน
                  </span>
                );
              })}
            </div>

            {/* ปุ่มฟรีซ/ปลดล็อก */}
            <div className="mt-3">
              {data.frozen ? (
                <button
                  type="button"
                  onClick={() => {
                    // ยกเลิกฟรีซ (ต้องยินยอมให้สตรีคอาจดับได้)
                    // เนื่องจาก localStorage ไม่มีสถานะสมบัติ ฟรีซจะค้างไว้จนกว่าจะปลดล็อก
                    // สำหรับ demo ให้ปลดล็อกทันที
                    // ในเวอร์จริงอาจต้องมีการยืนยัน
                    // TODO: เพิ่มฟังก์ชันปลดล็อกที่ต้องยืนยัน
                  }}
                  className="focus-ring w-full rounded-2xl bg-yellow-soft px-3 py-2 text-[11px] font-medium text-navy transition hover:bg-yellow"
                >
                  ปลดล็อกสตรีคฟรีซ (สตรีคอาจดับได้)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    // เริ่มต้นสตรีคฟรีซ
                    // เก็บสถานะลง localStorage
                    try {
                      const current = readFire();
                      const next: FireData = {
                        ...current,
                        frozen: true,
                      };
                      window.localStorage.setItem(FIRE_KEY, JSON.stringify(next));
                      window.dispatchEvent(new Event(FIRE_EVENT));
                    } catch {}
                  }}
                  className="focus-ring w-full rounded-2xl bg-green-soft px-3 py-2 text-[11px] font-medium text-navy transition hover:bg-green"
                >
                  เริ่มสตรีคฟรีซ (สตรีคคงที่แม้จะขาดวัน)
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={charge}
              disabled={checked}
              className="focus-ring mt-4 w-full rounded-2xl bg-navy px-4 py-3 text-[12.5px] font-semibold text-paper transition hover:bg-navy-deep disabled:cursor-default disabled:bg-cream-deep disabled:text-muted"
            >
              {checked ? "เติมไฟแล้ววันนี้ ✨" : "🔥 เติมไฟวันนี้"}
            </button>

            <p className="mt-2 text-[10px] text-muted">
              สถิติสูงสุด {data.best} วัน · เติมไฟทั้งหมด {data.total} ครั้ง
            </p>
          </div>
        </div>
      )}
    </>
  );
}

// สีไฟตามสตรีค (สำหรับใช้ใน component)
export const FIRE_COLORS = [
  "fec12e", // เหลืองอ่อน (default)
  "f6ad22", // ส้ม
  "fb923c", // pink
  "ec4899", // pink deep
  "3b82f6", // blue
  "10b981", // green
  "8b5cf6", // purple
];