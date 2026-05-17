import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface AppUser {
  uid: string;
  displayName: string;
  photoURL: string | null;
  isGuest: boolean;
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

const AUTH_KEY = "pp_auth_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(AUTH_KEY).then((raw) => {
      if (raw) {
        try {
          setUser(JSON.parse(raw));
        } catch {}
      }
      setLoading(false);
    });
  }, []);

  const signInAsGuest = useCallback(async () => {
    const guest: AppUser = {
      uid: "local",
      displayName: "Creador Local",
      photoURL: null,
      isGuest: true,
    };
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(guest));
    setUser(guest);
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(AUTH_KEY);
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
