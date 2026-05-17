import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  auth,
  googleProvider,
  signInAnonymously,
  signInWithCredential,
  firebaseSignOut,
  onAuthStateChanged,
  type User,
} from "@/lib/firebase";
import { GoogleAuthProvider } from "firebase/auth";

WebBrowser.maybeCompleteAuthSession();

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
  googleAuthAvailable: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  googleAuthAvailable: false,
  signInWithGoogle: async () => {},
  signInAsGuest: async () => {},
  signOut: async () => {},
});

function mapFirebaseUser(u: User): AppUser {
  return {
    uid: u.uid,
    displayName:
      u.displayName || (u.isAnonymous ? "Creador Local" : u.email || "Usuario"),
    photoURL: u.photoURL,
    isGuest: u.isAnonymous,
    firebaseUser: u,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ? mapFirebaseUser(u) : null);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential).catch(console.error);
    }
  }, [response]);

  const signInWithGoogle = useCallback(async () => {
    if (!webClientId) {
      throw new Error(
        "Google sign-in requires EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to be set"
      );
    }
    await promptAsync();
  }, [promptAsync, webClientId]);

  const signInAsGuest = useCallback(async () => {
    const cred = await signInAnonymously(auth);
    setUser(mapFirebaseUser(cred.user));
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        googleAuthAvailable: !!webClientId && !!request,
        signInWithGoogle,
        signInAsGuest,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
