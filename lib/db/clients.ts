// lib/db/clients.ts
//
// 🧠 WHAT THIS FILE DOES (explain like I'm 5):
//    This file is the "waiter" between your app and Supabase for clients.
//    Supabase is like a kitchen — it stores all your data.
//    Your app is like a customer — it wants data.
//    This file takes the order (your request) to the kitchen and brings back the food (data).
//
//    Functions in this file:
//      getAllClients()    → "give me ALL my clients, newest first"
//      getClientById()   → "give me the ONE client with this ID"
//      addClient()       → "add this new client to my list"
//      updateClient()    → "change something about this client"
//      deleteClient()    → "remove this client forever"

import { supabase } from "@/lib/supabase";
import { Client } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL CLIENTS
// Returns: array of all clients for the logged-in user, newest first
// ─────────────────────────────────────────────────────────────────────────────
export async function getAllClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from("clients")                            // look in the "clients" table
    .select("*")                                // get ALL columns
    .order("created_at", { ascending: false }); // newest first

  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// GET ONE CLIENT BY ID
// Returns: a single client, or null if not found
// ─────────────────────────────────────────────────────────────────────────────
export async function getClientById(id: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)   // where id = this specific id
    .single();      // return ONE object instead of an array

  if (error) return null;
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD A NEW CLIENT
// Takes: client fields (no id or created_at — Supabase makes those)
// Returns: the saved client with its new id
// ─────────────────────────────────────────────────────────────────────────────
export async function addClient(
  client: Omit<Client, "id" | "created_at">
): Promise<Client> {
  const { data, error } = await supabase
    .from("clients")
    .insert(client)  // insert = add a new row
    .select()        // return the row that was just inserted
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE A CLIENT
// Takes: the client id + only the fields you want to change
// Returns: the updated client
// ─────────────────────────────────────────────────────────────────────────────
export async function updateClient(
  id: string,
  changes: Partial<Client>  // Partial = you don't have to send ALL fields, just the changed ones
): Promise<Client> {
  const { data, error } = await supabase
    .from("clients")
    .update(changes)  // update = change existing row
    .eq("id", id)     // only the row with this id
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE A CLIENT
// Takes: the client id
// Returns: nothing (void) — the row is gone
// ─────────────────────────────────────────────────────────────────────────────
export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", id);  // only delete the row with this id

  if (error) throw new Error(error.message);
}
