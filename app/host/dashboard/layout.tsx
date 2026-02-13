import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HostSidebar from "@/components/HostSidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "host" && profile.role !== "admin")) {
    redirect("/");
  }

  return (
    <HostSidebar hostName={profile.full_name || profile.email}>
      {children}
    </HostSidebar>
  );
}
