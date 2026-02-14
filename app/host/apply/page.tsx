"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// /host/apply now redirects to the home page with the wizard auto-opened.
// No auth required.
export default function HostApplyPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/?apply=true");
  }, [router]);

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center">
      <div className="text-brand-smoke text-[13px]">Redirigiendo...</div>
    </div>
  );
}
