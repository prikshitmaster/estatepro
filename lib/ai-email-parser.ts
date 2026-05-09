// Gemini 2.0 Flash — free tier: 15 req/min, 1M tokens/day
// No npm package needed — plain REST call

export interface AILeadData {
  name:              string | null;
  phone:             string | null;
  email:             string | null;
  location:          string | null;
  budget_min:        number | null;
  budget_max:        number | null;
  property_interest: string | null;
  source:            string;
  message:           string | null;
}

const SYSTEM_PROMPT = `You are a real estate lead extraction assistant for the Indian property market.
Extract lead information from the email below.
Return ONLY valid JSON — no markdown, no explanation, nothing else.

JSON schema (use null for missing fields):
{
  "name": "full name of the buyer or enquirer",
  "phone": "10-digit Indian mobile number, digits only (no spaces, dashes, or country code)",
  "email": "email of the lead — NOT the portal's own email",
  "location": "city or area they want property in",
  "budget_min": minimum budget as integer rupees or null,
  "budget_max": maximum budget as integer rupees or null,
  "property_interest": "one of: 1BHK | 2BHK | 3BHK | 4BHK | Villa | Plot | Commercial — or null",
  "source": "portal in lowercase: 99acres | magicbricks | housing | nobroker | proptiger | squareyards | commonfloor | makaan | justdial | sulekha | olx | quikr | nestaway | anarock | zameen | bayut | facebook | instagram | other",
  "message": "short summary of their requirement"
}

Rules:
- phone: must start with 6–9, exactly 10 digits
- budget: convert Lakh → multiply by 100000, Crore → multiply by 10000000
- source: detect from the From address domain or email subject
- If this email is NOT a property lead (newsletter, OTP, billing, spam) return: {"not_a_lead": true}`;

export async function parseEmailWithAI(
  from: string,
  subject: string,
  body: string,
): Promise<AILeadData | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const emailContent = [
    `From: ${from}`,
    `Subject: ${subject}`,
    ``,
    `Body:`,
    body.slice(0, 3000), // cap tokens
  ].join("\n");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n---\n${emailContent}` }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 512 },
      }),
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const raw  = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();

  // Strip markdown code fences if Gemini adds them
  const json = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

  const parsed = JSON.parse(json);
  if (parsed.not_a_lead) return null;

  return parsed as AILeadData;
}
