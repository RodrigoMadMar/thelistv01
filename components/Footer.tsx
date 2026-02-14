export default function Footer() {
  return (
    <footer className="border-t border-brand py-12 px-5 md:px-10 max-w-[1320px] mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-7 md:gap-10 mb-12">
        {/* Brand */}
        <div>
          <a
            href="/"
            className="font-serif text-lg font-medium tracking-wide text-brand-white"
          >
            thelist<span className="text-brand-smoke font-normal">.</span>cl
          </a>
          <p className="text-[13px] text-brand-smoke leading-[1.6] max-w-[260px] mt-3">
            Seleccionamos experiencias que valen la pena.
          </p>
        </div>

        {/* Explorar */}
        <div>
          <h4 className="text-[9px] tracking-[0.15em] uppercase text-brand-smoke mb-4">
            Explorar
          </h4>
          <a
            href="#drops"
            className="block text-[13px] text-brand-silver/50 hover:text-brand-white transition-colors mb-[10px]"
          >
            Drops
          </a>
          <a
            href="#salas"
            className="block text-[13px] text-brand-silver/50 hover:text-brand-white transition-colors mb-[10px]"
          >
            Salas
          </a>
          <a
            href="#"
            className="block text-[13px] text-brand-silver/50 hover:text-brand-white transition-colors mb-[10px]"
          >
            The Door
          </a>
        </div>

        {/* thelist */}
        <div>
          <h4 className="text-[9px] tracking-[0.15em] uppercase text-brand-smoke mb-4">
            thelist
          </h4>
          <a
            href="#"
            className="block text-[13px] text-brand-silver/50 hover:text-brand-white transition-colors mb-[10px]"
          >
            Sobre nosotros
          </a>
          <a
            href="#"
            className="block text-[13px] text-brand-silver/50 hover:text-brand-white transition-colors mb-[10px]"
          >
            The Standard
          </a>
          <a
            href="#"
            className="block text-[13px] text-brand-silver/50 hover:text-brand-white transition-colors mb-[10px]"
          >
            Contacto
          </a>
        </div>

        {/* Conectar */}
        <div>
          <h4 className="text-[9px] tracking-[0.15em] uppercase text-brand-smoke mb-4">
            Conectar
          </h4>
          <a
            href="#"
            target="_blank"
            className="block text-[13px] text-brand-silver/50 hover:text-brand-white transition-colors mb-[10px]"
          >
            Instagram
          </a>
          <a
            href="/host/apply"
            className="block text-[13px] text-brand-silver/50 hover:text-brand-white transition-colors mb-[10px]"
          >
            Postular como host
          </a>
        </div>
      </div>

      {/* Bottom */}
      <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-brand text-[11px] text-brand-smoke/40 gap-3">
        <span>© 2025 thelist.cl</span>
        <div className="flex gap-5">
          <a href="#" className="hover:text-brand-smoke transition-colors">
            Términos
          </a>
          <a href="#" className="hover:text-brand-smoke transition-colors">
            Privacidad
          </a>
        </div>
      </div>
    </footer>
  );
}
