"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import HostApplicationForm from "@/components/HostApplicationForm";

export default function HostApplyPage() {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?redirectTo=/host/apply");
        return;
      }
      setChecking(false);
    }
    check();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center">
        <div className="text-brand-smoke text-[13px]">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-black">
      {/* Navbar mini */}
      <nav className="h-16 flex items-center px-5 md:px-10 border-b border-brand bg-brand-overlay backdrop-blur-[32px]">
        <a href="/" className="font-serif text-lg font-medium tracking-wide text-brand-white">
          thelist<span className="text-brand-smoke font-normal">.</span>cl
        </a>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-[120px] md:py-[160px] max-w-[640px] mx-auto">
        <span className="text-[10px] tracking-[0.2em] uppercase text-brand-smoke/50 mb-6">
          Para hosts
        </span>
        <h1 className="font-serif text-[clamp(32px,5vw,48px)] font-normal leading-[1.15] mb-5">
          Postula tu experiencia
        </h1>
        <p className="text-[15px] text-brand-smoke leading-[1.7] mb-4">
          La lista es corta. Convéncenos.
        </p>
        <p className="text-[13px] text-brand-smoke/50 leading-[1.6] mb-10 max-w-[480px]">
          La experiencia debe ser exclusivamente diseñada para THE LIST; no puede ser genérica ni estar ofrecida en otro canal.
        </p>
        <button
          onClick={() => setFormOpen(true)}
          className="font-sans text-[13px] font-medium tracking-[0.08em] uppercase px-10 py-[14px] rounded-full bg-brand-white text-brand-black border-none hover:-translate-y-px transition-all duration-300 cursor-pointer"
        >
          Postular experiencia
        </button>
      </section>

      <HostApplicationForm isOpen={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
