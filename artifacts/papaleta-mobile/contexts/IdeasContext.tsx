import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import {
  Idea,
  deleteIdea as deleteIdeaStorage,
  loadIdeas,
  logActivity,
  saveIdea,
  updateIdeaField,
} from "@/lib/storage";

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

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const loaded = await loadIdeas(user.uid);
    setIdeas(loaded);
    setLoading(false);
  }, [user]);

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
      await saveIdea(idea);
      await refresh();
    },
    [refresh]
  );

  const updateField = useCallback(
    async (id: string, field: string, value: any) => {
      await updateIdeaField(id, field, value);
      await refresh();
    },
    [refresh]
  );

  const removeIdea = useCallback(
    async (id: string) => {
      await deleteIdeaStorage(id);
      await refresh();
    },
    [refresh]
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
