import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "../types";
import { setAuthToken, getMe } from "../api";

const TOKEN_KEY = "localpoketrades:token";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) {
        setAuthToken(token);
        try {
          const me = await getMe();
          setUser(me);
        } catch {
          await AsyncStorage.removeItem(TOKEN_KEY);
          setAuthToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const signIn = async (token: string, signedInUser: User) => {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    setAuthToken(token);
    setUser(signedInUser);
  };

  const signOut = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const me = await getMe();
    setUser(me);
  };

  return <AuthContext.Provider value={{ user, loading, signIn, signOut, refreshUser }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
