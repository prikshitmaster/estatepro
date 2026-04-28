// app/(dashboard)/tasks/page.tsx — Tasks page with real Supabase data
//
// 🧠 WHAT THIS PAGE DOES (simple explanation):
//    A task is a reminder for the broker — like a sticky note:
//      "Call Rahul on Friday" or "Send documents to Priya"
//
//    This page lets you:
//      1. See ALL your tasks (sorted by due date — most urgent first)
//      2. Tick a task as DONE (or untick to undo)
//      3. Add a new task using the form at the top
//      4. Delete a task you no longer need
//      5. Filter: show All / Pending only / Done only
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getAllTasks, addTask, toggleTaskComplete, deleteTask } from "@/lib/db/tasks";
import { getAllLeads } from "@/lib/db/leads";
import { Task, TaskType, TaskPriority, Lead } from "@/lib/types";

// Colour of the priority dot on each task card
const PRIORITY_DOT: Record<TaskPriority, string> = {
  high:   "bg-red-500",
  medium: "bg-amber-400",
  low:    "bg-green-400",
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  high:   "High",
  medium: "Medium",
  low:    "Low",
};

type FilterType = "all" | "pending" | "done";

export default function TasksPage() {
  const router = useRouter();

  // All tasks fetched from Supabase
  const [tasks, setTasks]     = useState<Task[]>([]);
  // Leads list — used in the "Add Task" dropdown to pick which lead it's for
  const [leads, setLeads]     = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<FilterType>("all");

  // ── Add task form state ────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    lead_id:   "",           // which lead (optional)
    lead_name: "",           // typed manually if no lead selected
    lead_phone:"",
    type:      "Call" as TaskType,
    priority:  "medium" as TaskPriority,
    due_date:  "",           // date string from input
  });

  // ── Load tasks + leads on mount ────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [taskData, leadData] = await Promise.all([
          getAllTasks(),
          getAllLeads(),
        ]);
        setTasks(taskData);
        setLeads(leadData);
      } catch {
        // silently fail — page will show empty state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── When a lead is picked from the dropdown, auto-fill name + phone ────────
  function handleLeadSelect(leadId: string) {
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      setForm((f) => ({ ...f, lead_id: leadId, lead_name: lead.name, lead_phone: lead.phone }));
    } else {
      setForm((f) => ({ ...f, lead_id: "", lead_name: "", lead_phone: "" }));
    }
  }

  // ── Save new task ──────────────────────────────────────────────────────────
  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const newTask = await addTask({
        user_id:    user.id,
        lead_id:    form.lead_id || undefined,
        lead_name:  form.lead_name,
        lead_phone: form.lead_phone,
        type:       form.type,
        priority:   form.priority,
        due_date:   new Date(form.due_date).toISOString(),
        completed:  false,
      });

      // Add the new task to the top of the list without re-fetching
      setTasks((prev) => [newTask, ...prev]);

      // Reset form and hide it
      setForm({ lead_id: "", lead_name: "", lead_phone: "", type: "Call", priority: "medium", due_date: "" });
      setShowForm(false);

    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save task.");
    } finally {
      setSaving(false);
    }
  }

  // ── Tick/untick a task ─────────────────────────────────────────────────────
  async function handleToggle(task: Task) {
    const newValue = !task.completed;
    // Update the screen immediately (optimistic update) — feels instant
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, completed: newValue } : t));
    try {
      await toggleTaskComplete(task.id, newValue);
    } catch {
      // If it fails, revert back
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, completed: task.completed } : t));
    }
  }

  // ── Delete a task ──────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id)); // remove from screen immediately
    try {
      await deleteTask(id);
    } catch {
      // If fails, re-fetch to restore
      const fresh = await getAllTasks();
      setTasks(fresh);
    }
  }

  // ── Filter tasks based on selected tab ────────────────────────────────────
  const filtered = tasks.filter((t) => {
    if (filter === "pending") return !t.completed;
    if (filter === "done")    return  t.completed;
    return true; // "all"
  });

  const pendingCount = tasks.filter((t) => !t.completed).length;

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-3 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-24 sm:pb-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {pendingCount} pending · {tasks.length} total
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <PlusIcon />
          {showForm ? "Cancel" : "Add Task"}
        </button>
      </div>

      {/* ── Add Task form (shown/hidden by the button above) ───────────────── */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-blue-100 p-5 mb-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">New Task</h2>
          <form onSubmit={handleAddTask} className="flex flex-col gap-3">

            {/* Pick a lead from the dropdown (fills in name + phone automatically) */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Link to a Lead (optional)
              </label>
              <select
                value={form.lead_id}
                onChange={(e) => handleLeadSelect(e.target.value)}
                className={sel}
              >
                <option value="">— No lead (type name manually) —</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>{l.name} · {l.phone}</option>
                ))}
              </select>
            </div>

            {/* If no lead selected, let them type name + phone manually */}
            {!form.lead_id && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                  <input
                    required type="text" placeholder="Rahul Sharma"
                    value={form.lead_name}
                    onChange={(e) => setForm((f) => ({ ...f, lead_name: e.target.value }))}
                    className={inp}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input
                    type="tel" placeholder="+91 98765 43210"
                    value={form.lead_phone}
                    onChange={(e) => setForm((f) => ({ ...f, lead_phone: e.target.value }))}
                    className={inp}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {/* Task type */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Task Type</label>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as TaskType }))} className={sel}>
                  <option value="Call">Call</option>
                  <option value="Site Visit">Site Visit</option>
                  <option value="Send Docs">Send Docs</option>
                  <option value="Follow Up">Follow Up</option>
                  <option value="Negotiation">Negotiation</option>
                </select>
              </div>
              {/* Priority */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))} className={sel}>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            {/* Due date */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Due Date *</label>
              <input
                required type="datetime-local"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                className={inp}
              />
            </div>

            {formError && (
              <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>
            )}

            <button
              type="submit" disabled={saving}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {saving ? "Saving..." : "Save Task"}
            </button>
          </form>
        </div>
      )}

      {/* ── Filter tabs ────────────────────────────────────────────────────── */}
      <div className="flex gap-2 mb-4">
        {(["all", "pending", "done"] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
              filter === f
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm">
          {tasks.length === 0
            ? 'No tasks yet. Click "Add Task" to create your first one.'
            : "No tasks in this filter."}
        </div>
      )}

      {/* ── Task list ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        {filtered.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onToggle={() => handleToggle(task)}
            onDelete={() => handleDelete(task.id)}
          />
        ))}
      </div>

    </div>
  );
}

// ── Task card component ───────────────────────────────────────────────────────
function TaskCard({
  task, onToggle, onDelete,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const due = new Date(task.due_date);
  const now = new Date();
  const isOverdue = !task.completed && due < now;

  const dateStr = due.toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
  const timeStr = due.toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });

  return (
    <div className={`bg-white rounded-2xl border p-4 flex items-start gap-3 transition-all ${
      task.completed ? "border-gray-100 opacity-60" : isOverdue ? "border-red-200" : "border-gray-100"
    }`}>

      {/* Checkbox — clicking this marks it done */}
      <button
        onClick={onToggle}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
          task.completed
            ? "bg-green-500 border-green-500"
            : "border-gray-300 hover:border-blue-400"
        }`}
      >
        {task.completed && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Task details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-semibold ${task.completed ? "line-through text-gray-400" : "text-gray-900"}`}>
            {task.lead_name || "—"}
          </span>
          {/* Task type badge */}
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-medium rounded-full">
            {task.type}
          </span>
          {/* Overdue warning */}
          {isOverdue && (
            <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-medium rounded-full">
              Overdue
            </span>
          )}
        </div>

        {task.lead_phone && (
          <p className="text-xs text-gray-400 mt-0.5">{task.lead_phone}</p>
        )}

        <div className="flex items-center gap-2 mt-1.5">
          {/* Priority dot */}
          <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority]}`} />
          <span className="text-xs text-gray-400">{PRIORITY_LABEL[task.priority]} priority</span>
          <span className="text-gray-200">·</span>
          <span className={`text-xs ${isOverdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
            {dateStr} {timeStr}
          </span>
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={onDelete}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
        title="Delete task"
      >
        <TrashIcon />
      </button>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

// Shared input/select styles
const inp = "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
const sel = "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
