"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type TouchEvent,
} from "react";
import type { Task } from "@/lib/data";
import { subjectLabel } from "@/lib/data";
import {
  THAI_MONTHS_FULL,
  THAI_MONTHS_SHORT,
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const pickerPanelRef = useRef<HTMLDivElement>(null);
  const pickerTriggerRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    if (!pickerOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPickerOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [pickerOpen]);

  useEffect(() => {
    if (!pickerOpen) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        pickerPanelRef.current?.contains(target) ||
        pickerTriggerRef.current?.contains(target)
      ) {
        return;
      }
      setPickerOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [pickerOpen]);

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

  function openPicker() {
    setPickerYear(year);
    setPickerOpen((prev) => !prev);
  }

  function pickMonth(nextMonth: number) {
    goTo(pickerYear, nextMonth);
    setPickerOpen(false);
  }

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }

  function onTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;

    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;

    // ปัดซ้ายขวาเพื่อเปลี่ยนเดือน ต้องเป็นแนวนอนชัด ๆ เพื่อไม่ให้ทับการกดเลือกวัน
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    shiftMonths(dx < 0 ? 1 : -1);
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
    <section className="order-3 col-span-2 surface soft-shadow p-3 sm:col-span-2 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-bold text-navy sm:text-[17px]">
            ปฏิทินการบ้าน
          </h2>
          <p className="hidden text-[11.5px] text-muted sm:block">
            กดชื่อเดือนเพื่อเลือกเดือน/ปี หรือปัดซ้ายขวาก็ได้
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => shiftMonths(-1)}
            className="focus-ring grid h-10 w-10 place-items-center rounded-full border border-line text-[18px] leading-none text-navy transition hover:border-blue hover:bg-cream sm:h-9 sm:w-9"
            aria-label="เดือนก่อนหน้า"
          >
            ‹
          </button>

          <div className="relative">
            <button
              ref={pickerTriggerRef}
              onClick={openPicker}
              aria-expanded={pickerOpen}
              aria-haspopup="dialog"
              className="focus-ring flex h-10 min-w-[132px] items-center justify-center gap-1.5 rounded-full border border-line bg-paper px-3 text-[12px] font-bold text-navy transition hover:border-blue sm:h-9"
            >
              <span className="truncate">
                {THAI_MONTHS_SHORT[month]} {year + 543}
              </span>
              <span
                className={`text-[9px] text-muted transition ${pickerOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              >
                ▾
              </span>
            </button>

            {pickerOpen && (
              <>
                <div
                  className="fixed inset-0 z-30 bg-navy/10 backdrop-blur-[1px] sm:hidden"
                  aria-hidden="true"
                />
                <div
                  ref={pickerPanelRef}
                  role="dialog"
                  aria-label="เลือกเดือนและปี"
                  className="surface soft-shadow thin-scroll fixed left-1/2 top-1/2 z-40 max-h-[min(340px,62vh)] w-[min(264px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl p-2.5 sm:absolute sm:left-1/2 sm:top-auto sm:mt-2 sm:max-h-none sm:w-[268px] sm:translate-y-0"
                >
                  <div className="mb-1.5 flex items-center justify-between border-b border-line pb-1.5">
                    <p className="text-[10px] font-semibold text-muted">
                      เลือกเดือนและปี
                    </p>
                    <button
                      onClick={() => setPickerOpen(false)}
                      aria-label="ปิดตัวเลือกเดือน"
                      className="focus-ring grid h-7 w-7 place-items-center rounded-full border border-line bg-paper text-[16px] leading-none text-muted transition hover:bg-cream hover:text-navy"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => setPickerYear((prev) => prev - 1)}
                      aria-label="ย้อนไปปีก่อนหน้า"
                      className="focus-ring grid h-8 w-8 place-items-center rounded-full border border-line text-[14px] leading-none text-navy transition hover:border-blue"
                    >
                      «
                    </button>
                    <div className="text-center">
                      <p className="text-[12px] font-bold text-navy">
                        {pickerYear + 543}
                      </p>
                      <p className="text-[9px] text-muted">พ.ศ.</p>
                    </div>
                    <button
                      onClick={() => setPickerYear((prev) => prev + 1)}
                      aria-label="ไปปีถัดไป"
                      className="focus-ring grid h-8 w-8 place-items-center rounded-full border border-line text-[14px] leading-none text-navy transition hover:border-blue"
                    >
                      »
                    </button>
                  </div>

                  <div className="mt-1.5 grid grid-cols-3 gap-1">
                    {THAI_MONTHS_SHORT.map((monthName, monthIndex) => {
                      const active = pickerYear === year && monthIndex === month;
                      const isThisMonth =
                        today.getFullYear() === pickerYear &&
                        today.getMonth() === monthIndex;
                      return (
                        <button
                          key={monthName}
                          onClick={() => pickMonth(monthIndex)}
                          aria-pressed={active}
                          className={`focus-ring h-8 rounded-lg border text-[10.5px] font-semibold transition sm:h-9 sm:rounded-xl sm:text-[11.5px] ${
                            active
                              ? "border-blue bg-blue-soft text-navy"
                              : isThisMonth
                                ? "border-blue/50 bg-paper text-blue hover:bg-cream"
                                : "border-line bg-paper text-ink hover:bg-cream"
                          }`}
                        >
                          {monthName}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-2 flex gap-1.5">
                    <button
                      onClick={() => setPickerYear(today.getFullYear())}
                      className="focus-ring flex-1 rounded-full border border-line px-2.5 py-1 text-[10px] font-semibold text-navy transition hover:border-blue sm:px-3 sm:py-1.5 sm:text-[10.5px]"
                    >
                      ปีนี้
                    </button>
                    <button
                      onClick={() => {
                        setPickerOpen(false);
                        goToday();
                      }}
                      className="focus-ring flex-1 rounded-full bg-navy px-2.5 py-1 text-[10px] font-semibold text-paper transition hover:bg-navy-deep sm:px-3 sm:py-1.5 sm:text-[10.5px]"
                    >
                      วันนี้
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => shiftMonths(1)}
            className="focus-ring grid h-10 w-10 place-items-center rounded-full border border-line text-[18px] leading-none text-navy transition hover:border-blue hover:bg-cream sm:h-9 sm:w-9"
            aria-label="เดือนถัดไป"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => shiftYears(-1)}
            className="focus-ring rounded-full px-2 py-1 text-[10.5px] font-semibold text-muted transition hover:text-navy"
            aria-label="ย้อนไปปีก่อนหน้า"
          >
            « ปีก่อน
          </button>
          <button
            onClick={() => shiftYears(1)}
            className="focus-ring rounded-full px-2 py-1 text-[10.5px] font-semibold text-muted transition hover:text-navy"
            aria-label="ไปปีถัดไป"
          >
            ปีหน้า »
          </button>
        </div>
        {!isCurrentMonth && (
          <button
            onClick={goToday}
            className="focus-ring rounded-full border border-line bg-paper px-2.5 py-1 text-[10.5px] font-semibold text-navy transition hover:border-blue"
          >
            กลับไปวันนี้
          </button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-muted">
        {DAYS.map((day) => <span key={day}>{day}</span>)}
      </div>

      <div
        className="mt-1 grid touch-pan-y grid-cols-7 gap-1"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {cells.map((date, index) => {
          if (!date) return <span key={`empty-${index}`} className="min-h-11" />;
          const dateKey = key(date);
          const count = countByDay.get(dateKey) ?? 0;
          const active = selected === dateKey;
          const isToday = key(today) === dateKey;
          return (
            <button
              key={dateKey}
              onClick={() => setSelectedState(dateKey)}
              aria-pressed={active}
              aria-label={`${date.getDate()} ${THAI_MONTHS_FULL[date.getMonth()]}${count > 0 ? ` มี ${count} งาน` : ""}`}
              className={`focus-ring flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl border py-1 transition sm:min-h-14 ${
                active
                  ? "border-blue bg-blue-soft"
                  : "border-line bg-paper hover:border-blue/60 hover:bg-cream"
              }`}
            >
              <span
                className={`text-[11.5px] font-bold ${
                  isToday
                    ? "grid h-[19px] min-w-[19px] place-items-center rounded-full bg-navy px-1 text-[10.5px] text-paper"
                    : "text-navy"
                }`}
              >
                {date.getDate()}
              </span>
              <span className="flex h-1.5 items-center gap-0.5" aria-hidden="true">
                {count > 0 &&
                  Array.from({ length: Math.min(count, 3) }, (_, dot) => (
                    <span
                      key={dot}
                      className={`h-1.5 w-1.5 rounded-full ${active ? "bg-blue" : "bg-yellow"}`}
                    />
                  ))}
              </span>
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
