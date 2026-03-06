import {
  CITIES,
  CATEGORIES,
  MIN_RATING,
  MIN_REVIEWS,
  MAX_RESULTS_PER_QUERY,
  KNOWN_COMMUNES,
} from "./config";
import type { Lead, ScoutRunResult } from "./types";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.types",
  "places.primaryType",
  "places.googleMapsUri",
  "places.photos",
].join(",");

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function extractCommune(address: string): string | null {
  for (const commune of KNOWN_COMMUNES) {
    if (address.includes(commune)) return commune;
  }
  return null;
}

function parsePriceLevel(level: string | undefined): number | null {
  if (!level) return null;
  const map: Record<string, number> = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };
  return map[level] ?? null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface PlaceResult {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  types?: string[];
  primaryType?: string;
  googleMapsUri?: string;
  photos?: { name: string }[];
}

export async function discoverLeads(
  cities: string[],
  categories: string[],
  existingSourceIds: Set<string>,
): Promise<ScoutRunResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_MAPS_API_KEY not configured");

  const startTime = Date.now();
  const allLeads: Lead[] = [];
  const seenIds = new Set<string>(existingSourceIds);
  const errors: string[] = [];
  const categoryNames: string[] = [];

  for (const categoryKey of categories) {
    const cat = CATEGORIES[categoryKey];
    if (!cat) {
      errors.push(`Unknown category: ${categoryKey}`);
      continue;
    }
    categoryNames.push(categoryKey);

    for (const cityName of cities) {
      const cityCoords = CITIES[cityName];
      if (!cityCoords) {
        errors.push(`Unknown city: ${cityName}`);
        continue;
      }

      for (const query of cat.queries) {
        try {
          const textQuery = `${query} en ${cityName}, Chile`;

          const res = await fetch(
            "https://places.googleapis.com/v1/places:searchText",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": apiKey,
                "X-Goog-FieldMask": FIELD_MASK,
              },
              body: JSON.stringify({
                textQuery,
                languageCode: "es",
                regionCode: "CL",
                maxResultCount: MAX_RESULTS_PER_QUERY,
                locationBias: {
                  circle: {
                    center: {
                      latitude: cityCoords.lat,
                      longitude: cityCoords.lng,
                    },
                    radius: 15000,
                  },
                },
              }),
            },
          );

          if (!res.ok) {
            const errText = await res.text();
            errors.push(`API error for "${textQuery}": ${res.status} ${errText}`);
            continue;
          }

          const data = await res.json();
          const places: PlaceResult[] = data.places || [];

          for (const place of places) {
            if (seenIds.has(place.id)) continue;
            if (place.rating && place.rating < MIN_RATING) continue;
            if (place.userRatingCount && place.userRatingCount < MIN_REVIEWS) continue;

            seenIds.add(place.id);

            const name = place.displayName?.text || "Sin nombre";
            const address = place.formattedAddress || "";

            const lead: Lead = {
              name,
              slug: slugify(name),
              source: "google_maps",
              source_id: place.id,
              category: cat.thelistCategory,
              city: cityName,
              commune: extractCommune(address),
              address,
              lat: place.location?.latitude ?? null,
              lng: place.location?.longitude ?? null,
              rating: place.rating ?? null,
              review_count: place.userRatingCount ?? null,
              price_level: parsePriceLevel(place.priceLevel),
              website: place.websiteUri ?? null,
              phone: place.internationalPhoneNumber || place.nationalPhoneNumber || null,
              instagram: null,
              email: null,
              email_source: null,
              email_confidence: null,
              fit_score: null,
              fit_reasoning: null,
              status: "new",
              photos: (place.photos || [])
                .slice(0, 5)
                .map((p) => `https://places.googleapis.com/v1/${p.name}/media?maxHeightPx=800&key=${apiKey}`),
              google_types: place.types || [],
              description: null,
              generated_email_subject: null,
              generated_email_body: null,
              raw_data: {
                google_maps_uri: place.googleMapsUri,
                primary_type: place.primaryType,
              },
            };

            allLeads.push(lead);
          }

          await delay(200);
        } catch (err) {
          errors.push(`Error searching "${query}" in ${cityName}: ${(err as Error).message}`);
        }
      }
    }
  }

  const durationSeconds = (Date.now() - startTime) / 1000;

  return {
    source: "google_maps",
    city: cities.join(", "),
    categories: categoryNames,
    leads_found: allLeads.length,
    leads_new: allLeads.length,
    duration_seconds: durationSeconds,
    errors,
    leads: allLeads,
  };
}
