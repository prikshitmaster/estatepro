// lib/types.ts — shared TypeScript types for EstatePro CRM

export type LeadStage = "new" | "contacted" | "viewing" | "negotiating" | "closed" | "lost";

export type LeadSource = "website" | "referral" | "social" | "walk-in" | "ad" | "other";

export type PropertyInterest = "1BHK" | "2BHK" | "3BHK" | "4BHK" | "Villa" | "Plot" | "Commercial";

export interface Lead {
  id: string;
  user_id: string;
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
  next_follow_up_at?: string | null; // set when broker snoozes a follow-up
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

// ── Newspaper Lead types ──────────────────────────────────────────────────────

export type NewspaperLeadIntent     = "sale" | "rent";
export type NewspaperLeadOwnerType  = "owner" | "broker" | "unknown";
export type NewspaperSourceType     = "json" | "csv" | "pdf";

export interface NewspaperLead {
  id: string;
  source_file_name: string;
  source_type: NewspaperSourceType;
  newspaper_name: string;
  city: string;
  area: string;
  property_type: string;
  bhk: string;
  intent: NewspaperLeadIntent;
  price: number;
  phone: string;
  owner_type: NewspaperLeadOwnerType;
  description: string;
  is_active: boolean;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
}

export interface NewspaperLeadAction {
  id: string;
  user_id: string;
  newspaper_lead_id: string;
  is_saved: boolean;
  is_contacted: boolean;
  is_converted: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface NewspaperUpload {
  id: string;
  file_name: string;
  source_type: NewspaperSourceType;
  lead_count: number;
  uploaded_by: string;
  notes: string;
  uploaded_at: string;
}

// ── Follow-Up Log types ───────────────────────────────────────────────────────

export type FollowUpType    = "call" | "whatsapp" | "visit" | "note";
export type FollowUpOutcome = "called" | "no_answer" | "busy" | "callback" | "visited" | "note";

export interface FollowUpLog {
  id: string;
  lead_id: string;
  user_id: string;
  type: FollowUpType;
  outcome: FollowUpOutcome;
  note: string;
  next_follow_up_at: string | null;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────

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

// ─── Secure Share types ───────────────────────────────────────────────────────

export type ShareMediaType = "image" | "pdf" | "word" | "excel" | "video";

export interface SecureShareLink {
  id: string;
  user_id: string;
  token: string;
  title: string;
  property_id?: string | null;
  property_title?: string | null;
  expires_at?: string | null;
  max_views?: number | null;
  view_count: number;
  is_active: boolean;
  watermark_enabled: boolean;
  watermark_text?: string | null;
  password_hash?: string | null;
  created_at: string;
}

export interface ShareMedia {
  id: string;
  link_id: string;
  user_id: string;
  storage_path: string;
  external_url?: string | null;
  file_name: string;
  media_type: ShareMediaType;
  file_size?: number | null;
  sort_order: number;
  created_at: string;
}

export interface ShareViewLog {
  id: string;
  link_id: string;
  viewed_at: string;
  ip_address?: string | null;
  user_agent?: string | null;
  city?: string | null;
  country?: string | null;
}
