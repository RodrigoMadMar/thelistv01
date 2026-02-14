export default async function HostLayout({ children }: { children: React.ReactNode }) {
  // Auth is handled by the middleware (exempts /host/apply)
  // and by each page individually for host dashboard routes.
  return (
    <div className="min-h-screen bg-brand-black">
      {children}
    </div>
  );
}
