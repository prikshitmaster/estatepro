// lib/mock-data.ts — mock data used until Supabase is connected

import { Lead, Property, Task } from "./types";

// "mock-user" is a placeholder — real data from Supabase will have the actual user id
const MOCK_USER_ID = "mock-user";

export const mockLeads: Lead[] = [
  {
    id: "1",
    user_id: MOCK_USER_ID,
    name: "Rahul Sharma",
    phone: "+91 98765 43210",
    email: "rahul@example.com",
    source: "website",
    budget_min: 5000000,
    budget_max: 8000000,
    location: "Bandra, Mumbai",
    stage: "new",
    property_interest: "3BHK",
    notes: "Looking for 3BHK, prefers sea-facing",
    created_at: "2026-04-20T10:00:00Z",
  },
  {
    id: "2",
    user_id: MOCK_USER_ID,
    name: "Priya Nair",
    phone: "+91 91234 56789",
    email: "priya@example.com",
    source: "referral",
    budget_min: 3000000,
    budget_max: 5000000,
    location: "Andheri, Mumbai",
    stage: "contacted",
    property_interest: "2BHK",
    notes: "Wants ready-to-move-in only",
    created_at: "2026-04-21T11:00:00Z",
  },
  {
    id: "3",
    user_id: MOCK_USER_ID,
    name: "Amit Patel",
    phone: "+91 99887 65432",
    email: "amit@example.com",
    source: "ad",
    budget_min: 8000000,
    budget_max: 15000000,
    location: "Powai, Mumbai",
    stage: "viewing",
    property_interest: "Villa",
    notes: "Investor, looking for rental yield",
    created_at: "2026-04-22T09:30:00Z",
  },
  {
    id: "4",
    user_id: MOCK_USER_ID,
    name: "Sunita Joshi",
    phone: "+91 98100 12345",
    email: "sunita@example.com",
    source: "social",
    budget_min: 2000000,
    budget_max: 4000000,
    location: "Thane",
    stage: "negotiating",
    property_interest: "2BHK",
    notes: "First-time buyer, needs home loan guidance",
    created_at: "2026-04-23T14:00:00Z",
  },
  {
    id: "5",
    user_id: MOCK_USER_ID,
    name: "Vikram Mehta",
    phone: "+91 97321 09876",
    email: "vikram@example.com",
    source: "walk-in",
    budget_min: 12000000,
    budget_max: 20000000,
    location: "Juhu, Mumbai",
    stage: "closed",
    property_interest: "4BHK",
    notes: "Purchased 4BHK duplex",
    created_at: "2026-04-15T16:00:00Z",
  },
  {
    id: "6",
    user_id: MOCK_USER_ID,
    name: "Deepa Menon",
    phone: "+91 96543 21098",
    email: "deepa@example.com",
    source: "referral",
    budget_min: 6000000,
    budget_max: 10000000,
    location: "Worli, Mumbai",
    stage: "new",
    property_interest: "3BHK",
    notes: "Preferred floor 10+",
    created_at: "2026-04-25T08:00:00Z",
  },
  {
    id: "7",
    user_id: MOCK_USER_ID,
    name: "Karan Shah",
    phone: "+91 95678 34512",
    email: "karan@example.com",
    source: "website",
    budget_min: 4500000,
    budget_max: 7000000,
    location: "Goregaon, Mumbai",
    stage: "contacted",
    property_interest: "2BHK",
    notes: "Looking for gated society",
    created_at: "2026-04-26T10:30:00Z",
  },
];

export const mockProperties: Property[] = [
  {
    id: "1",
    user_id: MOCK_USER_ID,
    title: "Sea-View 3BHK — Bandra West",
    type: "apartment",
    location: "Bandra West, Mumbai",
    price: 12500000,
    status: "available",
  },
  {
    id: "2",
    user_id: MOCK_USER_ID,
    title: "Spacious 2BHK — Andheri East",
    type: "apartment",
    location: "Andheri East, Mumbai",
    price: 7800000,
    status: "available",
  },
  {
    id: "3",
    user_id: MOCK_USER_ID,
    title: "Independent Villa — Lonavala",
    type: "villa",
    location: "Lonavala",
    price: 25000000,
    status: "available",
  },
  {
    id: "4",
    user_id: MOCK_USER_ID,
    title: "Commercial Shop — Thane",
    type: "commercial",
    location: "Thane West",
    price: 4500000,
    status: "sold",
  },
];

export const mockTasks: Task[] = [
  {
    id: "1",
    user_id: MOCK_USER_ID,
    lead_id: "1",
    lead_name: "Rahul Sharma",
    lead_phone: "+91 98765 43210",
    type: "Call",
    priority: "high",
    due_date: "2026-04-28T10:00:00Z",
    completed: false,
  },
  {
    id: "2",
    user_id: MOCK_USER_ID,
    lead_id: "2",
    lead_name: "Priya Nair",
    lead_phone: "+91 91234 56789",
    type: "Site Visit",
    priority: "high",
    due_date: "2026-04-28T14:00:00Z",
    completed: false,
  },
  {
    id: "3",
    user_id: MOCK_USER_ID,
    lead_id: "3",
    lead_name: "Amit Patel",
    lead_phone: "+91 99887 65432",
    type: "Send Docs",
    priority: "medium",
    due_date: "2026-04-28T16:00:00Z",
    completed: false,
  },
  {
    id: "4",
    user_id: MOCK_USER_ID,
    lead_id: "4",
    lead_name: "Sunita Joshi",
    lead_phone: "+91 98100 12345",
    type: "Negotiation",
    priority: "high",
    due_date: "2026-04-28T17:00:00Z",
    completed: true,
  },
  {
    id: "5",
    user_id: MOCK_USER_ID,
    lead_id: "6",
    lead_name: "Deepa Menon",
    lead_phone: "+91 96543 21098",
    type: "Follow Up",
    priority: "low",
    due_date: "2026-04-29T09:00:00Z",
    completed: false,
  },
];

// Formats number as INR shorthand: ₹1.2Cr, ₹45L, etc.
export function formatPrice(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

// Returns initials from a full name e.g. "Rahul Sharma" → "RS"
export function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}
