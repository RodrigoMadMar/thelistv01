"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function submitApplication(formData: {
  businessName: string;
  contactName: string;
  location: string;
  phone: string;
  instagram: string;
  experienceName: string;
  description: string;
  sala: string;
  dailyCapacity: number;
  priceCLP: number;
  schedule: { start: string; end: string }[];
  daysOfWeek: string[];
  mediaUrls: string[];
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/host/apply");

  // Check if user already has a host record
  let { data: host } = await supabase
    .from("hosts")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  // Create host if doesn't exist
  if (!host) {
    const slug = formData.businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const { data: newHost, error: hostError } = await supabase
      .from("hosts")
      .insert({
        profile_id: user.id,
        business_name: formData.businessName,
        slug: slug + "-" + Date.now().toString(36),
        location: formData.location,
        phone: formData.phone,
        instagram: formData.instagram || null,
        status: "pending",
      })
      .select("id")
      .single();

    if (hostError) return { error: hostError.message };
    host = newHost;
  }

  // Create application
  const { error: appError } = await supabase.from("applications").insert({
    host_id: host!.id,
    experience_name: formData.experienceName,
    location: formData.location,
    description: formData.description,
    commercial_contact: formData.contactName,
    daily_capacity: formData.dailyCapacity,
    price_clp: formData.priceCLP,
    schedule: formData.schedule,
    days_of_week: formData.daysOfWeek,
    media_urls: formData.mediaUrls.length > 0 ? formData.mediaUrls : null,
    status: "pending",
  });

  if (appError) return { error: appError.message };

  // Update profile role to host if still user
  await supabase
    .from("profiles")
    .update({ role: "host" })
    .eq("id", user.id)
    .eq("role", "user");

  return { success: true };
}

export async function approveApplication(
  applicationId: string,
  sala: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Get application
  const { data: app, error: fetchError } = await supabase
    .from("applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (fetchError || !app) return { error: "Application not found" };

  // Update application
  const { error: updateError } = await supabase
    .from("applications")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (updateError) return { error: updateError.message };

  // Create plan as draft
  const { error: planError } = await supabase.from("plans").insert({
    application_id: applicationId,
    host_id: app.host_id,
    title: app.experience_name,
    description: app.description,
    short_description: app.description.substring(0, 100),
    sala: sala,
    location: app.location,
    price_clp: app.price_clp,
    capacity: app.daily_capacity,
    schedule: app.schedule,
    days_of_week: app.days_of_week,
    media_urls: app.media_urls,
    status: "draft",
  });

  if (planError) return { error: planError.message };

  return { success: true };
}

export async function rejectApplication(
  applicationId: string,
  adminComment: string,
  adminMessage: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("applications")
    .update({
      status: "rejected",
      admin_comment: adminComment,
      admin_message: adminMessage || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updatePlanStatus(
  planId: string,
  status: "published" | "paused" | "archived" | "draft",
) {
  const supabase = await createClient();
  const updates: Record<string, unknown> = { status };
  if (status === "published") {
    updates.published_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("plans")
    .update(updates)
    .eq("id", planId);

  if (error) return { error: error.message };
  return { success: true };
}
