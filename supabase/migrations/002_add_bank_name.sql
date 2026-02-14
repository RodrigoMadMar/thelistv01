-- Add bank_name column to host_profiles
alter table public.host_profiles add column if not exists bank_name text;
