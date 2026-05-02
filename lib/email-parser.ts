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
  source:            string;  // "99acres" | "magicbricks" | "housing" | "nobroker" | "facebook" | "other"
  notes:             string;
}

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

// ── Budget parser — handles all Indian formats ────────────────────────────────

function parseBudgetStr(text: string): { min: number; max: number } | null {
  // Remove ₹, Rs, INR, commas
  const clean = text.replace(/[₹,]/g, "").replace(/\bRs\.?\b/gi, "").trim();

  // Match range: "40 - 60 Lacs" | "50L - 1Cr" | "40 to 60 Lakh"
  const rangeRe = /(\d+(?:\.\d+)?)\s*(?:lakh|lac|lacs|lakhs|l\b)?[-–to\s]+(\d+(?:\.\d+)?)\s*(lakh|lac|lacs|lakhs|l\b|cr|crore|crores)/i;
  const rangeM  = clean.match(rangeRe);
  if (rangeM) {
    const [, minRaw, maxRaw, unit] = rangeM;
    const mul = unit.toLowerCase().startsWith("cr") ? 1e7 : 1e5;
    return { min: Math.round(parseFloat(minRaw) * 1e5), max: Math.round(parseFloat(maxRaw) * mul) };
  }

  // Match single value: "50 Lakh" | "1.5 Crore" | "85L" | "1.2Cr"
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

// Find budget anywhere in a block of text
function extractBudget(text: string): { min: number; max: number } | null {
  const budgetLineRe = /budget[:\s]+([^\n\r]{3,60})/i;
  const m = text.match(budgetLineRe);
  if (m) {
    const result = parseBudgetStr(m[1]);
    if (result) return result;
  }
  // Fallback: scan whole text for rupee amounts
  return parseBudgetStr(text);
}

// ── Phone extractor ───────────────────────────────────────────────────────────

function extractPhone(text: string): string {
  // Labeled fields first
  const labelRe = /(?:phone|mobile|contact|ph|tel|number)[:\s#]*(?:\+?91[-\s]?)?([6-9]\d{9})/i;
  const m = text.match(labelRe);
  if (m) return m[1];
  // Bare 10-digit number
  const bareRe = /\b(?:\+?91[-\s]?)?([6-9]\d{9})\b/;
  const m2 = text.match(bareRe);
  return m2 ? m2[1] : "";
}

// ── Email extractor ───────────────────────────────────────────────────────────

function extractEmail(text: string): string {
  const m = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return m ? m[0] : "";
}

// ── Name extractor ────────────────────────────────────────────────────────────

function extractName(text: string): string {
  const patterns = [
    /(?:buyer\s+name|customer\s+name|client\s+name|lead\s+name|your\s+name|name)[:\s]+([A-Za-z][^\n\r<]{2,40})/i,
    /^(?:name)[:\s]+(.+)$/im,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[1].trim().replace(/\s+/g, " ");
  }
  return "";
}

// ── Location extractor ────────────────────────────────────────────────────────

function extractLocation(text: string): string {
  const patterns = [
    /(?:city|location|area|locality|preferred\s+area|interested\s+in)[:\s]+([^\n\r,|]{3,50})/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[1].trim();
  }
  return "";
}

// ── Property interest extractor ───────────────────────────────────────────────

function extractPropertyInterest(text: string): string {
  // BHK detection
  const bhkM = text.match(/(\d)\s*bhk/i);
  if (bhkM) return `${bhkM[1]}BHK`;

  const typeMap: [RegExp, string][] = [
    [/\bvilla\b/i,      "Villa"],
    [/\bplot\b/i,       "Plot"],
    [/\bcommercial\b/i, "Commercial"],
    [/\boffice\b/i,     "Commercial"],
    [/\bstudio\b/i,     "1BHK"],
  ];
  for (const [re, label] of typeMap) {
    if (re.test(text)) return label;
  }

  // Check labeled field
  const fieldM = text.match(/(?:property\s+type|configuration|bedrooms|requirement)[:\s]+([^\n\r]{2,40})/i);
  if (fieldM) return fieldM[1].trim();

  return "";
}

// ── Strip HTML ────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ── Source-specific extractors (more accurate) ────────────────────────────────

function parse99acres(text: string): Partial<ParsedLead> {
  // 99acres puts data in labeled lines: "Name:", "Contact:", "Email ID:", "City:", "Budget:", etc.
  const name     = extractName(text);
  const phone    = extractPhone(text);
  const email    = extractEmail(text);
  const budget   = extractBudget(text);
  const location = extractLocation(text);
  const propType = extractPropertyInterest(text);

  // Extract message/requirement as notes
  const msgM = text.match(/(?:message|requirement|comments?)[:\s]+([^\n\r]{5,300})/i);
  const notes = msgM ? msgM[1].trim() : "";

  return { name, phone, email, location, budget_min: budget?.min, budget_max: budget?.max, property_interest: propType, notes };
}

function parseMagicBricks(text: string): Partial<ParsedLead> {
  // MagicBricks uses "Buyer Name:", "Mobile:", "Budget:"
  const nameM  = text.match(/(?:buyer\s+name|name)[:\s]+([^\n\r<]{2,50})/i);
  const phoneM = text.match(/(?:mobile|phone|contact)[:\s]*(?:\+?91[-\s]?)?([6-9]\d{9})/i);
  const name   = nameM  ? nameM[1].trim()  : extractName(text);
  const phone  = phoneM ? phoneM[1].trim() : extractPhone(text);
  const email  = extractEmail(text);
  const budget = extractBudget(text);
  const locM   = text.match(/(?:city|preferred\s+city|property\s+in)[:\s]+([^\n\r,]{3,50})/i);
  const location    = locM ? locM[1].trim() : extractLocation(text);
  const propType    = extractPropertyInterest(text);
  const msgM        = text.match(/(?:message|comments?|additional\s+details?)[:\s]+([^\n\r]{5,300})/i);
  const notes       = msgM ? msgM[1].trim() : "";

  return { name, phone, email, location, budget_min: budget?.min, budget_max: budget?.max, property_interest: propType, notes };
}

function parseHousing(text: string): Partial<ParsedLead> {
  // Housing.com uses "Customer Name:", "Phone:", "Location:", "Configuration:"
  const nameM  = text.match(/(?:customer\s+name|name)[:\s]+([^\n\r<]{2,50})/i);
  const phoneM = text.match(/(?:phone|mobile|contact)[:\s]*(?:\+?91[-\s]?)?([6-9]\d{9})/i);
  const locM   = text.match(/(?:location|locality|city)[:\s]+([^\n\r,]{3,50})/i);
  const name     = nameM  ? nameM[1].trim()  : extractName(text);
  const phone    = phoneM ? phoneM[1].trim() : extractPhone(text);
  const location = locM   ? locM[1].trim()   : extractLocation(text);
  const email    = extractEmail(text);
  const budget   = extractBudget(text);
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
  // Prefer plain text; fall back to stripped HTML
  const body   = text?.trim() ? text : stripHtml(html ?? "");
  const source = detectSource(from, subject);

  let partial: Partial<ParsedLead> = {};

  if      (source === "99acres")     partial = parse99acres(body);
  else if (source === "magicbricks") partial = parseMagicBricks(body);
  else if (source === "housing")     partial = parseHousing(body);
  else {
    // Generic: extract whatever we can find
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

  // Build notes: include original source + any message
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
