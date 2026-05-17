import AsyncStorage from "@react-native-async-storage/async-storage";

export const IDEAS_KEY = "pp_ideas";
export const HM_KEY = "pp_hm";

export interface Idea {
  id: string;
  uid: string;
  title: string;
  tag: string;
  rawText: string;
  doc: string;
  imgPrompt: string;
  imgUrl: string;
  kanban: { todo: string[]; doing: string[]; done: string[] };
  timeline: { data: string; date: string; desc: string }[];
  progress: number;
  createdAt: string;
}

export async function loadIdeas(uid: string): Promise<Idea[]> {
  const raw = await AsyncStorage.getItem(IDEAS_KEY);
  const all: Idea[] = raw ? JSON.parse(raw) : [];
  return all.filter((i) => i.uid === uid || i.uid === "local");
}

export async function saveIdea(idea: Idea): Promise<void> {
  const raw = await AsyncStorage.getItem(IDEAS_KEY);
  const all: Idea[] = raw ? JSON.parse(raw) : [];
  const ix = all.findIndex((i) => i.id === idea.id);
  if (ix >= 0) {
    all[ix] = idea;
  } else {
    all.unshift(idea);
  }
  await AsyncStorage.setItem(IDEAS_KEY, JSON.stringify(all));
}

export async function updateIdeaField(
  ideaId: string,
  field: string,
  value: any
): Promise<void> {
  const raw = await AsyncStorage.getItem(IDEAS_KEY);
  const all: Idea[] = raw ? JSON.parse(raw) : [];
  const ix = all.findIndex((i) => i.id === ideaId);
  if (ix >= 0) {
    (all[ix] as any)[field] = value;
    await AsyncStorage.setItem(IDEAS_KEY, JSON.stringify(all));
  }
}

export async function deleteIdea(ideaId: string): Promise<void> {
  const raw = await AsyncStorage.getItem(IDEAS_KEY);
  const all: Idea[] = raw ? JSON.parse(raw) : [];
  await AsyncStorage.setItem(
    IDEAS_KEY,
    JSON.stringify(all.filter((i) => i.id !== ideaId))
  );
}

export async function logActivity(): Promise<void> {
  const d = new Date().toISOString().slice(0, 10);
  const raw = await AsyncStorage.getItem(HM_KEY);
  const h: Record<string, number> = raw ? JSON.parse(raw) : {};
  h[d] = (h[d] || 0) + 1;
  await AsyncStorage.setItem(HM_KEY, JSON.stringify(h));
}

export async function getActivityMap(): Promise<Record<string, number>> {
  const raw = await AsyncStorage.getItem(HM_KEY);
  return raw ? JSON.parse(raw) : {};
}

export function calcStreak(h: Record<string, number>): number {
  let s = 0;
  const now = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    if (h[k] > 0) s++;
    else break;
  }
  return s;
}
