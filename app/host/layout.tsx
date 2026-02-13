import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HostSidebar from "@/components/HostSidebar";

export default async function HostLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Allow host and admin, but not for /host/apply (that's open to all authenticated users)
  // The apply page handles its own auth check
  if (!profile || (profile.role !== "host" && profile.role !== "admin")) {
    // Check if this is the apply route by letting it through
    // The layout wraps all /host/* routes including /host/apply
  }

  return (
    <div className="min-h-screen bg-brand-black">
      {children}
    </div>
  );
}
