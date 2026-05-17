import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import {
  db,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from "@/lib/firebase";
import {
  Idea,
  loadIdeas as loadLocalIdeas,
  saveIdea as saveLocalIdea,
  updateIdeaField as updateLocalField,
  deleteIdea as deleteLocalIdea,
  logActivity,
} from "@/lib/storage";

const IDEAS_COLLECTION = "ideas";

async function loadFirestoreIdeas(uid: string): Promise<Idea[]> {
  try {
    const snap = await getDocs(
      query(collection(db, IDEAS_COLLECTION), where("uid", "==", uid))
    );
    const ideas = snap.docs.map((d) => ({
      ...(d.data() as Omit<Idea, "id">),
      id: d.id,
      createdAt:
        (d.data().createdAt as any)?.toDate?.()?.toISOString() ||
        d.data().createdAt ||
        new Date().toISOString(),
    })) as Idea[];
    ideas.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return ideas;
  } catch {
    return [];
  }
}

async function addFirestoreIdea(idea: Idea): Promise<string> {
  const payload = {
    ...idea,
    createdAt: new Date(idea.createdAt),
  };
  const ref = await addDoc(collection(db, IDEAS_COLLECTION), payload);
  return ref.id;
}

async function updateFirestoreField(
  ideaId: string,
  field: string,
  value: any
): Promise<void> {
  try {
    await updateDoc(doc(db, IDEAS_COLLECTION, ideaId), { [field]: value });
  } catch {}
}

async function deleteFirestoreIdea(ideaId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, IDEAS_COLLECTION, ideaId));
  } catch {}
}

interface IdeasContextType {
  ideas: Idea[];
  loading: boolean;
  refresh: () => Promise<void>;
  addIdea: (idea: Idea) => Promise<void>;
  updateField: (id: string, field: string, value: any) => Promise<void>;
  removeIdea: (id: string) => Promise<void>;
  log: () => Promise<void>;
}

const IdeasContext = createContext<IdeasContextType>({
  ideas: [],
  loading: true,
  refresh: async () => {},
  addIdea: async () => {},
  updateField: async () => {},
  removeIdea: async () => {},
  log: async () => {},
});

export function IdeasProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);

  const isFirestoreUser = user && !user.isGuest;

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    if (isFirestoreUser) {
      const fsIdeas = await loadFirestoreIdeas(user.uid);
      if (fsIdeas.length > 0) {
        setIdeas(fsIdeas);
        for (const idea of fsIdeas) {
          await saveLocalIdea(idea);
        }
      } else {
        const local = await loadLocalIdeas(user.uid);
        setIdeas(local);
      }
    } else {
      const local = await loadLocalIdeas(user.uid);
      setIdeas(local);
    }

    setLoading(false);
  }, [user, isFirestoreUser]);

  useEffect(() => {
    if (user) {
      refresh();
    } else {
      setIdeas([]);
      setLoading(false);
    }
  }, [user, refresh]);

  const addIdea = useCallback(
    async (idea: Idea) => {
      await saveLocalIdea(idea);

      if (isFirestoreUser) {
        try {
          const firestoreId = await addFirestoreIdea(idea);
          const updatedIdea = { ...idea, id: firestoreId };
          await saveLocalIdea(updatedIdea);
        } catch {}
      }

      await refresh();
    },
    [isFirestoreUser, refresh]
  );

  const updateField = useCallback(
    async (id: string, field: string, value: any) => {
      await updateLocalField(id, field, value);

      if (isFirestoreUser && !id.startsWith("l_")) {
        await updateFirestoreField(id, field, value);
      }

      await refresh();
    },
    [isFirestoreUser, refresh]
  );

  const removeIdea = useCallback(
    async (id: string) => {
      await deleteLocalIdea(id);

      if (isFirestoreUser && !id.startsWith("l_")) {
        await deleteFirestoreIdea(id);
      }

      await refresh();
    },
    [isFirestoreUser, refresh]
  );

  const log = useCallback(async () => {
    await logActivity();
  }, []);

  return (
    <IdeasContext.Provider
      value={{ ideas, loading, refresh, addIdea, updateField, removeIdea, log }}
    >
      {children}
    </IdeasContext.Provider>
  );
}

export function useIdeas() {
  return useContext(IdeasContext);
}
