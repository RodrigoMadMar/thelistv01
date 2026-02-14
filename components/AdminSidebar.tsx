"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { label: "Postulaciones", href: "/admin/applications" },
  { label: "Invites", href: "/admin/invites" },
  { label: "Hosts", href: "/admin/hosts" },
  { label: "Planes", href: "/admin/plans" },
];

export default function AdminSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[220px] shrink-0 border-r border-brand h-screen sticky top-0 flex-col bg-brand-black">
        <div className="h-16 flex items-center px-5 border-b border-brand">
          <a href="/" className="font-serif text-lg font-medium tracking-wide text-brand-white">
            thelist<span className="text-brand-smoke font-normal">.</span>cl
          </a>
        </div>
        <div className="px-4 pt-4 pb-2">
          <span className="text-[9px] uppercase tracking-[0.15em] text-brand-smoke/40">Admin</span>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                className={`block px-3 py-2.5 rounded-lg text-[13px] transition-colors ${
                  active
                    ? "text-brand-white bg-white/[0.06]"
                    : "text-brand-smoke hover:text-brand-white hover:bg-white/[0.03]"
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
        <div className="px-4 py-4 border-t border-brand">
          <button onClick={handleSignOut} className="text-[11px] text-brand-smoke hover:text-brand-white transition-colors bg-transparent border-none cursor-pointer p-0">
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 border-b border-brand bg-brand-overlay backdrop-blur-[32px]">
        <a href="/" className="font-serif text-base font-medium text-brand-white">
          thelist<span className="text-brand-smoke font-normal">.</span>cl
        </a>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-brand-white bg-transparent border-none cursor-pointer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            {mobileOpen ? (
              <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
            ) : (
              <><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></>
            )}
          </svg>
        </button>
      </div>
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-brand-black/95 pt-14" onClick={() => setMobileOpen(false)}>
          <nav className="p-4 space-y-1">
            {NAV_ITEMS.map((item) => (
              <a key={item.href} href={item.href} className={`block px-4 py-3 rounded-lg text-[14px] ${pathname.startsWith(item.href) ? "text-brand-white bg-white/[0.06]" : "text-brand-smoke"}`}>
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      )}

      <main className="flex-1 md:pt-0 pt-14">{children}</main>
    </div>
  );
}
