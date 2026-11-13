export type FolderColor = "blue" | "yellow" | "red" | "green" | "plum";

export type Folder = {
  id: string;
  name: string;
  color: FolderColor;
};

type Tone = {
  dot: string;
  soft: string;
  chip: string;
  bar: string;
  text: string;
  swatch: string;
};

export const FOLDER_TONES: Record<FolderColor, Tone> = {
  blue: {
    dot: "bg-blue",
    soft: "bg-blue-soft",
    chip: "bg-blue-soft text-navy",
    bar: "bg-blue",
    text: "text-navy",
    swatch: "bg-blue",
  },
  yellow: {
    dot: "bg-yellow",
    soft: "bg-yellow-soft",
    chip: "bg-yellow-soft text-[#8a6410]",
    bar: "bg-yellow",
    text: "text-[#8a6410]",
    swatch: "bg-yellow",
  },
  red: {
    dot: "bg-red",
    soft: "bg-red-soft",
    chip: "bg-red-soft text-[#a33a30]",
    bar: "bg-red",
    text: "text-[#a33a30]",
    swatch: "bg-red",
  },
  green: {
    dot: "bg-green",
    soft: "bg-green-soft",
    chip: "bg-green-soft text-green",
    bar: "bg-green",
    text: "text-green",
    swatch: "bg-green",
  },
  plum: {
    dot: "bg-plum",
    soft: "bg-plum-soft",
    chip: "bg-plum-soft text-plum",
    bar: "bg-plum",
    text: "text-plum",
    swatch: "bg-plum",
  },
};

export const FOLDER_COLOR_ORDER: FolderColor[] = [
  "blue",
  "yellow",
  "red",
  "green",
  "plum",
];

export function isFolderColor(value: string): value is FolderColor {
  return (FOLDER_COLOR_ORDER as string[]).includes(value);
}

// จับคู่วิชาของงานเข้ากับโฟลเดอร์ เช่น "ฟิสิกส์" เข้าโฟลเดอร์ "ฟิสิกส์ ม.4" ได้
export function folderForSubject(
  subject: string,
  folders: Folder[],
): Folder | null {
  const name = subject.trim();
  if (!name) return null;

  const exact = folders.find((f) => f.name === name);
  if (exact) return exact;

  return (
    folders.find((f) => f.name.includes(name) || name.includes(f.name)) ?? null
  );
}

export function toneFor(color: FolderColor): Tone {
  return FOLDER_TONES[color] ?? FOLDER_TONES.blue;
}

// วิชาที่ยังไม่มีโฟลเดอร์ก็ยังมีสีของตัวเอง ไม่ต้องรอให้สร้างโฟลเดอร์ก่อน
export function colorForName(
  name: string,
  folders: Folder[],
): FolderColor {
  const found = folders.find((f) => f.name === name);
  if (found) return found.color;

  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 9973;
  return FOLDER_COLOR_ORDER[hash % FOLDER_COLOR_ORDER.length];
}
