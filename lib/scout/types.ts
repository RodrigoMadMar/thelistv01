export interface Lead {
  id?: string;
  name: string;
  slug: string;
  source: "google_maps" | "comino";
  source_id: string;
  category: string[];
  city: string;
  commune: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  review_count: number | null;
  price_level: number | null;
  website: string | null;
  phone: string | null;
  instagram: string | null;
  email: string | null;
  email_source: string | null;
  email_confidence: number | null;
  fit_score: number | null;
  fit_reasoning: string | null;
  status: LeadStatus;
  photos: string[];
  google_types: string[];
  description: string | null;
  generated_email_subject: string | null;
  generated_email_body: string | null;
  raw_data: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export type LeadStatus =
  | "new"
  | "qualified"
  | "emailed"
  | "responded"
  | "converted"
  | "rejected";

export interface ScoutRunResult {
  source: string;
  city: string;
  categories: string[];
  leads_found: number;
  leads_new: number;
  duration_seconds: number;
  errors: string[];
  leads: Lead[];
}

export interface DiscoverRequest {
  cities: string[];
  categories: string[];
}

export interface GenerateEmailRequest {
  lead_id: string;
}

export interface EnrichRequest {
  lead_id: string;
}

export interface UpdateStatusRequest {
  lead_id: string;
  status: LeadStatus;
}
