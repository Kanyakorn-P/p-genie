type IconProps = {
  className?: string;
  size?: number;
};

const ink = "#22252b";

export function HouseIcon({ className = "", size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M7 32 32 7l25 25"
        stroke={ink}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M12 27v26c0 2.2 1.6 3.6 3.8 3.6h32.4c2.2 0 3.8-1.4 3.8-3.6V27"
        fill="#f5c542"
        stroke={ink}
        strokeWidth="4.5"
        strokeLinejoin="round"
      />
      <path
        d="M27 56.5V39h11v17.5"
        fill="#fffdf7"
        stroke={ink}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M41 13h7v8"
        fill="#f5c542"
        stroke={ink}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChatIcon({ className = "", size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M26 9h28a6 6 0 0 1 6 6v14a6 6 0 0 1-6 6H45l1 8-9-8h-2"
        fill="#f4f1e6"
        stroke={ink}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path
        d="M6 25h26a6 6 0 0 1 6 6v12a6 6 0 0 1-6 6H22l-8 8 1-8H10a6 6 0 0 1-4-6V31a6 6 0 0 1 6-6z"
        fill="#fbf7ee"
        stroke={ink}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <g fill={ink}>
        <rect x="14" y="33" width="4" height="4" rx="1" />
        <rect x="22" y="33" width="4" height="4" rx="1" />
        <rect x="30" y="33" width="4" height="4" rx="1" />
        <rect x="36" y="18" width="4" height="4" rx="1" />
        <rect x="44" y="18" width="4" height="4" rx="1" />
        <rect x="52" y="18" width="4" height="4" rx="1" />
      </g>
    </svg>
  );
}

export function HomeworkIcon({ className = "", size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="10"
        y="6"
        width="44"
        height="50"
        rx="7"
        fill="#d9533b"
        stroke={ink}
        strokeWidth="3.5"
      />
      <path
        d="M18 6v50"
        stroke="#a83c29"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect
        x="23"
        y="20"
        width="26"
        height="19"
        rx="3"
        fill="#f7edd4"
        stroke="#a83c29"
        strokeWidth="2"
      />
      <path
        d="M27 26h17M27 32h17"
        stroke="#6f8aa6"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M15 53h35"
        stroke="#f7edd4"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AlarmClockIcon({ className = "", size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M15 15 9 8M49 15l6-7"
        stroke={ink}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="32" cy="34" r="23" fill={ink} />
      <circle cx="32" cy="34" r="17.5" fill="#f5f1e6" />
      <path
        d="M32 34V21"
        stroke={ink}
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M32 34l10 6"
        stroke={ink}
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M32 34v12"
        stroke="#ef9c1f"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M22 56l2 4M42 56l-2 4"
        stroke={ink}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="32" cy="34" r="2.4" fill={ink} />
    </svg>
  );
}

export function CeramicClockIcon({ className = "", size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
    >
      <circle cx="32" cy="33" r="27" fill="#f1e9da" />
      <circle cx="32" cy="33" r="27" fill="none" stroke="#ded2bf" strokeWidth="2" />
      <circle cx="32" cy="33" r="16" fill="#cfe0ee" />
      <ellipse cx="28" cy="30" rx="7" ry="3.4" fill="#fffdf7" transform="rotate(-14 28 30)" />
      <ellipse cx="36" cy="37" rx="7" ry="3.4" fill="#fffdf7" transform="rotate(8 36 37)" />
      <circle cx="23" cy="28" r="1.6" fill="#fffdf7" />
      <circle cx="31" cy="35" r="1.6" fill="#fffdf7" />
      <circle cx="38" cy="26" r="1.4" fill="#8fbf7a" />
      <circle cx="42" cy="31" r="1.2" fill="#8fbf7a" />
      <path d="M32 33V22" stroke="#6b6250" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M32 33l8 4" stroke="#6b6250" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="32" cy="33" r="1.6" fill="#b08a45" />
      <text
        x="32"
        y="14"
        textAnchor="middle"
        fontSize="8"
        fill="#9a907c"
        fontFamily="inherit"
      >
        12
      </text>
      <text
        x="54"
        y="36"
        textAnchor="middle"
        fontSize="8"
        fill="#9a907c"
        fontFamily="inherit"
      >
        3
      </text>
      <text
        x="32"
        y="58"
        textAnchor="middle"
        fontSize="8"
        fill="#9a907c"
        fontFamily="inherit"
      >
        6
      </text>
      <text
        x="10"
        y="36"
        textAnchor="middle"
        fontSize="8"
        fill="#9a907c"
        fontFamily="inherit"
      >
        9
      </text>
    </svg>
  );
}

export function StickyNoteIcon({ className = "", size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
    >
      <g transform="rotate(-5 32 32)">
        <rect
          x="13"
          y="11"
          width="38"
          height="44"
          rx="3"
          fill="#f7f1e2"
          stroke="#e2d6c0"
          strokeWidth="2"
        />
        <path
          d="M19 24h26M19 32h26M19 40h18"
          stroke="#cdd7e6"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <g>
          <path
            d="M35 17l2.5-3 2.5 3zM43 17l2.5-3 2.5 3z"
            fill="#efe3cc"
            stroke="#cdbda0"
            strokeWidth="1"
          />
          <circle cx="41.5" cy="21" r="5.4" fill="#f6efdf" stroke="#cdbda0" strokeWidth="1.2" />
          <circle cx="39.5" cy="20.4" r="0.9" fill="#8a7f6c" />
          <circle cx="43.5" cy="20.4" r="0.9" fill="#8a7f6c" />
          <path
            d="M38.6 23.4c1 1.6 2.4 2.2 3.4 0.8M44 23.4c-1 1.6-2.4 2.2-3.4 0.8"
            stroke="#8a7f6c"
            strokeWidth="1.1"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      </g>
      <rect x="25" y="3" width="16" height="9" rx="2" fill="#e9c07b" opacity="0.95" />
    </svg>
  );
}

export function CatFolderIcon({ className = "", size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M5 15h17l6 7h31v30a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5z"
        fill="#dcecd6"
        stroke="#c2d8ba"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <g fill="#7fa874" opacity="0.75">
        <circle cx="14" cy="16" r="1.1" />
        <circle cx="22" cy="16" r="1.1" />
        <circle cx="30" cy="16" r="1.1" />
        <circle cx="38" cy="16" r="1.1" />
        <circle cx="46" cy="16" r="1.1" />
        <circle cx="54" cy="16" r="1.1" />
        <circle cx="14" cy="52" r="1.1" />
        <circle cx="30" cy="52" r="1.1" />
        <circle cx="46" cy="52" r="1.1" />
      </g>
      <ellipse cx="33" cy="42" rx="13" ry="9" fill="#fffdf9" />
      <circle cx="30" cy="36" r="8" fill="#fffdf9" />
      <path d="M23 31l-1-7 6 4zM37 31l1-7-6 4z" fill="#f3f0e6" stroke="#fffdf9" strokeWidth="1" />
      <path d="M22 33c5-6 13-6 17 0z" fill="#f5d383" stroke="#e9c477" strokeWidth="1" />
      <path
        d="M25 37c1.4 1 2.6 1 4 0M33 37c1.4 1 2.6 1 4 0"
        stroke="#2f2f2f"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M29 41c1.2 1.4 3 1.4 4 0"
        stroke="#2f2f2f"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M45 46c3 2 5 3 8 2" stroke="#fffdf9" strokeWidth="4" strokeLinecap="round" />
      <g>
        <circle cx="49" cy="25" r="3" fill="#5f9a55" />
        <circle cx="53" cy="29" r="3" fill="#6fae62" />
        <circle cx="52" cy="22" r="2.6" fill="#548c4a" />
      </g>
    </svg>
  );
}
