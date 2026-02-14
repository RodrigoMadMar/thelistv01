"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { validateOnboardingToken, completeOnboarding } from "@/lib/onboarding-actions";

const STEPS = [
  { label: "Contraseña", shortLabel: "1" },
  { label: "Datos legales", shortLabel: "2" },
  { label: "Bancarios", shortLabel: "3" },
  { label: "Términos", shortLabel: "4" },
];

export default function HostOnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-brand-black flex items-center justify-center">
        <p className="text-brand-smoke text-[14px]">Cargando...</p>
      </div>
    }>
      <OnboardingWizard />
    </Suspense>
  );
}

function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  // Token validation
  const [validating, setValidating] = useState(true);
  const [tokenError, setTokenError] = useState("");
  const [inviteData, setInviteData] = useState<{
    id: string;
    email: string;
    application_type: string;
    application_id: string;
  } | null>(null);
  const [applicationData, setApplicationData] = useState<Record<string, unknown> | null>(null);

  // Wizard state
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Password
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 2: Legal data
  const [legalName, setLegalName] = useState("");
  const [rut, setRut] = useState("");
  const [legalRepName, setLegalRepName] = useState("");
  const [legalRepRut, setLegalRepRut] = useState("");

  // Step 3: Banking
  const [bankAccount, setBankAccount] = useState("");
  const [bankType, setBankType] = useState<"vista" | "corriente">("vista");

  // Step 4: Terms
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Validate token on mount
  useEffect(() => {
    async function validate() {
      if (!token) {
        setTokenError("No se proporcionó un token de onboarding.");
        setValidating(false);
        return;
      }

      const result = await validateOnboardingToken(token);

      if (result.error) {
        setTokenError(result.error);
        setValidating(false);
        return;
      }

      setInviteData(result.invite || null);
      setApplicationData(result.application || null);
      setValidating(false);
    }
    validate();
  }, [token]);

  function canProceed(): boolean {
    switch (step) {
      case 0:
        return password.length >= 8 && password === confirmPassword;
      case 1:
        return legalName.trim() !== "" && rut.trim() !== "" && legalRepName.trim() !== "" && legalRepRut.trim() !== "";
      case 2:
        return bankAccount.trim() !== "";
      case 3:
        return termsAccepted;
      default:
        return false;
    }
  }

  async function handleFinish() {
    if (!canProceed()) return;
    setSubmitting(true);
    setError("");

    const result = await completeOnboarding({
      token,
      password,
      legalName,
      rut,
      legalRepName,
      legalRepRut,
      bankAccount,
      bankType,
      termsAccepted,
    });

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    // Redirect to login (user needs to sign in with new credentials)
    router.push("/login?onboarding=success&email=" + encodeURIComponent(result.email || ""));
  }

  function handleNext() {
    if (!canProceed()) return;
    if (step === STEPS.length - 1) {
      handleFinish();
    } else {
      setStep(step + 1);
      setError("");
    }
  }

  const inputClass = "w-full bg-brand-surface border border-brand rounded-lg px-4 py-3 text-[14px] text-brand-white placeholder:text-brand-smoke/40 focus:outline-none focus:border-brand-smoke/30 transition-colors";
  const labelClass = "block text-[11px] uppercase tracking-[0.1em] text-brand-smoke mb-2";

  // Loading state
  if (validating) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center">
        <p className="text-brand-smoke text-[14px]">Validando invitación...</p>
      </div>
    );
  }

  // Token error
  if (tokenError) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="mb-6">
            <a href="/" className="font-serif text-xl font-medium tracking-wide text-brand-white">
              thelist<span className="text-brand-smoke font-normal">.</span>cl
            </a>
          </div>
          <div className="p-8 rounded-2xl border border-red-400/20 bg-red-400/[0.03]">
            <h1 className="font-serif text-[24px] font-normal text-brand-white mb-3">Link inválido o expirado</h1>
            <p className="text-[14px] text-brand-smoke leading-relaxed mb-4">{tokenError}</p>
            <p className="text-[12px] text-brand-smoke/60">
              Si crees que es un error, contacta al equipo de THE LIST.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Experience name for display
  const experienceName = applicationData?.experience_name || "tu experiencia";

  return (
    <div className="min-h-screen bg-brand-black">
      {/* Header */}
      <header className="h-16 flex items-center justify-center border-b border-brand">
        <a href="/" className="font-serif text-lg font-medium tracking-wide text-brand-white">
          thelist<span className="text-brand-smoke font-normal">.</span>cl
        </a>
      </header>

      <div className="max-w-[560px] mx-auto px-4 py-10">
        {/* Welcome */}
        <div className="text-center mb-10">
          <h1 className="font-serif text-[28px] font-normal text-brand-white mb-2">Bienvenido a THE LIST</h1>
          <p className="text-[14px] text-brand-smoke">
            Tu experiencia <span className="text-brand-white">&quot;{experienceName as string}&quot;</span> fue aprobada.
            Completa tu registro para activar tu cuenta.
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={i} className="flex-1 flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-medium transition-colors ${
                i < step
                  ? "bg-brand-lime text-brand-black"
                  : i === step
                  ? "bg-brand-white text-brand-black"
                  : "bg-brand-surface text-brand-smoke border border-brand"
              }`}>
                {i < step ? "✓" : s.shortLabel}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px ${i < step ? "bg-brand-lime" : "bg-brand"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step title */}
        <h2 className="font-serif text-[20px] font-normal text-brand-white mb-6">
          {STEPS[step].label}
        </h2>

        {/* Step content */}
        <div className="space-y-5 mb-8">
          {step === 0 && (
            <>
              <p className="text-[13px] text-brand-smoke mb-4">
                Tu email será <strong className="text-brand-white">{inviteData?.email}</strong>. Crea una contraseña segura.
              </p>
              <div>
                <label className={labelClass}>Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Mínimo 8 caracteres"
                />
                {password && password.length < 8 && (
                  <p className="text-[11px] text-red-400/70 mt-1">Mínimo 8 caracteres</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Confirmar contraseña</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Repite tu contraseña"
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-[11px] text-red-400/70 mt-1">Las contraseñas no coinciden</p>
                )}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <p className="text-[13px] text-brand-smoke mb-4">
                Datos legales de tu empresa o persona.
              </p>
              <div>
                <label className={labelClass}>Razón Social</label>
                <input
                  type="text"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className={inputClass}
                  placeholder="Ej: Restaurante Mi Cocina SpA"
                />
              </div>
              <div>
                <label className={labelClass}>RUT</label>
                <input
                  type="text"
                  value={rut}
                  onChange={(e) => setRut(e.target.value)}
                  className={inputClass}
                  placeholder="Ej: 76.123.456-7"
                />
              </div>
              <div>
                <label className={labelClass}>Persona natural responsable</label>
                <input
                  type="text"
                  value={legalRepName}
                  onChange={(e) => setLegalRepName(e.target.value)}
                  className={inputClass}
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <label className={labelClass}>RUT persona natural responsable</label>
                <input
                  type="text"
                  value={legalRepRut}
                  onChange={(e) => setLegalRepRut(e.target.value)}
                  className={inputClass}
                  placeholder="Ej: 12.345.678-9"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-[13px] text-brand-smoke mb-4">
                Datos bancarios para recibir pagos. Solo bancos de Chile.
              </p>
              <div>
                <label className={labelClass}>Número de cuenta</label>
                <input
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className={inputClass}
                  placeholder="Número de cuenta bancaria"
                />
              </div>
              <div>
                <label className={labelClass}>Tipo de cuenta</label>
                <select
                  value={bankType}
                  onChange={(e) => setBankType(e.target.value as "vista" | "corriente")}
                  className={inputClass + " cursor-pointer"}
                >
                  <option value="vista">Cuenta Vista</option>
                  <option value="corriente">Cuenta Corriente</option>
                </select>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-[13px] text-brand-smoke mb-4">
                Para finalizar, acepta los términos y condiciones de THE LIST.
              </p>
              <div className="p-5 rounded-xl border border-brand bg-brand-surface">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 cursor-pointer accent-brand-lime"
                  />
                  <span className="text-[13px] text-brand-smoke">
                    Acepto los{" "}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-brand-white underline underline-offset-2 hover:text-brand-lime transition-colors bg-transparent border-none cursor-pointer p-0 text-[13px]"
                    >
                      términos y condiciones
                    </button>{" "}
                    de THE LIST.
                  </span>
                </label>
              </div>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg border border-red-400/20 bg-red-400/[0.05] text-[13px] text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center">
          {step > 0 ? (
            <button
              onClick={() => { setStep(step - 1); setError(""); }}
              className="px-5 py-2.5 rounded-full border border-brand text-[12px] text-brand-smoke hover:text-brand-white hover:border-brand-smoke transition-all cursor-pointer bg-transparent"
            >
              Atrás
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={handleNext}
            disabled={!canProceed() || submitting}
            className="px-8 py-3 rounded-full bg-brand-white text-brand-black text-[12px] font-medium uppercase tracking-[0.08em] hover:-translate-y-px transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-none"
          >
            {submitting
              ? "Creando cuenta..."
              : step === STEPS.length - 1
              ? "Finalizar registro"
              : "Continuar"}
          </button>
        </div>
      </div>

      {/* Terms modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-w-lg w-full max-h-[80vh] overflow-y-auto bg-brand-black border border-brand rounded-2xl p-8">
            <h3 className="font-serif text-[20px] font-normal text-brand-white mb-4">Términos y Condiciones</h3>
            <div className="text-[13px] text-brand-smoke leading-relaxed space-y-3">
              <p>
                Los presentes Términos y Condiciones regulan la relación entre THE LIST y los hosts
                que publican experiencias en la plataforma.
              </p>
              <p>
                Al aceptar estos términos, el host se compromete a ofrecer experiencias exclusivas
                a través de THE LIST, cumplir con los estándares de calidad establecidos, y respetar
                las políticas de cancelación y reservas de la plataforma.
              </p>
              <p>
                THE LIST se reserva el derecho de pausar o remover experiencias que no cumplan con
                los estándares de calidad o que reciban quejas recurrentes de los miembros.
              </p>
              <p className="text-brand-smoke/50 italic">
                (Texto placeholder — Los términos definitivos serán publicados próximamente.)
              </p>
            </div>
            <button
              onClick={() => setShowTermsModal(false)}
              className="mt-6 px-6 py-2.5 rounded-full bg-brand-white text-brand-black text-[12px] font-medium uppercase tracking-[0.08em] cursor-pointer border-none hover:-translate-y-px transition-all"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
