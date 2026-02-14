"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Drops from "@/components/Drops";
import Salas from "@/components/Salas";
import TheDoor from "@/components/TheDoor";
import HostApplyWizard from "@/components/HostApplyWizard";
import Footer from "@/components/Footer";

export default function Home() {
  const [doorOpen, setDoorOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);

  // Auto-open wizard if ?apply=true (e.g. redirected from /host/apply)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("apply") === "true") {
      setApplyOpen(true);
    }
  }, []);

  return (
    <>
      <Navbar onOpenDoor={() => setDoorOpen(true)} onOpenApply={() => setApplyOpen(true)} />
      <Hero onOpenDoor={() => setDoorOpen(true)} />
      <Drops />
      <Salas />
      <Footer />
      <TheDoor isOpen={doorOpen} onClose={() => setDoorOpen(false)} />
      <HostApplyWizard isOpen={applyOpen} onClose={() => setApplyOpen(false)} />
    </>
  );
}
