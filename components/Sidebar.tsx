"use client";

import type { Folder } from "@/lib/theme";
import { toneFor } from "@/lib/theme";
import { GenieFace } from "./GenieFace";
import {
  IconChat,
  IconBook,
  IconClock,
  IconHome,
  IconPencil,
  IconPlus,
  IconTrash,
} from "./ui-icons";

export type NavKey = "home" | "chat" | "tasks" | "reminder";

type SidebarProps = {
  folders: Folder[];
  counts: Record<string, number>;
  pending: number;
  activeNav: NavKey;
  activeFolderId: string | null;
  onNav: (key: NavKey) => void;
  onFocusChat: () => void;
  onAddFolder: () => void;
  onEditFolder: (folder: Folder) => void;
  onDeleteFolder: (folder: Folder) => void;
  onFilterFolder: (folder: Folder) => void;
};

const NAV: { key: NavKey; label: string; sub: string; icon: typeof IconHome }[] = [
  { key: "home", label: "หน้าหลัก", sub: "Home", icon: IconHome },
  { key: "chat", label: "แชทกับพี่จินนี่", sub: "AI Agent", icon: IconChat },
  { key: "tasks", label: "การบ้าน & ทุกวิชา", sub: "All tasks", icon: IconBook },
  { key: "reminder", label: "กำหนดส่ง & เตือนความจำ", sub: "Reminder", icon: IconClock },
];

export function Sidebar({
  folders,
  counts,
  pending,
  activeNav,
  activeFolderId,
  onNav,
  onFocusChat,
  onAddFolder,
  onEditFolder,
  onDeleteFolder,
  onFilterFolder,
}: SidebarProps) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[286px] shrink-0 flex-col border-r border-line bg-paper px-4 py-5 lg:flex">
      <div className="flex items-center gap-3 px-2">
        <GenieFace size={48} />
        <div className="leading-tight">
          <p className="font-mali text-[19px] font-bold text-navy">พี่จินนี่</p>
          <p className="text-[9px] font-semibold tracking-[0.14em] text-muted">
            AI TO-DO LIST AGENT
          </p>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <button
          onClick={onFocusChat}
          className="focus-ring flex flex-1 items-center justify-center gap-1.5 rounded-full bg-navy px-3 py-2.5 text-[12px] font-semibold text-paper transition hover:bg-navy-deep"
        >
          <IconPlus size={14} />
          เพิ่มการบ้าน
        </button>
        <button
          onClick={onAddFolder}
          className="focus-ring flex flex-1 items-center justify-center gap-1.5 rounded-full border border-blue/40 px-3 py-2.5 text-[12px] font-semibold text-blue transition hover:bg-blue-soft"
        >
          <IconPlus size={14} />
          เพิ่มวิชา
        </button>
      </div>

      <p className="mt-6 px-2 text-[10px] font-semibold tracking-[0.12em] text-muted">
        เมนูหลัก
      </p>

      <nav className="mt-2 space-y-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = activeNav === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNav(item.key)}
              aria-current={active ? "page" : undefined}
              className={`focus-ring flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                active
                  ? "bg-navy text-paper"
                  : "text-ink hover:bg-cream"
              }`}
            >
              <Icon size={18} className={active ? "text-paper" : "text-navy"} />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[12.5px] font-semibold">
                  {item.label}
                </span>
                <span
                  className={`block text-[9.5px] ${
                    active ? "text-paper/70" : "text-muted"
                  }`}
                >
                  {item.sub}
                </span>
              </span>
              {item.key === "chat" && (
                <span className="rounded-full bg-yellow px-1.5 py-0.5 text-[9px] font-bold text-navy">
                  AI
                </span>
              )}
              {item.key === "tasks" && pending > 0 && (
                <span
                  className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold ${
                    active ? "bg-paper text-navy" : "bg-yellow text-navy"
                  }`}
                >
                  {pending}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-6 flex items-center justify-between px-2">
        <p className="text-[10px] font-semibold tracking-[0.12em] text-muted">
          โฟลเดอร์วิชา ({folders.length})
        </p>
        <button
          onClick={onAddFolder}
          aria-label="เพิ่มโฟลเดอร์วิชา"
          className="focus-ring grid h-6 w-6 place-items-center rounded-full text-blue transition hover:bg-blue-soft"
        >
          <IconPlus size={14} />
        </button>
      </div>

      <div className="thin-scroll mt-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
        {folders.length === 0 && (
          <p className="mx-2 mt-2 rounded-xl border border-dashed border-line px-3 py-3 text-[11px] leading-relaxed text-muted">
            ยังไม่มีโฟลเดอร์ กดปุ่ม + ด้านบนเพื่อเพิ่มวิชาแรกได้เลย
          </p>
        )}

        {folders.map((folder) => {
          const tone = toneFor(folder.color);
          const active = activeFolderId === folder.id;
          return (
            <div
              key={folder.id}
              className={`group flex items-center rounded-xl transition ${
                active ? "bg-blue-soft" : "hover:bg-cream"
              }`}
            >
              <button
                onClick={() => onFilterFolder(folder)}
                className="focus-ring flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2 text-left"
                aria-pressed={active}
              >
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tone.dot}`} />
                <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink">
                  {folder.name}
                </span>
                <span className="shrink-0 rounded-full bg-cream-deep px-1.5 text-[10px] font-semibold text-muted">
                  {counts[folder.name] ?? 0}
                </span>
              </button>
              <div className="flex shrink-0 gap-0.5 pr-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                <button
                  onClick={() => onEditFolder(folder)}
                  aria-label={`แก้ไขโฟลเดอร์ ${folder.name}`}
                  className="focus-ring grid h-6 w-6 place-items-center rounded-full text-muted hover:bg-paper hover:text-navy"
                >
                  <IconPencil size={12} />
                </button>
                <button
                  onClick={() => onDeleteFolder(folder)}
                  aria-label={`ลบโฟลเดอร์ ${folder.name}`}
                  className="focus-ring grid h-6 w-6 place-items-center rounded-full text-muted hover:bg-red-soft hover:text-red"
                >
                  <IconTrash size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-line bg-cream px-3 py-2.5">
        <GenieFace size={32} />
        <div className="leading-tight">
          <p className="text-[11.5px] font-semibold text-navy">
            พี่จินนี่ สแตนด์บาย
          </p>
          <p className="text-[10px] text-muted">พร้อมช่วยจดการบ้าน</p>
        </div>
      </div>
    </aside>
  );
}
