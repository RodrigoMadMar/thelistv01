export default function HostPaymentsPage() {
  return (
    <div className="p-6 md:p-10 max-w-[960px]">
      <h1 className="font-serif text-[28px] font-normal mb-8">Pagos</h1>

      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-brand-smoke/5 flex items-center justify-center mx-auto mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-smoke/30">
            <path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="font-serif text-[20px] font-normal mb-3 text-brand-smoke">Próximamente</h2>
        <p className="text-[13px] text-brand-smoke/60 max-w-[380px] mx-auto leading-[1.6]">
          Los pagos se procesarán a través de Mercado Pago. Esta sección estará disponible cuando se active el sistema de cobros.
        </p>
      </div>
    </div>
  );
}
