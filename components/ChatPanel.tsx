"use client";

import { useEffect, useRef } from "react";
import { GenieFace } from "./GenieFace";

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
  chips: string[];
  onChip: (value: string) => void;
  messagesClassName?: string;
};

export function ChatPanel({
  messages,
  input,
  onInput,
  onSend,
  chips,
  onChip,
  messagesClassName = "flex-1",
}: ChatPanelProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  return (
    <>
      <div className="flex items-center gap-2 border-b-2 border-ink/15 pb-3">
        <GenieFace size={36} />
        <div className="flex-1 leading-tight">
          <p className="font-mali text-[14px] font-bold">พี่จินนี่ ✨</p>
          <p className="text-[10.5px] text-olive">● ออนไลน์ • พร้อมช่วยงานบ้าน</p>
        </div>
        <span className="rounded-full border border-ink/30 bg-mustard-soft px-2 py-0.5 text-[10.5px]">
          ฅ อะไร
        </span>
      </div>

      <div
        className={`space-y-2.5 overflow-y-auto py-3 text-[12px] ${messagesClassName}`}
      >
        {messages.map((m) =>
          m.role === "genie" ? (
            <div key={m.id} className="flex justify-start">
              <div className="max-w-[88%] whitespace-pre-line rounded-2xl rounded-tl-sm border-2 border-ink bg-[#fffdf6] px-3 py-2.5">
                {m.text}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[88%] whitespace-pre-line rounded-2xl rounded-tr-sm border-2 border-ink bg-olive px-3 py-2.5 text-cream">
                {m.text}
              </div>
            </div>
          ),
        )}
        <div ref={endRef} />
      </div>

      <div className="flex flex-wrap gap-1.5 pb-2">
        {chips.map((c) => (
          <button
            key={c}
            onClick={() => onChip(c)}
            className="rounded-full border border-ink/40 bg-[#fffdf6] px-2.5 py-1 text-[10px] text-ink hover:bg-mustard-soft"
          >
            + {c}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
        className="flex items-center gap-2 rounded-full border-2 border-ink bg-[#fffdf6] py-1.5 pl-4 pr-1.5"
      >
        <input
          value={input}
          onChange={(e) => onInput(e.target.value)}
          className="w-full bg-transparent text-[11.5px] outline-none placeholder:text-ink-soft"
          placeholder="พิมพ์บอกการบ้าน เช่น ฟิสิกส์หน้า 45 ส่งพรุ่งนี้..."
        />
        <button
          type="submit"
          aria-label="ส่งข้อความ"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-ink bg-mustard text-[12px]"
        >
          ➤
        </button>
      </form>
    </>
  );
}
