import { redirect } from "next/navigation";

// Root route → go straight to login
export default function RootPage() {
  redirect("/login");
}
