"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addLead } from "@/lib/db/leads";
import { supabase } from "@/lib/supabase";
import { LeadSource, LeadStage } from "@/lib/types";

// ── CSV field → lead field mapping ────────────────────────────────────────────

const LEAD_FIELDS = [
  { key: "name",              label: "Full Name",        required: true  },
  { key: "phone",             label: "Phone",            required: true  },
  { key: "email",             label: "Email",            required: false },
  { key: "source",            label: "Source",           required: false },
  { key: "stage",             label: "Stage",            required: false },
  { key: "budget_min",        label: "Budget Min (₹)",   required: false },
  { key: "budget_max",        label: "Budget Max (₹)",   required: false },
  { key: "location",          label: "Location",         required: false },
  { key: "property_interest", label: "Property Type",    required: false },
  { key: "notes",             label: "Notes",            required: false },
  { key: "skip",              label: "— Skip column —",  required: false },
] as const;

type LeadField = typeof LEAD_FIELDS[number]["key"];

const VALID_SOURCES: LeadSource[] = ["website","referral","social","walk-in","ad","other"];
const VALID_STAGES: LeadStage[]   = ["new","contacted","viewing","negotiating","closed","lost"];

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (inQ) {
      if (ch === '"' && next === '"') { cell += '"'; i++; }
      else if (ch === '"') { inQ = false; }
      else { cell += ch; }
    } else {
      if (ch === '"') { inQ = true; }
      else if (ch === ',') { row.push(cell.trim()); cell = ""; }
      else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        row.push(cell.trim()); rows.push(row); row = []; cell = "";
        if (ch === '\r') i++;
      } else { cell += ch; }
    }
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows.filter((r) => r.some((c) => c));
}

function autoMap(headers: string[]): Record<number, LeadField> {
  const map: Record<number, LeadField> = {};
  const aliases: Record<string, LeadField> = {
    name: "name", "full name": "name", "contact name": "name",
    phone: "phone", mobile: "phone", "phone number": "phone", contact: "phone",
    email: "email", "e-mail": "email",
    source: "source", "lead source": "source",
    stage: "stage", status: "stage",
    "budget min": "budget_min", "min budget": "budget_min", "budget from": "budget_min",
    "budget max": "budget_max", "max budget": "budget_max", budget: "budget_max",
    location: "location", area: "location", city: "location",
    "property type": "property_interest", "property interest": "property_interest", type: "property_interest",
    notes: "notes", note: "notes", remarks: "notes", comment: "notes",
  };
  headers.forEach((h, i) => {
    const key = h.toLowerCase().trim();
    if (aliases[key]) map[i] = aliases[key];
  });
  return map;
}

type ImportStatus = "idle" | "importing" | "done" | "error";

export default function ImportPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step,       setStep]       = useState<"upload" | "map" | "preview" | "done">("upload");
  const [headers,    setHeaders]    = useState<string[]>([]);
  const [rows,       setRows]       = useState<string[][]>([]);
  const [mapping,    setMapping]    = useState<Record<number, LeadField>>({});
  const [status,     setStatus]     = useState<ImportStatus>("idle");
  const [progress,   setProgress]   = useState(0);
  const [imported,   setImported]   = useState(0);
  const [skipped,    setSkipped]    = useState(0);
  const [dragOver,   setDragOver]   = useState(false);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length < 2) return;
      const hdrs = parsed[0];
      const dataRows = parsed.slice(1).filter((r) => r.some((c) => c));
      setHeaders(hdrs);
      setRows(dataRows);
      setMapping(autoMap(hdrs));
      setStep("map");
    };
    reader.readAsText(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) handleFile(file);
  }

  function setMap(colIdx: number, field: LeadField) {
    setMapping((prev) => {
      const next = { ...prev };
      // Remove any existing assignment of this field (except "skip")
      if (field !== "skip") {
        Object.keys(next).forEach((k) => { if (next[+k] === field) next[+k] = "skip"; });
      }
      next[colIdx] = field;
      return next;
    });
  }

  const getCell = useCallback((row: string[], colIdx: number) => row[colIdx] ?? "", []);

  async function startImport() {
    setStatus("importing"); setProgress(0); setImported(0); setSkipped(0);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setStatus("error"); return; }

    let imp = 0, skip = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const get = (field: LeadField) => {
        const col = Object.entries(mapping).find(([, f]) => f === field)?.[0];
        return col !== undefined ? getCell(row, +col).trim() : "";
      };
      const name  = get("name");
      const phone = get("phone");
      if (!name || !phone) { skip++; setProgress(Math.round(((i + 1) / rows.length) * 100)); continue; }

      const rawSource = get("source").toLowerCase();
      const source: LeadSource = VALID_SOURCES.includes(rawSource as LeadSource) ? rawSource as LeadSource : "other";
      const rawStage = get("stage").toLowerCase();
      const stage: LeadStage = VALID_STAGES.includes(rawStage as LeadStage) ? rawStage as LeadStage : "new";
      const budMin = parseInt(get("budget_min").replace(/[^0-9]/g,"")) || 0;
      const budMax = parseInt(get("budget_max").replace(/[^0-9]/g,"")) || 0;

      try {
        await addLead({
          user_id: user.id, name, phone,
          email: get("email") || undefined as unknown as string,
          source, stage, budget_min: budMin, budget_max: budMax,
          location: get("location"),
          property_interest: get("property_interest") as never,
          notes: get("notes"),
        });
        imp++;
      } catch { skip++; }

      setProgress(Math.round(((i + 1) / rows.length) * 100));
      setImported(imp); setSkipped(skip);
    }

    setStatus("done"); setStep("done");
    setImported(imp); setSkipped(skip);
  }

  // ── Step: Upload ──────────────────────────────────────────────────────────────

  if (step === "upload") return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/leads" className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Import Leads from CSV</h1>
          <p className="text-sm text-gray-400">Upload a CSV file exported from any portal or spreadsheet</p>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all"
        style={{ borderColor: dragOver ? "#1BC47D" : "#E5E7EB", background: dragOver ? "#F0FDF9" : "#FAFAFA" }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "#F0FDF9" }}>
          <svg className="w-7 h-7" style={{ color: "#1BC47D" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-700 mb-1">Drop your CSV file here</p>
        <p className="text-xs text-gray-400">or click to browse</p>
        <input ref={fileRef} type="file" accept=".csv" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>

      {/* Tips */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Supported column names</p>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            ["Name / Full Name / Contact Name", "Required"],
            ["Phone / Mobile", "Required"],
            ["Email", "Optional"],
            ["Source", "website, referral, social…"],
            ["Stage", "new, contacted, viewing…"],
            ["Budget Min / Budget Max", "Numbers in ₹"],
            ["Location / Area / City", "Optional"],
            ["Notes / Remarks", "Optional"],
          ].map(([col, hint]) => (
            <div key={col} className="text-xs">
              <span className="font-medium text-gray-700">{col}</span>
              <span className="text-gray-400"> — {hint}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Step: Map columns ─────────────────────────────────────────────────────────

  if (step === "map") return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-24">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => setStep("upload")} className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Map Columns</h1>
          <p className="text-sm text-gray-400">{rows.length} rows detected · match each CSV column to a lead field</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="grid grid-cols-2 gap-0 divide-y divide-gray-100">
          {headers.map((h, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-700 truncate">{h}</p>
                <p className="text-[10px] text-gray-400 truncate">
                  e.g. {rows.slice(0, 2).map((r) => r[i] ?? "").filter(Boolean).join(", ")}
                </p>
              </div>
              <svg className="w-3.5 h-3.5 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <select
                value={mapping[i] ?? "skip"}
                onChange={(e) => setMap(i, e.target.value as LeadField)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1BC47D] bg-white"
                style={{ minWidth: 140 }}>
                {LEAD_FIELDS.map((f) => (
                  <option key={f.key} value={f.key}>{f.label}{f.required ? " *" : ""}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Validation */}
      {(() => {
        const hasName  = Object.values(mapping).includes("name");
        const hasPhone = Object.values(mapping).includes("phone");
        return (
          <div className="flex items-center gap-3 mb-6">
            <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${hasName ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={hasName ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
              </svg>
              Name mapped
            </div>
            <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${hasPhone ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={hasPhone ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
              </svg>
              Phone mapped
            </div>
            <span className="text-xs text-gray-400 ml-auto">{rows.length} leads to import</span>
          </div>
        );
      })()}

      <button
        onClick={startImport}
        disabled={!Object.values(mapping).includes("name") || !Object.values(mapping).includes("phone")}
        className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-40"
        style={{ background: "#1BC47D" }}>
        Import {rows.length} Leads
      </button>
    </div>
  );

  // ── Step: Done ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center pb-24">
      {status === "importing" ? (
        <>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#F0FDF9" }}>
            <svg className="w-8 h-8 animate-spin" style={{ color: "#1BC47D" }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <p className="text-lg font-bold text-gray-900 mb-2">Importing…</p>
          <p className="text-sm text-gray-400 mb-4">{imported} imported · {skipped} skipped</p>
          <div className="w-full bg-gray-100 rounded-full h-2 mx-auto max-w-xs">
            <div className="h-2 rounded-full transition-all" style={{ width: `${progress}%`, background: "#1BC47D" }} />
          </div>
        </>
      ) : (
        <>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#F0FDF9" }}>
            <svg className="w-8 h-8" style={{ color: "#1BC47D" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-xl font-bold text-gray-900 mb-1">Import Complete</p>
          <p className="text-sm text-gray-500 mb-6">
            <span className="font-semibold text-green-600">{imported} leads imported</span>
            {skipped > 0 && <> · <span className="text-gray-400">{skipped} skipped (missing name/phone)</span></>}
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/leads"
              className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: "#1BC47D" }}>
              View Leads
            </Link>
            <button onClick={() => { setStep("upload"); setStatus("idle"); setRows([]); setHeaders([]); }}
              className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              Import More
            </button>
          </div>
        </>
      )}
    </div>
  );
}
