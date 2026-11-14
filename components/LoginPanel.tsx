"use client";

import type { AccountUser } from "@/lib/supabase";
import { IconLink } from "./ui-icons";

type LoginPanelProps = {
  user: AccountUser | null;
  onGoogle: () => void;
  onDiscord: () => void;
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

function DiscordMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#ffffff"
        d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.51.07.07 0 0 0-.08.03c-.21.38-.44.87-.61 1.25a18.3 18.3 0 0 0-5.49 0c-.16-.39-.4-.87-.62-1.25a.08.08 0 0 0-.08-.03 19.74 19.74 0 0 0-4.88 1.51.07.07 0 0 0-.04.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 5.99 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.23-2a.08.08 0 0 0-.04-.1 13.1 13.1 0 0 1-1.87-.9.08.08 0 0 1 0-.12l.37-.3a.07.07 0 0 1 .08 0 14.2 14.2 0 0 0 12.06 0 .07.07 0 0 1 .08.01l.37.3a.08.08 0 0 1 0 .12c-.6.35-1.22.65-1.87.89a.08.08 0 0 0-.04.11c.36.7.77 1.36 1.22 1.99a.08.08 0 0 0 .09.03 19.84 19.84 0 0 0 6-3.03.08.08 0 0 0 .03-.06c.5-5.18-.84-9.67-3.55-13.66a.06.06 0 0 0-.03-.03ZM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42s.96-2.42 2.16-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.34-.96 2.42-2.16 2.42Zm7.97 0c-1.18 0-2.16-1.08-2.16-2.42s.96-2.42 2.16-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.34-.95 2.42-2.16 2.42Z"
      />
    </svg>
  );
}

export function LoginPanel({
  user,
  onGoogle,
  onDiscord,
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
        onClick={onDiscord}
        className="focus-ring mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-3 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#4752C4]"
      >
        <DiscordMark />
        ดำเนินการต่อด้วย Discord
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
