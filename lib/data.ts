export type SubjectKey = "ฟิสิกส์" | "ไทย" | "คณิต" | "อื่นๆ";

export type Subject = {
  key: SubjectKey;
  short: string;
  full: string;
  card: string;
  chip: string;
  dot: string;
  text: string;
};

export const SUBJECTS: Record<SubjectKey, Subject> = {
  ฟิสิกส์: {
    key: "ฟิสิกส์",
    short: "ฟ.",
    full: "ฟิสิกส์",
    card: "bg-peach",
    chip: "bg-peach",
    dot: "bg-[#e0a184]",
    text: "text-[#a3452a]",
  },
  ไทย: {
    key: "ไทย",
    short: "ไทย",
    full: "ภาษาไทย",
    card: "bg-mustard-soft",
    chip: "bg-mustard-soft",
    dot: "bg-mustard",
    text: "text-[#8a6a10]",
  },
  คณิต: {
    key: "คณิต",
    short: "คณิต",
    full: "คณิตศาสตร์",
    card: "bg-mint",
    chip: "bg-mint",
    dot: "bg-[#b7cc94]",
    text: "text-[#4f6b1f]",
  },
  อื่นๆ: {
    key: "อื่นๆ",
    short: "อื่นๆ",
    full: "ไม่ระบุวิชา",
    card: "bg-cream-deep",
    chip: "bg-cream-deep",
    dot: "bg-ink-soft",
    text: "text-ink-soft",
  },
};

export const FOLDER_SUBJECTS = [
  SUBJECTS["ฟิสิกส์"],
  SUBJECTS["ไทย"],
  SUBJECTS["คณิต"],
];

export type Task = {
  id: string;
  title: string;
  subject: SubjectKey;
  due: string;
  urgent?: boolean;
  done: boolean;
};
