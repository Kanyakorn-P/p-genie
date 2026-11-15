"use client";

import { subjectLabel, type Task } from "@/lib/data";
import { isTaskUrgent, taskDueLabel } from "@/lib/due-date";
import { toneFor, type FolderColor } from "@/lib/theme";
import { IconCheck, IconTrash } from "./ui-icons";

type TaskRowProps = {
  task: Task;
  color: FolderColor;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
};

export function TaskRow({ task, color, onToggle, onDelete }: TaskRowProps) {
  const tone = toneFor(color);

  return (
    <div className="group flex items-center gap-3 rounded-2xl bg-cream px-3 py-3 sm:px-4">
      <button
        onClick={() => onToggle(task.id)}
        aria-label={
          task.done ? "ทำเครื่องหมายว่ายังไม่เสร็จ" : "ทำเครื่องหมายว่าเสร็จแล้ว"
        }
        aria-pressed={task.done}
        className={`focus-ring grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md border-2 transition ${
          task.done
            ? "border-navy bg-navy text-paper"
            : "border-[#d9cdb4] bg-paper text-transparent hover:border-navy"
        }`}
      >
        <IconCheck size={13} />
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-[13px] font-medium ${
            task.done ? "text-muted line-through" : "text-ink"
          }`}
        >
          {task.title}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10.5px]">
          <span className={`rounded-full px-2.5 py-0.5 font-semibold ${tone.chip}`}>
            {subjectLabel(task.subject)}
          </span>
          <span className="rounded-full bg-paper px-2.5 py-0.5 text-muted">
            {taskDueLabel(task)}
          </span>
          {isTaskUrgent(task) && !task.done && (
            <span className="rounded-full bg-red-soft px-2.5 py-0.5 font-semibold text-red">
              ด่วน
            </span>
          )}
        </div>
      </div>

      <button
        onClick={() => {
          if (window.confirm(`ลบ "${task.title}" ออกใช่ไหม?`)) onDelete(task.id);
        }}
        aria-label="ลบการบ้าน"
        className="focus-ring grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted opacity-0 transition hover:bg-red-soft hover:text-red group-hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-100"
      >
        <IconTrash size={16} />
      </button>
    </div>
  );
}
