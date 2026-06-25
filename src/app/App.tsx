import { useState, useRef, useEffect } from "react";
import { useAuth, API_URL } from "./lib/auth.tsx";
import { Login } from "./components/Login.tsx";
import { AdminUsers } from "./components/AdminUsers.tsx";
import {
  LayoutDashboard, List, FileText, BarChart2, Users, Settings,
  Plus, Search, Bell, X, Send, Bug, Zap, CheckSquare, BookOpen,
  AlertTriangle, Flag, Minus, Clock, MessageSquare,
  ChevronRight, ChevronDown, Moon, Sun, MoreHorizontal,
  Target, Filter, GitBranch, CheckCircle, Circle, Tag,
  Layers, Calendar, TrendingUp, Play
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────

type View = "board" | "backlog" | "wiki" | "reports" | "team" | "settings";
type Priority = "critical" | "high" | "medium" | "low";
type IssueStatus = "todo" | "in-progress" | "in-review" | "done";
type IssueType = "bug" | "feature" | "task" | "story";

interface Member {
  id: string; name: string; initials: string; color: string; role: string;
}
interface IssueComment {
  id: string; authorId: string; content: string; createdAt: string;
}
interface Issue {
  id: string; title: string; description: string;
  status: IssueStatus; priority: Priority; type: IssueType;
  assigneeId: string | null; reporterId: string;
  sprint: string | null; storyPoints: number;
  labels: string[]; createdAt: string; comments: IssueComment[];
}
interface Sprint {
  id: string; name: string; startDate: string; endDate: string;
  status: "active" | "completed" | "planned"; goal: string;
}
interface WikiDoc {
  id: string; title: string; icon: string; content: string;
  children?: WikiDoc[]; updatedAt: string; authorId: string;
}

// ── Data ──────────────────────────────────────────────────────────────────────

const MEMBERS: Member[] = [
  { id: "u1", name: "Alice Chen",    initials: "AC", color: "#6554C0", role: "Product Manager"    },
  { id: "u2", name: "Bob Mueller",   initials: "BM", color: "#0065FF", role: "Frontend Engineer"  },
  { id: "u3", name: "Carla Santos",  initials: "CS", color: "#00B8D9", role: "Backend Engineer"   },
  { id: "u4", name: "David Kim",     initials: "DK", color: "#36B37E", role: "DevOps Engineer"    },
  { id: "u5", name: "Eva Richter",   initials: "ER", color: "#FF5630", role: "QA Engineer"        },
];

const SPRINTS: Sprint[] = [];

const INIT_ISSUES: Issue[] = [];

const WIKI_DOCS: WikiDoc[] = [
  {
    id: "w1", title: "TaskFlow", icon: "🚀", updatedAt: "2026-06-20", authorId: "u1",
    content: `# TaskFlow\n\nWelcome to the **TaskFlow** product wiki.\n\nUse this space for architecture decisions, API documentation, deployment guides and team norms.`,
    children: [
      { id: "w2", title: "Getting Started", icon: "🚀", updatedAt: "2026-06-20", authorId: "u1", content: `# Getting Started\n\n1. Clone the repository\n2. Run \`npm install\` in the root and in \`server/\`\n3. Run \`npm run server:seed\` to create the admin account\n4. Run \`npm run dev\` to start frontend and backend\n5. Open http://localhost:5173 and sign in` },
      { id: "w3", title: "Architecture", icon: "🏗️", updatedAt: "2026-06-20", authorId: "u1", content: `# Architecture\n\n- React frontend (Vite)\n- Node.js/Express backend\n- SQLite database for users and roles` },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const getMember = (id: string | null) => MEMBERS.find((m) => m.id === id);
const getSprint  = (id: string | null) => SPRINTS.find((s) => s.id === id);

const PRIORITY_CFG: Record<Priority, { label: string; dot: string; text: string }> = {
  critical: { label: "Critical", dot: "bg-red-500",    text: "text-red-600"    },
  high:     { label: "High",     dot: "bg-orange-400", text: "text-orange-500" },
  medium:   { label: "Medium",   dot: "bg-amber-400",  text: "text-amber-600"  },
  low:      { label: "Low",      dot: "bg-sky-400",    text: "text-sky-500"    },
};

const STATUS_CFG: Record<IssueStatus, { label: string; color: string; bg: string }> = {
  "todo":        { label: "To Do",       color: "text-gray-600",  bg: "bg-gray-100"  },
  "in-progress": { label: "In Progress", color: "text-blue-700",  bg: "bg-blue-100"  },
  "in-review":   { label: "In Review",   color: "text-amber-700", bg: "bg-amber-100" },
  "done":        { label: "Done",        color: "text-green-700", bg: "bg-green-100" },
};

const TYPE_ICONS: Record<IssueType, { Icon: React.FC<{ className?: string }>; color: string }> = {
  bug:     { Icon: Bug,         color: "text-red-500"    },
  feature: { Icon: Zap,         color: "text-purple-500" },
  task:    { Icon: CheckSquare, color: "text-blue-500"   },
  story:   { Icon: BookOpen,    color: "text-green-500"  },
};

function flattenWiki(docs: WikiDoc[]): WikiDoc[] {
  return docs.flatMap((d) => [d, ...flattenWiki(d.children ?? [])]);
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ memberId, size = "sm" }: { memberId: string | null; size?: "xs" | "sm" | "md" | "lg" }) {
  const m = getMember(memberId);
  const sz = { xs: "w-5 h-5 text-[9px]", sm: "w-6 h-6 text-[10px]", md: "w-8 h-8 text-xs", lg: "w-10 h-10 text-sm" }[size];
  if (!m) return <div className={`${sz} rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 font-mono`}>?</div>;
  return (
    <div className={`${sz} rounded-full flex items-center justify-center text-white font-mono font-semibold flex-shrink-0`}
      style={{ backgroundColor: m.color }} title={m.name}>
      {m.initials}
    </div>
  );
}

// ── IssueCard (Kanban) ────────────────────────────────────────────────────────

function IssueCard({ issue, onOpen, onDragStart }: { issue: Issue; onOpen: () => void; onDragStart: () => void }) {
  const { Icon, color } = TYPE_ICONS[issue.type];
  const p = PRIORITY_CFG[issue.priority];
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onOpen}
      className="bg-card border border-border rounded p-3 cursor-pointer hover:shadow-md hover:border-primary/40 transition-all group select-none"
    >
      <div className="flex items-start gap-2 mb-2">
        <Icon className={`${color} w-3.5 h-3.5 mt-0.5 flex-shrink-0`} />
        <p className="text-xs font-medium text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">{issue.title}</p>
      </div>
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-muted-foreground">{issue.id}</span>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.dot}`} title={p.label} />
          {issue.storyPoints > 0 && (
            <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded font-mono">{issue.storyPoints}sp</span>
          )}
        </div>
        <Avatar memberId={issue.assigneeId} size="xs" />
      </div>
      {issue.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {issue.labels.slice(0, 2).map((l) => (
            <span key={l} className="text-[9px] px-1.5 py-0.5 bg-accent text-accent-foreground rounded font-medium">{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── IssueRow (Backlog) ────────────────────────────────────────────────────────

function IssueRow({ issue, onOpen }: { issue: Issue; onOpen: () => void }) {
  const { Icon, color } = TYPE_ICONS[issue.type];
  const p = PRIORITY_CFG[issue.priority];
  const s = STATUS_CFG[issue.status];
  return (
    <div onClick={onOpen} className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/60 cursor-pointer group border-b border-border/60 last:border-b-0">
      <Icon className={`${color} w-3.5 h-3.5 flex-shrink-0`} />
      <span className="font-mono text-[11px] text-muted-foreground w-14 flex-shrink-0">{issue.id}</span>
      <span className="flex-1 text-xs text-foreground group-hover:text-primary transition-colors truncate">{issue.title}</span>
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.color} ${s.bg} flex-shrink-0 hidden sm:block`}>{s.label}</span>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.dot}`} title={p.label} />
      <span className="font-mono text-[10px] text-muted-foreground w-6 text-right flex-shrink-0">{issue.storyPoints || "—"}</span>
      <Avatar memberId={issue.assigneeId} size="xs" />
    </div>
  );
}

// ── Issue Detail Panel ────────────────────────────────────────────────────────

function IssueDetail({ issue, issues, setIssues, onClose, darkMode }: {
  issue: Issue; issues: Issue[]; setIssues: (i: Issue[]) => void; onClose: () => void; darkMode: boolean;
}) {
  const [comment, setComment] = useState("");
  const { Icon, color } = TYPE_ICONS[issue.type];
  const p = PRIORITY_CFG[issue.priority];
  const s = STATUS_CFG[issue.status];
  const sprint = getSprint(issue.sprint);
  const updateStatus = (status: IssueStatus) => {
    setIssues(issues.map((i) => i.id === issue.id ? { ...i, status } : i));
  };

  const addComment = () => {
    if (!comment.trim()) return;
    const updated = issues.map((i) => i.id === issue.id ? {
      ...i, comments: [...i.comments, { id: `c${Date.now()}`, authorId: "u1", content: comment.trim(), createdAt: new Date().toISOString().split("T")[0] }]
    } : i);
    setIssues(updated);
    setComment("");
  };

  return (
    <div className={`fixed inset-y-0 right-0 w-[520px] z-50 flex flex-col shadow-2xl border-l border-border ${darkMode ? "dark" : ""}`}
      style={{ backgroundColor: "var(--card)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Icon className={`${color} w-4 h-4`} />
          <span className="font-mono text-xs text-muted-foreground">{issue.id}</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-5">
          <h2 className="text-base font-semibold text-foreground mb-4 leading-snug">{issue.title}</h2>

          {/* Status selector */}
          <div className="flex flex-wrap gap-2 mb-6">
            {(["todo", "in-progress", "in-review", "done"] as IssueStatus[]).map((st) => {
              const sc = STATUS_CFG[st];
              const active = issue.status === st;
              return (
                <button key={st} onClick={() => updateStatus(st)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all border ${active ? `${sc.color} ${sc.bg} border-current` : "text-muted-foreground bg-secondary border-transparent hover:border-border"}`}>
                  {sc.label}
                </button>
              );
            })}
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { label: "Priority", value: <span className={`flex items-center gap-1.5 text-xs ${p.text}`}><span className={`w-2 h-2 rounded-full ${p.dot}`} />{p.label}</span> },
              { label: "Story Points", value: <span className="font-mono text-xs">{issue.storyPoints || "—"}</span> },
              { label: "Assignee", value: <div className="flex items-center gap-1.5"><Avatar memberId={issue.assigneeId} size="xs" /><span className="text-xs">{getMember(issue.assigneeId)?.name ?? "Unassigned"}</span></div> },
              { label: "Reporter", value: <div className="flex items-center gap-1.5"><Avatar memberId={issue.reporterId} size="xs" /><span className="text-xs">{getMember(issue.reporterId)?.name}</span></div> },
              { label: "Sprint", value: <span className="text-xs">{sprint?.name ?? "Backlog"}</span> },
              { label: "Created", value: <span className="text-xs">{issue.createdAt}</span> },
            ].map(({ label, value }) => (
              <div key={label} className="bg-secondary/50 rounded p-3">
                <p className="text-[10px] text-muted-foreground font-medium mb-1 uppercase tracking-wide">{label}</p>
                <div className="text-foreground">{value}</div>
              </div>
            ))}
          </div>

          {/* Labels */}
          {issue.labels.length > 0 && (
            <div className="mb-6">
              <p className="text-[10px] text-muted-foreground font-medium mb-2 uppercase tracking-wide">Labels</p>
              <div className="flex flex-wrap gap-1.5">
                {issue.labels.map((l) => (
                  <span key={l} className="text-xs px-2 py-1 bg-accent text-accent-foreground rounded font-medium">{l}</span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="mb-6">
            <p className="text-[10px] text-muted-foreground font-medium mb-2 uppercase tracking-wide">Description</p>
            <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{issue.description}</p>
          </div>

          {/* Comments */}
          <div>
            <p className="text-[10px] text-muted-foreground font-medium mb-3 uppercase tracking-wide flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3" /> Comments ({issue.comments.length})
            </p>
            <div className="space-y-3 mb-4">
              {issue.comments.map((c) => {
                const author = getMember(c.authorId);
                return (
                  <div key={c.id} className="flex gap-2.5">
                    <Avatar memberId={c.authorId} size="xs" />
                    <div className="flex-1 bg-secondary/50 rounded p-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-foreground">{author?.name}</span>
                        <span className="text-[10px] text-muted-foreground">{c.createdAt}</span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">{c.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Add comment */}
            <div className="flex gap-2">
              <Avatar memberId="u1" size="xs" />
              <div className="flex-1 flex gap-2">
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && addComment()}
                  placeholder="Add a comment..."
                  className="flex-1 text-xs bg-secondary/60 border border-border rounded px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
                <button onClick={addComment}
                  className="px-3 py-2 bg-primary text-primary-foreground rounded text-xs hover:opacity-90 transition-opacity flex items-center gap-1">
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Create Issue Modal ────────────────────────────────────────────────────────

function CreateIssueModal({ onClose, onCreate, initialStatus }: {
  onClose: () => void; onCreate: (issue: Issue) => void; initialStatus?: IssueStatus;
}) {
  const [form, setForm] = useState({
    title: "", description: "",
    type: "task" as IssueType, priority: "medium" as Priority,
    status: initialStatus ?? "todo" as IssueStatus,
    assigneeId: "" as string | null, sprint: "s24" as string | null,
    storyPoints: 3, labels: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const nextId = `PM-${61 + Math.floor(Math.random() * 100)}`;
    onCreate({
      id: nextId, title: form.title.trim(), description: form.description.trim(),
      status: form.status, priority: form.priority, type: form.type,
      assigneeId: form.assigneeId || null, reporterId: "u1",
      sprint: form.sprint, storyPoints: form.storyPoints,
      labels: form.labels.split(",").map((l) => l.trim()).filter(Boolean),
      createdAt: new Date().toISOString().split("T")[0], comments: [],
    });
    onClose();
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );

  const inputCls = "w-full text-sm bg-secondary/50 border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-primary";
  const selectCls = `${inputCls} cursor-pointer`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Create Issue</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Field label="Title *">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={inputCls} placeholder="Short, descriptive title" autoFocus required />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Type">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as IssueType })} className={selectCls}>
                <option value="task">Task</option>
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
                <option value="story">Story</option>
              </select>
            </Field>
            <Field label="Priority">
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })} className={selectCls}>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </Field>
            <Field label="Points">
              <input type="number" min={0} max={21} value={form.storyPoints}
                onChange={(e) => setForm({ ...form, storyPoints: Number(e.target.value) })}
                className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Assignee">
              <select value={form.assigneeId ?? ""} onChange={(e) => setForm({ ...form, assigneeId: e.target.value || null })} className={selectCls}>
                <option value="">Unassigned</option>
                {MEMBERS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
            <Field label="Sprint">
              <select value={form.sprint ?? ""} onChange={(e) => setForm({ ...form, sprint: e.target.value || null })} className={selectCls}>
                <option value="">Backlog</option>
                {SPRINTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Description">
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={`${inputCls} resize-none`} rows={3} placeholder="Describe the issue in detail..." />
          </Field>
          <Field label="Labels (comma-separated)">
            <input value={form.labels} onChange={(e) => setForm({ ...form, labels: e.target.value })}
              className={inputCls} placeholder="frontend, backend, auth" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity font-medium">
              Create Issue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Board View ────────────────────────────────────────────────────────────────

const COLUMNS: { status: IssueStatus; label: string; color: string }[] = [
  { status: "todo",        label: "To Do",       color: "border-t-gray-400"  },
  { status: "in-progress", label: "In Progress", color: "border-t-blue-500"  },
  { status: "in-review",   label: "In Review",   color: "border-t-amber-500" },
  { status: "done",        label: "Done",        color: "border-t-green-500" },
];

function BoardView({ issues, setIssues, onOpenIssue, onCreateIssue }: {
  issues: Issue[]; setIssues: (i: Issue[]) => void;
  onOpenIssue: (i: Issue) => void; onCreateIssue: (status: IssueStatus) => void;
}) {
  const dragId = useRef<string | null>(null);
  const activeSprint = SPRINTS.find((s) => s.status === "active");
  const boardIssues = activeSprint ? issues.filter((i) => i.sprint === activeSprint.id) : [];

  const done = boardIssues.filter((i) => i.status === "done").length;
  const total = boardIssues.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const totalSp = boardIssues.reduce((a, b) => a + b.storyPoints, 0);
  const doneSp  = boardIssues.filter((i) => i.status === "done").reduce((a, b) => a + b.storyPoints, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Sprint banner */}
      <div className="px-6 py-3 bg-card border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-green-500" />
              <span className="text-sm font-semibold text-foreground">{activeSprint?.name ?? "No active sprint"}</span>
            </div>
            {activeSprint && <span className="text-xs text-muted-foreground">{activeSprint.startDate} – {activeSprint.endDate}</span>}
            {activeSprint && <span className="text-xs text-muted-foreground hidden md:block">· {activeSprint.goal}</span>}
          </div>
          {activeSprint && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="font-mono">{doneSp}/{totalSp} sp</span>
              <span>{done}/{total} issues</span>
            </div>
          )}
        </div>
        {activeSprint && (
          <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-green-500 transition-all rounded-full" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>

      {/* Kanban columns */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex gap-4 h-full min-w-0">
          {COLUMNS.map(({ status, label, color }) => {
            const col = boardIssues.filter((i) => i.status === status);
            return (
              <div key={status}
                className="flex flex-col flex-1 min-w-[220px] max-w-[300px]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragId.current) {
                    setIssues(issues.map((i) => i.id === dragId.current ? { ...i, status } : i));
                    dragId.current = null;
                  }
                }}>
                {/* Column header */}
                <div className={`bg-card border border-border border-t-2 ${color} rounded-t px-3 py-2.5 flex items-center justify-between flex-shrink-0`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{label}</span>
                    <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{col.length}</span>
                  </div>
                  <button onClick={() => onCreateIssue(status)}
                    className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* Cards */}
                <div className="flex-1 overflow-y-auto bg-secondary/30 border border-t-0 border-border rounded-b p-2 space-y-2 min-h-[200px]">
                  {col.map((issue) => (
                    <IssueCard key={issue.id} issue={issue} onOpen={() => onOpenIssue(issue)}
                      onDragStart={() => { dragId.current = issue.id; }} />
                  ))}
                  {col.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Circle className="w-6 h-6 mb-2 opacity-30" />
                      <p className="text-xs opacity-50">Drop issues here</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Backlog View ──────────────────────────────────────────────────────────────

function BacklogView({ issues, setIssues, onOpenIssue, onCreateIssue }: {
  issues: Issue[]; setIssues: (i: Issue[]) => void;
  onOpenIssue: (i: Issue) => void; onCreateIssue: (status?: IssueStatus) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState("");

  const toggle = (id: string) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));

  const moveToSprint = (issueId: string, sprintId: string | null) => {
    setIssues(issues.map((i) => i.id === issueId ? { ...i, sprint: sprintId } : i));
  };

  const filtered = issues.filter((i) =>
    !filter || i.title.toLowerCase().includes(filter.toLowerCase()) || i.id.toLowerCase().includes(filter.toLowerCase())
  );

  const sections = [
    ...SPRINTS.map((s) => ({ id: s.id, label: s.name, badge: s.status, goal: s.goal, issues: filtered.filter((i) => i.sprint === s.id) })),
    { id: "backlog", label: "Backlog", badge: "backlog" as any, goal: "Unscheduled issues", issues: filtered.filter((i) => !i.sprint) },
  ];

  const badgeColors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    completed: "bg-gray-100 text-gray-500",
    planned: "bg-blue-100 text-blue-700",
    backlog: "bg-secondary text-muted-foreground",
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="px-6 py-3 bg-card border-b border-border flex items-center gap-3 flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter issues..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-secondary border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
        </div>
        <button onClick={() => onCreateIssue()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity font-medium">
          <Plus className="w-3.5 h-3.5" /> Create Issue
        </button>
      </div>

      {/* Sprint sections */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sections.map((section) => {
          const sp = section.issues.reduce((a, b) => a + b.storyPoints, 0);
          const isOpen = !collapsed[section.id];
          return (
            <div key={section.id} className="bg-card border border-border rounded overflow-hidden">
              {/* Section header */}
              <button onClick={() => toggle(section.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors">
                {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                <span className="font-semibold text-sm text-foreground">{section.label}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badgeColors[section.badge]}`}>
                  {section.badge}
                </span>
                <span className="text-xs text-muted-foreground flex-1 text-left truncate ml-1 hidden md:block">{section.goal}</span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                  <span className="font-mono">{sp} sp</span>
                  <span>{section.issues.length} issues</span>
                </div>
              </button>
              {/* Issues */}
              {isOpen && (
                <div className="border-t border-border">
                  {section.issues.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-4 py-4 text-center">No issues in this sprint</p>
                  ) : (
                    section.issues.map((issue) => (
                      <div key={issue.id} className="group relative">
                        <IssueRow issue={issue} onOpen={() => onOpenIssue(issue)} />
                        {/* Context menu on hover */}
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1">
                          <select
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => moveToSprint(issue.id, e.target.value || null)}
                            value={issue.sprint ?? ""}
                            className="text-[10px] px-2 py-1 bg-card border border-border rounded text-foreground cursor-pointer focus:outline-none"
                          >
                            <option value="">Backlog</option>
                            {SPRINTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Wiki View ─────────────────────────────────────────────────────────────────

function WikiContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("# "))   return <h1 key={i} className="text-xl font-bold text-foreground mt-2 mb-3">{line.slice(2)}</h1>;
        if (line.startsWith("## "))  return <h2 key={i} className="text-base font-semibold text-foreground mt-6 mb-2 pt-4 border-t border-border">{line.slice(3)}</h2>;
        if (line.startsWith("### ")) return <h3 key={i} className="text-sm font-semibold text-foreground mt-4 mb-1">{line.slice(4)}</h3>;
        if (line.startsWith("- "))   return <li key={i} className="ml-5 text-sm text-foreground mb-0.5 list-disc">{line.slice(2)}</li>;
        if (line === "")             return <div key={i} className="h-1" />;
        return <p key={i} className="text-sm text-foreground leading-relaxed">{line}</p>;
      })}
    </div>
  );
}

function WikiTreeItem({ doc, depth, selected, onSelect, expanded, onToggle }: {
  doc: WikiDoc; depth: number; selected: string; onSelect: (id: string) => void;
  expanded: Record<string, boolean>; onToggle: (id: string) => void;
}) {
  const hasChildren = doc.children && doc.children.length > 0;
  const isExpanded = expanded[doc.id];
  const isSelected = selected === doc.id;
  return (
    <div>
      <button onClick={() => { onSelect(doc.id); if (hasChildren) onToggle(doc.id); }}
        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors text-left ${isSelected ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}>
        {hasChildren
          ? (isExpanded ? <ChevronDown className="w-3 h-3 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 flex-shrink-0" />)
          : <span className="w-3" />}
        <span className="text-sm mr-1">{doc.icon}</span>
        <span className="truncate">{doc.title}</span>
      </button>
      {hasChildren && isExpanded && doc.children!.map((child) => (
        <WikiTreeItem key={child.id} doc={child} depth={depth + 1} selected={selected}
          onSelect={onSelect} expanded={expanded} onToggle={onToggle} />
      ))}
    </div>
  );
}

function WikiView() {
  const allDocs = flattenWiki(WIKI_DOCS);
  const [selectedId, setSelectedId] = useState("w1");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ w1: true, w3: true });
  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));
  const current = allDocs.find((d) => d.id === selectedId) ?? allDocs[0];
  const author = getMember(current.authorId);

  return (
    <div className="flex h-full">
      {/* Tree sidebar */}
      <div className="w-56 flex-shrink-0 border-r border-border bg-card overflow-y-auto p-2">
        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide px-3 pt-2 pb-1">Pages</p>
        {WIKI_DOCS.map((doc) => (
          <WikiTreeItem key={doc.id} doc={doc} depth={0} selected={selectedId}
            onSelect={setSelectedId} expanded={expanded} onToggle={toggle} />
        ))}
      </div>
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-8">
          <div className="flex items-center gap-2 mb-1 text-[11px] text-muted-foreground">
            <span className="text-xl">{current.icon}</span>
            <span>Updated {current.updatedAt}</span>
            <span>·</span>
            <div className="flex items-center gap-1">
              <Avatar memberId={current.authorId} size="xs" />
              <span>{author?.name}</span>
            </div>
          </div>
          <WikiContent content={current.content} />
        </div>
      </div>
    </div>
  );
}

// ── Reports View ──────────────────────────────────────────────────────────────

const burndownData = [
  { day: "D1", remaining: 32, ideal: 32 }, { day: "D2", remaining: 31, ideal: 28.8 },
  { day: "D3", remaining: 28, ideal: 25.6 }, { day: "D4", remaining: 26, ideal: 22.4 },
  { day: "D5", remaining: 23, ideal: 19.2 }, { day: "D6", remaining: 20, ideal: 16 },
  { day: "D7", remaining: 17, ideal: 12.8 }, { day: "D8", remaining: 13, ideal: 9.6 },
  { day: "D9", remaining: 10, ideal: 6.4 },  { day: "D10", remaining: 8, ideal: 3.2 },
];

const velocityData = [
  { sprint: "Spr 20", committed: 32, completed: 28 },
  { sprint: "Spr 21", committed: 35, completed: 34 },
  { sprint: "Spr 22", committed: 36, completed: 31 },
  { sprint: "Spr 23", committed: 38, completed: 38 },
  { sprint: "Spr 24", committed: 32, completed: 8  },
];

const PIE_COLORS = ["#ef4444", "#a855f7", "#3b82f6", "#22c55e"];

function ReportsView({ issues }: { issues: Issue[] }) {
  const typeDist = [
    { name: "Bug",     value: issues.filter((i) => i.type === "bug").length     },
    { name: "Feature", value: issues.filter((i) => i.type === "feature").length },
    { name: "Task",    value: issues.filter((i) => i.type === "task").length    },
    { name: "Story",   value: issues.filter((i) => i.type === "story").length   },
  ];

  const assigneeData = MEMBERS.map((m) => ({
    name: m.name.split(" ")[0],
    open: issues.filter((i) => i.assigneeId === m.id && i.status !== "done").length,
    done: issues.filter((i) => i.assigneeId === m.id && i.status === "done").length,
  }));

  const ChartCard = ({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) => (
    <div className="bg-card border border-border rounded p-5">
      <p className="text-sm font-semibold text-foreground mb-0.5">{title}</p>
      <p className="text-xs text-muted-foreground mb-4">{subtitle}</p>
      {children}
    </div>
  );

  const activeSprint = SPRINTS.find((s) => s.status === "active");
  const activeIssues = activeSprint ? issues.filter((i) => i.sprint === activeSprint.id) : [];
  const activeDone = activeIssues.filter((i) => i.status === "done").length;
  const activeTotal = activeIssues.length;
  const activeProgress = activeTotal ? Math.round((activeDone / activeTotal) * 100) : 0;
  const activeSp = activeIssues.reduce((a, b) => a + b.storyPoints, 0);
  const activeDoneSp = activeIssues.filter((i) => i.status === "done").reduce((a, b) => a + b.storyPoints, 0);
  const openIssues = issues.filter((i) => i.status !== "done").length;

  const hasData = issues.length > 0;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Active Sprint", value: activeSprint?.name ?? "—", sub: activeSprint ? `${activeSprint.startDate} → ${activeSprint.endDate}` : "No active sprint", icon: <Target className="w-4 h-4 text-blue-500" /> },
          { label: "Sprint Progress", value: `${activeProgress}%`, sub: `${activeDoneSp}/${activeSp} story points`, icon: <CheckCircle className="w-4 h-4 text-amber-500" /> },
          { label: "Open Issues", value: String(openIssues), sub: "across all sprints", icon: <GitBranch className="w-4 h-4 text-purple-500" /> },
          { label: "Total Issues", value: String(issues.length), sub: "in dashboard", icon: <TrendingUp className="w-4 h-4 text-green-500" /> },
        ].map(({ label, value, sub, icon }) => (
          <div key={label} className="bg-card border border-border rounded p-4">
            <div className="flex items-center justify-between mb-2">{icon}<span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span></div>
            <p className="text-2xl font-bold text-foreground font-mono">{value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {hasData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard title="Issues by Type" subtitle="Distribution across all issues">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={typeDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                  {typeDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "4px", fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {typeDist.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                  <span className="text-xs text-muted-foreground">{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Workload by Assignee" subtitle="Open vs completed issues per team member">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={assigneeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={40} />
                <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "4px", fontSize: 11 }} />
                <Bar dataKey="open" fill="#0052cc" name="Open" radius={[0, 2, 2, 0]} />
                <Bar dataKey="done" fill="#36b37e" name="Done" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      ) : (
        <div className="bg-card border border-border rounded p-10 text-center">
          <p className="text-sm text-muted-foreground">No data yet. Create issues to see reports.</p>
        </div>
      )}
    </div>
  );
}

// ── Team View ─────────────────────────────────────────────────────────────────

function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue} 70% 45%)`;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface TeamMember {
  id: number;
  email: string;
  name: string;
  role_name: string;
}

function TeamView({ issues }: { issues: Issue[] }) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("tf_token") || "";

  useEffect(() => {
    fetch(`${API_URL || ""}/api/team`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((m) => {
          const memberIssues = issues.filter((i) => i.assigneeId === String(m.id));
          const open = memberIssues.filter((i) => i.status !== "done");
          const done = memberIssues.filter((i) => i.status === "done");
          const inProg = memberIssues.filter((i) => i.status === "in-progress");
          const color = stringToColor(m.name);
          return (
            <div key={m.id} className="bg-card border border-border rounded p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold font-mono"
                  style={{ backgroundColor: color }}
                >
                  {initials(m.name)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.role_name}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: "Open", value: open.length, color: "text-blue-600" },
                  { label: "Active", value: inProg.length, color: "text-amber-600" },
                  { label: "Done", value: done.length, color: "text-green-600" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-secondary/50 rounded p-2 text-center">
                    <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
              {open.slice(0, 3).map((issue) => {
                const { Icon, color } = TYPE_ICONS[issue.type];
                return (
                  <div key={issue.id} className="flex items-center gap-2 py-1.5 border-t border-border/60 first:border-t-0">
                    <Icon className={`${color} w-3 h-3 flex-shrink-0`} />
                    <span className="font-mono text-[10px] text-muted-foreground w-12 flex-shrink-0">{issue.id}</span>
                    <span className="text-xs text-foreground truncate">{issue.title}</span>
                  </div>
                );
              })}
              {open.length > 3 && (
                <p className="text-[10px] text-muted-foreground mt-2">+{open.length - 3} more</p>
              )}
            </div>
          );
        })}
      </div>
      {members.length === 0 && (
        <p className="text-sm text-muted-foreground text-center mt-10">No team members found.</p>
      )}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: View; label: string; Icon: React.FC<{ className?: string }>; permission?: string }[] = [
  { id: "board",   label: "Board",   Icon: LayoutDashboard },
  { id: "backlog", label: "Backlog", Icon: List,            permission: "backlog" },
  { id: "wiki",    label: "Wiki",    Icon: FileText        },
  { id: "reports", label: "Reports", Icon: BarChart2,       permission: "reports" },
  { id: "team",    label: "Team",    Icon: Users           },
];

function Sidebar({ view, setView, darkMode, setDarkMode }: {
  view: View; setView: (v: View) => void; darkMode: boolean; setDarkMode: (d: boolean) => void;
}) {
  const { user, logout, hasPermission, isAdmin } = useAuth();
  const visibleNav = NAV_ITEMS.filter((item) => !item.permission || hasPermission(item.permission));

  return (
    <div className="w-52 flex-shrink-0 flex flex-col h-full" style={{ backgroundColor: "#0f1b2d" }}>
      {/* Logo */}
      <div className="px-4 py-4 border-b flex items-center gap-2.5" style={{ borderColor: "#1e304a" }}>
        <div className="w-7 h-7 rounded flex items-center justify-center bg-blue-500">
          <Layers className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-none">TaskFlow</p>
          <p className="text-[10px] text-blue-400 leading-none mt-0.5">Project Dashboard</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {visibleNav.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setView(id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors ${
              view === id
                ? "bg-blue-600/30 text-blue-300 font-medium"
                : "text-[#8899aa] hover:bg-white/5 hover:text-white"
            }`}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </button>
        ))}

        {isAdmin && (
          <div className="pt-3 mt-2 border-t" style={{ borderColor: "#1e304a" }}>
            <button
              onClick={() => setView("settings")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors ${
                view === "settings"
                  ? "bg-blue-600/30 text-blue-300 font-medium"
                  : "text-[#8899aa] hover:bg-white/5 hover:text-white"
              }`}>
              <Settings className="w-4 h-4 flex-shrink-0" />
              Settings
            </button>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t space-y-2" style={{ borderColor: "#1e304a" }}>
        <button onClick={() => setDarkMode(!darkMode)}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs text-[#8899aa] hover:bg-white/5 hover:text-white transition-colors">
          {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          {darkMode ? "Light mode" : "Dark mode"}
        </button>
        <div className="flex items-center gap-2 px-1 py-1">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white font-mono text-[10px]"
            style={{ backgroundColor: "#6554C0" }}>
            {user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white truncate">{user?.name ?? "User"}</p>
            <p className="text-[10px] text-[#8899aa] truncate">{user?.role_name ?? "Member"}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full text-left px-3 py-1.5 rounded text-xs text-[#8899aa] hover:bg-white/5 hover:text-white transition-colors">
          Sign out
        </button>
      </div>
    </div>
  );
}

// ── Top Bar ───────────────────────────────────────────────────────────────────

const VIEW_LABELS: Record<View, string> = {
  board: "Board", backlog: "Backlog", wiki: "Wiki", reports: "Reports", team: "Team", settings: "Settings",
};

function TopBar({ view, onCreateIssue }: { view: View; onCreateIssue: () => void }) {
  const [search, setSearch] = useState("");
  return (
    <div className="h-12 flex-shrink-0 bg-card border-b border-border flex items-center gap-4 px-5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>TaskFlow</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">{VIEW_LABELS[view]}</span>
      </div>
      <div className="flex-1 flex justify-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search issues, docs..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-secondary border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="relative p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>
        {view !== "settings" && (
          <button onClick={onCreateIssue}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity font-medium">
            <Plus className="w-3.5 h-3.5" /> Create
          </button>
        )}
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<View>("board");
  const [issues, setIssues] = useState<Issue[]>(INIT_ISSUES);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [createStatus, setCreateStatus] = useState<IssueStatus | null>(null);
  const [darkMode, setDarkMode] = useState(true);

  const openCreate = (status?: IssueStatus) => setCreateStatus(status ?? "todo");
  const closeCreate = () => setCreateStatus(null);

  const handleCreate = (issue: Issue) => {
    setIssues((prev) => [issue, ...prev]);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Loading…
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className={`h-screen flex overflow-hidden ${darkMode ? "dark" : ""} bg-background`}
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Sidebar view={view} setView={setView} darkMode={darkMode} setDarkMode={setDarkMode} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar view={view} onCreateIssue={() => openCreate()} />
        <main className="flex-1 overflow-hidden flex flex-col">
          {view === "board"   && <BoardView   issues={issues} setIssues={setIssues} onOpenIssue={setSelectedIssue} onCreateIssue={openCreate} />}
          {view === "backlog" && <BacklogView  issues={issues} setIssues={setIssues} onOpenIssue={setSelectedIssue} onCreateIssue={openCreate} />}
          {view === "wiki"    && <WikiView />}
          {view === "reports" && <ReportsView  issues={issues} />}
          {view === "team"    && <TeamView     issues={issues} />}
          {view === "settings" && <AdminUsers />}
        </main>
      </div>

      {/* Issue detail overlay */}
      {selectedIssue && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSelectedIssue(null)} />
          <IssueDetail
            issue={selectedIssue} issues={issues} setIssues={setIssues}
            onClose={() => setSelectedIssue(null)} darkMode={darkMode}
          />
        </>
      )}

      {/* Create issue modal */}
      {createStatus !== null && (
        <CreateIssueModal
          initialStatus={createStatus}
          onClose={closeCreate}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
