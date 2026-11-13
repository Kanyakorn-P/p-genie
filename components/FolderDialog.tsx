"use client";

import { useState } from "react";
import {
  FOLDER_COLOR_ORDER,
  FOLDER_TONES,
  type FolderColor,
} from "@/lib/theme";
import { IconClose } from "./ui-icons";

type FolderDialogProps = {
  mode: "create" | "edit";
  initialName?: string;
  initialColor?: FolderColor;
  existingNames: string[];
  onClose: () => void;
  onSave: (name: string, color: FolderColor) => void;
};

export function FolderDialog({
  mode,
  initialName = "",
  initialColor = "blue",
  existingNames,
  onClose,
  onSave,
}: FolderDialogProps) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState<FolderColor>(initialColor);
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();

    if (!trimmed) {
      setError("ใส่ชื่อโฟลเดอร์ก่อนน้า");
      return;
    }

    const duplicate = existingNames.some(
      (n) => n.toLowerCase() === trimmed.toLowerCase() && n !== initialName,
    );
    if (duplicate) {
      setError("มีโฟลเดอร์ชื่อนี้อยู่แล้ว");
      return;
    }

    onSave(trimmed, color);
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-navy/30 p-4 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      role="presentation"
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="surface soft-shadow w-[min(430px,100%)] p-6"
        role="dialog"
        aria-modal="true"
        aria-label={mode === "create" ? "เพิ่มโฟลเดอร์วิชา" : "แก้ไขชื่อโฟลเดอร์"}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[18px] font-bold text-navy">
              {mode === "create" ? "เพิ่มโฟลเดอร์วิชา" : "แก้ไขโฟลเดอร์"}
            </h2>
            <p className="mt-1 text-[12px] text-muted">
              {mode === "create"
                ? "ตั้งชื่อวิชาที่จะเก็บการบ้านไว้ด้วยกัน"
                : "เปลี่ยนชื่อหรือสีของโฟลเดอร์นี้"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
            className="focus-ring grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-cream-deep"
          >
            <IconClose size={16} />
          </button>
        </div>

        <label className="mt-5 block text-[12px] font-semibold text-ink">
          ชื่อโฟลเดอร์
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            autoFocus
            placeholder="เช่น ฟิสิกส์, ภาษาไทย, กิจกรรม"
            className="focus-ring mt-1.5 w-full rounded-xl border border-line bg-cream px-4 py-2.5 text-[13px] font-normal outline-none placeholder:text-muted"
          />
        </label>

        <div className="mt-4">
          <p className="text-[12px] font-semibold text-ink">สีประจำโฟลเดอร์</p>
          <div className="mt-2 flex gap-2">
            {FOLDER_COLOR_ORDER.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`เลือกสี ${c}`}
                aria-pressed={color === c}
                className={`focus-ring h-8 w-8 rounded-full ${FOLDER_TONES[c].swatch} ${
                  color === c
                    ? "ring-2 ring-navy ring-offset-2 ring-offset-paper"
                    : "opacity-70 hover:opacity-100"
                }`}
              />
            ))}
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-red-soft px-3 py-2 text-[12px] text-red">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="focus-ring rounded-full border border-line px-4 py-2 text-[12.5px] font-semibold text-ink hover:bg-cream-deep"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            className="focus-ring rounded-full bg-navy px-5 py-2 text-[12.5px] font-semibold text-paper hover:bg-navy-deep"
          >
            {mode === "create" ? "สร้างโฟลเดอร์" : "บันทึก"}
          </button>
        </div>
      </form>
    </div>
  );
}
