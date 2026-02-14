"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
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

// ── Public application (no auth required) ──

export async function submitPublicApplication(formData: {
  experienceName: string;
  email: string;
  phone: string;
  hostName: string;
  location: string;
  description: string;
  commercialContact: string;
  dailyCapacity: number;
  priceCLP: number;
  daysOfWeek: string[];
  schedule: { start: string; end: string }[];
  mediaUrls: string[];
  exclusivityConfirmed: boolean;
}) {
  const supabase = await createClient();

  const { error } = await supabase.from("public_applications").insert({
    experience_name: formData.experienceName,
    email: formData.email,
    phone: formData.phone,
    host_name: formData.hostName || null,
    location: formData.location,
    description: formData.description,
    commercial_contact: formData.commercialContact,
    daily_capacity: formData.dailyCapacity,
    price_clp: formData.priceCLP,
    days_of_week: formData.daysOfWeek,
    schedule: formData.schedule,
    media_urls: formData.mediaUrls.length > 0 ? formData.mediaUrls : null,
    exclusivity_confirmed: formData.exclusivityConfirmed,
    status: "pending",
  });

  if (error) return { error: error.message };
  return { success: true };
}

// ── Approve public application (admin only) ──

export async function approvePublicApplication(
  applicationId: string,
  sala: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Get public application
  const { data: app, error: fetchError } = await supabase
    .from("public_applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (fetchError || !app) return { error: "Application not found" };

  // Create the user account via Supabase Admin API (invite by email)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    return { error: "Server configuration missing (service role key)" };
  }

  const admin = createAdminClient(supabaseUrl, serviceRoleKey);

  // Invite user — sends activation email to set password
  const { data: inviteData, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(app.email, {
      data: { full_name: app.commercial_contact },
    });

  if (inviteError) return { error: "Error creating account: " + inviteError.message };

  const newUserId = inviteData.user.id;

  // Create host record
  const slug =
    (app.host_name || app.experience_name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Date.now().toString(36);

  const { data: host, error: hostError } = await admin
    .from("hosts")
    .insert({
      profile_id: newUserId,
      business_name: app.host_name || app.experience_name,
      slug,
      location: app.location,
      phone: app.phone,
      status: "active",
    })
    .select("id")
    .single();

  if (hostError) return { error: "Error creating host: " + hostError.message };

  // Create application in the main table
  const { error: appError } = await admin.from("applications").insert({
    host_id: host.id,
    experience_name: app.experience_name,
    location: app.location,
    description: app.description,
    commercial_contact: app.commercial_contact,
    daily_capacity: app.daily_capacity,
    price_clp: app.price_clp,
    schedule: app.schedule,
    days_of_week: app.days_of_week,
    media_urls: app.media_urls,
    status: "approved",
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
  });

  if (appError) return { error: "Error migrating application: " + appError.message };

  // Create plan as draft
  await admin.from("plans").insert({
    host_id: host.id,
    title: app.experience_name,
    description: app.description,
    short_description: app.description.substring(0, 100),
    sala,
    location: app.location,
    price_clp: app.price_clp,
    capacity: app.daily_capacity,
    schedule: app.schedule,
    days_of_week: app.days_of_week,
    media_urls: app.media_urls,
    status: "draft",
  });

  // Update profile role
  await admin
    .from("profiles")
    .update({ role: "host" })
    .eq("id", newUserId);

  // Mark public application as approved
  await supabase
    .from("public_applications")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  return { success: true };
}

// ── Reject public application (admin only) ──

export async function rejectPublicApplication(
  applicationId: string,
  adminComment: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("public_applications")
    .update({
      status: "rejected",
      admin_comment: adminComment,
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

// ── Host requests a change on a plan ──

export async function requestPlanChange(planId: string, message: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify the host owns this plan
  const { data: host } = await supabase
    .from("hosts")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!host) return { error: "Host not found" };

  const { data: plan } = await supabase
    .from("plans")
    .select("id, host_id")
    .eq("id", planId)
    .eq("host_id", host.id)
    .single();

  if (!plan) return { error: "Plan not found" };

  // Send a message to the admin via the messages table
  const { error } = await supabase.from("messages").insert({
    host_id: host.id,
    sender_id: user.id,
    content: `[Solicitud de cambio — Plan ${planId}]\n\n${message}`,
  });

  if (error) return { error: error.message };
  return { success: true };
}
