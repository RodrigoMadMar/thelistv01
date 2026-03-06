"use client";

import { useState, useEffect, useCallback } from "react";

/* ── Types ── */
interface Lead {
  id: string;
  name: string;
  slug: string;
  source: string;
  source_id: string;
  category: string[];
  city: string;
  commune: string | null;
  address: string | null;
  rating: number | null;
  review_count: number | null;
  price_level: number | null;
  website: string | null;
  phone: string | null;
  instagram: string | null;
  email: string | null;
  email_source: string | null;
  status: string;
  description: string | null;
  generated_email_subject: string | null;
  generated_email_body: string | null;
  created_at: string;
}

interface Stats {
  total: number;
  new: number;
  with_website: number;
  with_email: number;
}

interface ScrapeRun {
  id: string;
  source: string;
  city: string;
  category: string;
  leads_found: number;
  leads_new: number;
  duration_seconds: number;
  created_at: string;
}

/* ── Constants ── */
const STATUSES = ["new", "qualified", "emailed", "responded", "converted", "rejected"] as const;
const STATUS_COLORS: Record<string, string> = {
  new: "bg-[#d4a857]/20 text-[#d4a857] border-[#d4a857]/30",
  qualified: "bg-[#60a5fa]/20 text-[#60a5fa] border-[#60a5fa]/30",
  emailed: "bg-[#c084fc]/20 text-[#c084fc] border-[#c084fc]/30",
  responded: "bg-[#60a5fa]/20 text-[#60a5fa] border-[#60a5fa]/30",
  converted: "bg-[#4ade80]/20 text-[#4ade80] border-[#4ade80]/30",
  rejected: "bg-[#f87171]/20 text-[#f87171] border-[#f87171]/30",
};

const CITIES = ["Santiago", "Valparaíso", "Viña del Mar", "Concepción", "La Serena", "Puerto Varas", "Pucón"];
const CATEGORIES = ["restaurantes", "bares", "cafeterias", "outdoor", "wellness", "talleres"];

/* ── Helpers ── */
function apiFetch(path: string, key: string, opts: RequestInit = {}) {
  return fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "x-scout-key": key,
      ...(opts.headers || {}),
    },
  });
}

/* ── Component ── */
export default function ScoutDashboard() {
  const [adminKey, setAdminKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Data
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, new: 0, with_website: 0, with_email: 0 });
  const [recentRuns, setRecentRuns] = useState<ScrapeRun[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // Filters
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterMinRating, setFilterMinRating] = useState("");

  // Discovery
  const [selectedCities, setSelectedCities] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [discovering, setDiscovering] = useState(false);
  const [discoverResult, setDiscoverResult] = useState<string>("");
  const [discoveringComino, setDiscoveringComino] = useState(false);
  const [cominoResult, setCominoResult] = useState<string>("");

  // Lead actions
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [generatingEmail, setGeneratingEmail] = useState<string | null>(null);
  const [enriching, setEnriching] = useState<string | null>(null);

  // Loading
  const [loading, setLoading] = useState(false);

  /* ── Fetch data ── */
  const fetchData = useCallback(async () => {
    if (!adminKey) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (filterStatus) params.set("status", filterStatus);
      if (filterCity) params.set("city", filterCity);
      if (filterMinRating) params.set("minRating", filterMinRating);

      const res = await apiFetch(`/api/scout/status?${params}`, adminKey);
      if (res.status === 401) {
        setAuthenticated(false);
        setLoginError("Clave inválida");
        return;
      }
      const data = await res.json();
      setLeads(data.leads || []);
      setStats(data.stats || { total: 0, new: 0, with_website: 0, with_email: 0 });
      setRecentRuns(data.recent_runs || []);
      setTotal(data.total || 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [adminKey, page, filterStatus, filterCity, filterMinRating]);

  useEffect(() => {
    if (authenticated) fetchData();
  }, [authenticated, fetchData]);

  /* ── Login ── */
  const handleLogin = async () => {
    setLoginError("");
    const res = await apiFetch("/api/scout/status?page=1", adminKey);
    if (res.status === 401) {
      setLoginError("Clave inválida");
      return;
    }
    setAuthenticated(true);
  };

  /* ── Discovery: Google Maps ── */
  const handleDiscover = async () => {
    if (selectedCities.size === 0 || selectedCategories.size === 0) return;
    setDiscovering(true);
    setDiscoverResult("");
    try {
      const res = await apiFetch("/api/scout/discover", adminKey, {
        method: "POST",
        body: JSON.stringify({
          cities: Array.from(selectedCities),
          categories: Array.from(selectedCategories),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDiscoverResult(`Encontrados: ${data.leads_found} | Insertados: ${data.leads_inserted} | ${data.duration_seconds.toFixed(1)}s`);
        fetchData();
      } else {
        setDiscoverResult(`Error: ${data.error}`);
      }
    } catch (err) {
      setDiscoverResult(`Error: ${(err as Error).message}`);
    } finally {
      setDiscovering(false);
    }
  };

  /* ── Discovery: Comino ── */
  const handleDiscoverComino = async () => {
    setDiscoveringComino(true);
    setCominoResult("");
    try {
      const res = await apiFetch("/api/scout/discover-comino", adminKey, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setCominoResult(`Encontrados: ${data.leads_found} | Insertados: ${data.leads_inserted} | ${data.duration_seconds.toFixed(1)}s`);
        fetchData();
      } else {
        setCominoResult(`Error: ${data.error}`);
      }
    } catch (err) {
      setCominoResult(`Error: ${(err as Error).message}`);
    } finally {
      setDiscoveringComino(false);
    }
  };

  /* ── Generate Email ── */
  const handleGenerateEmail = async (leadId: string) => {
    setGeneratingEmail(leadId);
    try {
      const res = await apiFetch("/api/scout/generate-email", adminKey, {
        method: "POST",
        body: JSON.stringify({ lead_id: leadId }),
      });
      const data = await res.json();
      if (data.success) {
        setLeads((prev) =>
          prev.map((l) =>
            l.id === leadId
              ? { ...l, generated_email_subject: data.subject, generated_email_body: data.body }
              : l,
          ),
        );
        setExpandedEmail(leadId);
      }
    } catch {
      // ignore
    } finally {
      setGeneratingEmail(null);
    }
  };

  /* ── Enrich ── */
  const handleEnrich = async (leadId: string) => {
    setEnriching(leadId);
    try {
      const res = await apiFetch("/api/scout/enrich", adminKey, {
        method: "POST",
        body: JSON.stringify({ lead_id: leadId }),
      });
      const data = await res.json();
      if (data.success) {
        setLeads((prev) =>
          prev.map((l) =>
            l.id === leadId
              ? { ...l, email: data.email || l.email, instagram: data.instagram || l.instagram }
              : l,
          ),
        );
      }
    } catch {
      // ignore
    } finally {
      setEnriching(null);
    }
  };

  /* ── Update Status ── */
  const handleStatusChange = async (leadId: string, newStatus: string) => {
    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)),
    );
    await apiFetch("/api/scout/update-status", adminKey, {
      method: "PATCH",
      body: JSON.stringify({ lead_id: leadId, status: newStatus }),
    });
  };

  /* ── Copy to clipboard ── */
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  /* ── Toggle helpers ── */
  const toggleCity = (city: string) => {
    setSelectedCities((prev) => {
      const next = new Set(prev);
      if (next.has(city)) next.delete(city);
      else next.add(city);
      return next;
    });
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  /* ── LOGIN SCREEN ── */
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <p className="text-[#d4a857] text-sm font-medium tracking-widest uppercase" style={{ fontFamily: "Playfair Display, serif" }}>
              thelist.cl
            </p>
            <h1 className="text-[#e8e4df] text-2xl mt-2" style={{ fontFamily: "Playfair Display, serif" }}>
              Scout Dashboard
            </h1>
          </div>
          <div className="space-y-3">
            <input
              type="password"
              placeholder="Admin key"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full bg-[#141414] border border-[#222] text-[#e8e4df] px-4 py-3 rounded-lg focus:outline-none focus:border-[#d4a857] transition-colors"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
            {loginError && (
              <p className="text-[#f87171] text-sm">{loginError}</p>
            )}
            <button
              onClick={handleLogin}
              className="w-full bg-[#d4a857] text-[#0a0a0a] py-3 rounded-lg font-medium hover:bg-[#e0b96a] transition-colors"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Entrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── MAIN DASHBOARD ── */
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e8e4df]" style={{ fontFamily: "Outfit, sans-serif" }}>
      <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#d4a857] text-sm font-medium tracking-widest uppercase" style={{ fontFamily: "Playfair Display, serif" }}>
              thelist.cl
            </p>
            <h1 className="text-3xl font-light mt-1" style={{ fontFamily: "Playfair Display, serif" }}>
              Scout Dashboard
            </h1>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 bg-[#141414] border border-[#222] rounded-lg text-sm text-[#8a8580] hover:text-[#e8e4df] hover:border-[#333] transition-colors disabled:opacity-50"
          >
            {loading ? "Cargando..." : "Refrescar"}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total leads", value: stats.total },
            { label: "Nuevos", value: stats.new },
            { label: "Con Website", value: stats.with_website },
            { label: "Con Email", value: stats.with_email },
          ].map((s) => (
            <div key={s.label} className="bg-[#141414] border border-[#222] rounded-xl p-5">
              <p className="text-[#8a8580] text-xs uppercase tracking-wider">{s.label}</p>
              <p className="text-2xl font-light mt-1" style={{ fontFamily: "Playfair Display, serif" }}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="bg-[#141414] border border-[#222] text-[#e8e4df] px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-[#d4a857]"
          >
            <option value="">Todos los status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={filterCity}
            onChange={(e) => { setFilterCity(e.target.value); setPage(1); }}
            className="bg-[#141414] border border-[#222] text-[#e8e4df] px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-[#d4a857]"
          >
            <option value="">Todas las ciudades</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={filterMinRating}
            onChange={(e) => { setFilterMinRating(e.target.value); setPage(1); }}
            className="bg-[#141414] border border-[#222] text-[#e8e4df] px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-[#d4a857]"
          >
            <option value="">Rating mínimo</option>
            <option value="4">4.0+</option>
            <option value="4.3">4.3+</option>
            <option value="4.5">4.5+</option>
            <option value="4.7">4.7+</option>
          </select>
        </div>

        {/* Discovery Panel: Google Maps */}
        <div className="bg-[#141414] border border-[#222] rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-light" style={{ fontFamily: "Playfair Display, serif" }}>
            Discovery — Google Maps
          </h2>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-[#8a8580] uppercase tracking-wider mb-2">Ciudades</p>
              <div className="flex flex-wrap gap-2">
                {CITIES.map((city) => (
                  <button
                    key={city}
                    onClick={() => toggleCity(city)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      selectedCities.has(city)
                        ? "bg-[#d4a857]/20 border-[#d4a857]/50 text-[#d4a857]"
                        : "bg-[#0a0a0a] border-[#222] text-[#8a8580] hover:border-[#333]"
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-[#8a8580] uppercase tracking-wider mb-2">Categorías</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      selectedCategories.has(cat)
                        ? "bg-[#d4a857]/20 border-[#d4a857]/50 text-[#d4a857]"
                        : "bg-[#0a0a0a] border-[#222] text-[#8a8580] hover:border-[#333]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleDiscover}
              disabled={discovering || selectedCities.size === 0 || selectedCategories.size === 0}
              className="px-5 py-2.5 bg-[#d4a857] text-[#0a0a0a] rounded-lg font-medium text-sm hover:bg-[#e0b96a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {discovering ? "Buscando..." : "Buscar"}
            </button>
            {discoverResult && (
              <p className="text-sm text-[#8a8580]">{discoverResult}</p>
            )}
          </div>
        </div>

        {/* Discovery Panel: Comino */}
        <div className="bg-[#141414] border border-[#222] rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-light" style={{ fontFamily: "Playfair Display, serif" }}>
            Discovery — Comino.cl
          </h2>
          <div className="flex items-center gap-4">
            <button
              onClick={handleDiscoverComino}
              disabled={discoveringComino}
              className="px-5 py-2.5 bg-[#d4a857] text-[#0a0a0a] rounded-lg font-medium text-sm hover:bg-[#e0b96a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {discoveringComino ? "Scrapeando..." : "Scrapear Comino.cl"}
            </button>
            {cominoResult && (
              <p className="text-sm text-[#8a8580]">{cominoResult}</p>
            )}
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-[#141414] border border-[#222] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#222] text-[#8a8580] text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Fuente</th>
                  <th className="text-left px-4 py-3">Nombre</th>
                  <th className="text-left px-4 py-3">Ciudad</th>
                  <th className="text-left px-4 py-3">Comuna</th>
                  <th className="text-left px-4 py-3">Rating</th>
                  <th className="text-left px-4 py-3">Reviews</th>
                  <th className="text-left px-4 py-3">Web</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <>
                    <tr key={lead.id} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a]/50 transition-colors">
                      <td className="px-4 py-3">
                        <span title={lead.source}>
                          {lead.source === "google_maps" ? "📍" : "🌶️"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-[#e8e4df]">{lead.name}</td>
                      <td className="px-4 py-3 text-[#8a8580]">{lead.city}</td>
                      <td className="px-4 py-3 text-[#8a8580]">{lead.commune || "—"}</td>
                      <td className="px-4 py-3">
                        {lead.rating ? (
                          <span className="text-[#d4a857]">{lead.rating.toFixed(1)}</span>
                        ) : (
                          <span className="text-[#333]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#8a8580]">{lead.review_count ?? "—"}</td>
                      <td className="px-4 py-3">
                        {lead.website ? (
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#60a5fa] hover:underline truncate block max-w-[120px]"
                          >
                            Link
                          </a>
                        ) : (
                          <span className="text-[#333]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {lead.email ? (
                          <span className="text-[#4ade80] truncate block max-w-[160px]" title={lead.email}>
                            {lead.email}
                          </span>
                        ) : (
                          <span className="text-[#333]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                          className={`px-2 py-1 rounded text-xs border ${STATUS_COLORS[lead.status] || "bg-[#222] text-[#8a8580] border-[#333]"} bg-transparent focus:outline-none cursor-pointer`}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s} className="bg-[#141414] text-[#e8e4df]">
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              if (lead.generated_email_subject) {
                                setExpandedEmail(expandedEmail === lead.id ? null : lead.id);
                              } else {
                                handleGenerateEmail(lead.id);
                              }
                            }}
                            disabled={generatingEmail === lead.id}
                            className="px-2 py-1 text-xs bg-[#0a0a0a] border border-[#222] rounded hover:border-[#c084fc] hover:text-[#c084fc] transition-colors disabled:opacity-50"
                            title={lead.generated_email_subject ? "Ver email" : "Generar email"}
                          >
                            {generatingEmail === lead.id ? "..." : "✉"}
                          </button>

                          {lead.website && !lead.email && (
                            <button
                              onClick={() => handleEnrich(lead.id)}
                              disabled={enriching === lead.id}
                              className="px-2 py-1 text-xs bg-[#0a0a0a] border border-[#222] rounded hover:border-[#60a5fa] hover:text-[#60a5fa] transition-colors disabled:opacity-50"
                              title="Buscar email"
                            >
                              {enriching === lead.id ? "..." : "🔍"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded email row */}
                    {expandedEmail === lead.id && lead.generated_email_subject && (
                      <tr key={`${lead.id}-email`} className="border-b border-[#1a1a1a]">
                        <td colSpan={10} className="px-4 py-4">
                          <div className="bg-[#0a0a0a] border border-[#222] rounded-lg p-4 space-y-3 max-w-2xl ml-8">
                            <div>
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-[#8a8580] uppercase tracking-wider">Subject</p>
                                <button
                                  onClick={() => copyToClipboard(lead.generated_email_subject!)}
                                  className="text-xs text-[#8a8580] hover:text-[#e8e4df] transition-colors"
                                >
                                  Copiar
                                </button>
                              </div>
                              <p className="text-[#e8e4df] mt-1">{lead.generated_email_subject}</p>
                            </div>
                            <div>
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-[#8a8580] uppercase tracking-wider">Body</p>
                                <button
                                  onClick={() => copyToClipboard(lead.generated_email_body!)}
                                  className="text-xs text-[#8a8580] hover:text-[#e8e4df] transition-colors"
                                >
                                  Copiar
                                </button>
                              </div>
                              <p className="text-[#e8e4df] mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                                {lead.generated_email_body}
                              </p>
                            </div>
                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={() =>
                                  copyToClipboard(
                                    `Subject: ${lead.generated_email_subject}\n\n${lead.generated_email_body}`,
                                  )
                                }
                                className="px-3 py-1.5 text-xs bg-[#d4a857]/20 border border-[#d4a857]/30 text-[#d4a857] rounded hover:bg-[#d4a857]/30 transition-colors"
                              >
                                Copiar Email Completo
                              </button>
                              <button
                                onClick={() => handleGenerateEmail(lead.id)}
                                disabled={generatingEmail === lead.id}
                                className="px-3 py-1.5 text-xs bg-[#222] border border-[#333] text-[#8a8580] rounded hover:text-[#e8e4df] transition-colors disabled:opacity-50"
                              >
                                {generatingEmail === lead.id ? "Generando..." : "↻ Regenerar"}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 50 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#222]">
              <p className="text-sm text-[#8a8580]">
                {total} leads total — Página {page}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm bg-[#0a0a0a] border border-[#222] rounded text-[#8a8580] hover:text-[#e8e4df] disabled:opacity-30"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page * 50 >= total}
                  className="px-3 py-1 text-sm bg-[#0a0a0a] border border-[#222] rounded text-[#8a8580] hover:text-[#e8e4df] disabled:opacity-30"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Recent Runs */}
        {recentRuns.length > 0 && (
          <div className="bg-[#141414] border border-[#222] rounded-xl p-6 space-y-3">
            <h2 className="text-lg font-light" style={{ fontFamily: "Playfair Display, serif" }}>
              Últimas Ejecuciones
            </h2>
            <div className="space-y-2">
              {recentRuns.map((run) => (
                <div key={run.id} className="flex items-center gap-4 text-sm text-[#8a8580]">
                  <span>{run.source === "google_maps" ? "📍" : "🌶️"}</span>
                  <span className="text-[#e8e4df]">{run.city || "—"}</span>
                  <span>{run.category || "—"}</span>
                  <span className="text-[#d4a857]">{run.leads_found} encontrados</span>
                  <span className="text-[#4ade80]">{run.leads_new} nuevos</span>
                  <span>{run.duration_seconds?.toFixed(1)}s</span>
                  <span className="text-xs">{new Date(run.created_at).toLocaleString("es-CL")}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
