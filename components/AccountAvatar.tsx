"use client";

import { useState } from "react";

type AccountAvatarProps = {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  size: number;
  className?: string;
};

// รูปโปรไฟล์จาก Google / Discord ถ้าโหลดไม่ได้ค่อยกลับไปใช้ตัวอักษรแรก
export function AccountAvatar({
  name,
  email,
  avatarUrl,
  size,
  className = "",
}: AccountAvatarProps) {
  const [failed, setFailed] = useState(false);
  const initial = (name ?? email ?? "จ").trim().charAt(0) || "จ";
  const showImage = Boolean(avatarUrl) && !failed;

  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full ${className}`}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl ?? ""}
          alt={name ?? "รูปโปรไฟล์"}
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          className="font-mali font-bold leading-none"
          style={{ fontSize: Math.round(size * 0.42) }}
        >
          {initial}
        </span>
      )}
    </span>
  );
}
