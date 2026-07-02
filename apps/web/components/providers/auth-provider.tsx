"use client";

import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { apiBaseUrl, authenticatedRequest, CoraFitApiError } from "@/lib/api/authenticated-request";
import { getSupabaseBrowserClient } from "@/lib/auth/supabase";
import type { AuthProfile } from "@/lib/auth/types";

type SignupInput = {
  email: string;
  name: string;
  password: string;
  phone?: string;
  termsAccepted: boolean;
};

const legalTermsVersion = "1.0";
const legalPrivacyVersion = "1.0";

type LegacyAuthUser = {
  email?: string;
  id?: string;
  name?: string;
  phone?: string | null;
  platformRole?: string;
  status?: string;
  supabaseUserId?: string;
};

type AuthContextValue = {
  completeProfile: (input: { name: string; phone?: string; termsAccepted: boolean }) => Promise<AuthProfile>;
  isLoading: boolean;
  login: (input: { email: string; password: string }) => Promise<AuthProfile | null>;
  logout: () => Promise<void>;
  profile: AuthProfile | null;
  refreshProfile: (nextSession?: Session | null) => Promise<AuthProfile | null>;
  resetPassword: (email: string) => Promise<void>;
  session: Session | null;
  signup: (input: SignupInput) => Promise<"profile-created" | "confirm-email">;
  status: "loading" | "anonymous" | "missing-profile" | "authenticated";
  suggestedProfile: { name: string; phone?: string } | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const apiConfigStorageKey = "corafit_api_config";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMissingProfile, setHasMissingProfile] = useState(false);
  const sessionRef = useRef<Session | null>(null);
  const profileRef = useRef<AuthProfile | null>(null);

  useEffect(() => {
    sessionRef.current = session;
    profileRef.current = profile;
  }, [profile, session]);

  const syncLegacyApiConfig = useCallback((nextSession: Session | null, nextProfile: AuthProfile | null) => {
    if (typeof window === "undefined") {
      return;
    }

    if (!nextSession || !nextProfile) {
      window.localStorage.removeItem(apiConfigStorageKey);
      return;
    }

    window.localStorage.setItem(
      apiConfigStorageKey,
      JSON.stringify({
        apiUrl: apiBaseUrl,
        bearerToken: nextSession.access_token,
        organizationId: nextProfile.organization.id,
      }),
    );
  }, []);

  const refreshProfile = useCallback(
    async (nextSession?: Session | null) => {
      const activeSession =
        nextSession === undefined
          ? (await getSupabaseBrowserClient().auth.getSession()).data.session
          : nextSession;

      setSession(activeSession ?? null);

      if (!activeSession) {
        setProfile(null);
        setHasMissingProfile(false);
        syncLegacyApiConfig(null, null);
        return null;
      }

      try {
        const nextProfile = normalizeAuthProfile(
          await authenticatedRequest<AuthProfile | LegacyAuthUser>(
            "/auth/me",
            { method: "GET" },
            { session: activeSession },
          ),
        );

        if (!nextProfile) {
          setProfile(null);
          setHasMissingProfile(true);
          syncLegacyApiConfig(activeSession, null);
          return null;
        }

        setProfile(nextProfile);
        setHasMissingProfile(false);
        syncLegacyApiConfig(activeSession, nextProfile);
        return nextProfile;
      } catch (error) {
        if (isMissingProfileError(error)) {
          const profileFromMetadata = await createProfileFromMetadata(
            activeSession,
            syncLegacyApiConfig,
          );

          if (profileFromMetadata) {
            setProfile(profileFromMetadata);
            setHasMissingProfile(false);
            return profileFromMetadata;
          }

          setProfile(null);
          setHasMissingProfile(true);
          syncLegacyApiConfig(activeSession, null);
          return null;
        }

        throw error;
      }
    },
    [syncLegacyApiConfig],
  );

  useEffect(() => {
    let isMounted = true;
    let supabase: ReturnType<typeof getSupabaseBrowserClient>;

    try {
      supabase = getSupabaseBrowserClient();
    } catch {
      queueMicrotask(() => {
        if (!isMounted) {
          return;
        }

        setSession(null);
        setProfile(null);
        setHasMissingProfile(false);
        setIsLoading(false);
      });
      return () => {
        isMounted = false;
      };
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }

      refreshProfile(data.session)
        .catch(() => {
          if (isMounted) {
            setProfile(null);
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) {
        return;
      }

      const hasStableAuth = Boolean(sessionRef.current && profileRef.current);

      if (!hasStableAuth) {
        setIsLoading(true);
      }

      refreshProfile(nextSession)
        .catch(() => {
          if (isMounted && !hasStableAuth) {
            setProfile(null);
          }
        })
        .finally(() => {
          if (isMounted && !hasStableAuth) {
            setIsLoading(false);
          }
        });
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const login = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error("Correo o contrasena incorrectos.");
      }

      return refreshProfile(data.session);
    },
    [refreshProfile],
  );

  const signup = useCallback(
    async ({ email, name, password, phone, termsAccepted }: SignupInput) => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone: phone || undefined,
            termsAccepted,
            termsVersion: legalTermsVersion,
            privacyVersion: legalPrivacyVersion,
          },
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes("already")) {
          throw new Error("Tu cuenta ya existe. Inicia sesion.");
        }
        throw error;
      }

      if (!data.session) {
        return "confirm-email";
      }

      await createProfile(data.session, { name, phone, termsAccepted }, syncLegacyApiConfig);
      await refreshProfile(data.session);
      return "profile-created";
    },
    [refreshProfile, syncLegacyApiConfig],
  );

  const completeProfile = useCallback(
    async (input: { name: string; phone?: string; termsAccepted: boolean }) => {
      const activeSession = session ?? (await getSupabaseBrowserClient().auth.getSession()).data.session;

      if (!activeSession) {
        throw new CoraFitApiError(401, {
          error: "SESSION_NOT_FOUND",
          message: "Inicia sesion para continuar.",
        });
      }

      const nextProfile = await createProfile(activeSession, input, syncLegacyApiConfig);
      setSession(activeSession);
      setProfile(nextProfile);
      setHasMissingProfile(false);
      return nextProfile;
    },
    [session, syncLegacyApiConfig],
  );

  const resetPassword = useCallback(async (email: string) => {
    const supabase = getSupabaseBrowserClient();
    const redirectTo =
      typeof window === "undefined" ? undefined : `${window.location.origin}/login`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut({ scope: "local" });
    setSession(null);
    setProfile(null);
    setHasMissingProfile(false);
    syncLegacyApiConfig(null, null);
  }, [syncLegacyApiConfig]);

  const status = isLoading
    ? "loading"
    : profile
      ? "authenticated"
      : session && hasMissingProfile
        ? "missing-profile"
        : "anonymous";

  const value = useMemo<AuthContextValue>(
    () => ({
      completeProfile,
      isLoading,
      login,
      logout,
      profile,
      refreshProfile,
      resetPassword,
      session,
      signup,
      status,
      suggestedProfile: session ? getPendingProfileInput(session) : null,
    }),
    [
      completeProfile,
      isLoading,
      login,
      logout,
      profile,
      refreshProfile,
      resetPassword,
      session,
      signup,
      status,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function isMissingProfileError(error: unknown) {
  return (
    error instanceof CoraFitApiError &&
    (error.code === "PROFILE_NOT_FOUND" || error.status === 403)
  );
}

function normalizeAuthProfile(payload: AuthProfile | LegacyAuthUser) {
  if ("user" in payload && payload.user) {
    return payload;
  }

  return null;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return value;
}

function getPendingProfileInput(session: Session) {
  const metadata = session.user.user_metadata;
  const name = typeof metadata.name === "string" ? metadata.name.trim() : "";
  const phone = typeof metadata.phone === "string" ? metadata.phone.trim() : "";
  const termsAccepted = metadata.termsAccepted === true;

  if (!name) {
    return null;
  }

  return {
    name,
    phone: phone || undefined,
    termsAccepted,
  };
}

async function createProfileFromMetadata(
  session: Session,
  syncLegacyApiConfig: (session: Session | null, profile: AuthProfile | null) => void,
) {
  const input = getPendingProfileInput(session);

  if (!input) {
    return null;
  }

  if (!input.termsAccepted) {
    return null;
  }

  return createProfile(session, input, syncLegacyApiConfig);
}

async function createProfile(
  session: Session,
  input: { name: string; phone?: string; termsAccepted?: boolean },
  syncLegacyApiConfig: (session: Session | null, profile: AuthProfile | null) => void,
) {
  try {
    const profile = await authenticatedRequest<AuthProfile>(
      "/auth/register-profile",
      {
        method: "POST",
        body: JSON.stringify({
          name: input.name,
          phone: input.phone || undefined,
          termsAccepted: input.termsAccepted === true,
          termsVersion: legalTermsVersion,
          privacyVersion: legalPrivacyVersion,
        }),
      },
      { session },
    );
    syncLegacyApiConfig(session, profile);
    return profile;
  } catch (error) {
    if (error instanceof CoraFitApiError && error.code === "PROFILE_EXISTS") {
      const profile = await authenticatedRequest<AuthProfile>(
        "/auth/me",
        { method: "GET" },
        { session },
      );
      syncLegacyApiConfig(session, profile);
      return profile;
    }

    throw new Error(
      error instanceof Error
        ? error.message
        : "No pudimos crear tu perfil. Intenta de nuevo.",
    );
  }
}
