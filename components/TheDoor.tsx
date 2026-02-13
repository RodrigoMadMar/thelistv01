"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";

interface TheDoorProps {
  isOpen: boolean;
  onClose: () => void;
}

const steps = [
  {
    question: "¿Qué energía buscas?",
    options: ["Algo íntimo", "Algo social", "Algo culinario", "Algo creativo", "Sorpréndeme"],
  },
  {
    question: "¿Con quién vas?",
    options: ["Solo", "En pareja", "Con amigos", "Es un regalo"],
  },
  {
    question: "¿Qué tan fuera de lo común?",
    options: ["Algo seguro", "Un poco raro", "Muy experimental"],
  },
  {
    question: "¿Cuándo?",
    options: ["Hoy", "Este finde", "Esta semana", "Este mes"],
  },
];

const results = [
  {
    title: "Private tasting",
    description: "Luz baja, 8 copas, un host obsesivo.",
    price: "$45.000",
    meta: "Vie 21:00 · 3 cupos",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop",
  },
  {
    title: "Cena ciega",
    description: "No sabes qué comes. No sabes quién cocina.",
    price: "$62.000",
    meta: "Sáb 21:00 · 6 cupos",
    image: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=400&h=300&fit=crop",
  },
  {
    title: "Stand-up a puerta cerrada",
    description: "Un comediante. 20 sillas. Sin grabaciones.",
    price: "$25.000",
    meta: "Jue 22:00 · 2 cupos",
    image: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=400&h=300&fit=crop",
  },
];

export default function TheDoor({ isOpen, onClose }: TheDoorProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<(string | null)[]>(
    Array(steps.length).fill(null)
  );
  const [showResults, setShowResults] = useState(false);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const selectOption = (option: string) => {
    const updated = [...selections];
    updated[currentStep] = option;
    setSelections(updated);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      setShowResults(true);
    }
  };

  const prevStep = () => {
    if (showResults) {
      setShowResults(false);
    } else if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  const reset = useCallback(() => {
    setCurrentStep(0);
    setSelections(Array(steps.length).fill(null));
    setShowResults(false);
  }, []);

  const handleClose = () => {
    onClose();
    setTimeout(reset, 500);
  };

  const progress = showResults
    ? 100
    : ((currentStep + 1) / steps.length) * 100;

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[9000] bg-brand-black flex flex-col items-center justify-center transition-opacity duration-500 ${
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Close */}
      <button
        onClick={handleClose}
        className="absolute top-6 right-5 md:right-10 bg-transparent border-none cursor-pointer text-brand-smoke hover:text-brand-white transition-colors z-10"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-brand">
        <div
          className="h-full bg-brand-white transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      {!showResults && (
        <div className="flex flex-col items-center text-center max-w-[560px] px-6 animate-fade-up">
          <div className="text-[10px] tracking-[0.2em] uppercase text-brand-smoke/40 mb-8">
            Paso {currentStep + 1} de {steps.length}
          </div>

          <h2 className="font-serif text-[clamp(28px,4vw,40px)] font-normal leading-[1.2] mb-10">
            {steps[currentStep].question}
          </h2>

          <div className="flex flex-wrap gap-[10px] justify-center">
            {steps[currentStep].options.map((option) => (
              <button
                key={option}
                onClick={() => selectOption(option)}
                className={`px-7 py-3 border rounded-full font-sans text-[13px] font-light cursor-pointer transition-all ${
                  selections[currentStep] === option
                    ? "border-brand-white bg-brand-white text-brand-black font-normal"
                    : "border-brand text-brand-smoke hover:border-brand-white hover:text-brand-white bg-transparent"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          {/* Nav */}
          <div className="mt-12 flex gap-4">
            {currentStep > 0 && (
              <button
                onClick={prevStep}
                className="font-sans text-xs font-normal tracking-[0.08em] uppercase px-8 py-3 rounded-full bg-transparent text-brand-smoke border border-brand hover:border-brand-smoke hover:text-brand-white transition-all cursor-pointer"
              >
                Atrás
              </button>
            )}
            <button
              onClick={nextStep}
              disabled={!selections[currentStep]}
              className="font-sans text-xs font-normal tracking-[0.08em] uppercase px-8 py-3 rounded-full bg-brand-white text-brand-black border-none hover:-translate-y-px transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:translate-y-0"
            >
              {currentStep === steps.length - 1 ? "Ver mi lista" : "Siguiente"}
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {showResults && (
        <div className="flex flex-col items-center text-center w-full max-w-[900px] px-6 animate-fade-up">
          <h2 className="font-serif text-[32px] font-normal mb-10">
            Tu lista.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-[14px] w-full mb-10">
            {results.map((result) => (
              <div
                key={result.title}
                className="bg-brand-surface border border-brand rounded-[10px] overflow-hidden text-left cursor-pointer hover:border-brand-hover hover:-translate-y-[2px] transition-all"
              >
                <div className="relative w-full h-[160px]">
                  <Image
                    src={result.image}
                    alt={result.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-serif text-[17px] font-normal mb-1">
                    {result.title}
                  </h3>
                  <p className="text-xs text-brand-smoke">{result.description}</p>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-brand text-[11px] text-brand-smoke">
                    <strong className="text-brand-white font-medium text-sm">
                      {result.price}
                    </strong>
                    <span>{result.meta}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <button
              onClick={reset}
              className="font-sans text-xs font-normal tracking-[0.08em] uppercase px-8 py-3 rounded-full bg-transparent text-brand-smoke border border-brand hover:border-brand-smoke hover:text-brand-white transition-all cursor-pointer"
            >
              Empezar de nuevo
            </button>
            <button
              onClick={handleClose}
              className="font-sans text-xs font-normal tracking-[0.08em] uppercase px-8 py-3 rounded-full bg-brand-white text-brand-black border-none hover:-translate-y-px transition-all cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
