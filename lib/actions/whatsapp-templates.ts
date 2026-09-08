"use server";

import { revalidatePath } from "next/cache";
import { requireOrganization } from "@/lib/auth/organization";
import { requireMinimumRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { defaultThankYouTemplateBody } from "@/lib/whatsapp/templates";
import type { ActionResult } from "@/types/commerce";

export type WhatsAppTemplate = {
  id: string;
  name: string;
  body: string;
  is_default: boolean;
  sort_order: number;
  updated_at: string;
};

export type WhatsAppSalonContext = {
  name: string;
  phone: string | null;
  address: string | null;
};

async function loadSalonContext(
  organizationId: string
): Promise<WhatsAppSalonContext> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organizations")
    .select("name, phone, whatsapp_phone, address")
    .eq("id", organizationId)
    .single();

  return {
    name: data?.name?.trim() || "our salon",
    phone: data?.whatsapp_phone?.trim() || data?.phone?.trim() || null,
    address: data?.address?.trim() || null,
  };
}

async function ensureDefaultTemplate(
  organizationId: string
): Promise<WhatsAppTemplate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("whatsapp_templates")
    .select("id, name, body, is_default, sort_order, updated_at")
    .eq("organization_id", organizationId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  if ((data ?? []).length > 0) {
    return data as WhatsAppTemplate[];
  }

  const { data: created, error: insertError } = await supabase
    .from("whatsapp_templates")
    .insert({
      organization_id: organizationId,
      name: "Thank you",
      body: defaultThankYouTemplateBody(),
      is_default: true,
      sort_order: 0,
    })
    .select("id, name, body, is_default, sort_order, updated_at")
    .single();

  if (insertError || !created) {
    throw new Error(insertError?.message ?? "Could not create default template");
  }
  return [created as WhatsAppTemplate];
}

export async function getWhatsAppTemplates(): Promise<{
  templates: WhatsAppTemplate[];
  salon: WhatsAppSalonContext;
}> {
  const org = await requireOrganization();
  const [templates, salon] = await Promise.all([
    ensureDefaultTemplate(org.organizationId),
    loadSalonContext(org.organizationId),
  ]);
  return { templates, salon };
}

export async function createWhatsAppTemplate(input: {
  name: string;
  body: string;
  makeDefault?: boolean;
}): Promise<ActionResult & { template?: WhatsAppTemplate }> {
  const org = await requireMinimumRole("RECEPTIONIST");
  const name = input.name.trim();
  const body = input.body.trim();
  if (name.length < 1) return { error: "Template name is required" };
  if (name.length > 80) return { error: "Name must be 80 characters or less" };
  if (body.length < 1) return { error: "Message body is required" };
  if (body.length > 4000) return { error: "Message must be 4000 characters or less" };

  const supabase = await createClient();

  if (input.makeDefault) {
    await supabase
      .from("whatsapp_templates")
      .update({ is_default: false })
      .eq("organization_id", org.organizationId)
      .eq("is_default", true);
  }

  const { count } = await supabase
    .from("whatsapp_templates")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", org.organizationId);

  const { data, error } = await supabase
    .from("whatsapp_templates")
    .insert({
      organization_id: org.organizationId,
      name,
      body,
      is_default: Boolean(input.makeDefault) || (count ?? 0) === 0,
      sort_order: count ?? 0,
    })
    .select("id, name, body, is_default, sort_order, updated_at")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/whatsapp");
  return { success: true, template: data as WhatsAppTemplate };
}

export async function updateWhatsAppTemplate(input: {
  id: string;
  name: string;
  body: string;
  makeDefault?: boolean;
}): Promise<ActionResult> {
  const org = await requireMinimumRole("RECEPTIONIST");
  const name = input.name.trim();
  const body = input.body.trim();
  if (name.length < 1) return { error: "Template name is required" };
  if (name.length > 80) return { error: "Name must be 80 characters or less" };
  if (body.length < 1) return { error: "Message body is required" };
  if (body.length > 4000) return { error: "Message must be 4000 characters or less" };

  const supabase = await createClient();

  if (input.makeDefault) {
    await supabase
      .from("whatsapp_templates")
      .update({ is_default: false })
      .eq("organization_id", org.organizationId)
      .eq("is_default", true)
      .neq("id", input.id);
  }

  const patch: {
    name: string;
    body: string;
    updated_at: string;
    is_default?: boolean;
  } = {
    name,
    body,
    updated_at: new Date().toISOString(),
  };
  if (input.makeDefault) patch.is_default = true;

  const { error } = await supabase
    .from("whatsapp_templates")
    .update(patch)
    .eq("id", input.id)
    .eq("organization_id", org.organizationId);

  if (error) return { error: error.message };
  revalidatePath("/whatsapp");
  return { success: true };
}

export async function setDefaultWhatsAppTemplate(
  id: string
): Promise<ActionResult> {
  const org = await requireMinimumRole("RECEPTIONIST");
  const supabase = await createClient();

  await supabase
    .from("whatsapp_templates")
    .update({ is_default: false })
    .eq("organization_id", org.organizationId)
    .eq("is_default", true);

  const { error } = await supabase
    .from("whatsapp_templates")
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", org.organizationId);

  if (error) return { error: error.message };
  revalidatePath("/whatsapp");
  return { success: true };
}

export async function deleteWhatsAppTemplate(
  id: string
): Promise<ActionResult> {
  const org = await requireMinimumRole("MANAGER");
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("whatsapp_templates")
    .select("id, is_default")
    .eq("id", id)
    .eq("organization_id", org.organizationId)
    .maybeSingle();

  if (!existing) return { error: "Template not found" };

  const { count } = await supabase
    .from("whatsapp_templates")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", org.organizationId);

  if ((count ?? 0) <= 1) {
    return { error: "Keep at least one template" };
  }

  const { error } = await supabase
    .from("whatsapp_templates")
    .delete()
    .eq("id", id)
    .eq("organization_id", org.organizationId);

  if (error) return { error: error.message };

  if (existing.is_default) {
    const { data: next } = await supabase
      .from("whatsapp_templates")
      .select("id")
      .eq("organization_id", org.organizationId)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (next) {
      await supabase
        .from("whatsapp_templates")
        .update({ is_default: true })
        .eq("id", next.id);
    }
  }

  revalidatePath("/whatsapp");
  return { success: true };
}
