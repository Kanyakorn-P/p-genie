import { currentUserId, getSupabase, ownerToken } from "./supabase";
import { FOLDER_COLOR_ORDER, isFolderColor, type Folder } from "./theme";

const LOCAL_FOLDERS = "p-genie-folders-v1";

function readLocal(): Folder[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_FOLDERS);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((f) => f && typeof f.id === "string" && typeof f.name === "string")
      .map((f) => ({
        id: String(f.id),
        name: String(f.name),
        color: isFolderColor(String(f.color))
          ? (String(f.color) as Folder["color"])
          : FOLDER_COLOR_ORDER[0],
      }));
  } catch {
    return [];
  }
}

function writeLocal(folders: Folder[]) {
  try {
    window.localStorage.setItem(LOCAL_FOLDERS, JSON.stringify(folders));
  } catch {
    // พื้นที่เก็บเต็ม ไม่เป็นไร
  }
}

export async function listFolders(): Promise<Folder[]> {
  const supabase = getSupabase();
  if (!supabase) return readLocal();

  const { data, error } = await supabase
    .from("folders")
    .select("id,name,color")
    .order("created_at", { ascending: true });

  if (error || !data) return readLocal();

  const rows: Folder[] = data.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    color: isFolderColor(String(row.color))
      ? (String(row.color) as Folder["color"])
      : FOLDER_COLOR_ORDER[0],
  }));

  writeLocal(rows);
  return rows;
}

export async function insertFolder(folder: Folder): Promise<void> {
  writeLocal([...readLocal(), folder]);

  const supabase = getSupabase();
  if (!supabase) return;

  const userId = await currentUserId();
  await supabase.from("folders").insert({
    id: folder.id,
    owner_token: ownerToken(),
    user_id: userId,
    name: folder.name,
    color: folder.color,
  });
}

export async function updateFolder(folder: Folder): Promise<void> {
  writeLocal(
    readLocal().map((f) => (f.id === folder.id ? folder : f)),
  );

  const supabase = getSupabase();
  if (!supabase) return;

  await supabase
    .from("folders")
    .update({ name: folder.name, color: folder.color })
    .eq("id", folder.id);
}

export async function deleteFolderRow(id: string): Promise<void> {
  writeLocal(readLocal().filter((f) => f.id !== id));

  const supabase = getSupabase();
  if (!supabase) return;

  await supabase.from("folders").delete().eq("id", id);
}
