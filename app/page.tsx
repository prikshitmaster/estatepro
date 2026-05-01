// app/page.tsx — EstatePro CRM landing page
import Link from "next/link";

export const metadata = {
  title: "EstatePro CRM — Real Estate CRM for Indian Brokers",
  description: "Manage properties, leads, clients and close more deals. Built for Indian real estate brokers.",
};

const G      = "#1BC47D";
const DARK   = "#0F172A";
const MID    = "#475569";
const MUTE   = "#94A3B8";

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: DARK, background: "#fff", overflowX: "hidden" }}>
      <Navbar />
      <Hero />
      <TrustBar />
      <Features />
      <HowItWorks />
      <Pricing />
      <CtaBanner />
      <Footer />
    </div>
  );
}

// ── Navbar ─────────────────────────────────────────────────────────────────────
function Navbar() {
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(255,255,255,0.92)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderBottom: "1px solid #F1F5F9",
    }}>
      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: G, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 16 }}>🏢</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: 18, color: DARK, letterSpacing: -0.4 }}>EstatePro</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: G, background: "#F0FDF9", border: "1px solid #BBF7D0", borderRadius: 6, padding: "2px 6px", marginLeft: 2 }}>CRM</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 28, }}>
          {[["Features","#features"],["Pricing","#pricing"],["How it works","#howitworks"]].map(([l,h])=>(
            <a key={l} href={h} style={{ color: MID, fontSize: 14, fontWeight: 500, textDecoration: "none" }}>{l}</a>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/login" style={{ color: MID, fontSize: 14, fontWeight: 600, textDecoration: "none", padding: "8px 14px" }}>
            Sign in
          </Link>
          <Link href="/signup" style={{
            background: G, color: "#fff", fontSize: 14, fontWeight: 700,
            padding: "9px 20px", borderRadius: 10, textDecoration: "none",
            boxShadow: "0 1px 8px rgba(27,196,125,0.35)",
          }}>
            Start Free Trial
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ── Hero ───────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{ background: "linear-gradient(160deg, #F8FAFF 0%, #F0FDF9 50%, #F8FAFF 100%)", padding: "80px 24px 0" }}>
      <div style={{ maxWidth: 1140, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#F0FDF9", border: "1px solid #BBF7D0", borderRadius: 20, padding: "5px 12px 5px 8px", marginBottom: 24 }}>
            <span style={{ background: G, color: "#fff", fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 10 }}>NEW</span>
            <span style={{ color: "#15803D", fontSize: 12, fontWeight: 600 }}>30-day free trial — no card needed</span>
          </div>

          <h1 style={{ fontSize: "clamp(34px, 5vw, 52px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: -1.5, color: DARK, marginBottom: 20 }}>
            The CRM built for<br />
            <span style={{ color: G }}>Indian Real Estate</span><br />
            Brokers
          </h1>

          <p style={{ fontSize: 18, color: MID, lineHeight: 1.7, marginBottom: 36, maxWidth: 460 }}>
            Manage properties, track leads, share listings securely and close more deals — all from one clean app on your phone.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/signup" style={{
              background: G, color: "#fff", fontSize: 15, fontWeight: 700,
              padding: "14px 28px", borderRadius: 12, textDecoration: "none",
              boxShadow: "0 4px 20px rgba(27,196,125,0.4)",
              display: "inline-flex", alignItems: "center", gap: 8,
            }}>
              Start Free Trial →
            </Link>
            <a href="#features" style={{
              background: "#fff", color: DARK, fontSize: 15, fontWeight: 600,
              padding: "14px 28px", borderRadius: 12, textDecoration: "none",
              border: "1.5px solid #E2E8F0",
            }}>
              See Features
            </a>
          </div>

          <div style={{ display: "flex", gap: 32, marginTop: 40 }}>
            {[["500+","Brokers"],["12,000+","Properties"],["₹200Cr+","Deals Tracked"]].map(([n,l])=>(
              <div key={l}>
                <p style={{ fontWeight: 800, fontSize: 20, color: DARK, marginBottom: 2 }}>{n}</p>
                <p style={{ color: MUTE, fontSize: 12, fontWeight: 500 }}>{l}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ paddingBottom: 40 }}>
          <AppMockup />
        </div>
      </div>
    </section>
  );
}

function AppMockup() {
  return (
    <div style={{
      background: "#fff", borderRadius: 20,
      boxShadow: "0 24px 80px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)",
      overflow: "hidden", border: "1px solid #E2E8F0",
      transform: "perspective(1200px) rotateY(-6deg) rotateX(2deg)",
    }}>
      {/* Browser chrome */}
      <div style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 5 }}>
          {["#FF5F57","#FFBD2E","#28C840"].map(c=><div key={c} style={{ width:10, height:10, borderRadius:"50%", background:c }}/>)}
        </div>
        <div style={{ flex:1, background:"#EEF1F6", borderRadius:6, height:22, marginLeft:8, display:"flex", alignItems:"center", paddingLeft:10 }}>
          <span style={{ fontSize:10, color:MUTE }}>app.estatepro.in/properties</span>
        </div>
      </div>
      {/* Sidebar + content */}
      <div style={{ display:"flex", height:360 }}>
        <div style={{ width:52, background:"#0F172A", display:"flex", flexDirection:"column", alignItems:"center", paddingTop:16, gap:14 }}>
          {["🏠","👥","✅","🔗","📰"].map((icon,i)=>(
            <div key={i} style={{ width:32, height:32, borderRadius:8, background:i===0 ? G : "rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>
              {icon}
            </div>
          ))}
        </div>
        <div style={{ flex:1, padding:"16px 14px", background:"#F8FAFC" }}>
          <p style={{ fontSize:11, fontWeight:700, color:DARK, marginBottom:12 }}>Properties</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
            {[["12","Total",G],["8","Available","#6366F1"],["4","Leads","#F59E0B"]].map(([n,l,c])=>(
              <div key={l} style={{ background:"#fff", borderRadius:10, padding:"8px 10px", border:"1px solid #E2E8F0" }}>
                <p style={{ fontWeight:800, fontSize:16, color:c }}>{n}</p>
                <p style={{ fontSize:9, color:MUTE, fontWeight:600 }}>{l}</p>
              </div>
            ))}
          </div>
          {[
            { t:"3BHK Sea View Villa", l:"Juhu, Mumbai", p:"₹2.5 Cr", s:"Available", c:G },
            { t:"2BHK Apartment", l:"Banjara Hills", p:"₹85 Lakh", s:"Sold", c:"#94A3B8" },
            { t:"Commercial Space", l:"Nariman Point", p:"₹1.2 Cr", s:"Rented", c:"#6366F1" },
          ].map((p)=>(
            <div key={p.t} style={{ background:"#fff", borderRadius:10, padding:"10px 12px", marginBottom:8, border:"1px solid #E2E8F0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <p style={{ fontSize:10, fontWeight:700, color:DARK, marginBottom:2 }}>{p.t}</p>
                <p style={{ fontSize:9, color:MUTE }}>📍 {p.l}</p>
              </div>
              <div style={{ textAlign:"right" }}>
                <p style={{ fontSize:10, fontWeight:800, color:DARK }}>{p.p}</p>
                <span style={{ fontSize:8, fontWeight:700, color:p.c, background:`${p.c}18`, padding:"2px 6px", borderRadius:6 }}>{p.s}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Trust Bar ──────────────────────────────────────────────────────────────────
function TrustBar() {
  return (
    <div style={{ background:"#F8FAFC", borderTop:"1px solid #F1F5F9", borderBottom:"1px solid #F1F5F9", padding:"18px 24px" }}>
      <div style={{ maxWidth:1140, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"center", flexWrap:"wrap", gap:"16px 40px" }}>
        <p style={{ color:MUTE, fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>Trusted by brokers across India</p>
        {["Mumbai","Delhi NCR","Bengaluru","Hyderabad","Jamnagar","Surat","Pune","Chennai"].map(city=>(
          <span key={city} style={{ color:"#CBD5E1", fontSize:13, fontWeight:600 }}>{city}</span>
        ))}
      </div>
    </div>
  );
}

// ── Features ───────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon:"🏢", title:"Property Management", desc:"Add listings with photos, videos, BHK, price, amenities and more. Every detail in one place.", color:"#F0FDF9", border:"#BBF7D0" },
  { icon:"👥", title:"Lead Management", desc:"Track every lead from first contact to closing. Log calls, WhatsApp chats and site visits.", color:"#EFF6FF", border:"#BFDBFE" },
  { icon:"🔗", title:"Secure Share Links", desc:"Share property brochures with watermarked, view-limited, password-protected secure links.", color:"#F5F3FF", border:"#DDD6FE" },
  { icon:"📱", title:"WhatsApp Share", desc:"One tap to send a beautifully formatted property message with price, specs and photos.", color:"#F0FDF9", border:"#BBF7D0" },
  { icon:"📰", title:"Newspaper Leads", desc:"Upload newspaper ads in PDF/CSV and instantly get structured leads to follow up on.", color:"#FFF7ED", border:"#FED7AA" },
  { icon:"✅", title:"Tasks & Follow-ups", desc:"Never miss a follow-up. Schedule tasks, set reminders and track every lead's next step.", color:"#FFF1F2", border:"#FECDD3" },
];

function Features() {
  return (
    <section id="features" style={{ padding:"96px 24px", background:"#fff" }}>
      <div style={{ maxWidth:1140, margin:"0 auto" }}>
        <SectionLabel>Features</SectionLabel>
        <h2 style={{ fontSize:"clamp(28px, 4vw, 42px)", fontWeight:800, letterSpacing:-1, marginBottom:16, textAlign:"center" }}>
          Everything a broker needs,<br />nothing they don&apos;t
        </h2>
        <p style={{ color:MID, fontSize:17, textAlign:"center", maxWidth:520, margin:"0 auto 56px" }}>
          Built specifically for the Indian real estate workflow — from listing to closing.
        </p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))", gap:20 }}>
          {FEATURES.map(f=>(
            <div key={f.title} style={{ padding:"28px 28px 24px", borderRadius:16, border:`1px solid ${f.border}`, background:f.color }}>
              <div style={{ fontSize:32, marginBottom:14 }}>{f.icon}</div>
              <h3 style={{ fontWeight:700, fontSize:17, color:DARK, marginBottom:8 }}>{f.title}</h3>
              <p style={{ color:MID, fontSize:14, lineHeight:1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How It Works ───────────────────────────────────────────────────────────────
const STEPS = [
  { n:"01", icon:"✍️", title:"Sign up free", desc:"Create your account in 30 seconds. No credit card, no setup fees. 30 days fully free." },
  { n:"02", icon:"🏠", title:"Add your properties", desc:"Upload photos & videos, fill in BHK, price, location. Takes 2 minutes per listing." },
  { n:"03", icon:"👥", title:"Manage your leads", desc:"Add leads, log follow-ups, track stages. Never let a hot lead go cold." },
  { n:"04", icon:"📲", title:"Share & close deals", desc:"Send secure share links or WhatsApp messages. Track who viewed what. Close faster." },
];

function HowItWorks() {
  return (
    <section id="howitworks" style={{ padding:"96px 24px", background:"#F8FAFC" }}>
      <div style={{ maxWidth:1140, margin:"0 auto" }}>
        <SectionLabel>How It Works</SectionLabel>
        <h2 style={{ fontSize:"clamp(28px, 4vw, 42px)", fontWeight:800, letterSpacing:-1, marginBottom:16, textAlign:"center" }}>
          Up and running in minutes
        </h2>
        <p style={{ color:MID, fontSize:17, textAlign:"center", maxWidth:480, margin:"0 auto 60px" }}>
          No training needed. If you can use WhatsApp, you can use EstatePro.
        </p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:28 }}>
          {STEPS.map(s=>(
            <div key={s.n} style={{ textAlign:"center" }}>
              <div style={{ width:56, height:56, borderRadius:16, background:"#fff", border:`2px solid ${G}22`, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:24, marginBottom:16, boxShadow:"0 2px 12px rgba(27,196,125,0.1)" }}>
                {s.icon}
              </div>
              <div style={{ fontSize:11, fontWeight:800, color:G, letterSpacing:1, marginBottom:6 }}>STEP {s.n}</div>
              <h3 style={{ fontWeight:700, fontSize:16, color:DARK, marginBottom:8 }}>{s.title}</h3>
              <p style={{ color:MID, fontSize:14, lineHeight:1.65 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Pricing ────────────────────────────────────────────────────────────────────
const STARTER_F = [
  "Up to 20 properties",
  "Up to 20 leads",
  "3 secure share links",
  "Photo & video upload",
  "WhatsApp share",
  "Tasks & follow-ups",
  "Mobile app (PWA)",
];

const PRO_F = [
  "Unlimited properties",
  "Unlimited leads",
  "Unlimited secure share links",
  "Newspaper lead import",
  "Advanced analytics",
  "Priority support",
  "Everything in Starter",
];

function Pricing() {
  return (
    <section id="pricing" style={{ padding:"96px 24px", background:"#fff" }}>
      <div style={{ maxWidth:1140, margin:"0 auto" }}>
        <SectionLabel>Pricing</SectionLabel>
        <h2 style={{ fontSize:"clamp(28px, 4vw, 42px)", fontWeight:800, letterSpacing:-1, marginBottom:16, textAlign:"center" }}>
          Simple, honest pricing
        </h2>
        <p style={{ color:MID, fontSize:17, textAlign:"center", maxWidth:480, margin:"0 auto 20px" }}>
          Start free for 30 days. No hidden fees, no setup charges.
        </p>
        <div style={{ textAlign:"center", marginBottom:52 }}>
          <span style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#FFF7ED", border:"1px solid #FED7AA", borderRadius:20, padding:"6px 16px" }}>
            <span style={{ fontSize:14 }}>🎁</span>
            <span style={{ color:"#C2410C", fontSize:13, fontWeight:700 }}>30-day free trial on both plans — no credit card required</span>
          </span>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))", gap:24, maxWidth:780, margin:"0 auto" }}>
          <PricingCard name="Starter" price="₹99" tagline="Perfect for individual brokers" features={STARTER_F} highlighted={false} />
          <PricingCard name="Pro" price="₹299" tagline="For growing brokers & small teams" features={PRO_F} highlighted badge="Most Popular" />
        </div>

        <p style={{ textAlign:"center", color:MUTE, fontSize:13, marginTop:28 }}>
          All prices per month · Cancel anytime · GST extra
        </p>
      </div>
    </section>
  );
}

function PricingCard({ name, price, tagline, features, highlighted, badge }: {
  name: string; price: string; tagline: string;
  features: string[]; highlighted: boolean; badge?: string;
}) {
  return (
    <div style={{
      borderRadius:20, padding:"32px 28px 28px",
      border: highlighted ? `2px solid ${G}` : "1.5px solid #E2E8F0",
      background: highlighted ? "linear-gradient(160deg, #F0FDF9 0%, #fff 100%)" : "#fff",
      boxShadow: highlighted ? "0 8px 40px rgba(27,196,125,0.15)" : "0 2px 12px rgba(0,0,0,0.04)",
      position:"relative",
    }}>
      {badge && (
        <div style={{ position:"absolute", top:-13, left:"50%", transform:"translateX(-50%)", background:G, color:"#fff", fontSize:11, fontWeight:800, padding:"4px 14px", borderRadius:20, letterSpacing:0.5, whiteSpace:"nowrap" }}>
          {badge}
        </div>
      )}
      <p style={{ fontWeight:800, fontSize:18, color:DARK, marginBottom:4 }}>{name}</p>
      <p style={{ color:MID, fontSize:13, marginBottom:20 }}>{tagline}</p>
      <div style={{ marginBottom:24 }}>
        <span style={{ fontWeight:800, fontSize:40, color:DARK, letterSpacing:-1 }}>{price}</span>
        <span style={{ color:MUTE, fontSize:14, fontWeight:500 }}>/month</span>
      </div>
      <Link href="/signup" style={{
        display:"block", textAlign:"center",
        background: highlighted ? G : "#F8FAFC",
        color: highlighted ? "#fff" : DARK,
        border: highlighted ? "none" : "1.5px solid #E2E8F0",
        fontWeight:700, fontSize:14,
        padding:"13px 0", borderRadius:12, textDecoration:"none", marginBottom:24,
        boxShadow: highlighted ? "0 4px 16px rgba(27,196,125,0.35)" : "none",
      }}>
        Start Free Trial
      </Link>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {features.map(f=>(
          <div key={f} style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
            <span style={{ color:G, fontSize:15, flexShrink:0 }}>✓</span>
            <span style={{ color:MID, fontSize:14 }}>{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── CTA Banner ─────────────────────────────────────────────────────────────────
function CtaBanner() {
  return (
    <section style={{ padding:"80px 24px", background:"linear-gradient(135deg, #0F172A 0%, #1E293B 100%)" }}>
      <div style={{ maxWidth:720, margin:"0 auto", textAlign:"center" }}>
        <div style={{ fontSize:40, marginBottom:16 }}>🚀</div>
        <h2 style={{ fontSize:"clamp(26px, 4vw, 40px)", fontWeight:800, color:"#fff", letterSpacing:-0.8, marginBottom:16, lineHeight:1.2 }}>
          Start closing more deals today
        </h2>
        <p style={{ color:"rgba(255,255,255,0.6)", fontSize:17, marginBottom:36, lineHeight:1.7 }}>
          Join hundreds of brokers who manage their entire business from one app. First 30 days absolutely free.
        </p>
        <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
          <Link href="/signup" style={{ background:G, color:"#fff", fontSize:15, fontWeight:700, padding:"14px 32px", borderRadius:12, textDecoration:"none", boxShadow:"0 4px 24px rgba(27,196,125,0.45)", display:"inline-flex", alignItems:"center", gap:8 }}>
            Create Free Account →
          </Link>
          <Link href="/login" style={{ background:"rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.8)", border:"1px solid rgba(255,255,255,0.15)", fontSize:15, fontWeight:600, padding:"14px 32px", borderRadius:12, textDecoration:"none" }}>
            Sign In
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background:"#0F172A", borderTop:"1px solid rgba(255,255,255,0.06)", padding:"40px 24px 28px" }}>
      <div style={{ maxWidth:1140, margin:"0 auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:32, marginBottom:32 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <div style={{ width:28, height:28, borderRadius:7, background:G, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ color:"#fff", fontSize:13 }}>🏢</span>
              </div>
              <span style={{ fontWeight:800, fontSize:16, color:"#fff" }}>EstatePro CRM</span>
            </div>
            <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, maxWidth:220, lineHeight:1.6 }}>
              The complete CRM for Indian real estate brokers.
            </p>
          </div>
          <div style={{ display:"flex", gap:48, flexWrap:"wrap" }}>
            {[["Product",[["Features","#features"],["Pricing","#pricing"],["How it works","#howitworks"]]],["Account",[["Sign In","/login"],["Create Account","/signup"]]]].map(([title, links])=>(
              <div key={title as string}>
                <p style={{ color:"rgba(255,255,255,0.5)", fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:12 }}>{title as string}</p>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {(links as [string,string][]).map(([l,h])=>(
                    <a key={l} href={h} style={{ color:"rgba(255,255,255,0.55)", fontSize:13, textDecoration:"none", fontWeight:500 }}>{l}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)", paddingTop:20, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
          <p style={{ color:"rgba(255,255,255,0.25)", fontSize:12 }}>© 2026 EstatePro CRM. All rights reserved.</p>
          <p style={{ color:"rgba(255,255,255,0.25)", fontSize:12 }}>Made with ❤️ for Indian brokers</p>
        </div>
      </div>
    </footer>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ textAlign:"center", fontSize:12, fontWeight:800, color:G, letterSpacing:2, textTransform:"uppercase", marginBottom:12 }}>
      {children}
    </p>
  );
}
