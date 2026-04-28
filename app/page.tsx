// app/page.tsx — root route, redirects to login
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/login");
}
