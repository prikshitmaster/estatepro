// lib/db/newspaper-leads.ts — all database functions for Newspaper Leads
//
// 🧠 WHAT THIS FILE DOES:
//    Two sets of functions:
//
//    BROKER functions (any logged-in user can call these):
//      getAllNewspaperLeads()   → fetch all active leads (same for everyone)
//      getNewspaperLeadById()  → single lead by id
//      getUserActions()        → THIS user's bookmarks/contacts/converts
//      upsertUserAction()      → save/mark-contacted/convert for THIS user only
//
//    ADMIN functions (Supabase RLS blocks anyone who isn't the admin email):
//      addNewspaperLeads()     → bulk insert a batch of leads
//      logUpload()             → record the upload in upload history
//      getUploadHistory()      → list of past uploads
//      getAllNewspaperLeadsAdmin() → all leads including hidden ones
//      deleteNewspaperLead()   → hard delete a lead
//      toggleLeadActive()      → hide/show a lead without deleting

import { supabase } from "@/lib/supabase";
import { NewspaperLead, NewspaperLeadAction, NewspaperUpload } from "@/lib/types";
import { addLead } from "@/lib/db/leads";

// ── BROKER: read all active leads ─────────────────────────────────────────────
export async function getAllNewspaperLeads(): Promise<NewspaperLead[]> {
  const { data, error } = await supabase
    .from("newspaper_leads")
    .select("*")
    .eq("is_active", true)
    .order("uploaded_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ── BROKER: single lead ───────────────────────────────────────────────────────
export async function getNewspaperLeadById(id: string): Promise<NewspaperLead | null> {
  const { data, error } = await supabase
    .from("newspaper_leads")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

// ── BROKER: get THIS user's private actions on all leads ─────────────────────
// Returns a map: { [newspaper_lead_id]: action } for quick lookup
export async function getUserActions(userId: string): Promise<Record<string, NewspaperLeadAction>> {
  const { data, error } = await supabase
    .from("newspaper_lead_actions")
    .select("*")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  // Convert array to a map keyed by newspaper_lead_id for O(1) lookup
  const map: Record<string, NewspaperLeadAction> = {};
  (data ?? []).forEach((a) => { map[a.newspaper_lead_id] = a; });
  return map;
}

// ── BROKER: save or update an action (bookmark / contacted / converted) ───────
// Uses UPSERT — creates the row if it doesn't exist, updates if it does
export async function upsertUserAction(
  userId: string,
  leadId: string,
  updates: Partial<Pick<NewspaperLeadAction, "is_saved" | "is_contacted" | "is_converted" | "notes">>
): Promise<void> {
  const { error } = await supabase
    .from("newspaper_lead_actions")
    .upsert(
      { user_id: userId, newspaper_lead_id: leadId, ...updates, updated_at: new Date().toISOString() },
      { onConflict: "user_id,newspaper_lead_id" }
    );
  if (error) throw new Error(error.message);
}

// ── BROKER: convert newspaper lead into the broker's own CRM leads ────────────
// Creates a real lead in the 'leads' table (with that broker's user_id)
// Also marks the action as converted
export async function convertToCRMLead(lead: NewspaperLead, userId: string): Promise<string> {
  const crmLead = await addLead({
    user_id: userId,
    name: `${lead.area} — ${lead.bhk} ${lead.property_type}`,
    phone: lead.phone,
    email: "",
    source: "other",
    budget_min: Math.max(0, lead.price - 500000),
    budget_max: lead.price + 500000,
    location: `${lead.area}, ${lead.city}`,
    property_interest: undefined,
    stage: "new",
    notes: `📰 Newspaper Lead\n${lead.description}\n\nSource: ${lead.newspaper_name || lead.source_file_name}`,
  });
  // Mark as converted in the user's action record
  await upsertUserAction(userId, lead.id, { is_converted: true });
  return crmLead.id;
}

// ── ADMIN: bulk insert leads ──────────────────────────────────────────────────
// Supabase RLS will block this if the caller isn't the admin email
export async function addNewspaperLeads(
  leads: Omit<NewspaperLead, "id" | "is_active" | "created_at" | "updated_at">[]
): Promise<number> {
  const { data, error } = await supabase
    .from("newspaper_leads")
    .insert(leads.map((l) => ({ ...l, is_active: true })))
    .select("id");
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

// ── ADMIN: log an upload batch ────────────────────────────────────────────────
export async function logUpload(
  upload: Omit<NewspaperUpload, "id" | "uploaded_at">
): Promise<void> {
  const { error } = await supabase.from("newspaper_uploads").insert(upload);
  if (error) throw new Error(error.message);
}

// ── ADMIN: upload history ─────────────────────────────────────────────────────
export async function getUploadHistory(): Promise<NewspaperUpload[]> {
  const { data, error } = await supabase
    .from("newspaper_uploads")
    .select("*")
    .order("uploaded_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ── ADMIN: all leads including hidden ones ────────────────────────────────────
export async function getAllNewspaperLeadsAdmin(): Promise<NewspaperLead[]> {
  const { data, error } = await supabase
    .from("newspaper_leads")
    .select("*")
    .order("uploaded_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ── ADMIN: hard delete ────────────────────────────────────────────────────────
export async function deleteNewspaperLead(id: string): Promise<void> {
  const { error } = await supabase.from("newspaper_leads").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── ADMIN: show/hide a lead ───────────────────────────────────────────────────
export async function toggleLeadActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from("newspaper_leads")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
