"use client";

import { useRouter } from "next/navigation";

interface ReservationDateFilterProps {
  currentDate: string;
}

export default function ReservationDateFilter({ currentDate }: ReservationDateFilterProps) {
  const router = useRouter();
  const todayISO = new Date().toISOString().split("T")[0];

  function handleDateChange(date: string) {
    if (date) {
      router.push(`/host/dashboard/reservations?date=${date}`);
    } else {
      router.push("/host/dashboard/reservations");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <button
        onClick={() => handleDateChange(todayISO)}
        className={`px-4 py-2 rounded-full text-[12px] transition-all cursor-pointer border ${
          currentDate === todayISO
            ? "bg-brand-white text-brand-black border-brand-white"
            : "bg-transparent text-brand-smoke border-brand hover:text-brand-white hover:border-brand-smoke"
        }`}
      >
        Hoy
      </button>
      <button
        onClick={() => handleDateChange("")}
        className={`px-4 py-2 rounded-full text-[12px] transition-all cursor-pointer border ${
          !currentDate
            ? "bg-brand-white text-brand-black border-brand-white"
            : "bg-transparent text-brand-smoke border-brand hover:text-brand-white hover:border-brand-smoke"
        }`}
      >
        Todas
      </button>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={currentDate}
          onChange={(e) => handleDateChange(e.target.value)}
          className="bg-brand-surface border border-brand rounded-lg px-3 py-2 text-[12px] text-brand-white focus:outline-none focus:border-brand-smoke/30 transition-colors [color-scheme:dark]"
        />
      </div>
      {currentDate && currentDate !== todayISO && (
        <span className="text-[12px] text-brand-smoke">
          Filtrando: {currentDate}
        </span>
      )}
    </div>
  );
}
