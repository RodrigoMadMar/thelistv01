"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Drops from "@/components/Drops";
import Salas from "@/components/Salas";
import TheDoor from "@/components/TheDoor";
import Footer from "@/components/Footer";

export default function Home() {
  const [doorOpen, setDoorOpen] = useState(false);

  return (
    <>
      <Navbar onOpenDoor={() => setDoorOpen(true)} />
      <Hero onOpenDoor={() => setDoorOpen(true)} />
      <Drops />
      <Salas />
      <Footer />
      <TheDoor isOpen={doorOpen} onClose={() => setDoorOpen(false)} />
    </>
  );
}
