"use client";

import type { AccountUser } from "@/lib/supabase";
import { IconLink } from "./ui-icons";

type LoginPanelProps = {
  user: AccountUser | null;
  onGoogle: () => void;
  onLine: () => void;
  onSignOut: () => void;
  roomCode: string;
  onCopyLink: () => void;
};

function GoogleMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.5 2.5 30.1 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.3 17.6 9.5 24 9.5Z"
      />
      <path
        fill="#4285F4"
        d="M46.1 24.5c0-1.6-.1-2.8-.4-4.1H24v9.2h12.5c-.3 2.1-1.6 5.2-4.7 7.3l7.6 5.9c4.5-4.2 6.7-10.3 6.7-18.3Z"
      />
      <path
        fill="#FBBC05"
        d="M10.4 28.7A14.5 14.5 0 0 1 9.6 24c0-1.6.3-3.2.8-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1Z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.8-5.8l-7.6-5.9c-2.1 1.4-4.8 2.4-8.2 2.4-6.4 0-11.7-3.8-13.6-9.1l-7.8 6.1C6.5 42.6 14.6 48 24 48Z"
      />
    </svg>
  );
}

function LineMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#ffffff"
        d="M12 3.2c5 0 9 3.2 9 7.2 0 3.6-3.1 6.6-7.3 7.1-.3.1-.7.2-.8.5-.1.2-.1.5-.1.7l-.1.8c0 .2-.2.9-.8.9-.3 0-.6-.2-.9-.5-2.5-2.7-3.3-3.9-4.4-5.2C4.3 13.4 3 11.9 3 10.4c0-4 4-7.2 9-7.2Z"
      />
      <text
        x="12"
        y="12.4"
        textAnchor="middle"
        fontSize="4.6"
        fontWeight="700"
        fill="#06C755"
        fontFamily="Arial, sans-serif"
      >
        LINE
      </text>
    </svg>
  );
}

export function LoginPanel({
  user,
  onGoogle,
  onLine,
  onSignOut,
  roomCode,
  onCopyLink,
}: LoginPanelProps) {
  if (user) {
    const initial = (user.name ?? user.email ?? "จ").trim().charAt(0) || "จ";

    return (
      <div className="soft-shadow absolute right-0 top-11 z-30 w-[300px] rounded-2xl border border-line bg-paper p-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-yellow font-mali text-[16px] font-bold text-navy">
            {initial}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[12.5px] font-semibold text-navy">
              {user.name ?? "บัญชีของฉัน"}
            </p>
            <p className="truncate text-[10.5px] text-muted">
              {user.email ?? "ล็อกอินอยู่"}
            </p>
          </div>
        </div>

        <p className="mt-3 rounded-xl bg-green-soft px-3 py-2 text-[11px] leading-relaxed text-green">
          งานในบัญชีนี้เห็นได้จากทุกเครื่องที่ล็อกอินบัญชีเดียวกัน
        </p>

        <button
          onClick={onSignOut}
          className="focus-ring mt-3 w-full rounded-xl border border-line px-3 py-2 text-[11.5px] font-semibold text-ink transition hover:bg-cream"
        >
          ออกจากระบบ
        </button>
      </div>
    );
  }

  return (
    <div className="soft-shadow absolute right-0 top-11 z-30 w-[300px] rounded-2xl border border-line bg-paper p-4">
      <p className="text-[13px] font-semibold text-navy">เข้าสู่ระบบ</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">
        ล็อกอินบัญชีเดียวกับมือถือ งานจะขึ้นตรงกันทุกเครื่อง
      </p>

      <button
        onClick={onGoogle}
        className="focus-ring mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-paper px-3 py-2.5 text-[12px] font-semibold text-ink transition hover:bg-cream"
      >
        <GoogleMark />
        ดำเนินการต่อด้วย Google
      </button>

      <button
        onClick={onLine}
        className="focus-ring mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#06C755] px-3 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#05b34c]"
      >
        <LineMark />
        ดำเนินการต่อด้วย LINE
      </button>

      <p className="mt-2 text-center text-[10px] leading-relaxed text-muted">
        ครั้งแรกกดแล้วสมัครบัญชีให้เลย ไม่ต้องตั้งรหัสผ่าน
      </p>

      <div className="my-3 flex items-center gap-2 text-[10px] text-muted">
        <span className="h-px flex-1 bg-line" />
        หรือ
        <span className="h-px flex-1 bg-line" />
      </div>

      <p className="text-[10.5px] leading-relaxed text-muted">
        ยังไม่ล็อกอินก็ใช้ได้ ผ่านลิงก์ห้องนี้
      </p>
      <p className="mt-1 truncate rounded-lg bg-cream px-2.5 py-1.5 text-[10px] text-muted">
        ?room={roomCode || "..."}
      </p>
      <button
        onClick={onCopyLink}
        className="focus-ring mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-navy px-3 py-2 text-[11.5px] font-semibold text-paper transition hover:bg-navy-deep"
      >
        <IconLink size={13} />
        คัดลอกลิงก์ห้อง
      </button>
    </div>
  );
}
