import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, X } from "lucide-react";
import { useAuth, API_URL, User } from "../lib/auth";

interface Role {
  id: number;
  name: string;
  permissions: string[];
}

export function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ email: "", name: "", password: "", role_id: "" });

  const token = localStorage.getItem("tf_token") || "";

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        fetch(`${API_URL || ""}/api/users`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL || ""}/api/roles`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!usersRes.ok || !rolesRes.ok) throw new Error("Failed to load data");
      const usersData = await usersRes.json();
      const rolesData = await rolesRes.json();
      setUsers(usersData);
      setRoles(rolesData);
      if (rolesData.length > 0 && !form.role_id) {
        setForm((f) => ({ ...f, role_id: String(rolesData[0].id) }));
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      const res = await fetch(`${API_URL || ""}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, role_id: Number(form.role_id) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create user");
      }
      setShowForm(false);
      setForm({ email: "", name: "", password: "", role_id: String(roles[0]?.id || "") });
      await fetchData();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this user?")) return;
    await fetch(`${API_URL || ""}/api/users/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    await fetchData();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">User Management</h2>
            <p className="text-sm text-muted-foreground">Create and manage accounts and their roles.</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> Add User
          </button>
        </div>

        {showForm && (
          <div className="bg-card border border-border rounded-lg p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Create User</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            {formError && <p className="text-xs text-red-600 mb-3">{formError}</p>}
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded text-foreground text-sm focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded text-foreground text-sm focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded text-foreground text-sm focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Role</label>
                <select
                  value={form.role_id}
                  onChange={(e) => setForm({ ...form, role_id: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded text-foreground text-sm focus:outline-none focus:border-primary"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.permissions.join(", ")})
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity font-medium"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u.id} className="border-t border-border/60">
                  <td className="px-4 py-3 text-foreground">{u.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-secondary text-foreground font-medium">
                      {u.role_name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.id !== user?.id && (
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="p-1.5 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No users found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
