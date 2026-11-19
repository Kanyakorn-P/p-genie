"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  activeStreak,
  checkInFire,
  checkedInToday,
  getFireServerSnapshot,
  getFireSnapshot,
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
    getFireServerSnapshot,
  );
  const [open, setOpen] = useState(false);
  const [justCharged, setJustCharged] = useState(false);
  const prompted = useRef(false);

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

  function charge() {
    const result = checkInFire();
    if (!result.already) setJustCharged(true);
  }

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
                  ? "bg-yellow-soft ring-4 ring-yellow/40"
                  : "bg-cream-deep"
              }`}
            >
              <span
                className={`select-none text-[48px] leading-none transition-all duration-500 ${
                  checked
                    ? "scale-110 drop-shadow-[0_8px_16px_rgba(246,173,31,0.45)]"
                    : "scale-95 opacity-60"
                }`}
              >
                🔥
              </span>
              {justCharged && (
                <span className="absolute -right-1 top-1 animate-bounce rounded-full bg-red px-2 py-0.5 text-[10px] font-bold text-paper">
                  +1
                </span>
              )}
            </div>

            <h2
              id="fire-title"
              className="font-mali mt-4 text-[19px] font-bold text-navy"
            >
              {checked ? "วันนี้เติมไฟแล้ว" : "เติมไฟรายวัน"}
            </h2>
            <p className="mt-0.5 text-[11.5px] text-muted">
              {checked
                ? "พรุ่งนี้กลับมาต่อไฟอีกนะ"
                : "เข้ามากดเติมไฟวันละครั้ง ไฟจะไม่ดับ"}
            </p>

            <p className="font-mali mt-3 text-[30px] font-bold leading-none text-navy">
              {streak} <span className="text-[15px] font-semibold">วันติด</span>
            </p>

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
                        ? "bg-yellow-soft"
                        : isNext
                          ? "border border-dashed border-yellow bg-paper"
                          : "bg-cream"
                    }`}
                  >
                    <span className="block text-[11px] leading-4">
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
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      reached ? "bg-blue-soft text-navy" : "bg-cream text-muted"
                    }`}
                  >
                    {reached ? "✓ " : ""}
                    {milestone} วัน
                  </span>
                );
              })}
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
