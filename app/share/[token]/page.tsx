// app/share/[token]/page.tsx — Server component wrapper
// Generates WhatsApp/OG meta tags from the link title so the link shows a rich preview.
// The actual viewer UI is in ViewerClient.tsx (client component).
import type { Metadata } from "next";
import ViewerClient from "./ViewerClient";

type Props = { params: Promise<{ token: string }> };

const FALLBACK: Metadata = {
  title: "Secure Property Share — EstatePro",
  description: "View shared property media",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { token } = await params;
    // Dynamic import so a missing service key doesn't crash the whole build
    const { supabaseAdmin } = await import("@/lib/supabase-admin");
    const { data } = await supabaseAdmin
      .from("secure_share_links")
      .select("title, property_title")
      .eq("token", token)
      .single();

    if (!data) return FALLBACK;

    const description = data.property_title
      ? `Property: ${data.property_title}`
      : "View shared property media — secured by EstatePro CRM";

    return {
      title:       `${data.title} — EstatePro`,
      description,
      openGraph: {
        title:       data.title,
        description: data.property_title ?? "Shared via EstatePro CRM",
        type:        "website",
      },
    };
  } catch {
    return FALLBACK;
  }
}

export default function SharePage() {
  return <ViewerClient />;
}
