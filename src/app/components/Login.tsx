import { useState } from "react";
import { Layers, Loader2 } from "lucide-react";
import { useAuth } from "../lib/auth";

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@taskflow.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 dark">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xl p-8">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">TaskFlow</h1>
            <p className="text-xs text-muted-foreground">Project Dashboard</p>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-foreground mb-1 text-center">Welcome back</h2>
        <p className="text-sm text-muted-foreground mb-6 text-center">Sign in with your admin or user account.</p>

        {error && (
          <div className="mb-4 p-3 rounded bg-red-100 text-red-700 text-sm dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-secondary border border-border rounded text-foreground text-sm focus:outline-none focus:border-primary"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-secondary border border-border rounded text-foreground text-sm focus:outline-none focus:border-primary"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Sign in
          </button>
        </form>

        <div className="mt-6 p-3 bg-secondary/50 rounded text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Demo accounts</p>
          <p>Admin: admin@taskflow.local / admin123</p>
          <p className="mt-1">Create additional users after signing in as admin.</p>
        </div>
      </div>
    </div>
  );
}
