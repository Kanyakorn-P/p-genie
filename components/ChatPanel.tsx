"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useState } from "react";
import { GenieFace } from "./GenieFace";
import { IconSend } from "./ui-icons";
import type { AiMode } from "@/lib/genie-ai";

export type ChatMessage = {
  id: string;
  role: "genie" | "user";
  text: string;
};

type ChatPanelProps = {
  messages: ChatMessage[];
  input: string;
  onInput: (value: string) => void;
  onSend: () => void;
  thinking?: boolean;
  chips: string[];
  onChip: (value: string) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  messagesClassName?: string;
  aiMode: AiMode;
  onAiModeChange: (mode: AiMode) => void;
};

export function ChatPanel({
  messages,
  input,
  onInput,
  onSend,
  thinking = false,
  chips,
  onChip,
  inputRef,
  messagesClassName = "flex-1",
  aiMode,
  onAiModeChange,
}: ChatPanelProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const [aiModeOpen, setAiModeOpen] = useState(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  return (
    <>
      <div className="flex items-center gap-3 border-b border-line pb-3">
        <GenieFace size={40} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="font-mali text-[15px] font-bold text-navy">
            พี่จินนี่ <span className="text-yellow">✦</span>
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[10.5px] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-green" />
            ออนไลน์ • พร้อมช่วยจดงาน
          </p>
        </div>
      </div>

      <div
        className={`thin-scroll space-y-2.5 overflow-y-auto py-3 text-[12px] ${messagesClassName}`}
      >
        {messages.map((m) =>
          m.role === "genie" ? (
            <div key={m.id} className="flex justify-start">
              <div className="max-w-[88%] whitespace-pre-line rounded-2xl rounded-tl-md bg-cream px-3.5 py-2.5 text-ink">
                {m.text}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[88%] whitespace-pre-line rounded-2xl rounded-tr-md bg-navy px-3.5 py-2.5 text-paper">
                {m.text}
              </div>
            </div>
          ),
        )}
        {thinking && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-tl-md bg-cream px-3.5 py-2.5 text-muted">
              <span className="animate-pulse">●</span>
              <span
                className="animate-pulse"
                style={{ animationDelay: "0.15s" }}
              >
                ●
              </span>
              <span
                className="animate-pulse"
                style={{ animationDelay: "0.3s" }}
              >
                ●
              </span>
              <span className="ml-1 text-[11px]">พี่จินนี่กำลังคิด...</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex flex-wrap gap-1.5 pb-2">
        {chips.map((c) => (
          <button
            key={c}
            onClick={() => onChip(c)}
            className="focus-ring rounded-full border border-line bg-paper px-2.5 py-1 text-[10.5px] text-muted transition hover:border-blue hover:text-blue"
          >
            + {c}
          </button>
        ))}
      </div>

      <div className="relative">
        {aiModeOpen && (
          <>
            <button
              type="button"
              aria-label="ปิดเมนูโหมด AI"
              onClick={() => setAiModeOpen(false)}
              className="fixed inset-0 z-20 cursor-default"
            />
            <div className="soft-shadow absolute bottom-12 right-0 z-30 w-[210px] rounded-2xl border border-line bg-paper p-2.5">
              <p className="px-2 text-[11px] font-bold text-navy">โหมด AI</p>
              <p className="px-2 pt-0.5 text-[9.5px] text-muted">
                เลือกความเร็วและความละเอียดของคำตอบ
              </p>
              <div className="mt-2 space-y-1">
                {[
                  {
                    mode: "economy" as AiMode,
                    title: "ประหยัด",
                    detail: "เร็วและใช้โควตาน้อย",
                  },
                  {
                    mode: "balanced" as AiMode,
                    title: "สมดุล",
                    detail: "เข้าใจข้อความซับซ้อนขึ้น",
                  },
                ].map((option) => (
                  <button
                    key={option.mode}
                    type="button"
                    onClick={() => {
                      onAiModeChange(option.mode);
                      setAiModeOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left transition ${
                      aiMode === option.mode
                        ? "bg-blue-soft text-navy"
                        : "bg-cream text-ink hover:bg-cream-deep"
                    }`}
                  >
                    <span>
                      <span className="block text-[10.5px] font-semibold">
                        {option.title}
                      </span>
                      <span className="block text-[9px] text-muted">
                        {option.detail}
                      </span>
                    </span>
                    {aiMode === option.mode && <span className="text-[11px]">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSend();
          }}
          className="flex items-center gap-1.5 rounded-full border border-line bg-cream py-1.5 pl-3 pr-1.5 transition focus-within:border-blue"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => onInput(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-muted"
            placeholder="พิมพ์บอกการบ้าน เช่น ฟิสิกส์หน้า 45 ส่งพรุ่งนี้..."
            aria-label="พิมพ์การบ้านให้พี่จินนี่"
          />
          <button
            type="button"
            onClick={() => setAiModeOpen((open) => !open)}
            aria-label={`โหมด AI ปัจจุบัน: ${aiMode === "economy" ? "ประหยัด" : "สมดุล"}`}
            aria-expanded={aiModeOpen}
            className="focus-ring shrink-0 rounded-full border border-line bg-paper px-2 py-1.5 text-[9px] font-bold text-navy transition hover:border-blue"
          >
            {aiMode === "economy" ? "ประหยัด" : "สมดุล"}
          </button>
          <button
            type="submit"
            aria-label="ส่งข้อความ"
            disabled={thinking}
            className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy text-paper transition hover:bg-navy-deep disabled:opacity-50"
          >
            <IconSend size={16} />
          </button>
        </form>
      </div>
    </>
  );
}
