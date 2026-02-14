"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

// ── Generate onboarding token (admin only) ──

export async function generateOnboardingInvite(
  applicationId: string,
  applicationType: "internal" | "public",
  email: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Use admin client since onboarding_invites requires admin policy
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !supabaseUrl) {
    return { error: "Server configuration missing" };
  }
  const admin = createAdminClient(supabaseUrl, serviceRoleKey);

  // Generate a secure random token
  const token = randomBytes(32).toString("hex");

  // Token expires in 7 days
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { error } = await admin.from("onboarding_invites").insert({
    application_id: applicationId,
    application_type: applicationType,
    email,
    token,
    expires_at: expiresAt.toISOString(),
    created_by: user.id,
  });

  if (error) return { error: error.message };

  return { success: true, token };
}

// ── Regenerate onboarding invite (admin only, invalidates previous) ──

export async function regenerateOnboardingInvite(inviteId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !supabaseUrl) {
    return { error: "Server configuration missing" };
  }
  const admin = createAdminClient(supabaseUrl, serviceRoleKey);

  // Get the existing invite
  const { data: oldInvite, error: fetchError } = await admin
    .from("onboarding_invites")
    .select("*")
    .eq("id", inviteId)
    .single();

  if (fetchError || !oldInvite) return { error: "Invite no encontrado" };

  // Mark old invite as used (invalidate)
  await admin
    .from("onboarding_invites")
    .update({ used_at: new Date().toISOString() })
    .eq("id", inviteId);

  // Generate new token
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { error: insertError } = await admin.from("onboarding_invites").insert({
    application_id: oldInvite.application_id,
    application_type: oldInvite.application_type,
    email: oldInvite.email,
    token,
    expires_at: expiresAt.toISOString(),
    created_by: user.id,
  });

  if (insertError) return { error: insertError.message };

  return { success: true, token };
}

// ── Validate onboarding token (no auth required) ──

export async function validateOnboardingToken(token: string) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !supabaseUrl) {
    return { error: "Server configuration missing" };
  }
  const admin = createAdminClient(supabaseUrl, serviceRoleKey);

  const { data: invite, error } = await admin
    .from("onboarding_invites")
    .select("*")
    .eq("token", token)
    .single();

  if (error || !invite) return { error: "Token inválido" };

  // Check if already used
  if (invite.used_at) return { error: "Este link ya fue utilizado" };

  // Check if expired
  if (new Date(invite.expires_at) < new Date()) {
    return { error: "Este link ha expirado" };
  }

  // Get application data based on type
  let applicationData: Record<string, unknown> | null = null;
  if (invite.application_type === "public") {
    const { data } = await admin
      .from("public_applications")
      .select("*")
      .eq("id", invite.application_id)
      .single();
    applicationData = data;
  } else {
    const { data } = await admin
      .from("applications")
      .select("*, hosts(business_name)")
      .eq("id", invite.application_id)
      .single();
    applicationData = data;
  }

  return {
    valid: true,
    invite: {
      id: invite.id,
      email: invite.email,
      application_type: invite.application_type,
      application_id: invite.application_id,
    },
    application: applicationData,
  };
}

// ── Complete onboarding (no auth — creates account) ──

export async function completeOnboarding(data: {
  token: string;
  password: string;
  legalName: string;
  rut: string;
  legalRepName: string;
  legalRepRut: string;
  bankName: string;
  bankAccount: string;
  bankType: "vista" | "corriente";
  termsAccepted: boolean;
}) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !supabaseUrl) {
    return { error: "Server configuration missing" };
  }
  const admin = createAdminClient(supabaseUrl, serviceRoleKey);

  // 1. Validate token again
  const { data: invite, error: inviteError } = await admin
    .from("onboarding_invites")
    .select("*")
    .eq("token", data.token)
    .single();

  if (inviteError || !invite) return { error: "Token inválido" };
  if (invite.used_at) return { error: "Este link ya fue utilizado" };
  if (new Date(invite.expires_at) < new Date()) return { error: "Token expirado" };
  if (!data.termsAccepted) return { error: "Debe aceptar los términos y condiciones" };

  // 2. Get application data
  let appData: Record<string, unknown> | null = null;
  if (invite.application_type === "public") {
    const { data: app } = await admin
      .from("public_applications")
      .select("*")
      .eq("id", invite.application_id)
      .single();
    appData = app;
  } else {
    const { data: app } = await admin
      .from("applications")
      .select("*")
      .eq("id", invite.application_id)
      .single();
    appData = app;
  }

  if (!appData) return { error: "Postulación no encontrada" };

  // 3. Create user account with password (or reuse existing)
  let userId: string;

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: invite.email,
    password: data.password,
    email_confirm: true,
    user_metadata: {
      full_name: (appData.commercial_contact as string) || (appData.host_name as string) || "",
    },
  });

  if (authError) {
    // If user already exists, look them up and update their password
    if (authError.message.includes("already been registered")) {
      const { data: users, error: listError } = await admin.auth.admin.listUsers();
      if (listError) return { error: "Error buscando usuario existente" };
      const existingUser = users.users.find((u) => u.email === invite.email);
      if (!existingUser) return { error: "No se encontró el usuario existente" };
      userId = existingUser.id;

      // Update password for the existing user
      await admin.auth.admin.updateUser(userId, { password: data.password });
    } else {
      return { error: "Error creando cuenta: " + authError.message };
    }
  } else {
    userId = authData.user.id;
  }

  // 4. Update profile role to host
  await admin
    .from("profiles")
    .update({ role: "host" })
    .eq("id", userId);

  // 5. Create host record
  const businessName =
    invite.application_type === "public"
      ? (appData.host_name as string) || (appData.experience_name as string)
      : (appData.experience_name as string);

  const slug =
    businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Date.now().toString(36);

  const { data: host, error: hostError } = await admin
    .from("hosts")
    .insert({
      profile_id: userId,
      business_name: businessName,
      slug,
      location: appData.location as string,
      phone: (appData.phone as string) || null,
      status: "active",
    })
    .select("id")
    .single();

  if (hostError) return { error: "Error creando host: " + hostError.message };

  // 6. Create host_profile with legal/banking data
  const { error: profileError } = await admin.from("host_profiles").insert({
    host_id: host.id,
    legal_name: data.legalName,
    rut: data.rut,
    legal_rep_name: data.legalRepName,
    legal_rep_rut: data.legalRepRut,
    bank_name: data.bankName,
    bank_account: data.bankAccount,
    bank_type: data.bankType,
    terms_accepted_at: new Date().toISOString(),
    onboarded: true,
  });

  if (profileError) return { error: "Error guardando datos: " + profileError.message };

  // 7. If public application, create internal application record + plan
  if (invite.application_type === "public") {
    // Create application in main table
    const { data: newApp } = await admin
      .from("applications")
      .insert({
        host_id: host.id,
        experience_name: appData.experience_name as string,
        location: appData.location as string,
        description: appData.description as string,
        commercial_contact: appData.commercial_contact as string,
        daily_capacity: appData.daily_capacity as number,
        price_clp: appData.price_clp as number,
        schedule: appData.schedule,
        days_of_week: appData.days_of_week,
        media_urls: appData.media_urls,
        status: "approved",
        reviewed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    // Create plan
    if (newApp) {
      await admin.from("plans").insert({
        application_id: newApp.id,
        host_id: host.id,
        title: appData.experience_name as string,
        description: appData.description as string,
        short_description: (appData.description as string).substring(0, 100),
        sala: (appData as Record<string, unknown>).sala || "La Buena Mesa",
        location: appData.location as string,
        price_clp: appData.price_clp as number,
        capacity: appData.daily_capacity as number,
        schedule: appData.schedule,
        days_of_week: appData.days_of_week,
        media_urls: appData.media_urls,
        status: "draft",
      });
    }
  }

  // 8. Mark invite as used
  await admin
    .from("onboarding_invites")
    .update({ used_at: new Date().toISOString() })
    .eq("id", invite.id);

  return { success: true, email: invite.email };
}
