"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";

export function ProtectedAppGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, status } = useAuth();

  useEffect(() => {
    if (status === "anonymous") {
      router.replace("/login");
    }

    if (status === "missing-profile") {
      router.replace("/complete-profile");
    }

    if (
      status === "authenticated" &&
      profile?.user.platformRole === "admin_saas" &&
      !profile.organization &&
      !pathname.startsWith("/admin")
    ) {
      router.replace("/admin/exercises");
    }
  }, [pathname, profile, router, status]);

  if (
    status === "loading" ||
    status === "anonymous" ||
    status === "missing-profile" ||
    (status === "authenticated" &&
      profile?.user.platformRole === "admin_saas" &&
      !profile.organization &&
      !pathname.startsWith("/admin"))
  ) {
    return <FullScreenLoading label="Validando acceso..." />;
  }

  return children;
}

export function PublicAuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }

    if (status === "missing-profile") {
      router.replace("/complete-profile");
    }
  }, [router, status]);

  if (status === "loading" || status === "authenticated" || status === "missing-profile") {
    return <FullScreenLoading label="Validando sesion..." />;
  }

  return children;
}

export function CompleteProfileGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "anonymous") {
      router.replace("/login");
    }

    if (status === "authenticated") {
      router.replace("/");
    }
  }, [router, status]);

  if (status === "loading" || status === "anonymous" || status === "authenticated") {
    return <FullScreenLoading label="Validando perfil..." />;
  }

  return children;
}

function FullScreenLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
      {label}
    </div>
  );
}
