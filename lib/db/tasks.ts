// lib/db/tasks.ts
//
// 🧠 WHAT THIS FILE DOES (simple explanation):
//    This is the "tasks filing cabinet" — all Supabase functions for tasks.
//
//    A task is something the broker needs to DO:
//      - "Call Rahul Sharma on Friday"
//      - "Schedule site visit for Priya"
//      - "Send documents to Amit"
//
//    Functions in this file:
//      getAllTasks()      → get all tasks for the logged-in broker
//      addTask()         → add a new task
//      completeTask()    → mark a task as done (or undo it)
//      deleteTask()      → remove a task permanently

import { supabase } from "@/lib/supabase";
import { Task } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL TASKS
// Returns all tasks for the logged-in user, sorted by due date (soonest first)
// ─────────────────────────────────────────────────────────────────────────────
export async function getAllTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("due_date", { ascending: true }); // soonest deadline first

  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD A NEW TASK
// Takes task details (without id/created_at — Supabase makes those)
// Returns the saved task with its new id
// ─────────────────────────────────────────────────────────────────────────────
export async function addTask(
  task: Omit<Task, "id" | "created_at">
): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .insert(task)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// TOGGLE COMPLETE
// Flips the completed field: false → true (done) or true → false (undo)
// This is called when the broker ticks or unticks the checkbox
// ─────────────────────────────────────────────────────────────────────────────
export async function toggleTaskComplete(id: string, completed: boolean): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .update({ completed })  // set completed to whatever value was passed
    .eq("id", id);           // only update this specific task

  if (error) throw new Error(error.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE A TASK
// Permanently removes the task from Supabase
// ─────────────────────────────────────────────────────────────────────────────
export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}
