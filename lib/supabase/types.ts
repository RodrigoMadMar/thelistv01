// ── Enums / Union types ──

export type UserRole = "user" | "host" | "admin";

export type HostStatus = "pending" | "active" | "suspended";

export type ApplicationStatus = "pending" | "approved" | "rejected";

export type PlanStatus = "draft" | "published" | "paused" | "archived";

export type ReservationStatus = "pending" | "confirmed" | "completed" | "cancelled";

export type Sala =
  | "La Buena Mesa"
  | "Bar & Vino"
  | "Arte & Experimental"
  | "Fiestas & Sesiones"
  | "Outdoor";

export type Badge =
  | "last_seats"
  | "members_first"
  | "small_group"
  | "this_week"
  | "sold_out";

// ── Table interfaces ──

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Host {
  id: string;
  profile_id: string;
  business_name: string;
  slug: string;
  bio_short: string | null;
  bio_extended: string | null;
  tagline: string | null;
  cover_url: string | null;
  logo_url: string | null;
  location: string | null;
  phone: string | null;
  instagram: string | null;
  website: string | null;
  status: HostStatus;
  created_at: string;
}

export interface ScheduleSlot {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

export interface Application {
  id: string;
  host_id: string;
  experience_name: string;
  location: string;
  description: string;
  commercial_contact: string;
  daily_capacity: number;
  price_clp: number;
  schedule: ScheduleSlot[];
  days_of_week: string[];
  media_urls: string[] | null;
  status: ApplicationStatus;
  admin_comment: string | null;
  admin_message: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface PublicApplication {
  id: string;
  experience_name: string;
  email: string;
  phone: string;
  host_name: string | null;
  location: string;
  description: string;
  commercial_contact: string;
  daily_capacity: number;
  price_clp: number;
  days_of_week: string[];
  schedule: ScheduleSlot[];
  media_urls: string[] | null;
  exclusivity_confirmed: boolean;
  status: ApplicationStatus;
  admin_comment: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface Plan {
  id: string;
  application_id: string | null;
  host_id: string;
  title: string;
  description: string;
  short_description: string | null;
  sala: Sala;
  location: string;
  price_clp: number;
  capacity: number;
  duration_minutes: number | null;
  image_url: string | null;
  media_urls: string[] | null;
  schedule: ScheduleSlot[] | null;
  days_of_week: string[] | null;
  status: PlanStatus;
  drop_number: number;
  badges: Badge[] | null;
  featured: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  plan_id: string;
  user_id: string;
  num_people: number;
  date: string;
  time_slot: string | null;
  total_price: number;
  status: ReservationStatus;
  created_at: string;
}

export interface Message {
  id: string;
  host_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}
