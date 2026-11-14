export type Task = {
  id: string;
  title: string;
  subject: string;
  due: string;
  createdAt?: string | number;
  urgent?: boolean;
  done: boolean;
};

export const NO_SUBJECT = "อื่นๆ";

export function subjectLabel(subject: string) {
  return !subject || subject === NO_SUBJECT ? "ไม่ระบุวิชา" : subject;
}
