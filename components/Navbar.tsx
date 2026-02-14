"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";

interface NavbarProps {
  onOpenDoor: () => void;
  onOpenApply: () => void;
}

export default function Navbar({ onOpenDoor, onOpenApply }: NavbarProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();

    async function getProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) setProfile(data as Profile);
    }

    getProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setProfile(null);
      } else {
        getProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  const panelHref =
    profile?.role === "admin"
      ? "/admin/applications"
      : profile?.role === "host"
        ? "/host/dashboard"
        : "/";

  return (
    <nav className="fixed top-0 left-0 right-0 z-[1000] h-16 flex items-center justify-between px-5 md:px-10 border-b border-brand bg-brand-overlay backdrop-blur-[32px]">
      {/* Logo */}
      <a href="/" className="font-serif text-lg font-medium tracking-wide text-brand-white">
        thelist<span className="text-brand-smoke font-normal">.</span>cl
      </a>

      {/* Center Links */}
      <div className="hidden md:flex items-center gap-8">
        <a
          href="#drops"
          className="text-[11px] font-normal tracking-[0.1em] uppercase text-brand-smoke hover:text-brand-white transition-colors"
        >
          Drops
        </a>
        <a
          href="#salas"
          className="text-[11px] font-normal tracking-[0.1em] uppercase text-brand-smoke hover:text-brand-white transition-colors"
        >
          Salas
        </a>
        <button
          onClick={onOpenApply}
          className="text-[11px] font-normal tracking-[0.1em] uppercase text-brand-smoke hover:text-brand-white transition-colors bg-transparent border-none cursor-pointer"
        >
          Postular como host
        </button>
        <button
          onClick={onOpenDoor}
          className="flex items-center gap-2 text-[11px] font-normal tracking-[0.1em] uppercase text-brand-white bg-white/[0.06] border border-white/[0.12] px-[18px] py-[7px] rounded-full hover:bg-white/10 hover:border-white/20 transition-all"
        >
          <span className="w-[5px] h-[5px] rounded-full bg-brand-lime animate-pulse" />
          The Door
        </button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-5">
        {profile ? (
          /* Logged in: name + dropdown */
          <div className="relative hidden md:block" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 font-sans text-[11px] font-normal tracking-[0.1em] uppercase text-brand-white bg-white/[0.06] border border-white/[0.12] px-4 py-2 rounded-full hover:bg-white/10 hover:border-white/20 transition-all"
            >
              {profile.full_name || profile.email.split("@")[0]}
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`transition-transform ${menuOpen ? "rotate-180" : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-brand-surface border border-brand rounded-lg overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                <a
                  href={panelHref}
                  className="block px-4 py-3 text-[12px] text-brand-smoke hover:text-brand-white hover:bg-white/[0.04] transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Mi panel
                </a>
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-3 text-[12px] text-brand-smoke hover:text-brand-white hover:bg-white/[0.04] transition-colors border-t border-brand"
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Not logged in: Ingresar button */
          <a
            href="/login"
            className="hidden md:block font-sans text-[11px] font-normal tracking-[0.1em] uppercase text-brand-black bg-brand-white border-none px-5 py-2 rounded-full hover:bg-white hover:-translate-y-px transition-all"
          >
            Ingresar
          </a>
        )}

        {/* Mobile menu -> opens The Door */}
        <button className="md:hidden" onClick={onOpenDoor}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-brand-white"
          >
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
