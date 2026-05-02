// lib/email-parser.ts
// Parses portal lead emails from 99acres, MagicBricks, Housing.com, NoBroker.
// Zero external API calls — all regex-based, works completely free.

export interface ParsedLead {
  name:              string;
  phone:             string;
  email:             string;
  location:          string;
  budget_min:        number;
  budget_max:        number;
  property_interest: string;
  source:            string;
  notes:             string;
}

const PORTAL_DOMAINS = [
  "magicbricks.com", "99acres.com", "housing.com",
  "nobroker.in", "proptiger.com", "squareyards.com",
  "commonfloor.com", "makaan.com",
];

// ── Source detection ──────────────────────────────────────────────────────────

export function detectSource(from: string, subject: string): string {
  const f = from.toLowerCase();
  const s = subject.toLowerCase();
  if (f.includes("99acres") || s.includes("99acres"))         return "99acres";
  if (f.includes("magicbricks") || s.includes("magicbricks")) return "magicbricks";
  if (f.includes("housing.com") || s.includes("housing.com")) return "housing";
  if (f.includes("nobroker") || s.includes("nobroker"))       return "nobroker";
  if (f.includes("proptiger") || s.includes("proptiger"))     return "proptiger";
  if (f.includes("squareyards") || s.includes("squareyards")) return "squareyards";
  if (f.includes("facebook") || f.includes("fb.com"))         return "facebook";
  return "other";
}

// ── Strip HTML — properly handles table cells and div blocks ─────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|tr|li|h[1-6]|section|article)>/gi, "\n")
    .replace(/<\/(?:td|th)>/gi, " ")         // table cells → space so fields don't merge
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]{2,}/g, " ")             // collapse horizontal whitespace only
    .replace(/\n{3,}/g, "\n\n")             // max 2 blank lines
    .trim();
}

// ── Budget parser — handles all Indian formats ────────────────────────────────

function parseBudgetStr(text: string): { min: number; max: number } | null {
  const clean = text.replace(/[₹,]/g, "").replace(/\bRs\.?\b/gi, "").trim();

  // Range: "40 - 60 Lacs" | "50L - 1Cr" | "40 to 60 Lakh"
  const rangeRe = /(\d+(?:\.\d+)?)\s*(?:lakh|lac|lacs|lakhs|l\b)?[-–to\s]+(\d+(?:\.\d+)?)\s*(lakh|lac|lacs|lakhs|l\b|cr|crore|crores)/i;
  const rangeM  = clean.match(rangeRe);
  if (rangeM) {
    const [, minRaw, maxRaw, unit] = rangeM;
    const mul = unit.toLowerCase().startsWith("cr") ? 1e7 : 1e5;
    return { min: Math.round(parseFloat(minRaw) * 1e5), max: Math.round(parseFloat(maxRaw) * mul) };
  }

  // Single: "50 Lakh" | "1.5 Crore" | "85L" | "1.2Cr"
  const singleRe = /(\d+(?:\.\d+)?)\s*(lakh|lac|lacs|lakhs|l\b|cr|crore|crores)/i;
  const singleM  = clean.match(singleRe);
  if (singleM) {
    const [, val, unit] = singleM;
    const mul    = unit.toLowerCase().startsWith("cr") ? 1e7 : 1e5;
    const amount = Math.round(parseFloat(val) * mul);
    return { min: Math.round(amount * 0.85), max: Math.round(amount * 1.15) };
  }

  return null;
}

function extractBudget(text: string): { min: number; max: number } | null {
  const budgetLineRe = /budget[:\s]+([^\n\r]{3,60})/i;
  const m = text.match(budgetLineRe);
  if (m) {
    const result = parseBudgetStr(m[1]);
    if (result) return result;
  }
  return parseBudgetStr(text);
}

// ── Phone extractor ───────────────────────────────────────────────────────────

function extractPhone(text: string): string {
  // Labeled fields first (most reliable)
  const labelRe = /(?:phone|mobile|contact|ph|tel|number|mob)[:\s#]*(?:\+?91[-\s]?)?([6-9]\d{9})/i;
  const m = text.match(labelRe);
  if (m) return m[1];

  // Bare 10-digit number (any Indian mobile)
  const bareRe = /(?<!\d)(?:\+?91[-\s]?)?([6-9]\d{9})(?!\d)/g;
  let best = "";
  let match;
  while ((match = bareRe.exec(text)) !== null) {
    // Skip if surrounded by letters (part of email/URL)
    const before = text[match.index - 1] ?? " ";
    if (/[a-zA-Z@.]/.test(before)) continue;
    best = match[1];
    break;
  }
  return best;
}

// ── Email extractor — skips portal domain emails ──────────────────────────────

function extractEmail(text: string): string {
  const emailRe = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  let m;
  while ((m = emailRe.exec(text)) !== null) {
    const email = m[0];
    const domain = email.split("@")[1]?.toLowerCase() ?? "";
    if (!PORTAL_DOMAINS.some(d => domain.endsWith(d))) {
      return email;
    }
  }
  return "";
}

// ── Name extractor ────────────────────────────────────────────────────────────

const NAME_STOP = /(?:mobile|phone|email|city|budget|location|type|config|message|enquiry|property|interest|bhk|lakh|crore)/i;

function extractName(text: string): string {
  const patterns = [
    /(?:buyer\s+name|customer\s+name|client\s+name|lead\s+name|enquirer\s+name|your\s+name)[:\s]+([A-Za-z][A-Za-z\s.]{1,39})/i,
    /^name[:\s]+([A-Za-z][A-Za-z\s.]{1,39})$/im,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      // Trim at the first stop word
      const raw = m[1].trim();
      const stopIdx = raw.search(NAME_STOP);
      const name = (stopIdx > 3 ? raw.slice(0, stopIdx) : raw).trim();
      if (name.length >= 2) return name.replace(/\s+/g, " ");
    }
  }
  return "";
}

// ── Location extractor ────────────────────────────────────────────────────────

function extractLocation(text: string): string {
  const m = text.match(/(?:city|location|area|locality|preferred\s+(?:city|area)|interested\s+in|property\s+in)[:\s]+([^\n\r,|]{3,50})/i);
  return m ? m[1].trim() : "";
}

// ── Property interest extractor ───────────────────────────────────────────────

function extractPropertyInterest(text: string): string {
  const bhkM = text.match(/(\d)\s*bhk/i);
  if (bhkM) return `${bhkM[1]}BHK`;

  const typeMap: [RegExp, string][] = [
    [/\bvilla\b/i, "Villa"],
    [/\bplot\b/i, "Plot"],
    [/\bcommercial\b/i, "Commercial"],
    [/\boffice\b/i, "Commercial"],
    [/\bstudio\b/i, "1BHK"],
  ];
  for (const [re, label] of typeMap) {
    if (re.test(text)) return label;
  }

  const fieldM = text.match(/(?:property\s+type|configuration|bedrooms|requirement)[:\s]+([^\n\r]{2,40})/i);
  return fieldM ? fieldM[1].trim() : "";
}

// ── Source-specific parsers ───────────────────────────────────────────────────

function parse99acres(text: string): Partial<ParsedLead> {
  const name     = extractName(text);
  const phone    = extractPhone(text);
  const email    = extractEmail(text);
  const budget   = extractBudget(text);
  const location = extractLocation(text);
  const propType = extractPropertyInterest(text);
  const msgM     = text.match(/(?:message|requirement|comments?)[:\s]+([^\n\r]{5,300})/i);
  const notes    = msgM ? msgM[1].trim() : "";
  return { name, phone, email, location, budget_min: budget?.min, budget_max: budget?.max, property_interest: propType, notes };
}

function parseMagicBricks(text: string): Partial<ParsedLead> {
  // MagicBricks labels: "Buyer Name:", "Name:", "Mobile:", "Budget:", "City:"
  // Phone may be masked (98765XXXXX) — try anyway
  const nameM   = text.match(/(?:buyer\s+name|enquirer|name)[:\s]+([A-Za-z][A-Za-z\s.]{1,39})/i);
  const phoneM  = text.match(/(?:mobile|phone|contact|mob)[:\s]*(?:\+?91[-\s]?)?([6-9]\d{9})/i);
  const name    = nameM  ? nameM[1].trim().split(/\s{2,}|(?:mobile|email|city)/i)[0].trim() : extractName(text);
  const phone   = phoneM ? phoneM[1].trim() : extractPhone(text);
  const email   = extractEmail(text);
  const budget  = extractBudget(text);
  const locM    = text.match(/(?:city|preferred\s+city|property\s+in|location)[:\s]+([^\n\r,|]{3,50})/i);
  const location = locM ? locM[1].trim() : extractLocation(text);
  const propType = extractPropertyInterest(text);
  const msgM    = text.match(/(?:message|comments?|additional\s+details?|requirement)[:\s]+([^\n\r]{5,300})/i);
  const notes   = msgM ? msgM[1].trim() : "";
  return { name, phone, email, location, budget_min: budget?.min, budget_max: budget?.max, property_interest: propType, notes };
}

function parseHousing(text: string): Partial<ParsedLead> {
  const nameM   = text.match(/(?:customer\s+name|name)[:\s]+([A-Za-z][A-Za-z\s.]{1,39})/i);
  const phoneM  = text.match(/(?:phone|mobile|contact)[:\s]*(?:\+?91[-\s]?)?([6-9]\d{9})/i);
  const locM    = text.match(/(?:location|locality|city)[:\s]+([^\n\r,]{3,50})/i);
  const name    = nameM  ? nameM[1].trim() : extractName(text);
  const phone   = phoneM ? phoneM[1].trim() : extractPhone(text);
  const location = locM ? locM[1].trim() : extractLocation(text);
  const email   = extractEmail(text);
  const budget  = extractBudget(text);
  const propType = extractPropertyInterest(text);
  return { name, phone, email, location, budget_min: budget?.min, budget_max: budget?.max, property_interest: propType, notes: "" };
}

// ── Main parser ───────────────────────────────────────────────────────────────

export function parseInboundEmail(
  from:    string,
  subject: string,
  text:    string,
  html:    string,
): ParsedLead {
  const body   = text?.trim() ? text : stripHtml(html ?? "");
  const source = detectSource(from, subject);

  let partial: Partial<ParsedLead> = {};

  if      (source === "99acres")     partial = parse99acres(body);
  else if (source === "magicbricks") partial = parseMagicBricks(body);
  else if (source === "housing")     partial = parseHousing(body);
  else {
    const budget = extractBudget(body);
    partial = {
      name:              extractName(body),
      phone:             extractPhone(body),
      email:             extractEmail(body),
      location:          extractLocation(body),
      budget_min:        budget?.min,
      budget_max:        budget?.max,
      property_interest: extractPropertyInterest(body),
      notes:             "",
    };
  }

  const sourceNote = `Auto-captured from ${source} on ${new Date().toLocaleDateString("en-IN")}`;
  const finalNotes = [sourceNote, partial.notes].filter(Boolean).join("\n");

  return {
    name:              partial.name              ?? "",
    phone:             partial.phone             ?? "",
    email:             partial.email             ?? "",
    location:          partial.location          ?? "",
    budget_min:        partial.budget_min        ?? 0,
    budget_max:        partial.budget_max        ?? 0,
    property_interest: partial.property_interest ?? "",
    source,
    notes:             finalNotes,
  };
}
