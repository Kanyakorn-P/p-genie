"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { Task } from "@/lib/data";
import { subjectLabel } from "@/lib/data";
import {
  THAI_MONTHS_FULL,
  formatDueDate,
  startOfDay,
  taskDueDate,
} from "@/lib/due-date";

const DAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const FULL_DAYS = [
  "อาทิตย์",
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
];
const emptySubscribe = () => () => {};

function key(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

type CalendarViewProps = { tasks: Task[] };

export function CalendarView({ tasks }: CalendarViewProps) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const today = mounted ? startOfDay(new Date()) : null;

  const [viewState, setViewState] = useState<{
    year: number;
    month: number;
  } | null>(null);
  const [selectedState, setSelectedState] = useState("");

  const year = viewState?.year ?? today?.getFullYear() ?? 0;
  const month = viewState?.month ?? today?.getMonth() ?? 0;

  const isCurrentMonth =
    today !== null &&
    today.getFullYear() === year &&
    today.getMonth() === month;

  const selected =
    selectedState ||
    (isCurrentMonth && today ? key(today) : key(new Date(year, month, 1)));

  const datedTasks = useMemo(() => {
    if (!today) return [] as { task: Task; date: Date }[];
    return tasks
      .map((task) => ({ task, date: taskDueDate(task, today) }))
      .filter((item): item is { task: Task; date: Date } => item.date !== null);
  }, [tasks, today]);

  const countByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of datedTasks) {
      const dayKey = key(item.date);
      map.set(dayKey, (map.get(dayKey) ?? 0) + 1);
    }
    return map;
  }, [datedTasks]);

  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: first.getDay() + days }, (_, index) => {
    if (index < first.getDay()) return null;
    return new Date(year, month, index - first.getDay() + 1);
  });

  const selectedTasks = datedTasks.filter((item) => key(item.date) === selected);

  function goTo(nextYear: number, nextMonth: number) {
    const normalized = new Date(nextYear, nextMonth, 1);
    setViewState({
      year: normalized.getFullYear(),
      month: normalized.getMonth(),
    });
    setSelectedState(key(normalized));
  }

  function shiftMonths(delta: number) {
    goTo(year, month + delta);
  }

  function shiftYears(delta: number) {
    goTo(year + delta, month);
  }

  function goToday() {
    if (!today) return;
    setViewState({ year: today.getFullYear(), month: today.getMonth() });
    setSelectedState(key(today));
  }

  if (!today) {
    return (
      <section className="surface soft-shadow min-h-[360px] p-5">
        <p className="text-[17px] font-bold text-navy">ปฏิทินการบ้าน</p>
      </section>
    );
  }

  const selectedParts = selected.split("-").map(Number);
  const selectedDate = new Date(
    selectedParts[0],
    selectedParts[1],
    selectedParts[2],
  );
  const selectedIsToday = key(selectedDate) === key(today);

  return (
    <section className="order-3 surface soft-shadow p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[17px] font-bold text-navy">ปฏิทินการบ้าน</h2>
          <p className="text-[11.5px] text-muted">
            เลื่อนเดือนหรือข้ามปีด้วยลูกศรได้เลย
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => shiftYears(-1)}
            className="focus-ring grid h-8 w-8 place-items-center rounded-full border border-line text-[12px] font-bold text-navy transition hover:border-blue"
            aria-label="ย้อนไปปีก่อนหน้า"
          >
            «
          </button>
          <button
            onClick={() => shiftMonths(-1)}
            className="focus-ring grid h-8 w-8 place-items-center rounded-full border border-line text-navy transition hover:border-blue"
            aria-label="เดือนก่อนหน้า"
          >
            ‹
          </button>
          <label className="relative">
            <span className="sr-only">เลือกเดือนและปี</span>
            <select
              value={`${year}-${month}`}
              onChange={(event) => {
                const [nextYear, nextMonth] = event.target.value
                  .split("-")
                  .map(Number);
                goTo(nextYear, nextMonth);
              }}
              className="min-w-[148px] cursor-pointer appearance-none rounded-full border border-line bg-paper px-3 py-2 text-center text-[12px] font-bold text-navy outline-none transition hover:border-blue focus:border-blue"
              aria-label="เลือกเดือนและปี"
            >
              {Array.from(
                { length: 17 },
                (_, index) => today.getFullYear() - 8 + index,
              ).flatMap((optionYear) =>
                THAI_MONTHS_FULL.map((monthName, monthIndex) => (
                  <option
                    key={`${optionYear}-${monthIndex}`}
                    value={`${optionYear}-${monthIndex}`}
                  >
                    {monthName} {optionYear + 543}
                  </option>
                )),
              )}
            </select>
          </label>
          <button
            onClick={() => shiftMonths(1)}
            className="focus-ring grid h-8 w-8 place-items-center rounded-full border border-line text-navy transition hover:border-blue"
            aria-label="เดือนถัดไป"
          >
            ›
          </button>
          <button
            onClick={() => shiftYears(1)}
            className="focus-ring grid h-8 w-8 place-items-center rounded-full border border-line text-[12px] font-bold text-navy transition hover:border-blue"
            aria-label="ไปปีถัดไป"
          >
            »
          </button>
          <button
            onClick={goToday}
            className="focus-ring rounded-full border border-line bg-paper px-2.5 py-1.5 text-[10.5px] font-semibold text-navy transition hover:border-blue"
          >
            วันนี้
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-muted">
        {DAYS.map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((date, index) => {
          if (!date) return <span key={`empty-${index}`} className="min-h-12" />;
          const dateKey = key(date);
          const count = countByDay.get(dateKey) ?? 0;
          const active = selected === dateKey;
          const isToday = key(today) === dateKey;
          return (
            <button
              key={dateKey}
              onClick={() => setSelectedState(dateKey)}
              className={`focus-ring min-h-12 rounded-xl border p-1 text-left transition ${
                active ? "border-blue bg-blue-soft" : "border-line bg-paper hover:bg-cream"
              }`}
            >
              <span className={`text-[11px] font-bold ${isToday ? "text-blue" : "text-navy"}`}>
                {date.getDate()}
              </span>
              {count > 0 && (
                <span className="mt-1 block truncate rounded-full bg-yellow px-1 text-center text-[9px] font-bold text-navy">
                  {count} งาน
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl bg-cream p-3">
        <p className="text-[11px] font-bold text-navy">
          {selectedIsToday ? "วันนี้ " : ""}
          วัน{FULL_DAYS[selectedDate.getDay()]} ที่ {selectedDate.getDate()}{" "}
          {THAI_MONTHS_FULL[selectedDate.getMonth()]}{" "}
          {selectedDate.getFullYear() + 543}
        </p>
        {selectedTasks.length > 0 ? (
          <div className="mt-2 space-y-2">
            {selectedTasks.map(({ task, date }) => (
              <div key={task.id} className="rounded-xl bg-paper px-3 py-2">
                <p className="text-[12px] font-semibold text-ink">{task.title}</p>
                <p className="mt-0.5 text-[10px] text-muted">
                  {subjectLabel(task.subject)} · {formatDueDate(date, today)}
                  {task.done ? " · ส่งแล้ว" : ""}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-[11px] text-muted">
            วันนี้ยังไม่มีงานที่ระบุวันส่งไว้
          </p>
        )}
      </div>
    </section>
  );
}
