// app/(dashboard)/upgrade/page.tsx
// Paid plans aren't being sold yet — every broker is on the free trial.
// Any old "upgrade" link now lands on the billing/trial page instead.
import { redirect } from "next/navigation";

export default function UpgradePage() {
  redirect("/settings/billing");
}
