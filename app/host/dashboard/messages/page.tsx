import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function HostMessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: host } = await supabase.from("hosts").select("id").eq("profile_id", user.id).single();
  const { data: messages } = host
    ? await supabase
        .from("messages")
        .select("*, profiles:sender_id(full_name, email)")
        .eq("host_id", host.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="p-6 md:p-10 max-w-[960px]">
      <h1 className="font-serif text-[28px] font-normal mb-8">Mensajes</h1>

      {!messages || messages.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-brand-smoke text-[14px]">Sin mensajes aún.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => {
            const sender = msg.profiles as Record<string, string> | null;
            const date = new Date(msg.created_at).toLocaleDateString("es-CL", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <div
                key={msg.id}
                className={`p-4 rounded-xl border bg-brand-surface transition-colors ${
                  msg.read ? "border-brand" : "border-brand-smoke/20"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {!msg.read && <span className="w-2 h-2 rounded-full bg-brand-lime shrink-0" />}
                    <span className="text-[13px] text-brand-white">
                      {sender?.full_name || sender?.email || "Usuario"}
                    </span>
                  </div>
                  <span className="text-[11px] text-brand-smoke/50">{date}</span>
                </div>
                <p className="text-[13px] text-brand-smoke leading-[1.6]">{msg.content}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
