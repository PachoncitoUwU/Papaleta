import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  auth,
  signInAnonymously,
  firebaseSignOut,
  onAuthStateChanged,
  type User,
} from "@/lib/firebase";

export interface AppUser {
  uid: string;
  displayName: string;
  photoURL: string | null;
  isGuest: boolean;
  firebaseUser: User;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInAsGuest: async () => {},
  signOut: async () => {},
});

function mapFirebaseUser(u: User): AppUser {
  return {
    uid: u.uid,
    displayName: u.displayName || (u.isAnonymous ? "Creador Local" : u.email || "Usuario"),
    photoURL: u.photoURL,
    isGuest: u.isAnonymous,
    firebaseUser: u,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(mapFirebaseUser(u));
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signInAsGuest = useCallback(async () => {
    const cred = await signInAnonymously(auth);
    setUser(mapFirebaseUser(cred.user));
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signInAsGuest, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
