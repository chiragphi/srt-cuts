import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, isAdmin } from "@/lib/session";
import "./admin.css";

export const metadata: Metadata = {
  title: "Operator",
  robots: { index: false, follow: false },
};

// Server-side gate. Only a real admin session reaches the cockpit. During
// impersonation the effective session is the (non-admin) customer, so this
// bounces back to the storefront — you can't sit in admin while viewing as
// a customer. This is the outer guard; every admin API route re-checks.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user || !isAdmin(user.phone)) {
    redirect("/");
  }

  return <div className="admin-scope">{children}</div>;
}
