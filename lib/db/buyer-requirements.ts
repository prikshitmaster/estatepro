// lib/db/buyer-requirements.ts — Supabase functions for buyer requirements
//
// 🧠 WHAT THIS FILE DOES (simple explanation):
//    A "buyer requirement" is a saved note of what a client wants to BUY:
//    budget, location, and type (e.g. "₹50L–₹1Cr, 2BHK in Andheri").
//    The broker creates these from a buyer lead. We then match them against
//    the broker's own properties AND the newspaper market pool.
//
//    Functions:
//      getRequirementsForLead(leadId) → all requirements for one buyer
//      getActiveRequirements()        → all of THIS user's active requirements (dashboard)
//      addRequirement()               → create one
//      updateRequirement()            → edit / change status
//      deleteRequirement()            → remove one

import { supabase } from "@/lib/supabase";
import { BuyerRequirement } from "@/lib/types";

// All requirements for a single lead (newest first)
export async function getRequirementsForLead(leadId: string): Promise<BuyerRequirement[]> {
  const { data, error } = await supabase
    .from("buyer_requirements")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// All of this user's ACTIVE requirements — used by the dashboard "Buyers to match"
export async function getActiveRequirements(): Promise<BuyerRequirement[]> {
  const { data, error } = await supabase
    .from("buyer_requirements")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// Create a requirement (id/created_at are made by Supabase)
export async function addRequirement(
  req: Omit<BuyerRequirement, "id" | "created_at">
): Promise<BuyerRequirement> {
  const { data, error } = await supabase
    .from("buyer_requirements")
    .insert(req)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Edit a requirement (e.g. change budget, or set status to "fulfilled")
export async function updateRequirement(
  id: string,
  changes: Partial<BuyerRequirement>
): Promise<BuyerRequirement> {
  const { data, error } = await supabase
    .from("buyer_requirements")
    .update(changes)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Remove a requirement permanently
export async function deleteRequirement(id: string): Promise<void> {
  const { error } = await supabase
    .from("buyer_requirements")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
