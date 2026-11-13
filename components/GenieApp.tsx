"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { FOLDER_SUBJECTS, SUBJECTS, type Task } from "@/lib/data";
import { getServerSnapshot, getSnapshot, saveTasks, subscribe } from "@/lib/taskStore";
import { parseTasks } from "@/lib/parse";
import { ChatPanel, type ChatMessage } from "./ChatPanel";
import { GenieFace } from "./GenieFace";

const START_MESSAGE: ChatMessage = {
  id: "hello",
  role: "genie",
  text: "สวัสดีจ้า พี่จินนี่เอง ✨ พิมพ์การบ้านมาหลายวิชาพร้อมกันได้เลยน้า เช่น ฟิสิกส์หน้า 45 ส่งพรุ่งนี้ ไทยแต่งกลอน 2 บท ส่งศุกร์หน้า",
};

const CHIPS = [
  "ฟิสิกส์หน้า 45 ส่งพรุ่งนี้",
  "ไทยแต่งกลอน 2 บท ส่งศุกร์หน้า",
  "คณิตทำโจทย์ 10 ข้อ",
];

let uidCounter = 0;
function uid() {
  uidCounter += 1;
  return `id-${uidCounter}-${Date.now().toString(36)}`;
}

const SHORT_DAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
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

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

function formatToday(date: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function buildWeek(today: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const key =
      i === 0 ? "วันนี้" : i === 1 ? "พรุ่งนี้" : `วัน${FULL_DAYS[d.getDay()]}`;
    return {
      day: String(d.getDate()),
      label: i === 0 ? "วันนี้" : i === 1 ? "พรุ่งนี้" : SHORT_DAYS[d.getDay()],
      active: i === 0,
      dueKey: key,
    };
  });
}

export function GenieApp() {
  const [messages, setMessages] = useState<ChatMessage[]>([START_MESSAGE]);
  const [input, setInput] = useState("");

  const rawTasks = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const tasks = useMemo<Task[]>(() => {
    try {
      const parsed = JSON.parse(rawTasks);
      return Array.isArray(parsed) ? (parsed as Task[]) : [];
    } catch {
      return [];
    }
  }, [rawTasks]);

  const mounted = useMounted();
  const todayLabel = mounted ? formatToday(new Date()) : "";
  const week = mounted ? buildWeek(new Date()) : [];

  function dotsFor(dueKey: string) {
    return Math.min(
      tasks.filter((t) => !t.done && t.due.includes(dueKey)).length,
      3,
    );
  }

  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  const pending = total - done;
  const tomorrowCount = tasks.filter(
    (t) => !t.done && t.due.includes("พรุ่งนี้"),
  ).length;
  const noDueCount = tasks.filter(
    (t) => !t.done && t.due === "ยังไม่ระบุวันส่ง",
  ).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const tomorrowTasks = tasks.filter((t) => t.due.includes("พรุ่งนี้"));

  function toggle(id: string) {
    saveTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function send() {
    const text = input.trim();
    if (!text) return;

    const parsed = parseTasks(text);
    const userMessage: ChatMessage = { id: uid(), role: "user", text };

    if (parsed.length === 0) {
      setMessages((prev) => [
        ...prev,
        userMessage,
        {
          id: uid(),
          role: "genie",
          text: "ยังไม่เห็นการบ้านเลย ลองพิมพ์อีกทีนะ เช่น ฟิสิกส์หน้า 45 ส่งพรุ่งนี้",
        },
      ]);
      setInput("");
      return;
    }

    saveTasks([
      ...parsed.map((p) => ({
        id: uid(),
        title: p.title,
        subject: p.subject,
        due: p.due,
        urgent: p.urgent,
        done: false,
      })),
      ...tasks,
    ]);

    const list = parsed
      .map((p) => `• ${SUBJECTS[p.subject].short}: ${p.title} (${p.due})`)
      .join("\n");

    setMessages((prev) => [
      ...prev,
      userMessage,
      {
        id: uid(),
        role: "genie",
        text: `จดให้แล้ว ${parsed.length} งานน้า ✨\n${list}\nถ้าวันส่งผิด บอกพี่จินนี่ได้เลย`,
      },
    ]);
    setInput("");
  }

  const chatProps = {
    messages,
    input,
    onInput: setInput,
    onSend: send,
    chips: CHIPS,
    onChip: setInput,
  };

  return (
    <div className="flex min-h-screen bg-cream">
      <aside className="sticky top-0 hidden h-screen w-[268px] shrink-0 flex-col border-r-2 border-ink bg-[#fdf8ec] lg:flex">
        <div className="flex items-center gap-3 border-b-2 border-ink px-4 py-4">
          <GenieFace size={44} />
          <div className="leading-tight">
            <p className="font-mali text-[15px] font-bold">
              พี่จินนี่ (P&apos; Genie) ✨
            </p>
            <p className="text-[11px] text-ink-soft">AI To-Do List Agent</p>
          </div>
        </div>

        <div className="flex gap-2 px-4 py-4">
          <a
            href="#chat"
            className="flex-1 rounded-full border-2 border-ink bg-olive px-3 py-2 text-center text-[12px] font-semibold text-cream"
          >
            + เพิ่มการบ้าน
          </a>
          <button className="flex-1 rounded-full border-2 border-ink bg-[#fffdf6] px-3 py-2 text-[12px] font-semibold">
            + เพิ่มวิชา
          </button>
        </div>

        <p className="px-5 pb-2 text-[11px] font-semibold tracking-wide text-ink-soft">
          เมนูหลัก
        </p>
        <nav className="space-y-1 px-3">
          <div className="flex items-center gap-2 rounded-xl bg-olive px-3 py-2 text-[12.5px] text-cream">
            <span className="h-4 w-4 rounded border border-current opacity-70" />
            <span className="flex-1">หน้าหลัก (Home)</span>
          </div>
          <a
            href="#chat"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-[12.5px] text-ink hover:bg-cream-deep"
          >
            <span className="h-4 w-4 rounded border border-current opacity-70" />
            <span className="flex-1">แชทกับพี่จินนี่ (AI Agent)</span>
            <span className="rounded-full bg-mustard px-2 py-0.5 text-[10px] font-bold text-ink">
              AI ✨
            </span>
          </a>
          <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-[12.5px] text-ink hover:bg-cream-deep">
            <span className="h-4 w-4 rounded border border-current opacity-70" />
            <span className="flex-1">การบ้าน &amp; ทุกวิชา</span>
            <span className="grid h-5 w-5 place-items-center rounded-full bg-olive text-[10px] font-bold text-cream">
              {pending}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-[12.5px] text-ink hover:bg-cream-deep">
            <span className="h-4 w-4 rounded border border-current opacity-70" />
            <span className="flex-1">ตั้งเวลาเตือนความจำ</span>
          </div>
        </nav>

        <div className="mt-6 flex items-center justify-between px-5 pb-2 text-[11px] font-semibold text-ink-soft">
          <span>ไฟลเดอร์วิชา (3)</span>
          <span className="text-olive">+</span>
        </div>
        <div className="space-y-1 px-3">
          {FOLDER_SUBJECTS.map((s) => (
            <div
              key={s.key}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-[12.5px] hover:bg-cream-deep"
            >
              <span className={`h-3 w-3 rounded-full ${s.dot}`} />
              <span className="flex-1">
                {s.short}
                <span className="text-ink-soft"> ({s.full})</span>
              </span>
              <span className="grid h-5 w-5 place-items-center rounded-full bg-mustard text-[10px] font-bold">
                {tasks.filter((t) => t.subject === s.key).length}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-auto m-3 flex items-center gap-3 rounded-2xl border-2 border-ink bg-[#fffdf6] px-3 py-3">
          <GenieFace size={34} />
          <div className="leading-tight">
            <p className="text-[12px] font-semibold">พี่จินนี่ สแตนด์บาย</p>
            <p className="text-[10.5px] text-ink-soft">
              พร้อมบริการห้าดาวตลอดงาน
            </p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b-2 border-ink bg-[#fdf8ec] px-5 py-3">
          <label className="flex max-w-md flex-1 items-center gap-2 rounded-full border-2 border-ink bg-[#fffdf6] px-4 py-2">
            <span className="text-ink-soft">⌕</span>
            <input
              className="w-full bg-transparent text-[12.5px] outline-none placeholder:text-ink-soft"
              placeholder="ค้นหาการบ้าน, วิชา, เลขหน้า..."
            />
          </label>
          <div className="ml-auto flex items-center gap-2">
            <a
              href="#chat"
              className="rounded-full border-2 border-ink bg-olive px-4 py-1.5 text-[12px] font-semibold text-cream"
            >
              + เพิ่มการบ้าน
            </a>
            <button className="grid h-9 w-9 place-items-center rounded-full border-2 border-ink bg-[#fffdf6]">
              🔔
            </button>
            <div className="grid h-9 w-9 place-items-center rounded-full border-2 border-ink bg-mustard text-[12px] font-bold">
              จ
            </div>
          </div>
        </header>

        <div className="flex min-w-0 flex-1">
          <main className="min-w-0 flex-1 space-y-5 p-5">
            <section className="paper-card relative overflow-hidden p-6">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-1 rounded-full border border-ink/30 bg-mustard-soft px-3 py-1 text-[11px] font-semibold">
                  ✨ ยินดีต้อนรับสู่ผู้ช่วยการบ้าน AI อัจฉริยะ
                </span>
                <h1 className="mt-3 font-mali text-[26px] font-bold leading-snug">
                  {pending === 0 ? (
                    <>
                      หวัดดีจ้า! ตอนนี้ยังไม่มีงานค้างเลย{" "}
                      <span className="text-olive underline decoration-mustard decoration-4 underline-offset-4">
                        ลุยเลย
                      </span>{" "}
                      ✨
                    </>
                  ) : (
                    <>
                      หวัดดีจ้า! วันนี้มีงานค้าง{" "}
                      <span className="text-olive underline decoration-mustard decoration-4 underline-offset-4">
                        {pending} อย่าง
                      </span>{" "}
                      น้า ✨
                    </>
                  )}
                </h1>
                <p className="mt-1 text-[13px] text-ink-soft">
                  พี่จินนี่พร้อมช่วยจดการบ้าน แยกวิชา และเตือนความจำก่อนถึงเดตไลน์
                  พิมพ์บอกในแชทได้เลย!
                </p>

                <div className="mt-5 max-w-md">
                  <div className="flex justify-between text-[11.5px] font-medium">
                    <span>ความคืบหน้าการบ้านทั้งหมด</span>
                    <span>
                      {done}/{total} งาน ({percent}%)
                    </span>
                  </div>
                  <div className="mt-1 h-3 overflow-hidden rounded-full border-2 border-ink bg-[#fffdf6]">
                    <div
                      className="h-full rounded-full bg-olive transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-6 -right-4 grid h-40 w-40 place-items-center rounded-full bg-mustard-soft/70 max-lg:hidden">
                <GenieFace size={104} />
              </div>
            </section>

            <section id="chat" className="paper-card scroll-mt-24 p-4 xl:hidden">
              <ChatPanel {...chatProps} messagesClassName="h-[260px]" />
            </section>

            <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <StatCard
                label="การบ้านค้างส่ง"
                value={pending}
                note={`จากทั้งหมด ${total} งาน`}
                tone="bg-olive-soft"
                icon="◔"
              />
              <StatCard
                label="ส่งพรุ่งนี้"
                value={tomorrowCount}
                note="ต้องรีบทำให้เสร็จ"
                tone="bg-mustard-soft"
                icon="▤"
              />
              <StatCard
                label="รอระบุวันส่ง"
                value={noDueCount}
                note="พี่จินนี่รอคอยช่วย"
                tone="bg-peach"
                icon="!"
              />
              <StatCard
                label="ทำเสร็จแล้ว"
                value={done}
                note="ยอดเยี่ยมมาก!"
                tone="bg-mint"
                icon="✓"
              />
            </section>

            <section className="paper-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-mali text-[17px] font-bold">
                    What do u want? (เมนูช่วย)
                  </h2>
                  <p className="text-[11.5px] text-ink-soft">
                    เลือกสิ่งที่ต้องการทำ
                  </p>
                </div>
                <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-ink bg-mustard-soft">
                  ✨
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {[
                  {
                    title: "Check dates",
                    sub: "ดูตารางส่งการบ้าน",
                    glyph: "📅",
                    tone: "bg-mustard-soft",
                  },
                  {
                    title: "Chat with P' genie",
                    sub: "บอกพี่จินนี่ช่วยจดงาน",
                    glyph: "💬",
                    tone: "bg-mint",
                  },
                  {
                    title: "Add new folder",
                    sub: "สร้างโฟลเดอร์วิชาใหม่",
                    glyph: "📁",
                    tone: "bg-peach",
                  },
                ].map((w) => (
                  <a
                    key={w.title}
                    href="#chat"
                    className={`flex items-center gap-3 rounded-2xl border-2 border-ink ${w.tone} px-3 py-3 text-left transition hover:-translate-y-0.5`}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 border-ink bg-[#fffdf6]">
                      {w.glyph}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">
                        {w.title}
                      </span>
                      <span className="block truncate text-[11px] text-ink-soft">
                        {w.sub}
                      </span>
                    </span>
                    <span className="text-ink-soft">›</span>
                  </a>
                ))}
              </div>
            </section>

            <section className="paper-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl border-2 border-ink bg-mustard-soft">
                    ▦
                  </span>
                  <div>
                    <h2 className="font-mali text-[17px] font-bold">
                      กำหนดการ (ตารางส่งงานสัปดาห์นี้)
                    </h2>
                    <p className="text-[11.5px] text-ink-soft">{todayLabel}</p>
                  </div>
                  <span className="rounded-full border border-ink/30 bg-peach px-2 py-0.5 text-[10.5px] font-semibold">
                    ต้องส่ง {tomorrowCount} งาน
                  </span>
                </div>
                <button className="rounded-full border-2 border-ink bg-[#fffdf6] px-3 py-1.5 text-[11.5px] font-semibold">
                  + เพิ่มงานส่งวันนี้
                </button>
              </div>

              <div className="mt-4 grid grid-cols-7 gap-2">
                {week.map((d) => {
                  const dots = dotsFor(d.dueKey);
                  return (
                    <div
                      key={`${d.day}-${d.label}`}
                      className={`rounded-xl border-2 border-ink px-1 py-2 text-center ${
                        d.active ? "bg-olive text-cream" : "bg-[#fffdf6] text-ink"
                      }`}
                    >
                      <p className="text-[10.5px] opacity-80">{d.label}</p>
                      <p className="font-mali text-[15px] font-bold">{d.day}</p>
                      <div className="mt-0.5 flex justify-center gap-0.5">
                        {Array.from({ length: dots }).map((_, i) => (
                          <span
                            key={i}
                            className={`h-1 w-1 rounded-full ${
                              d.active ? "bg-mustard" : "bg-[#e0a184]"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="mt-4 flex items-center gap-2 text-[12px] font-semibold">
                <span className="grid h-5 w-5 place-items-center rounded-full border border-ink text-[10px]">
                  ◷
                </span>
                งานที่ต้องส่งพรุ่งนี้ (ไม่ระบุเวลา)
              </p>

              <div className="mt-2 space-y-2">
                {tomorrowTasks.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-ink/30 px-3 py-3 text-[11.5px] text-ink-soft">
                    ยังไม่มีงานที่ต้องส่งพรุ่งนี้ พิมพ์ในแชทเพื่อเพิ่มได้เลย
                  </p>
                ) : (
                  tomorrowTasks.map((t) => (
                    <TaskRow key={t.id} task={t} onToggle={toggle} />
                  ))
                )}
              </div>
            </section>

            <section className="paper-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl border-2 border-ink bg-mint">
                    ▥
                  </span>
                  <div>
                    <h2 className="font-mali text-[17px] font-bold">
                      สรุปความคืบหน้าการบ้าน (Task Analytics) ✨
                    </h2>
                    <p className="text-[11.5px] text-ink-soft">
                      แยกตามโฟลเดอร์วิชา
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 text-[11px]">
                  <span className="rounded-full border border-ink/30 bg-mint px-2 py-0.5">
                    เสร็จ {done}
                  </span>
                  <span className="rounded-full border border-ink/30 bg-mustard-soft px-2 py-0.5">
                    ค้าง {pending}
                  </span>
                  <span className="rounded-full border border-ink/30 bg-[#fffdf6] px-2 py-0.5">
                    ↝ {percent}%
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {FOLDER_SUBJECTS.map((s) => {
                  const subjectTasks = tasks.filter((t) => t.subject === s.key);
                  const width =
                    subjectTasks.length === 0
                      ? 0
                      : Math.max(subjectTasks.length * 24, 6);
                  return (
                    <div key={s.key} className="flex items-center gap-3">
                      <span className="w-16 text-right text-[11.5px] text-ink-soft">
                        {s.short}
                      </span>
                      <div className="h-5 flex-1 overflow-hidden rounded-full border-2 border-ink bg-[#fffdf6]">
                        <div
                          className={`h-full ${s.card}`}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <span className="w-6 text-[11.5px] font-semibold">
                        {subjectTasks.length}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="paper-card p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-mali text-[17px] font-bold">
                  การบ้านทั้งหมด ({total} งาน)
                </h2>
                <a href="#chat" className="text-[11.5px] font-semibold text-olive">
                  + เพิ่มการบ้าน
                </a>
              </div>
              <div className="mt-3 space-y-2.5">
                {tasks.length === 0 && (
                  <p className="rounded-xl border border-dashed border-ink/30 px-3 py-4 text-center text-[11.5px] text-ink-soft">
                    ยังไม่มีการบ้านเลย พิมพ์บอกพี่จินนี่ในช่องแชทได้เลย
                  </p>
                )}
                {tasks.map((t) => (
                  <TaskRow key={t.id} task={t} onToggle={toggle} wide />
                ))}
              </div>
            </section>

            <section className="paper-card p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-mali text-[17px] font-bold">
                  ไฟลเดอร์วิชา (3 วิชา)
                </h2>
                <button className="text-[11.5px] font-semibold text-olive">
                  + เพิ่มวิชา
                </button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {FOLDER_SUBJECTS.map((s) => (
                  <div
                    key={s.key}
                    className={`rounded-2xl border-2 border-ink ${s.card} p-4`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="grid h-9 w-9 place-items-center rounded-xl border-2 border-ink bg-[#fffdf6]">
                        📁
                      </span>
                      <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-ink bg-[#fffdf6] text-[11px] font-bold">
                        {tasks.filter((t) => t.subject === s.key).length}
                      </span>
                    </div>
                    <p className="mt-3 font-mali text-[15px] font-bold">
                      {s.short}
                    </p>
                    <p className="text-[11.5px] text-ink-soft">{s.full}</p>
                  </div>
                ))}
              </div>
            </section>
          </main>

          <aside className="sticky top-[65px] hidden h-[calc(100vh-65px)] w-[360px] shrink-0 flex-col border-l-2 border-ink bg-[#fdf8ec] p-4 xl:flex">
            <ChatPanel {...chatProps} />
          </aside>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  note,
  tone,
  icon,
}: {
  label: string;
  value: number;
  note: string;
  tone: string;
  icon: string;
}) {
  return (
    <div className="paper-card p-4">
      <div className="flex items-start justify-between">
        <p className="text-[12px] font-semibold text-ink-soft">{label}</p>
        <span
          className={`grid h-7 w-7 place-items-center rounded-lg border-2 border-ink/60 ${tone} text-[11px]`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-1 font-mali text-[30px] font-bold leading-none">{value}</p>
      <p className="mt-1 text-[11px] text-ink-soft">{note}</p>
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  wide = false,
}: {
  task: Task;
  onToggle: (id: string) => void;
  wide?: boolean;
}) {
  const subject = SUBJECTS[task.subject];
  return (
    <div className="flex items-center gap-3 rounded-xl border-2 border-ink bg-[#fffdf6] px-3 py-2.5">
      <button
        onClick={() => onToggle(task.id)}
        aria-label={
          task.done ? "ทำเครื่องหมายว่ายังไม่เสร็จ" : "ทำเครื่องหมายว่าเสร็จแล้ว"
        }
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 border-ink text-[11px] ${
          task.done ? "bg-olive text-cream" : "bg-[#fffdf6]"
        }`}
      >
        {task.done ? "✓" : ""}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-[12.5px] font-medium ${
            task.done ? "text-ink-soft line-through" : ""
          }`}
        >
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10.5px]">
          <span
            className={`rounded-md border border-ink/30 px-2 py-0.5 font-semibold ${subject.chip} ${subject.text}`}
          >
            {subject.short}
          </span>
          <span className="rounded-md border border-ink/20 bg-[#fffdf6] px-2 py-0.5 text-ink-soft">
            ▤ {task.due}
          </span>
          {task.urgent && (
            <span className="rounded-md bg-peach px-2 py-0.5 text-[#a3452a]">
              ⏱ ด่วน
            </span>
          )}
        </div>
      </div>
      {wide && <button className="shrink-0 text-ink-soft">🗑</button>}
    </div>
  );
}
