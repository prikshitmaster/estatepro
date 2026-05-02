// lib/email-parser.ts
// Parses portal lead emails. Zero API cost — pure regex.
// Supports: 99acres, MagicBricks, Housing.com, NoBroker, PropTiger,
//           SquareYards, CommonFloor, Makaan, JustDial, Sulekha,
//           OLX, Quikr, NestAway, Anarock, Zameen, Bayut, Facebook/Instagram

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
  raw_message:       string; // original message/requirement text
}

// All known portal email domains — buyer emails from these are filtered out
export const PORTAL_DOMAINS = [
  "magicbricks.com", "99acres.com", "housing.com", "nobroker.in",
  "proptiger.com", "squareyards.com", "commonfloor.com", "makaan.com",
  "justdial.com", "sulekha.com", "olx.in", "quikr.com", "nestaway.com",
  "anarock.com", "zameen.com", "bayut.com", "indiabulls.com",
  "apnacomplex.com", "homezz.com", "1realty.in", "propequity.com",
  "stanzaliving.com", "colive.com", "co-live.in",
];

// ── Source detection ──────────────────────────────────────────────────────────

export function detectSource(from: string, subject: string): string {
  const f = from.toLowerCase();
  const s = subject.toLowerCase();
  if (f.includes("99acres")    || s.includes("99acres"))                   return "99acres";
  if (f.includes("magicbricks")|| s.includes("magicbricks"))               return "magicbricks";
  if (f.includes("housing.com")|| s.includes("housing.com"))               return "housing";
  if (f.includes("nobroker")   || s.includes("nobroker"))                  return "nobroker";
  if (f.includes("proptiger")  || s.includes("proptiger"))                 return "proptiger";
  if (f.includes("squareyards")|| s.includes("squareyards"))               return "squareyards";
  if (f.includes("commonfloor")|| s.includes("commonfloor"))               return "commonfloor";
  if (f.includes("makaan")     || s.includes("makaan"))                    return "makaan";
  if (f.includes("justdial")   || s.includes("justdial"))                  return "justdial";
  if (f.includes("sulekha")    || s.includes("sulekha"))                   return "sulekha";
  if (f.includes("olx.in")     || s.includes(" olx "))                    return "olx";
  if (f.includes("quikr")      || s.includes("quikr"))                     return "quikr";
  if (f.includes("nestaway")   || s.includes("nestaway"))                  return "nestaway";
  if (f.includes("anarock")    || s.includes("anarock"))                   return "anarock";
  if (f.includes("zameen")     || s.includes("zameen"))                    return "zameen";
  if (f.includes("bayut")      || s.includes("bayut"))                     return "bayut";
  if (f.includes("facebook")   || f.includes("fb.com") || s.includes("facebook lead")) return "facebook";
  if (f.includes("instagram"))                                              return "instagram";
  return "other";
}

// ── Strip HTML — handles tables, divs, lists properly ────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|tr|li|h[1-6]|section|article)>/gi, "\n")
    .replace(/<\/(?:td|th)>/gi, " | ")   // table cells → separator so fields don't merge
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ── Budget parser — all Indian formats ───────────────────────────────────────

function parseBudgetStr(text: string): { min: number; max: number } | null {
  const clean = text.replace(/[₹,]/g, "").replace(/\bRs\.?\b/gi, "").trim();

  // Range: "40 - 60 Lacs" | "50L - 1Cr" | "40 to 60 Lakh"
  const rangeRe = /(\d+(?:\.\d+)?)\s*(?:lakh|lac|lacs|lakhs|l\b)?[-–to\s]+(\d+(?:\.\d+)?)\s*(lakh|lac|lacs|lakhs|l\b|cr|crore|crores)/i;
  const rangeM  = clean.match(rangeRe);
  if (rangeM) {
    const [, minRaw, maxRaw, unit] = rangeM;
    const maxMul = unit.toLowerCase().startsWith("cr") ? 1e7 : 1e5;
    return { min: Math.round(parseFloat(minRaw) * 1e5), max: Math.round(parseFloat(maxRaw) * maxMul) };
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
  const m = text.match(/budget[:\s]+([^\n\r]{3,60})/i);
  if (m) {
    const r = parseBudgetStr(m[1]);
    if (r) return r;
  }
  return parseBudgetStr(text);
}

// ── Phone extractor ───────────────────────────────────────────────────────────

function extractPhone(text: string): string {
  // Labeled fields first
  const labeled = text.match(/(?:phone|mobile|contact|ph|tel|mob)[:\s#|]*(?:\+?91[-\s]?)?([6-9]\d{9})/i);
  if (labeled) return labeled[1];
  // Bare 10-digit number, skip if inside email/URL
  const bareRe = /(?<![a-zA-Z@.\d])(?:\+?91[-\s]?)?([6-9]\d{9})(?!\d)/g;
  let m;
  while ((m = bareRe.exec(text)) !== null) {
    return m[1];
  }
  return "";
}

// ── Email extractor — skips portal addresses ──────────────────────────────────

function extractEmail(text: string): string {
  const re = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const domain = m[0].split("@")[1]?.toLowerCase() ?? "";
    if (!PORTAL_DOMAINS.some(d => domain.endsWith(d))) return m[0];
  }
  return "";
}

// ── Name extractor ────────────────────────────────────────────────────────────

const NAME_STOP = /\b(?:mobile|phone|email|city|budget|location|type|config|message|enquiry|property|bhk|lakh|crore|requirement)\b/i;

function extractName(text: string): string {
  const patterns = [
    /(?:buyer\s+name|customer\s+name|client\s+name|lead\s+name|enquirer(?:\s+name)?|sender\s+name)[:\s|]+([A-Za-z][A-Za-z\s'.]{1,40})/i,
    /^name[:\s|]+([A-Za-z][A-Za-z\s'.]{1,40})$/im,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    const raw   = m[1].trim();
    const stop  = raw.search(NAME_STOP);
    const name  = (stop > 2 ? raw.slice(0, stop) : raw).trim().replace(/[|:]+$/, "").trim();
    if (name.length >= 2 && !name.includes("@")) return name.replace(/\s+/g, " ");
  }
  return "";
}

// ── Location extractor ────────────────────────────────────────────────────────

function extractLocation(text: string): string {
  const m = text.match(/(?:city|location|area|locality|preferred\s+(?:city|area|location)|interested\s+in|property\s+in)[:\s|]+([^\n\r,|]{3,50})/i);
  return m ? m[1].trim().replace(/[|:]+$/, "").trim() : "";
}

// ── Property interest extractor ───────────────────────────────────────────────

function extractPropertyInterest(text: string): string {
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

  const fieldM = text.match(/(?:property\s+type|configuration|bedrooms|bedroom|requirement|looking\s+for)[:\s|]+([^\n\r|]{2,40})/i);
  return fieldM ? fieldM[1].trim().replace(/[|:]+$/, "").trim() : "";
}

// ── Message extractor ─────────────────────────────────────────────────────────

function extractMessage(text: string): string {
  const m = text.match(/(?:message|requirement|comments?|additional\s+details?|query|description|notes?)[:\s|]+([^\n\r]{5,400})/i);
  return m ? m[1].trim() : "";
}

// ── Source-specific parsers ───────────────────────────────────────────────────

function parse99acres(text: string): Partial<ParsedLead> {
  return {
    name:              extractName(text),
    phone:             extractPhone(text),
    email:             extractEmail(text),
    location:          extractLocation(text),
    ...(extractBudget(text) ? { budget_min: extractBudget(text)!.min, budget_max: extractBudget(text)!.max } : {}),
    property_interest: extractPropertyInterest(text),
    raw_message:       extractMessage(text),
    notes:             extractMessage(text),
  };
}

function parseMagicBricks(text: string): Partial<ParsedLead> {
  const nameM  = text.match(/(?:buyer\s+name|enquirer|name)[:\s|]+([A-Za-z][A-Za-z\s'.]{1,40})/i);
  const phoneM = text.match(/(?:mobile|phone|contact|mob)[:\s|]*(?:\+?91[-\s]?)?([6-9]\d{9})/i);
  const locM   = text.match(/(?:city|preferred\s+city|property\s+in|location)[:\s|]+([^\n\r,|]{3,50})/i);

  const rawName = nameM ? nameM[1].trim() : "";
  const stop    = rawName.search(NAME_STOP);
  const name    = (stop > 2 ? rawName.slice(0, stop) : rawName).trim().replace(/[|:]+$/, "").trim();
  const budget  = extractBudget(text);

  return {
    name:              name || extractName(text),
    phone:             phoneM ? phoneM[1] : extractPhone(text),
    email:             extractEmail(text),
    location:          locM ? locM[1].trim() : extractLocation(text),
    budget_min:        budget?.min,
    budget_max:        budget?.max,
    property_interest: extractPropertyInterest(text),
    raw_message:       extractMessage(text),
    notes:             extractMessage(text),
  };
}

function parseHousing(text: string): Partial<ParsedLead> {
  const nameM  = text.match(/(?:customer\s+name|name)[:\s|]+([A-Za-z][A-Za-z\s'.]{1,40})/i);
  const phoneM = text.match(/(?:phone|mobile|contact)[:\s|]*(?:\+?91[-\s]?)?([6-9]\d{9})/i);
  const locM   = text.match(/(?:location|locality|city)[:\s|]+([^\n\r,|]{3,50})/i);
  const budget = extractBudget(text);

  return {
    name:              nameM ? nameM[1].trim() : extractName(text),
    phone:             phoneM ? phoneM[1] : extractPhone(text),
    email:             extractEmail(text),
    location:          locM ? locM[1].trim() : extractLocation(text),
    budget_min:        budget?.min,
    budget_max:        budget?.max,
    property_interest: extractPropertyInterest(text),
    raw_message:       extractMessage(text),
    notes:             extractMessage(text),
  };
}

function parseGeneric(text: string): Partial<ParsedLead> {
  const budget = extractBudget(text);
  return {
    name:              extractName(text),
    phone:             extractPhone(text),
    email:             extractEmail(text),
    location:          extractLocation(text),
    budget_min:        budget?.min,
    budget_max:        budget?.max,
    property_interest: extractPropertyInterest(text),
    raw_message:       extractMessage(text),
    notes:             extractMessage(text),
  };
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

  let partial: Partial<ParsedLead>;

  if      (source === "99acres")                                      partial = parse99acres(body);
  else if (source === "magicbricks")                                  partial = parseMagicBricks(body);
  else if (source === "housing")                                      partial = parseHousing(body);
  else if (["nobroker","proptiger","squareyards","commonfloor",
            "makaan","justdial","sulekha","olx","quikr",
            "nestaway","anarock","zameen","bayut"].includes(source))  partial = parseGeneric(body);
  else                                                                partial = parseGeneric(body);

  const sourceNote  = `Auto-captured from ${source} on ${new Date().toLocaleDateString("en-IN")}`;
  const finalNotes  = [sourceNote, partial.notes].filter(Boolean).join("\n");

  return {
    name:              partial.name              ?? "",
    phone:             partial.phone             ?? "",
    email:             partial.email             ?? "",
    location:          partial.location          ?? "",
    budget_min:        partial.budget_min        ?? 0,
    budget_max:        partial.budget_max        ?? 0,
    property_interest: partial.property_interest ?? "",
    raw_message:       partial.raw_message       ?? "",
    source,
    notes:             finalNotes,
  };
}
