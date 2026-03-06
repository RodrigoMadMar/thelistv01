export const CITIES: Record<string, { lat: number; lng: number }> = {
  Santiago: { lat: -33.4489, lng: -70.6693 },
  "Valparaíso": { lat: -33.0472, lng: -71.6127 },
  "Viña del Mar": { lat: -33.0153, lng: -71.55 },
  "Concepción": { lat: -36.827, lng: -73.0503 },
  "La Serena": { lat: -29.9027, lng: -71.252 },
  "Puerto Varas": { lat: -41.3167, lng: -72.9833 },
  "Pucón": { lat: -39.2823, lng: -71.9543 },
};

export interface CategoryConfig {
  queries: string[];
  thelistCategory: string[];
}

export const CATEGORIES: Record<string, CategoryConfig> = {
  restaurantes: {
    queries: [
      "restaurantes de autor",
      "restaurantes mejor evaluados",
      "restaurantes nueva cocina chilena",
      "fine dining",
    ],
    thelistCategory: ["restaurante"],
  },
  bares: {
    queries: [
      "bares de cócteles",
      "bares speakeasy",
      "wine bar",
      "rooftop bar",
    ],
    thelistCategory: ["bar"],
  },
  cafeterias: {
    queries: [
      "café de especialidad",
      "cafetería specialty coffee",
      "brunch",
    ],
    thelistCategory: ["cafetería"],
  },
  outdoor: {
    queries: [
      "actividades outdoor",
      "trekking guiado",
      "kayak tours",
      "experiencias naturaleza",
    ],
    thelistCategory: ["outdoor", "aventura"],
  },
  wellness: {
    queries: [
      "spa y wellness",
      "yoga estudio",
      "retiro bienestar",
    ],
    thelistCategory: ["wellness"],
  },
  talleres: {
    queries: [
      "taller de cocina",
      "clase de cerámica",
      "taller de arte",
      "experiencia gastronómica",
    ],
    thelistCategory: ["taller", "clase"],
  },
};

export const MIN_RATING = 4.0;
export const MIN_REVIEWS = 10;
export const MAX_RESULTS_PER_QUERY = 20;

export const KNOWN_COMMUNES = [
  "Providencia",
  "Las Condes",
  "Vitacura",
  "Ñuñoa",
  "Santiago",
  "La Reina",
  "Lo Barnechea",
  "Recoleta",
  "San Miguel",
  "Macul",
  "Peñalolén",
  "La Florida",
  "Maipú",
  "Independencia",
  "Quinta Normal",
  "Estación Central",
  "Bellavista",
];
