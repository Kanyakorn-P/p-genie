"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { Task } from "@/lib/data";
import { subjectLabel } from "@/lib/data";

const MONTHS = [
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

const DAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const emptySubscribe = () => () => {};
const THAI_MONTHS: Record<string, number> = {
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
};

function key(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dueDate(due: string, now: Date): Date | null {
  const base = startOfDay(now);
  if (due.includes("วันนี้")) return base;
  if (due.includes("พรุ่งนี้")) {
    base.setDate(base.getDate() + 1);
    return base;
  }
  if (due.includes("มะรืน")) {
    base.setDate(base.getDate() + 2);
    return base;
  }

  const explicit = due.match(
    /(\d{1,2})\s*(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)/,
  );
  if (explicit) {
    const month = THAI_MONTHS[explicit[2]];
    return new Date(now.getFullYear(), month, Number(explicit[1]));
  }

  const numeric = due.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (numeric) {
    const numericYear = numeric[3] ? Number(numeric[3]) : now.getFullYear();
    const year = numericYear < 100 ? 2000 + numericYear : numericYear;
    return new Date(year, Number(numeric[2]) - 1, Number(numeric[1]));
  }

  const weekdays = [
    "อาทิตย์",
    "จันทร์",
    "อังคาร",
    "พุธ",
    "พฤหัสบดี",
    "ศุกร์",
    "เสาร์",
  ];
  const weekday = weekdays.findIndex((day) => due.includes(`วัน${day}`));
  if (weekday >= 0) {
    let delta = (weekday - base.getDay() + 7) % 7;
    if (due.includes("หน้า")) delta = delta === 0 ? 7 : delta + 7;
    base.setDate(base.getDate() + delta);
    return base;
  }

  if (due.includes("สัปดาห์หน้า")) {
    base.setDate(base.getDate() + ((8 - base.getDay()) % 7 || 7));
    return base;
  }

  return null;
}

type CalendarViewProps = { tasks: Task[] };

export function CalendarView({ tasks }: CalendarViewProps) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const today = mounted ? startOfDay(new Date()) : null;
  const [monthState, setMonthState] = useState<number | null>(null);
  const [yearState, setYearState] = useState<number | null>(null);
  const [selectedState, setSelectedState] = useState("");
  const month = monthState ?? today?.getMonth() ?? 0;
  const selected = selectedState || (today ? key(today) : "");
  const year = yearState ?? today?.getFullYear() ?? 0;

  const datedTasks = useMemo(
    () =>
      today
        ? tasks
        .map((task) => ({ task, date: dueDate(task.due, today) }))
        .filter(
          (item): item is { task: Task; date: Date } =>
            item.date !== null && item.date.getFullYear() === year,
        )
        : [],
    [tasks, today, year],
  );

  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: first.getDay() + days }, (_, index) => {
    if (index < first.getDay()) return null;
    return new Date(year, month, index - first.getDay() + 1);
  });
  const selectedTasks = datedTasks.filter((item) => key(item.date) === selected);

  if (!today) {
    return (
      <section className="surface soft-shadow min-h-[360px] p-5">
        <p className="text-[17px] font-bold text-navy">ปฏิทินการบ้าน</p>
      </section>
    );
  }

  return (
    <section className="order-3 surface soft-shadow p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[17px] font-bold text-navy">ปฏิทินการบ้าน</h2>
          <p className="text-[11.5px] text-muted">
            เลื่อนดูงานในปีนี้ แล้วกดวันที่เพื่อดูรายละเอียด
          </p>
        </div>
        <div className="relative flex items-center gap-2">
          <button
            onClick={() => setMonthState((value) => Math.max(0, (value ?? month) - 1))}
            disabled={month === 0}
            className="focus-ring grid h-8 w-8 place-items-center rounded-full border border-line text-navy disabled:opacity-30"
            aria-label="เดือนก่อนหน้า"
          >
            ‹
          </button>
          <label className="relative">
            <span className="sr-only">เลือกเดือนและปี</span>
            <select
              value={`${year}-${month}`}
              onChange={(event) => {
                const [nextYear, nextMonth] = event.target.value.split("-").map(Number);
                setYearState(nextYear);
                setMonthState(nextMonth);
                setSelectedState(key(new Date(nextYear, nextMonth, 1)));
              }}
              className="min-w-[156px] cursor-pointer appearance-none rounded-full border border-line bg-paper px-4 py-2 text-center text-[12px] font-bold text-navy outline-none transition hover:border-blue focus:border-blue"
              aria-label="เลือกเดือนและปี"
            >
              {Array.from(
                { length: 7 },
                (_, index) => year - 3 + index,
              ).flatMap((optionYear) =>
                MONTHS.map((monthName, monthIndex) => (
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
            onClick={() => setMonthState((value) => Math.min(11, (value ?? month) + 1))}
            disabled={month === 11}
            className="focus-ring grid h-8 w-8 place-items-center rounded-full border border-line text-navy disabled:opacity-30"
            aria-label="เดือนถัดไป"
          >
            ›
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
          const count = datedTasks.filter((item) => key(item.date) === dateKey).length;
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
          งานวันที่ {new Date(Number(selected.split("-")[0]), Number(selected.split("-")[1]), Number(selected.split("-")[2])).getDate()} {MONTHS[Number(selected.split("-")[1])]}
        </p>
        {selectedTasks.length > 0 ? (
          <div className="mt-2 space-y-2">
            {selectedTasks.map(({ task }) => (
              <div key={task.id} className="rounded-xl bg-paper px-3 py-2">
                <p className="text-[12px] font-semibold text-ink">{task.title}</p>
                <p className="mt-0.5 text-[10px] text-muted">
                  {subjectLabel(task.subject)} · {task.due}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-[11px] text-muted">วันนี้ยังไม่มีงานที่ระบุวันส่งไว้</p>
        )}
      </div>
    </section>
  );
}
