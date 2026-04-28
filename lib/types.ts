// lib/types.ts — shared TypeScript types for EstatePro CRM

export type LeadStage = "new" | "contacted" | "viewing" | "negotiating" | "closed" | "lost";

export type LeadSource = "website" | "referral" | "social" | "walk-in" | "ad" | "other";

export type PropertyInterest = "1BHK" | "2BHK" | "3BHK" | "4BHK" | "Villa" | "Plot" | "Commercial";

export interface Lead {
  id: string;
  user_id: string; // which broker this lead belongs to (Supabase user id)
  name: string;
  phone: string;
  email: string;
  source: LeadSource;
  budget_min: number;
  budget_max: number;
  location: string;
  stage: LeadStage;
  notes: string;
  created_at: string;
  property_interest?: PropertyInterest;
}

export type PropertyType = "apartment" | "villa" | "plot" | "commercial" | "office";

export type PropertyStatus = "available" | "sold" | "rented" | "off-market";

export interface Property {
  id: string;
  user_id: string; // which broker this property belongs to
  title: string;
  type: PropertyType;
  location: string;
  price: number;
  status: PropertyStatus;
  image_url?: string;  // optional photo uploaded to Supabase Storage
  created_at?: string;
}

// ── Client types ─────────────────────────────────────────────────────────────
// ClientType: is this person a buyer, a seller, or both?
export type ClientType = "buyer" | "seller" | "both";

export interface Client {
  id: string;
  user_id: string;       // which broker this client belongs to
  name: string;
  phone: string;
  email: string;
  type: ClientType;      // buyer / seller / both
  notes: string;         // any notes about this client
  total_deals: number;   // how many deals done with them so far
  created_at?: string;
}

export type TaskType = "Call" | "Site Visit" | "Send Docs" | "Follow Up" | "Negotiation";

export type TaskPriority = "high" | "medium" | "low";

export interface Task {
  id: string;
  user_id: string;       // which broker this task belongs to
  lead_id?: string;      // which lead it's about (optional)
  lead_name: string;
  lead_phone: string;
  type: TaskType;
  priority: TaskPriority;
  due_date: string;
  completed: boolean;
  created_at?: string;
}
