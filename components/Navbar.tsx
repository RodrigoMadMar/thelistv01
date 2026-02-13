"use client";

interface NavbarProps {
  onOpenDoor: () => void;
}

export default function Navbar({ onOpenDoor }: NavbarProps) {
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
        <a
          href="#"
          className="text-[11px] font-normal tracking-[0.1em] uppercase text-brand-smoke hover:text-brand-white transition-colors"
        >
          Postular como host
        </a>
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
        <button className="hidden md:block font-sans text-[11px] font-normal tracking-[0.1em] uppercase text-brand-black bg-brand-white border-none px-5 py-2 rounded-full hover:bg-white hover:-translate-y-px transition-all">
          Ingresar
        </button>

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
