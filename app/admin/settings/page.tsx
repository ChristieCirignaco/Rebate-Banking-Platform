import { redirect } from "next/navigation";

// /admin/settings has no body of its own — it lands on the first tab.
export default function SettingsIndexPage() {
  redirect("/admin/settings/general");
}
