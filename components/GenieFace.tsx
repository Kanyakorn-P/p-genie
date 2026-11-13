export function GenieFace({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="32"
        cy="34"
        r="23"
        fill="#FFFDF7"
        stroke="#1E2733"
        strokeWidth="2.5"
      />
      <path
        d="M11 24c0-11 9-17 21-17s21 6 21 17"
        fill="#F5C542"
        stroke="#1E2733"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <rect
        x="9"
        y="19"
        width="46"
        height="8"
        rx="4"
        fill="#E4B02C"
        stroke="#1E2733"
        strokeWidth="2.5"
      />
      <circle
        cx="32"
        cy="13"
        r="3"
        fill="#FFFDF7"
        stroke="#1E2733"
        strokeWidth="2"
      />
      <circle cx="23" cy="35" r="2.6" fill="#1E2733" />
      <circle cx="41" cy="35" r="2.6" fill="#1E2733" />
      <path
        d="M27 42c2.8 3.2 7.2 3.2 10 0"
        stroke="#1E2733"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="17" cy="41" r="3.2" fill="#F5B7A0" opacity="0.9" />
      <circle cx="47" cy="41" r="3.2" fill="#F5B7A0" opacity="0.9" />
    </svg>
  );
}
