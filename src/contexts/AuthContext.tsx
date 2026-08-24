import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/types";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Mensagens amigáveis — nunca expomos erros técnicos ao usuário. */
function friendlyAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login") || normalized.includes("credentials")) {
    return "Usuário ou senha inválidos.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Seu acesso ainda não foi ativado. Use a opção Primeiro acesso.";
  }
  return "Não foi possível entrar agora. Tente novamente.";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRole = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setRole(null);
      return;
    }
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .order("role", { ascending: true });

    const roles = (data ?? []).map((row) => row.role as AppRole);
    setRole(roles.includes("admin") ? "admin" : roles.length > 0 ? "player" : "player");
  }, []);

  useEffect(() => {
    let active = true;

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      void loadRole(nextSession?.user?.id);
    });

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadRole(data.session?.user?.id);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadRole]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return { error: error ? friendlyAuthError(error.message) : null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setRole(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      role,
      isAdmin: role === "admin",
      loading,
      signIn,
      signOut,
    }),
    [session, role, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return context;
}
