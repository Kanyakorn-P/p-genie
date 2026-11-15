"use client";

import { useEffect, useRef } from "react";
import { IconClose, IconTrash } from "./ui-icons";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

// กล่องยืนยันแบบเดียวกับธีมเว็บ ใช้แทน window.confirm ที่หน้าตาไม่เข้ากับแอป
export function ConfirmDialog({
  open,
  title,
  description,
  detail,
  confirmLabel = "ลบเลย",
  cancelLabel = "ยกเลิก",
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (!open) return;

    cancelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancelRef.current();
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-navy/35 p-3 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="surface soft-shadow w-[min(420px,100%)] rounded-t-3xl p-5 sm:rounded-3xl sm:p-6"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-soft text-red">
            <IconTrash size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-bold text-navy">{title}</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-muted">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="ปิดหน้าต่าง"
            className="focus-ring -mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-cream-deep"
          >
            <IconClose size={16} />
          </button>
        </div>

        {detail && (
          <p className="mt-4 truncate rounded-xl border border-line bg-cream px-3 py-2.5 text-[13px] font-semibold text-ink">
            {detail}
          </p>
        )}

        <div className="mt-5 flex gap-2 sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="focus-ring flex-1 rounded-full border border-line px-4 py-2.5 text-[12.5px] font-semibold text-ink transition hover:bg-cream-deep sm:flex-none"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="focus-ring flex-1 rounded-full bg-red px-5 py-2.5 text-[12.5px] font-semibold text-paper transition hover:opacity-90 sm:flex-none"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
