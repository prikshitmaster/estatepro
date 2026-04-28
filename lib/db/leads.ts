// lib/db/leads.ts
//
// 🧠 WHAT THIS FILE DOES (simple explanation):
//    This file has all the "talk to Supabase" functions for leads.
//    Think of it like a menu at a restaurant:
//      - getAllLeads()   → "bring me all the leads"
//      - getLeadById()  → "bring me lead number 5"
//      - addLead()      → "add this new lead to the list"
//      - updateLead()   → "change something about lead number 5"
//      - deleteLead()   → "remove lead number 5"
//
//    Every page that needs leads imports from HERE instead of
//    talking to Supabase directly. Clean and organised.

import { supabase } from "@/lib/supabase";
import { Lead } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL LEADS
// Returns: array of all leads for the logged-in user, newest first
// ─────────────────────────────────────────────────────────────────────────────
export async function getAllLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")          // look in the "leads" table
    .select("*")            // get ALL columns (* means everything)
    .order("created_at", { ascending: false }); // newest lead on top

  // If something went wrong (no internet, wrong key, etc.), throw an error
  if (error) throw new Error(error.message);

  // Return the data, or an empty array [] if nothing came back
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// GET ONE LEAD BY ID
// Returns: a single lead matching the given id, or null if not found
// ─────────────────────────────────────────────────────────────────────────────
export async function getLeadById(id: string): Promise<Lead | null> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)   // .eq means "where id equals ..."
    .single();      // .single() returns one object instead of an array

  if (error) return null; // lead not found — return null instead of crashing
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD A NEW LEAD
// Takes: a lead object WITHOUT id/created_at (Supabase makes those automatically)
// Returns: the saved lead (with its new id)
// ─────────────────────────────────────────────────────────────────────────────
export async function addLead(
  lead: Omit<Lead, "id" | "created_at">
): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads")
    .insert(lead)   // insert = add new row
    .select()       // return the row that was just inserted
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE A LEAD (e.g. change stage from "new" to "contacted")
// Takes: the lead id + which fields to change
// Returns: the updated lead
// ─────────────────────────────────────────────────────────────────────────────
export async function updateLead(
  id: string,
  changes: Partial<Lead>  // Partial means you can pass just SOME fields
): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads")
    .update(changes)       // update = change existing row
    .eq("id", id)          // only change the row with this id
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE A LEAD
// Takes: the lead id
// Returns: nothing (void)
// ─────────────────────────────────────────────────────────────────────────────
export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("id", id);  // only delete the row with this id

  if (error) throw new Error(error.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET DASHBOARD STATS
// Returns counts used on the dashboard (new leads, active, closed, etc.)
// ─────────────────────────────────────────────────────────────────────────────
export async function getDashboardStats() {
  // Fetch all leads once, then count locally — simpler than multiple queries
  const leads = await getAllLeads();

  return {
    total:        leads.length,
    newLeads:     leads.filter((l) => l.stage === "new").length,
    activeFollowUps: leads.filter((l) =>
      ["contacted", "viewing"].includes(l.stage)
    ).length,
    activeDeals:  leads.filter((l) => l.stage === "negotiating").length,
    closed:       leads.filter((l) => l.stage === "closed").length,
    // Pipeline value = sum of all max budgets for non-closed/lost leads
    pipelineValue: leads
      .filter((l) => !["closed", "lost"].includes(l.stage))
      .reduce((sum, l) => sum + (l.budget_max ?? 0), 0),
  };
}
