import { createContext, useContext, useEffect, useState, ReactNode } from "react";

const API_URL = import.meta.env.VITE_API_URL || "";

export interface User {
  id: number;
  email: string;
  name: string;
  role_id: number;
  role_name: string;
  permissions: string[];
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("tf_token");
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${API_URL || ""}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Invalid session");
        return res.json();
      })
      .then((data) => setUser(data))
      .catch(() => {
        localStorage.removeItem("tf_token");
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_URL || ""}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Login failed");
    }
    const data = await res.json();
    localStorage.setItem("tf_token", data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("tf_token");
    setUser(null);
  };

  const hasPermission = (permission: string) =>
    user?.permissions?.includes(permission) ?? false;

  const isAdmin = user?.role_name === "admin";

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { API_URL };
