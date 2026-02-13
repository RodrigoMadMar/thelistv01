"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface HostSidebarProps {
  hostName: string;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { label: "Hoy", href: "/host/dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
  { label: "Mis planes", href: "/host/dashboard/plans", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
  { label: "Postulaciones", href: "/host/dashboard/applications", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { label: "Reservas", href: "/host/dashboard/reservations", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { label: "Mensajes", href: "/host/dashboard/messages", icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" },
  { label: "Pagos", href: "/host/dashboard/payments", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" },
];

export default function HostSidebar({ hostName, children }: HostSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const sidebar = (
    <aside className="w-[240px] shrink-0 border-r border-brand h-screen sticky top-0 flex flex-col bg-brand-black">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-brand">
        <a href="/" className="font-serif text-lg font-medium tracking-wide text-brand-white">
          thelist<span className="text-brand-smoke font-normal">.</span>cl
        </a>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-colors ${
                active
                  ? "text-brand-white bg-white/[0.06]"
                  : "text-brand-smoke hover:text-brand-white hover:bg-white/[0.03]"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              {item.label}
            </a>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-4 py-4 border-t border-brand">
        <div className="text-[12px] text-brand-white mb-1 truncate">{hostName}</div>
        <button
          onClick={handleSignOut}
          className="text-[11px] text-brand-smoke hover:text-brand-white transition-colors bg-transparent border-none cursor-pointer p-0"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <div className="hidden md:block">{sidebar}</div>

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

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-brand-black/95 pt-14" onClick={() => setMobileOpen(false)}>
          <nav className="p-4 space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`block px-4 py-3 rounded-lg text-[14px] ${
                    active ? "text-brand-white bg-white/[0.06]" : "text-brand-smoke"
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
            <button onClick={handleSignOut} className="block w-full text-left px-4 py-3 text-[14px] text-brand-smoke bg-transparent border-none cursor-pointer mt-4 border-t border-brand pt-4">
              Cerrar sesión
            </button>
          </nav>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 md:pt-0 pt-14">{children}</main>
    </div>
  );
}
