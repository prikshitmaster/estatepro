// app/(dashboard)/analytics/page.tsx — Analytics dashboard
//
// 🧠 WHAT THIS PAGE DOES (explain like I'm 5):
//    This page shows you a "health report" of your business.
//    Instead of reading a list of leads one by one, you see it as charts and numbers.
//
//    It answers questions like:
//      → "What % of my leads actually become closed deals?"
//      → "Which stage has the most leads stuck in it?"
//      → "Where do most of my leads come from? (referral? website?)"
//      → "How much money is in my pipeline right now?"
//      → "What's my busiest month for closings?"
//
//    HOW THE CHARTS WORK:
//      We do NOT use any external chart library (no Chart.js, no Recharts).
//      A bar is just a <div> with a background color and a width like "width: 60%"
//      The width % is calculated from real data. Simple but looks great.
//
// "use client" is needed because we use useState and useEffect to load data
"use client";

import { useEffect, useState } from "react";
import { getAllLeads } from "@/lib/db/leads";
import { getAllProperties } from "@/lib/db/properties";
import { getAllClients } from "@/lib/db/clients";
import { formatPrice } from "@/lib/mock-data";
import { Lead, LeadStage, LeadSource } from "@/lib/types";

// ── Stage display config ──────────────────────────────────────────────────────
// Maps each stage to a label and bar color
const STAGE_CONFIG: Record<LeadStage, { label: string; color: string }> = {
  new:         { label: "New",         color: "bg-blue-400"   },
  contacted:   { label: "Contacted",   color: "bg-amber-400"  },
  viewing:     { label: "Viewing",     color: "bg-violet-400" },
  negotiating: { label: "Negotiating", color: "bg-orange-400" },
  closed:      { label: "Closed",      color: "bg-green-500"  },
  lost:        { label: "Lost",        color: "bg-red-400"    },
};

// ── Source display config ─────────────────────────────────────────────────────
const SOURCE_CONFIG: Record<LeadSource, { label: string; color: string }> = {
  referral: { label: "Referral",  color: "bg-blue-500"   },
  website:  { label: "Website",   color: "bg-violet-500" },
  social:   { label: "Social",    color: "bg-pink-400"   },
  "walk-in":{ label: "Walk-in",   color: "bg-amber-400"  },
  ad:       { label: "Ad",        color: "bg-cyan-500"   },
  other:    { label: "Other",     color: "bg-gray-400"   },
};

// ── All stages and sources in display order ───────────────────────────────────
const ALL_STAGES:  LeadStage[]  = ["new","contacted","viewing","negotiating","closed","lost"];
const ALL_SOURCES: LeadSource[] = ["referral","website","social","walk-in","ad","other"];

export default function AnalyticsPage() {
  // Raw data from Supabase
  const [leads, setLeads]         = useState<Lead[]>([]);
  const [clientCount, setClientCount] = useState(0);
  const [propertyCount, setPropertyCount] = useState(0);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  // ── Load all data on page open ────────────────────────────────────────────
  useEffect(() => {
    async function fetchAll() {
      try {
        // Fetch leads, clients, properties all at the same time (parallel)
        // Promise.all means: "start all 3 requests, wait for ALL of them to finish"
        const [leadsData, clientsData, propertiesData] = await Promise.all([
          getAllLeads(),
          getAllClients(),
          getAllProperties(),
        ]);
        setLeads(leadsData);
        setClientCount(clientsData.length);
        setPropertyCount(propertiesData.length);
      } catch (err) {
        setError("Could not load analytics data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  // ── Calculate all stats from raw leads data ───────────────────────────────
  // These are computed values — they recalculate automatically when leads changes

  const totalLeads    = leads.length;
  const closedLeads   = leads.filter((l) => l.stage === "closed").length;
  const lostLeads     = leads.filter((l) => l.stage === "lost").length;
  const activeLeads   = totalLeads - closedLeads - lostLeads;

  // Conversion rate = how many leads became "closed" as a percentage
  // e.g. 5 closed out of 20 total = 25%
  const conversionRate = totalLeads > 0
    ? Math.round((closedLeads / totalLeads) * 100)
    : 0;

  // Pipeline value = sum of max budgets for all active (not closed/lost) leads
  const pipelineValue = leads
    .filter((l) => !["closed","lost"].includes(l.stage))
    .reduce((sum, l) => sum + (l.budget_max ?? 0), 0);

  // Count leads per stage: { new: 3, contacted: 5, ... }
  const byStage = ALL_STAGES.reduce((acc, stage) => {
    acc[stage] = leads.filter((l) => l.stage === stage).length;
    return acc;
  }, {} as Record<LeadStage, number>);

  // Count leads per source: { referral: 4, website: 2, ... }
  const bySource = ALL_SOURCES.reduce((acc, source) => {
    acc[source] = leads.filter((l) => l.source === source).length;
    return acc;
  }, {} as Record<LeadSource, number>);

  // Max count in any stage — used to calculate bar widths as %
  // e.g. if the biggest bar has 8 leads, that bar is 100% wide
  //      a bar with 4 leads is 50% wide (4/8 = 0.5 → 50%)
  const maxStage  = Math.max(...Object.values(byStage),  1);
  const maxSource = Math.max(...Object.values(bySource), 1);

  // Top leads by budget — sorted highest first, show top 5
  const topLeads = [...leads]
    .sort((a, b) => (b.budget_max ?? 0) - (a.budget_max ?? 0))
    .slice(0, 5);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-40" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <div className="h-3 bg-gray-100 rounded w-1/2" />
              <div className="h-8 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              {[...Array(4)].map((_, j) => (
                <div key={j} className="space-y-1">
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                  <div className="h-4 bg-gray-200 rounded" style={{ width: `${60 - j * 10}%` }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  // ── Empty state (no leads yet) ────────────────────────────────────────────
  if (totalLeads === 0) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-center py-20 text-gray-400 text-sm">
        No data yet. Add some leads to see analytics.
      </div>
    );
  }

  // ── Main analytics page ───────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-24 sm:pb-6 space-y-5">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-400 mt-0.5">Business performance overview</p>
      </div>

      {/* ── Summary stat cards ── */}
      {/* 4 cards in a row — the most important numbers at a glance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

        <SummaryCard
          label="Total Leads"
          value={totalLeads}
          sub={`${activeLeads} active`}
          color="text-blue-600"
          bg="bg-blue-50"
          icon={<LeadsIcon />}
        />

        <SummaryCard
          label="Closed Deals"
          value={closedLeads}
          sub={`${lostLeads} lost`}
          color="text-green-600"
          bg="bg-green-50"
          icon={<ClosedIcon />}
        />

        {/* Conversion rate — e.g. "25%" */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">Conversion Rate</p>
            <span className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <ConversionIcon />
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{conversionRate}%</p>
          {/* Mini bar showing the conversion visually */}
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-violet-500 h-1.5 rounded-full transition-all"
              style={{ width: `${conversionRate}%` }}
            />
          </div>
        </div>

        <SummaryCard
          label="Total Clients"
          value={clientCount}
          sub={`${propertyCount} properties`}
          color="text-amber-600"
          bg="bg-amber-50"
          icon={<ClientsIcon />}
        />

      </div>

      {/* ── Pipeline value highlight ── */}
      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-8 left-16 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
        <div className="relative">
          <p className="text-blue-100 text-sm font-medium">Active Pipeline Value</p>
          <p className="text-3xl sm:text-4xl font-bold text-white mt-1">{formatPrice(pipelineValue)}</p>
          <p className="text-blue-200 text-xs mt-1">Total budget across {activeLeads} active leads</p>
        </div>
        <div className="relative flex flex-col gap-1.5 sm:text-right">
          <p className="text-blue-100 text-xs font-medium">Est. commission (2%)</p>
          <p className="text-2xl font-bold text-white">{formatPrice(Math.round(pipelineValue * 0.02))}</p>
        </div>
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Leads by Stage — horizontal bar chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-4">Leads by Stage</h2>
          <div className="flex flex-col gap-3">
            {ALL_STAGES.map((stage) => {
              const count = byStage[stage];
              // barWidth = what % of the max this stage is
              // e.g. if max is 8 and this stage has 4, barWidth = 50
              const barWidth = Math.round((count / maxStage) * 100);
              const { label, color } = STAGE_CONFIG[stage];
              return (
                <div key={stage} className="flex items-center gap-3">
                  {/* Stage label — fixed width so all bars start at the same x */}
                  <span className="text-xs text-gray-500 w-24 shrink-0 capitalize">{label}</span>
                  {/* Bar container — full width track */}
                  <div className="flex-1 h-6 bg-gray-50 rounded-lg overflow-hidden relative">
                    {/* Colored bar — width comes from the count */}
                    {count > 0 && (
                      <div
                        className={`h-full ${color} rounded-lg transition-all flex items-center`}
                        style={{ width: `${barWidth}%`, minWidth: count > 0 ? "2rem" : "0" }}
                      >
                        {/* Show count inside the bar (only if bar is wide enough) */}
                        {barWidth > 15 && (
                          <span className="text-white text-[10px] font-bold pl-2">{count}</span>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Count outside bar (if bar is too narrow to fit text) */}
                  <span className="text-xs font-semibold text-gray-700 w-5 text-right shrink-0">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leads by Source — horizontal bar chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-4">Leads by Source</h2>
          <div className="flex flex-col gap-3">
            {ALL_SOURCES.map((source) => {
              const count = bySource[source];
              const barWidth = Math.round((count / maxSource) * 100);
              const { label, color } = SOURCE_CONFIG[source];
              return (
                <div key={source} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-16 shrink-0">{label}</span>
                  <div className="flex-1 h-6 bg-gray-50 rounded-lg overflow-hidden relative">
                    {count > 0 && (
                      <div
                        className={`h-full ${color} rounded-lg transition-all flex items-center`}
                        style={{ width: `${barWidth}%`, minWidth: count > 0 ? "2rem" : "0" }}
                      >
                        {barWidth > 15 && (
                          <span className="text-white text-[10px] font-bold pl-2">{count}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-5 text-right shrink-0">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── Stage breakdown — counts + % of total ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-900 text-sm mb-4">Stage Breakdown</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {ALL_STAGES.map((stage) => {
            const count = byStage[stage];
            // Percentage of all leads that are in this stage
            const pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
            const { label, color } = STAGE_CONFIG[stage];
            return (
              <div key={stage} className="flex flex-col items-center gap-2">
                {/* Circle with count */}
                <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center`}>
                  <span className="text-white text-sm font-bold">{count}</span>
                </div>
                <p className="text-[11px] text-gray-600 font-medium text-center">{label}</p>
                <p className="text-[10px] text-gray-400">{pct}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Top leads by budget ── */}
      {topLeads.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-4">Top Leads by Budget</h2>
          <div className="flex flex-col divide-y divide-gray-50">
            {topLeads.map((lead, i) => {
              // How wide this lead's bar is relative to the #1 lead
              const maxBudget = topLeads[0]?.budget_max ?? 1;
              const barWidth  = Math.round((lead.budget_max / maxBudget) * 100);
              return (
                <div key={lead.id} className="flex items-center gap-3 py-2.5">
                  {/* Rank number */}
                  <span className="text-xs font-bold text-gray-300 w-4 shrink-0">{i + 1}</span>
                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{lead.name}</p>
                    {/* Thin bar showing relative budget */}
                    <div className="w-full bg-gray-100 rounded h-1 mt-1 overflow-hidden">
                      <div className="bg-blue-400 h-1 rounded" style={{ width: `${barWidth}%` }} />
                    </div>
                  </div>
                  {/* Budget amount */}
                  <span className="text-sm font-bold text-blue-600 shrink-0">
                    {formatPrice(lead.budget_max)}
                  </span>
                  {/* Stage badge */}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize shrink-0 ${
                    lead.stage === "closed" ? "bg-green-50 text-green-700" :
                    lead.stage === "negotiating" ? "bg-orange-50 text-orange-600" :
                    "bg-gray-50 text-gray-500"
                  }`}>
                    {lead.stage}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

// ── Summary card component ────────────────────────────────────────────────────
// Used for the 4 stat cards at the top (Total Leads, Closed, etc.)
function SummaryCard({
  label, value, sub, color, bg, icon,
}: {
  label: string;
  value: number;
  sub: string;
  color: string;
  bg: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <span className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
          {icon}
        </span>
      </div>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function LeadsIcon() {
  return <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}
function ClosedIcon() {
  return <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function ConversionIcon() {
  return <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
}
function ClientsIcon() {
  return <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
}
