"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { NO_SUBJECT, subjectLabel, type Task } from "@/lib/data";
import { parseTasks } from "@/lib/parse";
import {
  deleteFolderRow,
  insertFolder,
  listFolders,
  updateFolder,
} from "@/lib/folders";
import {
  colorForName,
  folderForSubject,
  toneFor,
  type Folder,
  type FolderColor,
} from "@/lib/theme";
import {
  addTasks,
  claimGuestData,
  deleteTask,
  getSupabase,
  listTasks,
  ownerToken,
  renameTaskSubject,
  setTaskDone,
  signInWith,
  signOutNow,
  toAccountUser,
  updateTaskDue,
  submitFeedback,
  type AccountUser,
} from "@/lib/supabase";
import { askGenie, type AiMode } from "@/lib/genie-ai";
import {
  anchorDate,
  canonicalDue,
  daysBetween,
  describeDue,
  isTaskUrgent,
  parseDueAnswer,
  resolveDue,
  startOfDay,
  taskDueLabel,
} from "@/lib/due-date";
import { ChatPanel, type ChatMessage } from "./ChatPanel";
import { AccountAvatar } from "./AccountAvatar";
import { CalendarView } from "./CalendarView";
import { ConfirmDialog } from "./ConfirmDialog";
import { FolderDialog } from "./FolderDialog";
import { GenieFace } from "./GenieFace";
import { LoginPanel } from "./LoginPanel";
import { Sidebar, type NavKey } from "./Sidebar";
import { TaskRow } from "./TaskRow";
import { CatFolderIcon } from "./icons";
import {
  IconBell,
  IconBook,
  IconChat,
  IconClose,
  IconClock,
  IconHome,
  IconPencil,
  IconPlus,
  IconSearch,
  IconSparkle,
  IconTrash,
} from "./ui-icons";

const START_MESSAGE: ChatMessage = {
  id: "hello",
  role: "genie",
  text: "สวัสดีจ้า พี่จินนี่เอง ✨ พิมพ์การบ้านมาหลายวิชาพร้อมกันได้เลยน้า เช่น ฟิสิกส์หน้า 45 ส่งพรุ่งนี้ ไทยแต่งกลอน 2 บท ส่งศุกร์หน้า",
};

const ONBOARDING_KEY = "p-genie-onboarding-dismissed-v1";
// ความชอบการแจ้งเตือนหน้าแนะนำ: "never" = ไม่ถามอีก, "always" = ถามทุกครั้ง,
// ไม่มีค่า = ค่าเดิมคือถามครั้งแรกครั้งเดียว
const ONBOARDING_PREF_KEY = "p-genie-onboarding-pref-v1";
const ONBOARDING_STEPS = [
  {
    title: "พิมพ์งานที่อยากจดได้เลย",
    text: "การบ้านบอกวิชากับรายละเอียด ส่วนธุระหรือนัดหมายบอกสิ่งที่ต้องทำและวันเวลาได้เลย",
  },
  {
    title: "ยังไม่รู้กำหนดก็จดไว้ก่อนได้",
    text: "การบ้านที่ยังไม่ระบุกำหนด พี่จินนี่จะถามวันส่ง ส่วนงานทั่วไปจะไม่ถามวันต่อ",
  },
  {
    title: "โฟลเดอร์สร้างและจัดให้เอง",
    text: "พิมพ์ “ฟิ” หรือ “วิทย์เรื่องเซลล์” ก็จะจับเข้าฟิสิกส์หรือชีววิทยาให้",
  },
  {
    title: "ดูงานได้หลายแบบ",
    text: "ใช้กำหนดการสัปดาห์นี้ ปฏิทินการบ้าน และค้นหางานที่ต้องส่งวันนี้ได้เลย",
  },
];
const subscribeOnboarding = (callback: () => void) => {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
};
const AI_MODE_KEY = "p-genie-ai-mode-v1";
const subscribeAiMode = (callback: () => void) => {
  window.addEventListener("p-genie-ai-mode", callback);
  return () => window.removeEventListener("p-genie-ai-mode", callback);
};
const getAiMode = (): AiMode =>
  window.localStorage.getItem(AI_MODE_KEY) === "balanced"
    ? "balanced"
    : "economy";
type OnboardingPref = "never" | "always";

function getOnboardingPref(): OnboardingPref | null {
  try {
    const saved = window.localStorage.getItem(ONBOARDING_PREF_KEY);
    if (saved === "never" || saved === "always") return saved;
    // ผู้ใช้เวอร์ชันก่อนที่กดปิดไปแล้ว ถือว่าเลือก "ไม่ต้องแจ้งแล้ว"
    if (window.localStorage.getItem(ONBOARDING_KEY) === "1") return "never";
  } catch {
    // อ่าน localStorage ไม่ได้ ก็ใช้ค่าเริ่มต้น
  }
  return null;
}

const getOnboardingDismissed = () => getOnboardingPref() === "never";

const CHIPS = [
  "ฟิสิกส์หน้า 45 ส่งพรุ่งนี้",
  "ไทยแต่งกลอน 2 บท ส่งศุกร์หน้า",
  "คณิตทำโจทย์ 10 ข้อ",
];

type Filter =
  | { kind: "folder"; id: string; name: string }
  | { kind: "due"; key: string }
  | null;

type ProgressRow = {
  key: string;
  id: string | null;
  name: string;
  label: string;
  color: FolderColor;
  total: number;
  done: number;
};

let uidCounter = 0;
function uid() {
  uidCounter += 1;
  return `id-${uidCounter}-${Date.now().toString(36)}`;
}

const SHORT_DAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const FULL_DAYS = [
  "อาทิตย์",
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
];

const emptySubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (callback: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    [query],
  );
  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query],
  );
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

function formatToday(date: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function buildWeek(today: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const key =
      i === 0 ? "วันนี้" : i === 1 ? "พรุ่งนี้" : `วัน${FULL_DAYS[d.getDay()]}`;
    return {
      day: String(d.getDate()),
      label: i === 0 ? "วันนี้" : i === 1 ? "พรุ่งนี้" : SHORT_DAYS[d.getDay()],
      active: i === 0,
      dueKey: key,
    };
  });
}

function taskDue(task: Task, today: Date = new Date()) {
  return resolveDue(task.due, anchorDate(task.createdAt ?? today));
}

function isSameDay(a: Date | null, b: Date | null) {
  return Boolean(a && b && daysBetween(a, b) === 0);
}

function dueMatches(
  due: string,
  targetKey: string,
  createdAt?: string | number | null,
) {
  const today = startOfDay(new Date());
  const target = resolveDue(targetKey, today);
  const date = resolveDue(due, anchorDate(createdAt ?? today));
  if (target && date) return daysBetween(target, date) === 0;
  return due.includes(targetKey);
}

function dueSortRank(due: string, createdAt?: string | number | null) {
  const date = resolveDue(due, anchorDate(createdAt));
  if (!date) return 100000;
  return daysBetween(new Date(), date);
}

export function GenieApp() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [ready, setReady] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([START_MESSAGE]);
  const [input, setInput] = useState("");

  const [query, setQuery] = useState("");
  const [taskPage, setTaskPage] = useState(1);
  const [folderPage, setFolderPage] = useState(1);
  const [filter, setFilter] = useState<Filter>(null);
  const [activeNav, setActiveNav] = useState<NavKey>("home");
  const [dialog, setDialog] = useState<
    { mode: "create" } | { mode: "edit"; folder: Folder } | null
  >(null);
  const [confirmDialog, setConfirmDialog] = useState<
    | { kind: "folder"; folder: Folder }
    | { kind: "task"; id: string; title: string }
    | null
  >(null);
  const [pop, setPop] = useState<"bell" | "account" | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [user, setUser] = useState<AccountUser | null>(null);
  const [thinking, setThinking] = useState(false);
  const [pendingDueTaskIds, setPendingDueTaskIds] = useState<string[]>([]);
  const [contactOpen, setContactOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState<
    "idea" | "issue" | "other"
  >("idea");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [onboarding, setOnboarding] = useState<"ask" | "guide" | null>("ask");
  const [onboardingStep, setOnboardingStep] = useState(0);
  const onboardingDismissed = useSyncExternalStore(
    subscribeOnboarding,
    getOnboardingDismissed,
    () => false,
  );
  const aiMode = useSyncExternalStore(
    subscribeAiMode,
    getAiMode,
    () => "economy" as AiMode,
  );

  function changeAiMode(mode: AiMode) {
    window.localStorage.setItem(AI_MODE_KEY, mode);
    window.dispatchEvent(new Event("p-genie-ai-mode"));
  }

  function saveOnboardingPref(pref: OnboardingPref) {
    try {
      window.localStorage.setItem(ONBOARDING_PREF_KEY, pref);
    } catch {
      // ไม่เป็นไร ถ้าบันทึกไม่ได้
    }
  }

  // ปิดจากในหน้าแนะนำ: ถ้าเลือก "แจ้งเตือนทุกครั้ง" ไว้ก็ยังถามต่อครั้งหน้า
  function closeOnboarding() {
    if (getOnboardingPref() !== "always") saveOnboardingPref("never");
    setOnboarding(null);
  }

  // เลือก "ไม่ต้องแจ้งแล้ว" = ปิดถาวร ไม่ถามอีกเลย
  function stopOnboardingReminders() {
    saveOnboardingPref("never");
    setOnboarding(null);
  }

  // เลือก "แจ้งเตือนทุกครั้ง" = ถามใหม่ทุกครั้งที่เปิดแอป
  function remindOnboardingAlways() {
    saveOnboardingPref("always");
    setOnboarding(null);
  }

  const chatInputRef = useRef<HTMLInputElement>(null);
  const mounted = useMounted();
  const wide = useMediaQuery("(min-width: 1280px)");
  const mobile = useMediaQuery("(max-width: 639px)");

  useEffect(() => {
    let alive = true;

    Promise.all([listTasks(), listFolders()])
      .then(([loadedTasks, loadedFolders]) => {
        if (!alive) return;
        setTasks(loadedTasks);
        setFolders(loadedFolders);
      })
      .catch(() => {
        // อ่านข้อมูลไม่ได้ เริ่มจากลิสต์ว่าง
      })
      .finally(() => {
        if (alive) setReady(true);
      });

    return () => {
      alive = false;
    };
  }, []);

  // ฟังสถานะล็อกอิน Google / LINE
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    let alive = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (alive) setUser(toAccountUser(data.session?.user));
      })
      .catch(() => {});

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) setUser(toAccountUser(session?.user));
    });

    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const userId = user?.id ?? null;

  // พอล็อกอินแล้ว งานที่จดไว้ก่อนล็อกอินจะย้ายเข้าบัญชีให้ แล้วโหลดของบัญชีมาแสดง
  useEffect(() => {
    if (!userId) return;

    let alive = true;

    (async () => {
      await claimGuestData(userId);
      const [loadedTasks, loadedFolders] = await Promise.all([
        listTasks(),
        listFolders(),
      ]);
      if (!alive) return;
      setTasks(loadedTasks);
      setFolders(loadedFolders);
    })().catch(() => {});

    return () => {
      alive = false;
    };
  }, [userId]);

  // ถ้าล็อกอินไม่สำเร็จ Supabase จะเด้งกลับมาพร้อม error ใน URL บอกให้รู้ว่าเกิดอะไร
  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const pick = (key: string) =>
      search.get(key) ?? hash.get(key) ?? null;

    const code = pick("error_code") ?? pick("error");
    const desc = pick("error_description");

    if (code || desc) {
      const reason = desc ?? code ?? "";
      const thai = reason.toLowerCase();

      if (thai.includes("provider is not enabled")) {
        flash("Discord ยังไม่เปิดใน Supabase ต้องใส่ Client ID/Secret ก่อนน้า");
      } else if (thai.includes("email")) {
        flash("Discord บัญชีนี้ไม่ได้ให้สิทธิ์อีเมล ลองกด Allow ตอนถาม Permission");
      } else {
        flash(`ล็อกอินไม่สำเร็จ: ${reason.slice(0, 90)}`);
      }

      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    // มี code กลับมาแต่ไม่ได้ session = แลก token ไม่สำเร็จ
    if (search.get("code")) {
      const supabase = getSupabase();
      if (!supabase) return;
      const client = supabase;
      const timer = window.setTimeout(async () => {
        const { data } = await client.auth.getSession();
        if (!data.session) {
          flash(
            "ล็อกอินไม่ติด ลองปิดแท็บนี้แล้วเปิด p-genie.vercel.app ใหม่ หรือใช้ Google",
          );
        }
        window.history.replaceState({}, "", window.location.pathname);
      }, 5000);
      return () => window.clearTimeout(timer);
    }
  }, []);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }

  async function sendFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = feedbackMessage.trim();
    if (!message || feedbackSending) return;

    setFeedbackSending(true);
    try {
      const result = await submitFeedback(message, feedbackCategory);
      if (result.error) {
        flash(result.error);
        return;
      }
      setFeedbackMessage("");
      setFeedbackCategory("idea");
      setFeedbackOpen(false);
      flash("ขอบคุณสำหรับ Feedback นะ ✨");
    } catch {
      flash("ส่ง Feedback ไม่สำเร็จ ลองใหม่อีกครั้งนะ");
    } finally {
      setFeedbackSending(false);
    }
  }

  const todayLabel = mounted ? formatToday(new Date()) : "";
  const week = mounted ? buildWeek(new Date()) : [];

  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  const pending = total - done;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  const folderStats = useMemo(() => {
    const byFolder = new Map<string, { total: number; done: number }>();
    for (const f of folders) byFolder.set(f.id, { total: 0, done: 0 });
    const loose = new Map<string, { total: number; done: number }>();

    for (const t of tasks) {
      const folder = folderForSubject(t.subject, folders);
      const bucket = folder ? byFolder : loose;
      const key = folder ? folder.id : t.subject;
      const row = bucket.get(key) ?? { total: 0, done: 0 };
      row.total += 1;
      if (t.done) row.done += 1;
      bucket.set(key, row);
    }

    return { byFolder, loose };
  }, [tasks, folders]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of folders) {
      map[f.name] = folderStats.byFolder.get(f.id)?.total ?? 0;
    }
    return map;
  }, [folders, folderStats]);

  const visibleTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks
      .filter((t) => {
      if (filter?.kind === "folder") {
        const folder = folderForSubject(t.subject, folders);
        if (folder?.id !== filter.id) return false;
      }
      if (filter?.kind === "due" && !dueMatches(t.due, filter.key, t.createdAt)) return false;
      if (!q) return true;
      return `${t.title} ${subjectLabel(t.subject)} ${t.due}`
        .toLowerCase()
        .includes(q);
      })
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        const dueOrder =
          dueSortRank(a.due, a.createdAt) - dueSortRank(b.due, b.createdAt);
        if (dueOrder !== 0) return dueOrder;
        const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return aCreated - bCreated;
      });
  }, [tasks, filter, query, folders]);
  const tasksPerPage = mobile ? 3 : 5;
  const taskPageCount = Math.max(
    1,
    Math.ceil(visibleTasks.length / tasksPerPage),
  );
  const currentTaskPage = Math.min(taskPage, taskPageCount);
  const pagedTasks = visibleTasks.slice(
    (currentTaskPage - 1) * tasksPerPage,
    currentTaskPage * tasksPerPage,
  );
  const foldersPerPage = mobile ? 3 : 5;
  const folderPageCount = Math.max(
    1,
    Math.ceil(folders.length / foldersPerPage),
  );
  const currentFolderPage = Math.min(folderPage, folderPageCount);
  const pagedFolders = folders.slice(
    (currentFolderPage - 1) * foldersPerPage,
    currentFolderPage * foldersPerPage,
  );

  const tomorrowTasks = useMemo(
    () =>
      tasks.filter(
        (t) => !t.done && dueMatches(t.due, "พรุ่งนี้", t.createdAt),
      ),
    [tasks],
  );

  const urgentTasks = useMemo(
    () => tasks.filter((t) => !t.done && isTaskUrgent(t)),
    [tasks],
  );

  const progressRows = useMemo<ProgressRow[]>(() => {
    const rows: ProgressRow[] = folders.map((folder) => {
      const stat = folderStats.byFolder.get(folder.id) ?? { total: 0, done: 0 };
      return {
        key: folder.id,
        id: folder.id,
        name: folder.name,
        label: folder.name,
        color: folder.color,
        total: stat.total,
        done: stat.done,
      };
    });

    folderStats.loose.forEach((stat, name) => {
      rows.push({
        key: `subject-${name}`,
        id: null,
        name,
        label: subjectLabel(name),
        color: colorForName(name, folders),
        total: stat.total,
        done: stat.done,
      });
    });

    return rows;
  }, [folders, folderStats]);

  function scrollTo(id: string) {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function focusChat() {
    scrollTo("chat");
    window.setTimeout(() => chatInputRef.current?.focus(), 300);
  }

  function handleNav(key: NavKey) {
    setActiveNav(key);
    if (key === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (key === "chat") {
      focusChat();
      return;
    }
    if (key === "tasks") {
      setFilter(null);
      scrollTo("tasks");
      return;
    }
    scrollTo("reminder");
  }

  function toggle(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const next = !task.done;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: next } : t)));
    void setTaskDone(id, next);
  }

  function removeTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    void deleteTask(id);
    flash("ลบการบ้านแล้ว");
  }

  function askDeleteTask(id: string) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    setConfirmDialog({ kind: "task", id, title: task.title });
  }

  function saveFolder(name: string, color: FolderColor) {
    if (!dialog) return;

    if (dialog.mode === "edit") {
      const old = dialog.folder;
      const next: Folder = { ...old, name, color };
      setFolders((prev) => prev.map((f) => (f.id === old.id ? next : f)));
      setTasks((prev) =>
        prev.map((t) => (t.subject === old.name ? { ...t, subject: name } : t)),
      );
      if (filter?.kind === "folder" && filter.id === old.id) {
        setFilter({ kind: "folder", id: old.id, name });
      }
      void updateFolder(next);
      if (old.name !== name) void renameTaskSubject(old.name, name);
      flash(`เปลี่ยนชื่อโฟลเดอร์เป็น "${name}" แล้ว`);
    } else {
      const folder: Folder = { id: uid(), name, color };
      setFolders((prev) => [...prev, folder]);
      void insertFolder(folder);
      flash(`เพิ่มโฟลเดอร์ "${name}" แล้ว`);
    }

    setDialog(null);
  }

  // ลบจริง ใช้ทั้งตอนกดยืนยันในกล่องและตอนสั่งลบผ่านแชท
  function deleteFolderNow(folder: Folder) {
    setFolders((prev) => prev.filter((f) => f.id !== folder.id));
    if (filter?.kind === "folder" && filter.id === folder.id) {
      setFilter(null);
    }
    void deleteFolderRow(folder.id);
    flash(`ลบโฟลเดอร์ "${folder.name}" แล้ว`);
  }

  function askDeleteFolder(folder: Folder) {
    setConfirmDialog({ kind: "folder", folder });
  }

  function folderDeleteTarget(text: string): Folder | null | undefined {
    const match = text.match(
      /^\s*(?:พี่ๆ?\s*)?(?:ช่วย\s*)?(?:เอาโฟลเดอร์ออก|ลบออก|เอาออก|ลบ)\s*(?:โฟลเดอร์\s*)?(.+?)\s*[นะน้าา.!?]*\s*$/i,
    );
    if (!match) return undefined;

    const requested = match[1]
      .replace(/^โฟลเดอร์\s*/i, "")
      .replace(/[“”"'`]/g, "")
      .replace(/\s*(?:ให้ที|ให้หน่อย|หน่อย|ที|นะ|น้า)\s*$/i, "")
      .trim();
    if (!requested) return null;

    return (
      folders.find((folder) => folder.name === requested) ??
      folders.find(
        (folder) =>
          folder.name.includes(requested) || requested.includes(folder.name),
      ) ??
      null
    );
  }

  function subjectOnlyCommand(text: string): string | null {
    const cleaned = text
      .trim()
      .replace(/^โฟลเดอร์\s*/i, "")
      .replace(/^(?:ช่วย\s*)?(?:สร้าง|เพิ่ม)\s*(?:โฟลเดอร์\s*)?/i, "")
      .replace(/\s*(?:ให้ที|ให้หน่อย|หน่อย|ที|นะ|น้า)\s*$/i, "")
      .trim();

    const subjects: Record<string, string> = {
      ฟิ: "ฟิสิกส์",
      ฟิสิกส์: "ฟิสิกส์",
      เลข: "คณิต",
      คณิต: "คณิต",
      คณิตศาสตร์: "คณิต",
      ไทย: "ไทย",
      ภาษาไทย: "ไทย",
      อิ๊ง: "อังกฤษ",
      อังกฤษ: "อังกฤษ",
      ภาษาอังกฤษ: "อังกฤษ",
      วิทย์: "วิทยาศาสตร์",
      วิทยาศาสตร์: "วิทยาศาสตร์",
      ชีวะ: "ชีววิทยา",
      ชีววิทยา: "ชีววิทยา",
      เซล: "ชีววิทยา",
      เซลล์: "ชีววิทยา",
      เคมี: "เคมี",
      สังคม: "สังคม",
    };

    return subjects[cleaned] ?? null;
  }

  function isTodayQuestion(text: string) {
    return (
      /วันนี้/.test(text) &&
      /(มีอะไร|ต้องส่ง|ส่งอะไร|การบ้าน|งาน)/.test(text)
    );
  }

  function isVagueHomeworkMessage(text: string) {
    return /^(?:มี|เพิ่ม|จด|ช่วยจด)?\s*(?:การบ้าน|งาน)\s*(?:เพิ่ม|ใหม่)?\s*(?:แล้ว|นะ|จ้า)?$/i.test(
      text.trim(),
    );
  }

  function casualReply(text: string): string | null {
    const value = text.trim();
    const hasHomeworkIntent =
      /(การบ้าน|งาน|ส่ง|ทำ|สอบ|โจทย์|หน้า|บทที่|แบบฝึกหัด|อาจารย์|ครู|วิชา|โฟลเดอร์|ช่วยจำ|เตือน|อย่าลืม|นัด|จ่าย|ซื้อ|โทร|ไปรับ|ซัก|ล้าง|จอง|ประชุม)/.test(
        value,
      );
    if (hasHomeworkIntent) return null;

    if (/^(?:สวัสดี|หวัดดี|ฮัลโหล|ดีจ้า|ดีครับ|ดีค่ะ)/.test(value)) {
      return "หวัดดีจ้า ✨ วันนี้เป็นไงบ้าง มีอะไรให้พี่จินนี่ช่วยไหม";
    }
    if (/ขอบคุณ|ขอบใจ/.test(value)) {
      return "ยินดีเสมอจ้า พี่จินนี่อยู่ตรงนี้นะ ✨";
    }
    if (/(วันนี้|ช่วงนี้)?\s*(เหนื่อย|เครียด|ง่วง|ท้อ|ไม่ไหว)/.test(value)) {
      return "โอ๋ ๆ พักก่อนก็ได้นะ หายใจลึก ๆ แล้วค่อยลุยทีละอย่าง พี่จินนี่อยู่เป็นเพื่อนจ้า";
    }
    if (/(ร้อน|หนาว)/.test(value)) {
      return "อากาศร้อนจริงจ้า 🥵 ไปดื่มน้ำเย็น ๆ หรือหาที่เย็น ๆ นั่งก่อนนะ";
    }
    if (/หิว/.test(value)) {
      return "หิวข้าวแล้วใช่ไหมจ๊ะ ไปหาอะไรอร่อย ๆ กินก่อนน้า 🍚";
    }
    if (/(งง|เบื่อ|เหงา|เศร้า|ดีใจ|ปวดหัว|ไม่สบาย)/.test(value)) {
      return "พี่จินนี่ได้ยินนะ ดูแลตัวเองก่อนน้า อยากเล่าอะไรให้ฟังต่อไหม ✨";
    }
    if (/^(?:จ้า|จ้าา|โอเค|โอเคจ้า|ครับ|ค่ะ)$/.test(value)) {
      return "เยี่ยมเลยจ้า พี่จินนี่อยู่ตรงนี้นะ ✨";
    }
    if (/ทำอะไรอยู่|เป็นไงบ้าง|คุยเล่น/.test(value)) {
      return "พี่จินนี่กำลังรอคุยกับเราอยู่เลยจ้า อยากคุยเรื่องอะไรดี ✨";
    }
    return null;
  }

  // สร้างโฟลเดอร์ให้วิชาที่ยังไม่มี (เช่นพิมพ์ "ฟิ" ก็ได้โฟลเดอร์ "ฟิสิกส์" เอง)
  function ensureFolders(names: string[]): {
    canonical: Map<string, string>;
    created: Folder[];
  } {
    const working = [...folders];
    const created: Folder[] = [];
    const canonical = new Map<string, string>();

    for (const raw of names) {
      const name = raw.trim();
      if (!name || name === NO_SUBJECT || canonical.has(name)) continue;

      const found = folderForSubject(name, working);
      if (found) {
        canonical.set(name, found.name);
        continue;
      }

      const folder: Folder = {
        id: uid(),
        name,
        color: colorForName(name, working),
      };
      working.push(folder);
      created.push(folder);
      canonical.set(name, name);
    }

    if (created.length > 0) {
      setFolders((prev) => [...prev, ...created]);
      for (const folder of created) void insertFolder(folder);
    }

    return { canonical, created };
  }

  async function send() {
    const text = input.trim();
    if (!text || thinking) return;

    const userMessage: ChatMessage = { id: uid(), role: "user", text };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setActiveNav("chat");

    if (pendingDueTaskIds.length > 0) {
      if (/งานไหน|อันไหน|อะไรนะ|หมายถึงงานไหน|ขอรายละเอียด/.test(text)) {
        const pendingTasks = tasks.filter((task) =>
          pendingDueTaskIds.includes(task.id),
        );
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "genie",
            text: `หมายถึงงานนี้จ้า\n${pendingTasks
              .map(
                (task) =>
                  `• ${subjectLabel(task.subject)}: ${task.title}\nงานนี้มีกำหนดวันไหนเหรอ?`,
              )
              .join("\n")}`,
          },
        ]);
        return;
      }

      const dueAnswer = parseDueAnswer(text);
      if (dueAnswer) {
        const label = dueAnswer.label;
        const diff = dueAnswer.date ? daysBetween(new Date(), dueAnswer.date) : null;
        const urgent = diff !== null && diff >= 0 && diff <= 2;

        setTasks((prev) =>
          prev.map((task) =>
            pendingDueTaskIds.includes(task.id)
              ? { ...task, due: label, urgent }
              : task,
          ),
        );
        for (const id of pendingDueTaskIds) {
          void updateTaskDue(id, label, urgent);
        }
        setPendingDueTaskIds([]);
        const hint = dueAnswer.date ? ` (${describeDue(dueAnswer.date)})` : "";
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "genie",
            text:
              dueAnswer.kind === "unknown"
                ? "โอเคจ้า เก็บไว้ก่อนนะ ไว้รู้กำหนดแล้วบอกพี่จินนี่ได้เลย"
                : `โอเคจ้า อัปเดตให้แล้ว กำหนดส่ง ${label} นะ${hint}`,
          },
        ]);
        return;
      }
    }

    // คำสั่งลบโฟลเดอร์ต้องทำเป็น action ก่อน ไม่ส่งเข้า Gemini ให้กลายเป็นการบ้าน
    const deleteTarget = folderDeleteTarget(text);
    if (deleteTarget !== undefined) {
      if (!deleteTarget) {
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "genie",
            text: "ยังหาโฟลเดอร์นี้ไม่เจอน้า ลองพิมพ์ชื่อโฟลเดอร์ให้ตรงอีกนิด",
          },
        ]);
        return;
      }

      deleteFolderNow(deleteTarget);
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "genie",
          text: `ลบโฟลเดอร์ "${deleteTarget.name}" ให้แล้วนะ การบ้านข้างในยังอยู่ ไม่ได้ลบตาม`,
        },
      ]);
      return;
    }

    // คำถามค้นงานวันนี้ต้องอ่านจากงานจริง ห้ามส่งเข้า AI ให้สร้างงานหรือโฟลเดอร์
    if (isTodayQuestion(text)) {
      const today = startOfDay(new Date());
      const dueToday = tasks.filter(
        (task) => !task.done && isSameDay(taskDue(task), today),
      );
      const answer =
        dueToday.length > 0
          ? `วันนี้มี ${dueToday.length} งานที่มีกำหนดน้า\n${dueToday
              .map(
                (task) =>
                  `• ${subjectLabel(task.subject)}: ${task.title} (${task.due})`,
              )
              .join("\n")}`
          : "วันนี้ยังไม่มีงานที่มีกำหนดไว้น้า พักหายใจได้เลย ✨";

      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "genie", text: answer },
      ]);
      return;
    }

    if (isVagueHomeworkMessage(text)) {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "genie",
          text: "ได้เลยจ้า อยากจดการบ้านหรืองานอะไรบอกพี่จินนี่ได้เลยน้า ถ้าเป็นการบ้านบอกวิชากับงานที่ต้องทำ ถ้ามีกำหนดวันไหนก็บอกได้เลย",
        },
      ]);
      return;
    }

    const casual = casualReply(text);
    if (casual) {
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "genie", text: casual },
      ]);
      return;
    }

    // พิมพ์แค่ชื่อวิชา เช่น "ฟิสิกส์" = ขอเปิด/สร้างโฟลเดอร์ ไม่ใช่การบ้าน
    const subjectOnly = subjectOnlyCommand(text);
    if (subjectOnly) {
      const { created } = ensureFolders([subjectOnly]);
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "genie",
          text: created.length
            ? `เพิ่มโฟลเดอร์ "${subjectOnly}" ให้แล้วน้า`
            : `มีโฟลเดอร์ "${subjectOnly}" อยู่แล้วจ้า`,
        },
      ]);
      return;
    }

    setThinking(true);

    const ai = await askGenie(
      text,
      folders.map((f) => f.name),
      aiMode,
      tasks.slice(0, 30).map((task) => ({
        title: task.title,
        subject: task.subject,
        due: task.due,
        done: task.done,
      })),
    );

    setThinking(false);

    const parsed = ai ? ai.tasks : parseTasks(text);
    const aiReply = ai && ai.tasks.length > 0 ? ai.reply : "";

    // สร้างโฟลเดอร์จากวิชาของงาน + โฟลเดอร์ที่พี่จินนี่บอกว่าควรมี
    const { canonical, created } = ensureFolders([
      ...parsed.map((p) => p.subject),
      ...(ai?.folders ?? []),
    ]);

    const normalized = parsed.map((p) => ({
      ...p,
      subject: canonical.get(p.subject) ?? p.subject,
    }));

    // กันงานซ้ำ ถ้ามีชื่อและวิชาเดิมอยู่แล้ว
    const existingKeys = new Set(
      tasks.map((task) => `${task.subject}|${task.title}`.trim().toLowerCase()),
    );
    const fresh = normalized.filter(
      (p) => !existingKeys.has(`${p.subject}|${p.title}`.trim().toLowerCase()),
    );

    if (normalized.length > 0 && fresh.length === 0) {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "genie",
          text: "งานนี้จดไว้แล้วน้า ไม่ต้องเพิ่มซ้ำก็ได้ ✨",
        },
      ]);
      return;
    }

    if (normalized.length === 0) {
      const folderLine =
        created.length > 0
          ? `\nเพิ่มโฟลเดอร์ให้แล้ว: ${created.map((f) => f.name).join(", ")}`
          : "";

      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "genie",
          text:
            (ai?.reply ||
              (created.length > 0
                ? "แยกโฟลเดอร์ให้เรียบร้อยแล้วน้า"
                : "ยังไม่เห็นงานที่อยากจด ลองเล่ารายละเอียดเพิ่มอีกนิดน้า")) +
            folderLine,
        },
      ]);
      return;
    }

    const now = new Date();
    const newTasks: Task[] = fresh.map((p) => {
      // เก็บเป็นวันที่จริง เช่น 16 พ.ย. ไม่เก็บคำว่า "พรุ่งนี้" เพราะจะเลื่อนทุกวัน
      const due = p.due.includes("ไม่ระบุ") ? "ยังไม่ระบุกำหนด" : canonicalDue(p.due, now) ?? p.due;
      return {
        id: uid(),
        title: p.title,
        subject: p.subject,
        due,
        createdAt: Date.now(),
        urgent: p.urgent,
        done: false,
      };
    });

    setTasks((prev) => [...newTasks, ...prev]);
    void addTasks(newTasks);

    const missingDue = newTasks.filter(
      (task) => task.subject !== "งานทั่วไป" && task.due.includes("ไม่ระบุ"),
    );
    setPendingDueTaskIds(missingDue.map((task) => task.id));

    const list = newTasks
      .map((task) => `• ${subjectLabel(task.subject)}: ${task.title} (${task.due})`)
      .join("\n");

    const folderLine =
      created.length > 0
        ? `\nเพิ่มโฟลเดอร์ให้แล้ว: ${created.map((f) => f.name).join(", ")}`
        : "";
    const dueQuestion =
      missingDue.length > 0
        ? `\nงาน${missingDue.length > 1 ? "พวกนี้" : "นี้"}มีกำหนดวันไหนเหรอ?`
        : "";

    setMessages((prev) => [
      ...prev,
      {
        id: uid(),
        role: "genie",
        text: `${aiReply ? `${aiReply}\n` : `จดให้แล้ว ${newTasks.length} งานน้า ✨\n`}${list}${folderLine}${dueQuestion}`,
      },
    ]);
  }

  function toggleFolderFilter(folder: Folder) {
    setActiveNav("tasks");
    setFilter((prev) =>
      prev?.kind === "folder" && prev.id === folder.id
        ? null
        : { kind: "folder", id: folder.id, name: folder.name },
    );
  }

  async function copyRoomLink() {
    const token = ownerToken();
    const link = `${window.location.origin}${window.location.pathname}?room=${token}`;
    setRoomCode(token);

    try {
      await navigator.clipboard.writeText(link);
      flash("คัดลอกลิงก์ห้องนี้แล้ว เอาไปเปิดในมือถือได้เลย");
    } catch {
      flash("คัดลอกอัตโนมัติไม่ได้ ลิงก์อยู่ข้างบนน้า");
    }
  }

  async function handleSignIn(provider: "google" | "discord") {
    const label = provider === "google" ? "Google" : "Discord";
    const error = await signInWith(provider);
    if (!error) {
      setPop(null);
      return;
    }

    if (error.toLowerCase().includes("not enabled")) {
      flash(
        provider === "google"
          ? "Google ยังไม่เปิดใน Supabase ต้องใส่ Client ID/Secret ก่อนน้า"
          : "Discord ยังไม่เปิดใน Supabase ต้องใส่ Client ID/Secret ก่อนน้า",
      );
      return;
    }

    flash(`ล็อกอิน ${label} ไม่สำเร็จ: ${error}`);
  }

  async function handleSignOut() {
    await signOutNow();
    setPop(null);
    const [loadedTasks, loadedFolders] = await Promise.all([
      listTasks(),
      listFolders(),
    ]);
    setTasks(loadedTasks);
    setFolders(loadedFolders);
    flash("ออกจากระบบแล้ว งานในเครื่องยังอยู่");
  }

  const activeFilterLabel =
    filter?.kind === "folder"
      ? `โฟลเดอร์: ${filter.name}`
      : filter?.kind === "due"
        ? `กำหนดส่ง: ${filter.key}`
        : null;

  const chatPanel = (
    <ChatPanel
      messages={messages}
      input={input}
      onInput={setInput}
      onSend={send}
      thinking={thinking}
      chips={CHIPS}
      onChip={setInput}
      inputRef={chatInputRef}
      messagesClassName={wide ? "flex-1" : "h-[300px]"}
      aiMode={aiMode}
      onAiModeChange={changeAiMode}
    />
  );

  return (
    <div className={`${darkMode ? "dark" : ""} flex min-h-screen bg-cream`}>
      <Sidebar
        folders={folders}
        counts={counts}
        pending={pending}
        activeNav={activeNav}
        activeFolderId={filter?.kind === "folder" ? filter.id : null}
        onNav={handleNav}
        onHome={() => handleNav("home")}
        onFocusChat={focusChat}
        onAddFolder={() => setDialog({ mode: "create" })}
        onEditFolder={(folder) => setDialog({ mode: "edit", folder })}
        onDeleteFolder={askDeleteFolder}
        onFilterFolder={toggleFolderFilter}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-line bg-cream/95 px-4 py-3 backdrop-blur sm:px-6">
          <button
            onClick={() => handleNav("home")}
            aria-label="กลับหน้าหลักพี่จินนี่"
            className="focus-ring flex items-center gap-2 rounded-2xl text-left lg:hidden"
          >
            <GenieFace size={34} />
            <div className="leading-tight">
              <p className="font-mali text-[15px] font-bold text-navy">
                พี่จินนี่
              </p>
              <p className="text-[8px] font-semibold tracking-[0.12em] text-muted">
                AI TO-DO LIST
              </p>
            </div>
          </button>

          <label className="order-3 flex basis-full min-w-0 flex-1 items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 transition focus-within:border-blue sm:order-none sm:basis-auto">
            <IconSearch size={16} className="shrink-0 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาการบ้าน, วิชา, เลขหน้า..."
              aria-label="ค้นหาการบ้าน"
              className="w-full bg-transparent text-[12.5px] outline-none placeholder:text-muted"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="ล้างคำค้นหา"
                className="focus-ring shrink-0 rounded-full text-muted hover:text-navy"
              >
                <IconClose size={14} />
              </button>
            )}
          </label>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setDarkMode((enabled) => !enabled)}
              aria-label={darkMode ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
              className="focus-ring grid h-9 w-9 place-items-center rounded-full border border-line bg-paper text-[16px] text-navy transition hover:border-blue"
            >
              {darkMode ? "☀" : "◐"}
            </button>
            <button
              onClick={focusChat}
              className="focus-ring hidden items-center gap-1.5 rounded-full bg-navy px-3.5 py-2 text-[12px] font-semibold text-paper transition hover:bg-navy-deep sm:flex"
            >
              <IconPlus size={14} />
              เพิ่มการบ้าน
            </button>

            <div className="relative">
              <button
                onClick={() => setPop(pop === "bell" ? null : "bell")}
                aria-label="งานที่ใกล้ถึงกำหนด"
                aria-expanded={pop === "bell"}
                className="focus-ring relative grid h-9 w-9 place-items-center rounded-full border border-line bg-paper text-navy transition hover:border-blue"
              >
                <IconBell size={17} />
                {urgentTasks.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red px-1 text-[9px] font-bold text-paper">
                    {urgentTasks.length}
                  </span>
                )}
              </button>

              {pop === "bell" && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setPop(null)}
                    aria-hidden="true"
                  />
                  <div className="soft-shadow fixed left-3 right-3 top-16 z-30 max-h-[calc(100dvh-6rem)] w-auto overflow-y-auto rounded-2xl border border-line bg-paper p-3 sm:absolute sm:left-auto sm:right-0 sm:top-11 sm:w-[280px]">
                    <p className="px-1 text-[12px] font-semibold text-navy">
                      ใกล้ถึงกำหนด
                    </p>
                    {urgentTasks.length === 0 ? (
                      <p className="mt-2 rounded-xl bg-cream px-3 py-3 text-[11.5px] text-muted">
                        ยังไม่มีงานที่ต้องส่งวันนี้หรือพรุ่งนี้ ✨
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-1.5">
                        {urgentTasks.slice(0, 5).map((t) => (
                          <li
                            key={t.id}
                            className="rounded-xl bg-cream px-3 py-2 text-[11.5px]"
                          >
                            <p className="truncate font-medium">{t.title}</p>
                            <p className="text-[10.5px] text-muted">
                              {subjectLabel(t.subject)} • {taskDueLabel(t)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                    <button
                      onClick={() => {
                        setFilter({ kind: "due", key: "พรุ่งนี้" });
                        setPop(null);
                        setActiveNav("tasks");
                        scrollTo("tasks");
                      }}
                      className="focus-ring mt-2 w-full rounded-xl bg-blue-soft px-3 py-2 text-[11.5px] font-semibold text-navy hover:bg-blue"
                    >
                      ดูงานที่ต้องส่งพรุ่งนี้
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setRoomCode(ownerToken());
                  setPop(pop === "account" ? null : "account");
                }}
                aria-label={user ? "บัญชีของฉัน" : "เข้าสู่ระบบหรือลิงก์ห้อง"}
                aria-expanded={pop === "account"}
                className={`focus-ring grid h-9 w-9 place-items-center overflow-hidden rounded-full text-[12px] font-bold transition ${
                  user
                    ? "bg-navy text-paper ring-2 ring-blue-soft"
                    : "bg-yellow text-navy"
                }`}
              >
                {user ? (
                  <AccountAvatar
                    name={user.name}
                    email={user.email}
                    avatarUrl={user.avatarUrl}
                    size={36}
                    className="bg-navy text-paper"
                  />
                ) : (
                  "จ"
                )}
              </button>

              {pop === "account" && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setPop(null)}
                    aria-hidden="true"
                  />
                  <LoginPanel
                    user={user}
                    onGoogle={() => void handleSignIn("google")}
                    onDiscord={() => void handleSignIn("discord")}
                    onSignOut={() => void handleSignOut()}
                    roomCode={roomCode}
                    onCopyLink={() => {
                      void copyRoomLink();
                      setPop(null);
                    }}
                  />
                </>
              )}
            </div>
          </div>
        </header>

        <div className="content-pattern flex min-w-0 flex-1 items-start gap-5 px-4 py-5 pb-24 sm:px-6 lg:pb-5">
          <main className="grid min-w-0 flex-1 grid-cols-2 items-start gap-3 sm:flex sm:flex-col sm:items-stretch sm:gap-5">
            <section className="order-0 col-span-2 surface soft-shadow relative overflow-hidden p-4 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <span className="hidden items-center gap-1.5 rounded-full bg-yellow-soft px-3 py-1 text-[10.5px] font-semibold text-[#8a6410] sm:inline-flex">
                    <IconSparkle size={12} />
                    พร้อมช่วยจดการบ้านทุกวัน
                  </span>
                  <h1 className="text-[15px] font-bold leading-snug text-ink sm:mt-3 sm:text-[26px]">
                    {pending === 0 ? (
                      <>
                        หวัดดีจ้า! ตอนนี้ยังไม่มีงานค้าง{" "}
                        <span className="text-blue">ลุยเลย</span> ✨
                      </>
                    ) : (
                      <>
                        หวัดดีจ้า! วันนี้มีงานค้าง{" "}
                        <span className="text-blue">{pending} อย่าง</span> น้า ✨
                      </>
                    )}
                  </h1>
                  <p className="mt-1 text-[9.5px] text-muted sm:text-[12px]">
                    {todayLabel}
                  </p>

                  <div className="mt-3 max-w-md sm:mt-4">
                    <div className="flex items-center justify-between gap-1 text-[9.5px] font-medium text-muted sm:text-[11px]">
                      <span className="hidden sm:inline">
                        ความคืบหน้าการบ้านทั้งหมด
                      </span>
                      <span className="sm:hidden">คืบหน้า</span>
                      <span className="font-semibold text-navy">
                        {done}/{total} ({percent}%)
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-cream-deep sm:mt-1.5 sm:h-2.5">
                      <div
                        className="h-full rounded-full bg-blue transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5 text-[9.5px] sm:mt-4 sm:gap-2 sm:text-[11px]">
                    <span className="rounded-full bg-cream px-2 py-0.5 font-medium text-muted sm:px-3 sm:py-1">
                      ค้าง {pending}
                    </span>
                    <button
                      onClick={() => {
                        setFilter({ kind: "due", key: "พรุ่งนี้" });
                        setActiveNav("tasks");
                        scrollTo("tasks");
                      }}
                      className="focus-ring rounded-full bg-cream px-2 py-0.5 font-medium text-muted transition hover:bg-yellow-soft sm:px-3 sm:py-1"
                    >
                      ส่งพรุ่งนี้ {tomorrowTasks.length}
                    </button>
                    <span className="hidden rounded-full bg-cream px-3 py-1 font-medium text-muted sm:inline">
                      เสร็จแล้ว {done}
                    </span>
                  </div>
                </div>

                <div className="relative z-10 hidden shrink-0 rounded-full bg-cream p-3 sm:block">
                  <GenieFace size={92} />
                </div>
              </div>
            </section>

            <section id="tasks" className="order-2 col-span-2 scroll-mt-24">
              <div className="surface soft-shadow p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-[15px] font-bold text-navy sm:text-[17px]">
                      การบ้านทั้งหมด
                    </h2>
                    <p className="text-[11.5px] text-muted">
                      แสดง {visibleTasks.length} จาก {total} งาน
                    </p>
                  </div>
                  <button
                    onClick={focusChat}
                    className="focus-ring rounded-full border border-line px-3 py-1.5 text-[11.5px] font-semibold text-navy transition hover:border-blue hover:bg-blue-soft"
                  >
                    + เพิ่มการบ้าน
                  </button>
                </div>

                {(activeFilterLabel || query) && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {activeFilterLabel && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-soft px-3 py-1 text-[11px] font-semibold text-navy">
                        {activeFilterLabel}
                        <button
                          onClick={() => setFilter(null)}
                          aria-label="ล้างตัวกรอง"
                          className="focus-ring rounded-full hover:text-red"
                        >
                          <IconClose size={12} />
                        </button>
                      </span>
                    )}
                    {query && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-cream-deep px-3 py-1 text-[11px] font-semibold text-muted">
                        ค้นหา: {query}
                        <button
                          onClick={() => setQuery("")}
                          aria-label="ล้างคำค้นหา"
                          className="focus-ring rounded-full hover:text-red"
                        >
                          <IconClose size={12} />
                        </button>
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  {!ready && (
                    <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-[12px] text-muted">
                      กำลังโหลดการบ้าน...
                    </p>
                  )}

                  {ready && tasks.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-line px-4 py-8 text-center">
                      <p className="text-[12.5px] text-muted">
                        ยังไม่มีการบ้านเลย พิมพ์บอกพี่จินนี่ในช่องแชทได้เลย
                      </p>
                      <button
                        onClick={focusChat}
                        className="focus-ring mt-3 rounded-full bg-navy px-4 py-2 text-[11.5px] font-semibold text-paper hover:bg-navy-deep"
                      >
                        ไปที่ช่องแชท
                      </button>
                    </div>
                  )}

                  {ready && tasks.length > 0 && visibleTasks.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-line px-4 py-6 text-center">
                      <p className="text-[12px] text-muted">
                        ไม่พบงานที่ตรงกับตัวกรองนี้
                      </p>
                      <button
                        onClick={() => {
                          setFilter(null);
                          setQuery("");
                        }}
                        className="focus-ring mt-2 rounded-full bg-cream-deep px-3 py-1.5 text-[11.5px] font-semibold text-navy"
                      >
                        ล้างตัวกรองทั้งหมด
                      </button>
                    </div>
                  )}

                  {pagedTasks.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      color={
                        folderForSubject(t.subject, folders)?.color ??
                        colorForName(t.subject, folders)
                      }
                      onToggle={toggle}
                      onDelete={askDeleteTask}
                    />
                  ))}

                  {visibleTasks.length > 5 && (
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2 border-t border-line pt-4">
                      <button
                        onClick={() => setTaskPage((page) => Math.max(1, page - 1))}
                        disabled={currentTaskPage === 1}
                        className="focus-ring rounded-full border border-line px-3 py-1.5 text-[11px] font-semibold text-navy disabled:opacity-30"
                      >
                        ก่อนหน้า
                      </button>
                      <span className="text-[11px] text-muted">หน้า</span>
                      <input
                        type="number"
                        min={1}
                        max={taskPageCount}
                        value={currentTaskPage}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          if (Number.isFinite(next)) {
                            setTaskPage(
                              Math.min(taskPageCount, Math.max(1, next)),
                            );
                          }
                        }}
                        aria-label="หมายเลขหน้าการบ้าน"
                        className="h-8 w-14 rounded-full border border-line bg-paper text-center text-[11px] font-bold text-navy outline-none focus:border-blue"
                      />
                      <span className="text-[11px] text-muted">
                        / {taskPageCount}
                      </span>
                      <button
                        onClick={() =>
                          setTaskPage((page) =>
                            Math.min(taskPageCount, page + 1),
                          )
                        }
                        disabled={currentTaskPage === taskPageCount}
                        className="focus-ring rounded-full border border-line px-3 py-1.5 text-[11px] font-semibold text-navy disabled:opacity-30"
                      >
                        ถัดไป
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="order-4 col-span-2">
              <div className="surface soft-shadow p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-[15px] font-bold text-navy sm:text-[17px]">
                      สรุปความคืบหน้า
                    </h2>
                    <p className="text-[11.5px] text-muted">
                      แยกตามโฟลเดอร์วิชา
                    </p>
                  </div>
                  <div className="flex gap-1.5 text-[10.5px]">
                    <span className="rounded-full bg-green-soft px-2.5 py-1 font-semibold text-green">
                      เสร็จ {done}
                    </span>
                    <span className="rounded-full bg-yellow-soft px-2.5 py-1 font-semibold text-[#8a6410]">
                      ค้าง {pending}
                    </span>
                    <span className="rounded-full bg-cream px-2.5 py-1 font-semibold text-muted">
                      {percent}%
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {progressRows.length === 0 && (
                    <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-center text-[11.5px] text-muted">
                      ยังไม่มีข้อมูลให้สรุป เพิ่มโฟลเดอร์หรือจดการบ้านก่อนน้า
                    </p>
                  )}

                  {progressRows.map((row) => {
                    const tone = toneFor(row.color);
                    const fill =
                      row.total === 0
                        ? 0
                        : Math.round((row.done / row.total) * 100);
                    const folder = row.id
                      ? folders.find((f) => f.id === row.id)
                      : undefined;
                    const inner = (
                      <>
                        <span className="w-20 shrink-0 truncate text-[11.5px] font-medium text-muted">
                          {row.label}
                        </span>
                        <span className="h-4 flex-1 overflow-hidden rounded-full bg-cream-deep">
                          <span
                            className={`block h-full rounded-full ${tone.bar} transition-all`}
                            style={{ width: `${fill}%` }}
                          />
                        </span>
                        <span className="w-12 shrink-0 text-right text-[11px] font-semibold text-navy">
                          {row.total}
                        </span>
                      </>
                    );

                    return folder ? (
                      <button
                        key={row.key}
                        onClick={() => toggleFolderFilter(folder)}
                        aria-pressed={
                          filter?.kind === "folder" && filter.id === folder.id
                        }
                        className="focus-ring flex w-full items-center gap-3 rounded-xl px-1 py-1 text-left transition hover:bg-cream"
                      >
                        {inner}
                      </button>
                    ) : (
                      <div
                        key={row.key}
                        className="flex w-full items-center gap-3 px-1 py-1"
                      >
                        {inner}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="order-5 col-span-2">
              <div className="surface soft-shadow p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-[15px] font-bold text-navy sm:text-[17px]">
                      โฟลเดอร์วิชา ({folders.length})
                    </h2>
                    <p className="text-[11.5px] text-muted">
                      กดที่โฟลเดอร์เพื่อดูการบ้านข้างใน
                    </p>
                  </div>
                  <button
                    onClick={() => setDialog({ mode: "create" })}
                    className="focus-ring flex items-center gap-1 rounded-full bg-blue-soft px-3 py-1.5 text-[11.5px] font-semibold text-navy transition hover:bg-blue"
                  >
                    <IconPlus size={13} />
                    เพิ่มโฟลเดอร์
                  </button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {pagedFolders.map((folder) => {
                    const tone = toneFor(folder.color);
                    const folderCount = counts[folder.name] ?? 0;
                    return (
                      <div
                        key={folder.id}
                        className={`relative rounded-2xl ${tone.soft} p-4 transition hover:-translate-y-0.5`}
                      >
                        <button
                          onClick={() => toggleFolderFilter(folder)}
                          aria-label={`ดูการบ้านในโฟลเดอร์ ${folder.name}`}
                          className="focus-ring absolute inset-0 rounded-2xl"
                        />
                        <div className="pointer-events-none relative">
                          <div className="flex items-start justify-between">
                            <CatFolderIcon size={38} />
                            <span className="grid h-6 min-w-6 place-items-center rounded-full bg-paper px-1 text-[11px] font-bold text-navy">
                              {folderCount}
                            </span>
                          </div>
                           <p className="mt-3 truncate text-[14px] font-bold text-ink">
                            {folder.name}
                          </p>
                          <p className="text-[10.5px] text-navy/60">
                            {folderCount} งาน
                          </p>
                        </div>
                        <div className="absolute right-2.5 top-2.5 z-10 flex gap-0.5">
                          <button
                            onClick={() => setDialog({ mode: "edit", folder })}
                            aria-label={`แก้ไขโฟลเดอร์ ${folder.name}`}
                            className="focus-ring grid h-7 w-7 place-items-center rounded-full bg-paper/80 text-muted transition hover:text-navy"
                          >
                            <IconPencil size={13} />
                          </button>
                          <button
                            onClick={() => askDeleteFolder(folder)}
                            aria-label={`ลบโฟลเดอร์ ${folder.name}`}
                            className="focus-ring grid h-7 w-7 place-items-center rounded-full bg-paper/80 text-muted transition hover:text-red"
                          >
                            <IconTrash size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                </div>
                {folderPageCount > 1 && (
                  <div className="mt-4 flex items-center justify-center gap-3">
                    <button
                      onClick={() =>
                        setFolderPage((page) => Math.max(1, page - 1))
                      }
                      disabled={currentFolderPage === 1}
                      className="focus-ring rounded-full border border-line bg-paper px-3.5 py-2 text-[11px] font-semibold text-navy transition hover:border-blue disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ← ก่อนหน้า
                    </button>
                    <span className="text-[10.5px] font-medium text-muted">
                      หน้า {currentFolderPage} / {folderPageCount}
                    </span>
                    <button
                      onClick={() =>
                        setFolderPage((page) =>
                          Math.min(folderPageCount, page + 1),
                        )
                      }
                      disabled={currentFolderPage === folderPageCount}
                      className="focus-ring rounded-full border border-line bg-paper px-3.5 py-2 text-[11px] font-semibold text-navy transition hover:border-blue disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ถัดไป →
                    </button>
                  </div>
                )}
              </div>
            </section>

            <section
              id="reminder"
              className="order-1 col-span-2 scroll-mt-24"
            >
              <div className="surface soft-shadow p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
                  <div>
                    <h2 className="text-[13px] font-bold text-navy sm:text-[17px]">
                      <span className="sm:hidden">สัปดาห์นี้</span>
                      <span className="hidden sm:inline">กำหนดการสัปดาห์นี้</span>
                    </h2>
                    <p className="hidden text-[11.5px] text-muted sm:block">
                      {todayLabel}
                    </p>
                  </div>
                  <span className="rounded-full bg-red-soft px-2 py-0.5 text-[9px] font-semibold text-red sm:px-3 sm:py-1 sm:text-[10.5px]">
                    ส่งพรุ่งนี้ {tomorrowTasks.length} งาน
                  </span>
                </div>

                <div className="mt-2.5 grid grid-cols-7 gap-1 sm:mt-4 sm:gap-2">
                  {week.map((d) => {
                    const dots = Math.min(
                      tasks.filter(
                        (t) =>
                          !t.done && dueMatches(t.due, d.dueKey, t.createdAt),
                      ).length,
                      3,
                    );
                    const active =
                      filter?.kind === "due" && filter.key === d.dueKey;
                    return (
                      <button
                        key={`${d.day}-${d.label}`}
                        onClick={() =>
                          setFilter(
                            active ? null : { kind: "due", key: d.dueKey },
                          )
                        }
                        aria-pressed={active}
                        className={`focus-ring rounded-lg px-0.5 py-1.5 text-center transition sm:rounded-xl sm:px-1 sm:py-2 ${
                          active
                            ? "bg-navy text-paper"
                            : "bg-cream text-ink hover:bg-cream-deep"
                        }`}
                      >
                        <span className="block truncate text-[8px] opacity-70 sm:text-[10px]">
                          {d.label}
                        </span>
                        <span className="block font-mali text-[12.5px] font-bold sm:text-[15px]">
                          {d.day}
                        </span>
                        <span className="mt-0.5 flex min-h-1 justify-center gap-0.5">
                          {Array.from({ length: dots }).map((_, i) => (
                            <span
                              key={i}
                              className={`h-1 w-1 rounded-full ${
                                active ? "bg-yellow" : "bg-blue"
                              }`}
                            />
                          ))}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <p className="mt-3 text-[11px] font-semibold text-navy sm:mt-4 sm:text-[12px]">
                  งานที่ต้องส่งเร็ว ๆ นี้
                </p>
                <div className="mt-2 space-y-2">
                  {!ready && (
                    <p className="rounded-2xl border border-dashed border-line px-4 py-3 text-center text-[11px] text-muted sm:py-4 sm:text-[11.5px]">
                      กำลังโหลด...
                    </p>
                  )}
                  {ready && urgentTasks.length === 0 && (
                    <p className="rounded-2xl border border-dashed border-line px-3 py-3 text-center text-[10.5px] text-muted sm:px-4 sm:py-4 sm:text-[11.5px]">
                      ยังไม่มีงานที่ต้องส่งวันนี้หรือพรุ่งนี้ พิมพ์ในแชทเพื่อเพิ่มได้เลย
                    </p>
                  )}
                  {urgentTasks.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      color={
                        folderForSubject(t.subject, folders)?.color ??
                        colorForName(t.subject, folders)
                      }
                      onToggle={toggle}
                      onDelete={askDeleteTask}
                    />
                  ))}
                </div>
              </div>
            </section>

            <CalendarView tasks={tasks} />

            {!wide && (
              <section id="chat" className="order-6 col-span-2 scroll-mt-24">
                <div className="surface soft-shadow flex flex-col p-4">
                  {chatPanel}
                </div>
              </section>
            )}
          </main>

          {wide && (
            <aside className="sticky top-[76px] max-h-[calc(100vh-96px)] w-[360px] shrink-0">
              <div
                id="chat"
                className="surface soft-shadow scroll-mt-24 flex h-[calc(100vh-100px)] flex-col p-4"
              >
                {chatPanel}
              </div>
            </aside>
          )}
        </div>
        <nav
          aria-label="เมนูหลักบนมือถือ"
          className="fixed inset-x-3 bottom-3 z-40 flex items-end justify-around rounded-3xl border border-line bg-paper/95 px-2 py-2 shadow-lg backdrop-blur lg:hidden"
        >
          {[
            { key: "home" as NavKey, label: "หน้าหลัก", Icon: IconHome },
            { key: "chat" as NavKey, label: "แชท", Icon: IconChat },
          ].map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => handleNav(key)}
              className={`focus-ring flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[9px] font-semibold transition ${
                activeNav === key ? "text-navy" : "text-muted"
              }`}
              aria-current={activeNav === key ? "page" : undefined}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
          <button
            onClick={focusChat}
            aria-label="เพิ่มการบ้าน"
            className="focus-ring -mt-7 grid h-12 w-12 shrink-0 place-items-center rounded-full border-4 border-cream bg-navy text-paper shadow-md"
          >
            <IconPlus size={19} />
          </button>
          {[
            { key: "tasks" as NavKey, label: "การบ้าน", Icon: IconBook },
            { key: "reminder" as NavKey, label: "กำหนดส่ง", Icon: IconClock },
          ].map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => handleNav(key)}
              className={`focus-ring flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[9px] font-semibold transition ${
                activeNav === key ? "text-navy" : "text-muted"
              }`}
              aria-current={activeNav === key ? "page" : undefined}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>
        <footer className="relative border-t border-line bg-paper/75 px-6 py-4 pb-24 text-center text-[11px] text-muted lg:pb-4">
          <span>มีคำแนะนำหรืออยากคุยกับเราไหม? </span>
          <button
            onClick={() => setContactOpen((open) => !open)}
            className="font-semibold text-navy underline decoration-line underline-offset-2 transition hover:text-blue"
            aria-expanded={contactOpen}
          >
            Contact us
          </button>
          <span className="mx-1">·</span>
          <button
            onClick={() => {
              setContactOpen(false);
              setFeedbackOpen(true);
            }}
            className="font-semibold text-navy underline decoration-line underline-offset-2 transition hover:text-blue"
          >
            ส่ง Feedback
          </button>
          {contactOpen && (
            <>
              <button
                aria-label="ปิดช่องทางติดต่อ"
                onClick={() => setContactOpen(false)}
                className="fixed inset-0 z-20 cursor-default"
              />
              <div className="soft-shadow absolute bottom-24 left-1/2 z-30 w-[min(280px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-line bg-paper p-3 text-left sm:bottom-14">
                <p className="text-[12px] font-bold text-navy">Contact us</p>
                <p className="mt-1 text-[10.5px] text-muted">
                  เลือกช่องทางที่สะดวกได้เลยน้า
                </p>
                <div className="mt-3 space-y-2">
                  <a
                    href="https://www.instagram.com/pangolin.9132033/"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-xl bg-cream px-3 py-2 text-[11px] font-semibold text-navy transition hover:bg-pink-100"
                  >
                    <span>Instagram</span>
                    <span className="text-muted">เปิดลิงก์ ↗</span>
                  </a>
                  <a
                    href="https://discord.com/app"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-xl bg-cream px-3 py-2 text-[11px] font-semibold text-navy transition hover:bg-blue-soft"
                  >
                    <span>Discord: mbius_</span>
                    <span className="text-muted">เปิด Discord ↗</span>
                  </a>
                  <a
                    href="https://www.facebook.com/share/1JUq5ew4qh/"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-xl bg-cream px-3 py-2 text-[11px] font-semibold text-navy transition hover:bg-blue-soft"
                  >
                    <span>Facebook</span>
                    <span className="text-muted">เปิดลิงก์ ↗</span>
                  </a>
                  <a
                    href="https://line.me/R/ti/p/~nongpang2009"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-xl bg-cream px-3 py-2 text-[11px] font-semibold text-navy transition hover:bg-green-soft"
                  >
                    <span>Line</span>
                    <span className="text-muted">เปิดแชท ↗</span>
                  </a>
                </div>
              </div>
            </>
          )}
        </footer>
      </div>

      {feedbackOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy/30 px-4 py-6 backdrop-blur-[2px]">
          <button
            aria-label="ปิดหน้าส่ง Feedback"
            onClick={() => setFeedbackOpen(false)}
            className="absolute inset-0 cursor-default"
          />
          <form
            onSubmit={sendFeedback}
            className="soft-shadow relative z-10 w-full max-w-[420px] rounded-3xl border border-line bg-paper p-5 text-left"
            aria-labelledby="feedback-title"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="feedback-title" className="font-mali text-xl font-bold text-navy">
                  ส่ง Feedback ให้พี่จินนี่
                </h2>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  บอกได้เลยว่าอยากให้ปรับอะไร หรือเจอปัญหาตรงไหน ✨
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFeedbackOpen(false)}
                aria-label="ปิด"
                className="focus-ring rounded-full p-1 text-muted hover:bg-cream hover:text-navy"
              >
                <IconClose size={17} />
              </button>
            </div>
            <label className="mt-4 block text-[11px] font-semibold text-navy" htmlFor="feedback-category">
              ประเภท
            </label>
            <select
              id="feedback-category"
              value={feedbackCategory}
              onChange={(event) =>
                setFeedbackCategory(event.target.value as "idea" | "issue" | "other")
              }
              className="focus-ring mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[12px] text-ink"
            >
              <option value="idea">ข้อเสนอแนะ</option>
              <option value="issue">แจ้งปัญหา</option>
              <option value="other">อื่น ๆ</option>
            </select>
            <label className="mt-3 block text-[11px] font-semibold text-navy" htmlFor="feedback-message">
              รายละเอียด
            </label>
            <textarea
              id="feedback-message"
              value={feedbackMessage}
              onChange={(event) => setFeedbackMessage(event.target.value)}
              maxLength={2000}
              required
              rows={5}
              placeholder="พิมพ์ Feedback ได้เลย..."
              className="focus-ring mt-1 w-full resize-y rounded-xl border border-line bg-white px-3 py-2.5 text-[12px] leading-relaxed text-ink placeholder:text-muted/70"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[10px] text-muted">
                {feedbackMessage.length}/2000
              </span>
              <button
                type="submit"
                disabled={!feedbackMessage.trim() || feedbackSending}
                className="focus-ring rounded-full bg-navy px-4 py-2 text-[11px] font-semibold text-white transition hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-50"
              >
                {feedbackSending ? "กำลังส่ง..." : "ส่ง Feedback"}
              </button>
            </div>
          </form>
        </div>
      )}

      {mounted && !onboardingDismissed && onboarding && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-navy/25 px-4 backdrop-blur-[2px]">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-title"
            className="soft-shadow w-full max-w-[420px] rounded-3xl border border-line bg-paper p-5"
          >
            {onboarding === "ask" ? (
              <>
                <div className="rounded-2xl bg-yellow-soft p-4">
                  <p className="font-mali text-[20px] font-bold text-navy">
                    ให้พี่จินนี่แนะนำไหม? ✨
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted">
                    ใช้เวลาไม่ถึง 1 นาที จะได้รู้ว่าพิมพ์งานยังไงและดูงานตรงไหน
                    เลือกได้เลยว่าอยากให้ถามเรื่องนี้อีกเมื่อไหร่
                  </p>
                </div>
                <div className="mt-4 grid gap-2">
                  <button
                    onClick={() => setOnboarding("guide")}
                    className="focus-ring rounded-2xl bg-navy px-4 py-3 text-left text-paper transition hover:bg-navy-deep"
                  >
                    <span className="block text-[12px] font-semibold">
                      แจ้งเตือนในครั้งนี้
                    </span>
                    <span className="mt-0.5 block text-[10px] font-normal text-paper/75">
                      ดูคำแนะนำเลยครั้งนี้ครั้งเดียว
                    </span>
                  </button>
                  <button
                    onClick={stopOnboardingReminders}
                    className="focus-ring rounded-2xl border border-line px-4 py-3 text-left transition hover:bg-cream"
                  >
                    <span className="block text-[12px] font-semibold text-navy">
                      ไม่ต้องแจ้งแล้ว
                    </span>
                    <span className="mt-0.5 block text-[10px] text-muted">
                      ปิดถาวร ไม่ถามเรื่องนี้อีก
                    </span>
                  </button>
                  <button
                    onClick={remindOnboardingAlways}
                    className="focus-ring rounded-2xl border border-line px-4 py-3 text-left transition hover:bg-cream"
                  >
                    <span className="block text-[12px] font-semibold text-navy">
                      แจ้งเตือนทุกครั้ง
                    </span>
                    <span className="mt-0.5 block text-[10px] text-muted">
                      ถามทุกครั้งที่เปิดแอป
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-blue-soft px-3 py-1 text-[10px] font-bold text-navy">
                    ขั้นตอนที่ {onboardingStep + 1} / {ONBOARDING_STEPS.length}
                  </span>
                  <button
                    onClick={closeOnboarding}
                    className="focus-ring rounded-full px-2 py-1 text-[11px] text-muted hover:text-navy"
                  >
                    ข้าม
                  </button>
                </div>
                <h2 id="onboarding-title" className="mt-5 text-[20px] font-bold text-navy">
                  {ONBOARDING_STEPS[onboardingStep].title}
                </h2>
                <p className="mt-2 min-h-[58px] text-[12px] leading-relaxed text-muted">
                  {ONBOARDING_STEPS[onboardingStep].text}
                </p>
                <div className="mt-5 flex items-center justify-between">
                  <div className="flex gap-1">
                    {ONBOARDING_STEPS.map((_, index) => (
                      <span
                        key={index}
                        className={`h-1.5 w-5 rounded-full ${
                          index === onboardingStep ? "bg-blue" : "bg-cream-deep"
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      if (onboardingStep === ONBOARDING_STEPS.length - 1) {
                        closeOnboarding();
                      } else {
                        setOnboardingStep((step) => step + 1);
                      }
                    }}
                    className="focus-ring rounded-full bg-navy px-4 py-2 text-[11.5px] font-semibold text-paper hover:bg-navy-deep"
                  >
                    {onboardingStep === ONBOARDING_STEPS.length - 1
                      ? "เริ่มใช้งาน"
                      : "ถัดไป"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {dialog && (
        <FolderDialog
          mode={dialog.mode}
          initialName={dialog.mode === "edit" ? dialog.folder.name : ""}
          initialColor={dialog.mode === "edit" ? dialog.folder.color : undefined}
          existingNames={folders.map((f) => f.name)}
          onClose={() => setDialog(null)}
          onSave={saveFolder}
        />
      )}

      {confirmDialog && (
        <ConfirmDialog
          open
          title={
            confirmDialog.kind === "folder"
              ? "ลบโฟลเดอร์นี้ใช่ไหม?"
              : "ลบการบ้านนี้ใช่ไหม?"
          }
          description={
            confirmDialog.kind === "folder"
              ? "การบ้านที่อยู่ในโฟลเดอร์นี้ยังอยู่ครบ ไม่ถูกลบไปด้วยน้า"
              : "ลบแล้วจะกู้คืนไม่ได้ แต่ยังจดใหม่ในแชทได้ตลอดน้า"
          }
          detail={
            confirmDialog.kind === "folder"
              ? confirmDialog.folder.name
              : confirmDialog.title
          }
          confirmLabel={
            confirmDialog.kind === "folder" ? "ลบโฟลเดอร์" : "ลบการบ้าน"
          }
          onCancel={() => setConfirmDialog(null)}
          onConfirm={() => {
            if (confirmDialog.kind === "folder") {
              deleteFolderNow(confirmDialog.folder);
            } else {
              removeTask(confirmDialog.id);
            }
            setConfirmDialog(null);
          }}
        />
      )}

      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-navy px-5 py-2.5 text-[12px] font-medium text-paper shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

