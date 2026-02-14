"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Email o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center px-5">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <a
          href="/"
          className="block text-center font-serif text-2xl font-medium tracking-wide text-brand-white mb-12"
        >
          thelist<span className="text-brand-smoke font-normal">.</span>cl
        </a>

        <h1 className="font-serif text-[28px] font-normal text-brand-white text-center mb-2">
          Ingresar
        </h1>
        <p className="text-[13px] text-brand-smoke text-center mb-10">
          Accede a tu cuenta de thelist.cl
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] uppercase tracking-[0.1em] text-brand-smoke mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-brand-surface border border-brand rounded-lg px-4 py-3 text-[14px] text-brand-white placeholder:text-brand-smoke/40 focus:outline-none focus:border-brand-smoke/30 transition-colors"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.1em] text-brand-smoke mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-brand-surface border border-brand rounded-lg px-4 py-3 text-[14px] text-brand-white placeholder:text-brand-smoke/40 focus:outline-none focus:border-brand-smoke/30 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-[13px] text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full font-sans text-[13px] font-medium tracking-[0.08em] uppercase px-8 py-[14px] rounded-full bg-brand-white text-brand-black hover:-translate-y-px transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <p className="text-[13px] text-brand-smoke text-center mt-8">
          ¿No tienes cuenta?{" "}
          <a
            href="/register"
            className="text-brand-white hover:text-brand-lime transition-colors"
          >
            Crear cuenta
          </a>
        </p>
      </div>
    </div>
  );
}
