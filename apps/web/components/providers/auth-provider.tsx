"use client";

import { createContext, type ReactNode, useContext } from "react";

type AuthContextValue = {
  status: "stub";
};

const AuthContext = createContext<AuthContextValue>({ status: "stub" });

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={{ status: "stub" }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
