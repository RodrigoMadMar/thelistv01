import type { Lead, ScoutRunResult } from "./types";

const USER_AGENT = "Mozilla/5.0 (compatible; thelistbot/1.0)";
const BASE_URL = "https://comino.cl";

const KNOWN_CITIES = [
  "Santiago",
  "Valparaíso",
  "Viña del Mar",
  "Concepción",
  "La Serena",
  "Puerto Varas",
  "Pucón",
  "Providencia",
  "Las Condes",
  "Vitacura",
  "Ñuñoa",
  "Recoleta",
  "Bellavista",
  "Barrio Italia",
  "Lastarria",
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractListingSlugs(html: string): string[] {
  const regex = /href="https:\/\/comino\.cl\/guia\/([a-z0-9-]+)\/?"/gi;
  const slugs = new Set<string>();

  let match;
  while ((match = regex.exec(html)) !== null) {
    const slug = match[1];
    if (slug && slug.length > 0) {
      slugs.add(slug);
    }
  }

  return Array.from(slugs);
}

function extractCity(address: string): string {
  for (const city of KNOWN_CITIES) {
    if (address.toLowerCase().includes(city.toLowerCase())) {
      return city;
    }
  }
  // Try to get last meaningful part of address
  const parts = address.split(",").map((p) => p.trim());
  if (parts.length >= 2) {
    return parts[parts.length - 1] || parts[parts.length - 2] || "Chile";
  }
  return "Chile";
}

function extractCategories(html: string): string[] {
  const categories: string[] = [];
  const catMap: Record<string, string> = {
    bares: "bar",
    restaurantes: "restaurante",
    cafeterias: "cafetería",
    cafes: "cafetería",
    hoteles: "hotel",
    tiendas: "tienda",
  };

  for (const [key, value] of Object.entries(catMap)) {
    if (html.toLowerCase().includes(`/lugar/${key}/`) || html.toLowerCase().includes(`>${key}<`)) {
      categories.push(value);
    }
  }

  return categories.length > 0 ? categories : ["otro"];
}

function extractName(html: string): string {
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    return h1Match[1].replace(/<[^>]+>/g, "").trim();
  }
  return "";
}

function extractAddress(html: string): string | null {
  // Look for address-like text near the h1 — often in a <p> or <span> after h1
  // Also try structured data
  const addressPatterns = [
    /<p[^>]*class="[^"]*address[^"]*"[^>]*>([\s\S]*?)<\/p>/i,
    /<span[^>]*class="[^"]*address[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
    /<div[^>]*class="[^"]*address[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  ];

  for (const pattern of addressPatterns) {
    const match = html.match(pattern);
    if (match) {
      return match[1].replace(/<[^>]+>/g, "").trim();
    }
  }

  // Look for text that looks like a Chilean address
  const addrRegex = /([A-ZÁ-Ú][a-záéíóúñ]+[\s\w.]+\d+,\s*[A-ZÁ-Ú][a-záéíóúñ]+)/;
  const addrMatch = html.match(addrRegex);
  if (addrMatch) return addrMatch[1];

  return null;
}

function extractPhone(html: string): string | null {
  const telMatch = html.match(/tel:([+\d\s-]+)/i);
  if (telMatch) return telMatch[1].trim();

  const phoneRegex = /(\+56\s*\d[\s\d-]{7,})/;
  const phoneMatch = html.match(phoneRegex);
  if (phoneMatch) return phoneMatch[1].trim();

  return null;
}

function extractWebsite(html: string): string | null {
  // Look for link labeled "Web" or "Sitio web"
  const webLinkRegex = /<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>[^<]*(?:Web|Sitio)[^<]*<\/a>/gi;
  const match = webLinkRegex.exec(html);
  if (match) {
    const url = match[1];
    if (!url.includes("comino.cl") && !url.includes("instagram.com") && !url.includes("facebook.com")) {
      return url;
    }
  }

  // Fallback: any external link that's not social media
  const linkRegex = /<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>/gi;
  let linkMatch;
  while ((linkMatch = linkRegex.exec(html)) !== null) {
    const url = linkMatch[1];
    if (
      !url.includes("comino.cl") &&
      !url.includes("instagram.com") &&
      !url.includes("facebook.com") &&
      !url.includes("twitter.com") &&
      !url.includes("google.com") &&
      !url.includes("wp-content")
    ) {
      return url;
    }
  }

  return null;
}

function extractInstagram(html: string): string | null {
  const igRegex = /instagram\.com\/([a-zA-Z0-9._]+)/gi;
  const match = igRegex.exec(html);
  if (match) {
    const handle = match[1].replace(/\/$/, "");
    const excluded = new Set(["p", "reel", "stories", "explore"]);
    if (!excluded.has(handle.toLowerCase())) return handle;
  }
  return null;
}

function extractPhotos(html: string): string[] {
  const photos: string[] = [];
  const imgRegex = /(?:src|href)="(https?:\/\/comino\.cl\/wp-content\/uploads\/[^"]+)"/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    if (!photos.includes(match[1])) {
      photos.push(match[1]);
    }
  }
  return photos.slice(0, 8);
}

function extractDescription(html: string): string | null {
  // Find the longest paragraph of text
  const paragraphs = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
  let longest = "";

  for (const p of paragraphs) {
    const text = p.replace(/<[^>]+>/g, "").trim();
    if (text.length > longest.length && text.length > 50) {
      longest = text;
    }
  }

  return longest || null;
}

function extractPriceText(html: string): string | null {
  const priceMatch = html.match(/Valor por persona[:\s]*([^<\n]+)/i);
  if (priceMatch) return priceMatch[1].trim();

  const priceMatch2 = html.match(/\$[\d.,]+/);
  if (priceMatch2) return priceMatch2[0];

  return null;
}

function extractHours(html: string): string | null {
  const hoursMatch = html.match(/HORARIOS?[:\s]*([\s\S]*?)(?:<\/|$)/i);
  if (hoursMatch) {
    return hoursMatch[1].replace(/<[^>]+>/g, "").trim().slice(0, 500);
  }
  return null;
}

function extractOccasions(html: string): string[] {
  const occasions: string[] = [];
  const occasionRegex = /(?:After Office|Con Amigos|Romántico|Familiar|Cumpleaños|Celebración|Negocios)/gi;
  let match;
  while ((match = occasionRegex.exec(html)) !== null) {
    if (!occasions.includes(match[0])) {
      occasions.push(match[0]);
    }
  }
  return occasions;
}

export async function discoverComino(
  existingSourceIds: Set<string>,
): Promise<ScoutRunResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const leads: Lead[] = [];

  // 1. Fetch main listing page
  const guiaHtml = await fetchPage(`${BASE_URL}/guia/`);
  if (!guiaHtml) {
    return {
      source: "comino",
      city: "all",
      categories: [],
      leads_found: 0,
      leads_new: 0,
      duration_seconds: (Date.now() - startTime) / 1000,
      errors: ["Could not fetch comino.cl/guia/"],
      leads: [],
    };
  }

  // 2. Extract all listing slugs
  const slugs = extractListingSlugs(guiaHtml);

  // 3. For each slug, fetch and parse if not already in DB
  for (const slug of slugs) {
    const sourceId = `${BASE_URL}/guia/${slug}/`;

    if (existingSourceIds.has(sourceId)) continue;

    try {
      const html = await fetchPage(sourceId);
      if (!html) {
        errors.push(`Could not fetch ${sourceId}`);
        continue;
      }

      const name = extractName(html);
      if (!name) {
        errors.push(`No name found for ${sourceId}`);
        continue;
      }

      const address = extractAddress(html);
      const city = address ? extractCity(address) : "Chile";

      const lead: Lead = {
        name,
        slug: slugify(name),
        source: "comino",
        source_id: sourceId,
        category: extractCategories(html),
        city,
        commune: null,
        address,
        lat: null,
        lng: null,
        rating: null,
        review_count: null,
        price_level: null,
        website: extractWebsite(html),
        phone: extractPhone(html),
        instagram: extractInstagram(html),
        email: null,
        email_source: null,
        email_confidence: null,
        fit_score: null,
        fit_reasoning: null,
        status: "new",
        photos: extractPhotos(html),
        google_types: [],
        description: extractDescription(html),
        generated_email_subject: null,
        generated_email_body: null,
        raw_data: {
          comino_url: sourceId,
          price_text: extractPriceText(html),
          hours: extractHours(html),
          occasion: extractOccasions(html),
        },
      };

      leads.push(lead);
      await delay(500);
    } catch (err) {
      errors.push(`Error processing ${sourceId}: ${(err as Error).message}`);
    }
  }

  const durationSeconds = (Date.now() - startTime) / 1000;

  return {
    source: "comino",
    city: "all",
    categories: [],
    leads_found: leads.length,
    leads_new: leads.length,
    duration_seconds: durationSeconds,
    errors,
    leads,
  };
}
