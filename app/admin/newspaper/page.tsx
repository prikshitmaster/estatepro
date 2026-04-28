// app/admin/newspaper/page.tsx — Admin: upload and manage newspaper leads
//
// 🧠 WHAT THIS PAGE DOES:
//    This is YOUR private upload panel. Brokers never see this.
//
//    WORKFLOW:
//      1. Drag-drop a JSON or CSV file onto the upload zone
//      2. The page instantly parses the file and shows you a preview table
//      3. You review — delete any bad rows
//      4. Click "Publish" → all leads go into Supabase → brokers see them immediately
//
//    Also shows upload history (last 20 uploads) at the bottom.
"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { NewspaperLead, NewspaperUpload, NewspaperLeadIntent, NewspaperLeadOwnerType } from "@/lib/types";
import {
  addNewspaperLeads,
  logUpload,
  getUploadHistory,
  getAllNewspaperLeadsAdmin,
  deleteNewspaperLead,
  toggleLeadActive,
} from "@/lib/db/newspaper-leads";
import { formatPrice } from "@/lib/mock-data";

type ParsedRow = Omit<NewspaperLead, "id" | "is_active" | "created_at" | "updated_at">;

// ─── File parsers ─────────────────────────────────────────────────────────────

function parseJSON(text: string, fileName: string): ParsedRow[] {
  const raw = JSON.parse(text);
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.map((r: Record<string, string>) => mapRow(r, fileName, "json"));
}

function parseCSV(text: string, fileName: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  // Header row — normalise to lowercase, strip quotes and spaces
  const headers = lines[0].split(",").map((h) => h.replace(/["'\s]/g, "").toLowerCase());
  return lines.slice(1).filter((l) => l.trim()).map((line) => {
    // Handle quoted fields that may contain commas
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === "," && !inQuotes) { values.push(current.trim()); current = ""; continue; }
      current += ch;
    }
    values.push(current.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return mapRow(row, fileName, "csv");
  });
}

function mapRow(r: Record<string, string>, fileName: string, sourceType: "json" | "csv"): ParsedRow {
  const price = parseInt(r.price ?? r.Price ?? "0") || 0;
  const intent = r.intent === "rent" ? "rent" : "sale";
  const ownerRaw = (r.owner_type ?? r.ownertype ?? "").toLowerCase();
  const ownerType: NewspaperLeadOwnerType = ["owner", "broker"].includes(ownerRaw) ? ownerRaw as NewspaperLeadOwnerType : "unknown";
  return {
    source_file_name: fileName,
    source_type:      sourceType,
    newspaper_name:   r.newspaper_name ?? r.newspaper ?? "",
    city:             r.city ?? "",
    area:             r.area ?? "",
    property_type:    r.property_type ?? r.propertytype ?? "flat",
    bhk:              r.bhk ?? "",
    intent:           intent as NewspaperLeadIntent,
    price,
    phone:            r.phone ?? "",
    owner_type:       ownerType,
    description:      r.description ?? "",
    uploaded_at:      new Date().toISOString(),
  };
}

// ─── Helper: intent + owner badges ───────────────────────────────────────────

function IntentPill({ v }: { v: string }) {
  return v === "rent"
    ? <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700">RENT</span>
    : <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">SALE</span>;
}

function OwnerPill({ v }: { v: string }) {
  if (v === "owner")  return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">🔑 Owner</span>;
  if (v === "broker") return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600">Broker</span>;
  return <span className="text-[10px] text-gray-400">—</span>;
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function AdminNewspaperPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [preview,     setPreview]     = useState<ParsedRow[]>([]);
  const [fileName,    setFileName]    = useState("");
  const [dragOver,    setDragOver]    = useState(false);
  const [publishing,  setPublishing]  = useState(false);
  const [publishedMsg,setPublishedMsg]= useState("");
  const [parseError,  setParseError]  = useState("");

  const [history,     setHistory]     = useState<NewspaperUpload[]>([]);
  const [allLeads,    setAllLeads]    = useState<NewspaperLead[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [userId,      setUserId]      = useState("");
  const [tab,         setTab]         = useState<"upload" | "manage">("upload");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
      const [h, l] = await Promise.all([getUploadHistory(), getAllNewspaperLeadsAdmin()]);
      setHistory(h);
      setAllLeads(l);
      setLoadingData(false);
    }
    load();
  }, []);

  // ── File processing ──────────────────────────────────────────────────────────

  function processFile(file: File) {
    setParseError("");
    setPreview([]);
    setPublishedMsg("");
    setFileName(file.name);

    const ext = file.name.split(".").pop()?.toLowerCase();
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        let rows: ParsedRow[] = [];
        if (ext === "json") rows = parseJSON(text, file.name);
        else if (ext === "csv") rows = parseCSV(text, file.name);
        else {
          setParseError("PDF upload detected. PDF auto-parsing is not available yet. Please convert to JSON or CSV first.");
          return;
        }
        if (rows.length === 0) { setParseError("No valid rows found in file."); return; }
        setPreview(rows);
      } catch {
        setParseError("Could not parse file. Make sure it is valid JSON or CSV.");
      }
    };

    reader.readAsText(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function removePreviewRow(index: number) {
    setPreview((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Publish ──────────────────────────────────────────────────────────────────

  async function handlePublish() {
    if (preview.length === 0) return;
    setPublishing(true);
    try {
      const count = await addNewspaperLeads(preview);
      await logUpload({
        file_name: fileName,
        source_type: preview[0].source_type,
        lead_count: count,
        uploaded_by: userId,
        notes: "",
      });
      setPublishedMsg(`✅ Published ${count} leads successfully! Brokers can see them now.`);
      setPreview([]);
      setFileName("");
      // Refresh history + all leads
      const [h, l] = await Promise.all([getUploadHistory(), getAllNewspaperLeadsAdmin()]);
      setHistory(h);
      setAllLeads(l);
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  // ── Manage: delete / toggle ───────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm("Delete this lead permanently? Brokers will no longer see it.")) return;
    await deleteNewspaperLead(id);
    setAllLeads((prev) => prev.filter((l) => l.id !== id));
  }

  async function handleToggle(lead: NewspaperLead) {
    await toggleLeadActive(lead.id, !lead.is_active);
    setAllLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, is_active: !l.is_active } : l));
  }

  // ── Stats for header ─────────────────────────────────────────────────────────

  const totalPublished = allLeads.filter((l) => l.is_active).length;
  const totalHidden    = allLeads.filter((l) => !l.is_active).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Newspaper Leads Upload</h1>
        <p className="text-gray-500 text-sm mt-1">
          Upload JSON or CSV → preview → publish. Brokers see leads instantly after publish.
        </p>
        {!loadingData && (
          <div className="flex gap-4 mt-3">
            <span className="text-sm text-gray-600"><span className="font-bold text-purple-700">{totalPublished}</span> live leads</span>
            <span className="text-sm text-gray-600"><span className="font-bold text-gray-500">{totalHidden}</span> hidden</span>
            <span className="text-sm text-gray-600"><span className="font-bold text-gray-700">{history.length}</span> uploads total</span>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {(["upload", "manage"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {t === "upload" ? "📤 Upload" : "⚙️ Manage Leads"}
          </button>
        ))}
      </div>

      {/* ══════════════════════ UPLOAD TAB ══════════════════════ */}
      {tab === "upload" && (
        <div className="flex flex-col gap-6">

          {/* Drag-drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${
              dragOver ? "border-purple-400 bg-purple-50" : "border-gray-300 bg-white hover:border-purple-300 hover:bg-purple-50/30"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,.pdf"
              onChange={handleFileInput}
              className="hidden"
            />
            <div className="text-5xl mb-4">📂</div>
            <p className="text-base font-semibold text-gray-700">Drop your file here or click to browse</p>
            <p className="text-sm text-gray-400 mt-1">Supports <span className="font-medium">JSON</span>, <span className="font-medium">CSV</span></p>

            {/* JSON format hint */}
            <div className="mt-5 text-left inline-block bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 text-[11px] text-gray-500 font-mono">
              {"[{ \"city\":\"Ahmedabad\", \"area\":\"Satellite\", \"bhk\":\"2\","}<br/>
              {"  \"property_type\":\"Flat\", \"intent\":\"sale\", \"price\":\"6500000\","}<br/>
              {"  \"phone\":\"9876543210\", \"owner_type\":\"owner\", \"description\":\"...\" }]"}
            </div>
          </div>

          {/* Parse error */}
          {parseError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {parseError}
            </div>
          )}

          {/* Success message */}
          {publishedMsg && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 font-semibold">
              {publishedMsg}
            </div>
          )}

          {/* Preview table */}
          {preview.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <h2 className="font-bold text-gray-900">Preview — {preview.length} leads from <span className="text-purple-600">{fileName}</span></h2>
                  <p className="text-xs text-gray-400 mt-0.5">Review below. Delete bad rows. Then click Publish.</p>
                </div>
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white text-sm font-bold rounded-xl hover:bg-purple-700 disabled:opacity-60 transition-colors"
                >
                  {publishing ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Publishing…
                    </>
                  ) : `🚀 Publish ${preview.length} Leads`}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {["#", "Area", "City", "Type", "BHK", "Intent", "Price", "Phone", "Owner", ""].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {preview.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2.5 text-gray-400 text-[11px]">{i + 1}</td>
                        <td className="px-3 py-2.5 font-medium text-gray-800">{row.area || <span className="text-red-400">—</span>}</td>
                        <td className="px-3 py-2.5 text-gray-600">{row.city || <span className="text-red-400">—</span>}</td>
                        <td className="px-3 py-2.5 text-gray-600 capitalize">{row.property_type}</td>
                        <td className="px-3 py-2.5 text-gray-700">{row.bhk}</td>
                        <td className="px-3 py-2.5"><IntentPill v={row.intent} /></td>
                        <td className="px-3 py-2.5 font-semibold text-gray-900 whitespace-nowrap">{formatPrice(row.price)}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-gray-600">{row.phone || <span className="text-red-400">missing</span>}</td>
                        <td className="px-3 py-2.5"><OwnerPill v={row.owner_type} /></td>
                        <td className="px-3 py-2.5">
                          <button
                            onClick={() => removePreviewRow(i)}
                            className="p-1 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Upload history */}
          {history.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">Upload History</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {history.map((u) => (
                  <div key={u.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{u.file_name}</p>
                      <p className="text-[11px] text-gray-400">
                        {new Date(u.uploaded_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-full">{u.lead_count} leads</span>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-medium rounded uppercase">{u.source_type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════ MANAGE TAB ══════════════════════ */}
      {tab === "manage" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900">All Leads ({allLeads.length})</h2>
              <p className="text-xs text-gray-400 mt-0.5">Hide a lead to remove it from brokers' view without deleting.</p>
            </div>
          </div>

          {allLeads.length === 0 && !loadingData && (
            <div className="py-12 text-center text-gray-400 text-sm">No leads uploaded yet.</div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Area", "City", "BHK", "Intent", "Price", "Owner", "Source", "Visible", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allLeads.map((lead) => (
                  <tr key={lead.id} className={lead.is_active ? "hover:bg-gray-50" : "opacity-50 bg-gray-50"}>
                    <td className="px-4 py-3 font-medium text-gray-800">{lead.area}</td>
                    <td className="px-4 py-3 text-gray-600">{lead.city}</td>
                    <td className="px-4 py-3 text-gray-700">{lead.bhk}</td>
                    <td className="px-4 py-3"><IntentPill v={lead.intent} /></td>
                    <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{formatPrice(lead.price)}</td>
                    <td className="px-4 py-3"><OwnerPill v={lead.owner_type} /></td>
                    <td className="px-4 py-3 text-[11px] text-gray-400 max-w-[120px] truncate">{lead.source_file_name}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggle(lead)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                          lead.is_active
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                        }`}
                      >
                        {lead.is_active ? "Live" : "Hidden"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(lead.id)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
