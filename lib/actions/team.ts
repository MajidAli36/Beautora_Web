"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createInviteToken,
  findAuthUserByEmail,
  getEmailBlockReason,
  hashInviteToken,
  normalizeEmail,
  TEAM_INVITE_TTL_DAYS,
} from "@/lib/auth/email-guards";
import { requireAction } from "@/lib/auth/permissions";
import { sendTeamInviteEmail } from "@/lib/email/notify";
import { ROLE_LABELS } from "@/lib/permissions/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { MemberRole } from "@/types";
import type { ActionResult } from "@/types/commerce";

export type TeamMember = {
  id: string;
  userId: string;
  email: string;
  role: MemberRole;
  roleLabel: string;
  joinedAt: string;
};

export type TeamInvitation = {
  id: string;
  email: string;
  role: MemberRole;
  roleLabel: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
  createdAt: string;
};

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MANAGER", "CASHIER", "RECEPTIONIST", "STAFF"]),
});

const roleSchema = z.object({
  memberId: z.string().uuid(),
  role: z.enum(["ADMIN", "MANAGER", "CASHIER", "RECEPTIONIST", "STAFF"]),
});

const resetPasswordSchema = z.object({
  memberId: z.string().uuid(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

async function getUserEmail(userId: string): Promise<string> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data.user?.email) return userId.slice(0, 8) + "…";
    return data.user.email;
  } catch {
    return userId.slice(0, 8) + "…";
  }
}

async function getOrgName(organizationId: string): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("organizations")
    .select("name")
    .eq("id", organizationId)
    .maybeSingle();
  return data?.name ?? "your salon";
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  const org = await requireAction("staff.manage_logins");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organization_members")
    .select("id, user_id, role, created_at")
    .eq("organization_id", org.organizationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[team] getTeamMembers failed", error.message);
    return [];
  }
  if (!data) return [];

  return Promise.all(
    data.map(async (row) => {
      const role = row.role as MemberRole;
      return {
        id: row.id,
        userId: row.user_id,
        email: await getUserEmail(row.user_id),
        role,
        roleLabel: ROLE_LABELS[role],
        joinedAt: row.created_at,
      };
    })
  );
}

export async function getPendingTeamInvitations(): Promise<TeamInvitation[]> {
  const org = await requireAction("staff.manage_logins");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("team_invitations")
    .select("id, email, role, status, expires_at, created_at")
    .eq("organization_id", org.organizationId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[team] getPendingTeamInvitations failed", error.message);
    return [];
  }
  if (!data) return [];

  const now = Date.now();
  return data.map((row) => {
    const expired = new Date(row.expires_at).getTime() < now;
    const role = row.role as MemberRole;
    return {
      id: row.id,
      email: row.email,
      role,
      roleLabel: ROLE_LABELS[role],
      status: expired ? "expired" : (row.status as TeamInvitation["status"]),
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    };
  });
}

export async function resetTeamMemberPassword(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const org = await requireAction("staff.manage_logins");
  const parsed = resetPasswordSchema.safeParse({
    memberId: formData.get("memberId"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "Add SUPABASE_SERVICE_ROLE_KEY to .env.local to reset passwords." };
  }

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("organization_members")
    .select("user_id, role")
    .eq("id", parsed.data.memberId)
    .eq("organization_id", org.organizationId)
    .single();

  if (!member) return { error: "Member not found" };
  if (member.role === "OWNER") return { error: "Cannot reset owner password here" };

  const { error } = await admin.auth.admin.updateUserById(member.user_id, {
    password: parsed.data.password,
  });
  if (error) return { error: error.message };

  revalidatePath("/staff");
  return { success: true };
}

/**
 * Invite a teammate by email. They receive a Beautora email and create their
 * own password on accept. The email is reserved (blocks salon/partner signup).
 */
export async function inviteTeamMember(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const org = await requireAction("staff.manage_logins");
  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error:
        "Add SUPABASE_SERVICE_ROLE_KEY to .env.local to invite team members from the app.",
    };
  }

  const email = normalizeEmail(parsed.data.email);
  const role = parsed.data.role;

  const blocked = await getEmailBlockReason(admin, email, "team_invite");
  if (blocked) return { error: blocked };

  const { data: existingMember } = await admin
    .from("organization_members")
    .select("id, user_id")
    .eq("organization_id", org.organizationId);

  const existingUser = await findAuthUserByEmail(admin, email);
  if (existingUser && existingMember?.some((m) => m.user_id === existingUser.id)) {
    return { error: "This person is already on your team." };
  }

  const { data: otherPending } = await admin
    .from("team_invitations")
    .select("id, organization_id")
    .eq("email", email)
    .eq("status", "pending")
    .maybeSingle();

  if (otherPending && otherPending.organization_id !== org.organizationId) {
    return {
      error:
        "This email already has a pending invite from another salon. They must accept or that invite must be revoked first.",
    };
  }

  // Revoke previous pending invite for this org+email (resend path)
  await admin
    .from("team_invitations")
    .update({ status: "revoked" })
    .eq("organization_id", org.organizationId)
    .eq("email", email)
    .eq("status", "pending");

  const { token, tokenHash } = createInviteToken();
  const expiresAt = new Date(
    Date.now() + TEAM_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const supabase = await createClient();
  const {
    data: { user: actor },
  } = await supabase.auth.getUser();

  const { data: invite, error: insertError } = await admin
    .from("team_invitations")
    .insert({
      organization_id: org.organizationId,
      email,
      role,
      token_hash: tokenHash,
      invited_by: actor?.id ?? null,
      status: "pending",
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (insertError || !invite) {
    return { error: insertError?.message ?? "Could not create invitation" };
  }

  const salonName = await getOrgName(org.organizationId);
  const mailed = await sendTeamInviteEmail({
    email,
    salonName,
    role,
    roleLabel: ROLE_LABELS[role],
    inviteToken: token,
    inviteId: invite.id,
    expiresDays: TEAM_INVITE_TTL_DAYS,
  });

  if (!mailed.ok) {
    await admin.from("team_invitations").delete().eq("id", invite.id);
    return {
      error: mailed.skipped
        ? "Email is not configured. Add SMTP_PASSWORD / RESEND_API_KEY, then try again."
        : mailed.error || "Could not send invite email. Try again.",
    };
  }

  revalidatePath("/staff");
  return { success: true };
}

export async function resendTeamInvitation(inviteId: string): Promise<ActionResult> {
  const org = await requireAction("staff.manage_logins");
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY" };
  }

  const { data: invite } = await admin
    .from("team_invitations")
    .select("id, email, role, status, expires_at")
    .eq("id", inviteId)
    .eq("organization_id", org.organizationId)
    .maybeSingle();

  if (!invite || invite.status !== "pending") {
    return { error: "Invitation not found" };
  }

  const { token, tokenHash } = createInviteToken();
  const expiresAt = new Date(
    Date.now() + TEAM_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { error: updateError } = await admin
    .from("team_invitations")
    .update({ token_hash: tokenHash, expires_at: expiresAt })
    .eq("id", invite.id);

  if (updateError) return { error: updateError.message };

  const salonName = await getOrgName(org.organizationId);
  const role = invite.role as MemberRole;
  const mailed = await sendTeamInviteEmail({
    email: invite.email,
    salonName,
    role,
    roleLabel: ROLE_LABELS[role],
    inviteToken: token,
    inviteId: invite.id,
    expiresDays: TEAM_INVITE_TTL_DAYS,
  });

  if (!mailed.ok) {
    return {
      error: mailed.skipped
        ? "Email is not configured. Add SMTP_PASSWORD / RESEND_API_KEY, then try again."
        : mailed.error || "Could not resend invite email",
    };
  }

  revalidatePath("/staff");
  return { success: true };
}

export async function revokeTeamInvitation(inviteId: string): Promise<ActionResult> {
  const org = await requireAction("staff.manage_logins");
  const supabase = await createClient();

  const { error } = await supabase
    .from("team_invitations")
    .update({ status: "revoked" })
    .eq("id", inviteId)
    .eq("organization_id", org.organizationId)
    .eq("status", "pending");

  if (error) return { error: error.message };

  revalidatePath("/staff");
  return { success: true };
}

export type InvitePreview =
  | {
      ok: true;
      email: string;
      salonName: string;
      role: MemberRole;
      roleLabel: string;
      needsPassword: boolean;
    }
  | { ok: false; error: string };

export async function getTeamInvitePreview(token: string): Promise<InvitePreview> {
  if (!token?.trim()) return { ok: false, error: "Invalid invite link" };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, error: "Invite service unavailable" };
  }

  const tokenHash = hashInviteToken(token.trim());
  const { data: invite } = await admin
    .from("team_invitations")
    .select("id, email, role, status, expires_at, organization_id")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!invite) return { ok: false, error: "This invite link is invalid." };
  if (invite.status === "accepted") {
    return { ok: false, error: "This invite was already accepted. Please sign in." };
  }
  if (invite.status !== "pending") {
    return { ok: false, error: "This invite is no longer valid." };
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    await admin
      .from("team_invitations")
      .update({ status: "expired" })
      .eq("id", invite.id);
    return { ok: false, error: "This invite has expired. Ask your salon admin to resend it." };
  }

  const existing = await findAuthUserByEmail(admin, invite.email);
  const salonName = await getOrgName(invite.organization_id);
  const role = invite.role as MemberRole;

  return {
    ok: true,
    email: invite.email,
    salonName,
    role,
    roleLabel: ROLE_LABELS[role],
    needsPassword: !existing,
  };
}

export async function acceptTeamInvite(input: {
  token: string;
  password?: string;
  fullName?: string;
}): Promise<ActionResult & { email?: string }> {
  const token = input.token?.trim();
  if (!token) return { error: "Invalid invite link" };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "Invite service unavailable" };
  }

  const tokenHash = hashInviteToken(token);
  const { data: invite } = await admin
    .from("team_invitations")
    .select("id, email, role, status, expires_at, organization_id")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!invite || invite.status !== "pending") {
    return { error: "This invite is invalid or already used." };
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    await admin
      .from("team_invitations")
      .update({ status: "expired" })
      .eq("id", invite.id);
    return { error: "This invite has expired. Ask your salon admin to resend it." };
  }

  const email = invite.email;
  const role = invite.role as MemberRole;
  let existing = await findAuthUserByEmail(admin, email);
  let userId = existing?.id;

  if (!userId) {
    const password = input.password ?? "";
    if (password.length < 8) {
      return { error: "Password must be at least 8 characters" };
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        account_type: "staff",
        created_by_admin: true,
        salon_role: role,
        full_name: input.fullName?.trim() || null,
        invited_organization_id: invite.organization_id,
      },
    });

    if (createErr || !created.user) {
      return { error: createErr?.message ?? "Could not create your account" };
    }
    userId = created.user.id;
  } else {
    const meta = (existing?.user_metadata ?? {}) as Record<string, unknown>;
    const type = typeof meta.account_type === "string" ? meta.account_type : "";
    if (type === "partner" || type === "owner" || type === "platform_admin") {
      return {
        error:
          "This email already has a different Beautora account type and cannot join as staff.",
      };
    }
    await admin.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...meta,
        account_type: "staff",
        created_by_admin: true,
        salon_role: role,
        full_name: input.fullName?.trim() || meta.full_name || null,
      },
    });
  }

  const { error: memberError } = await admin.from("organization_members").upsert(
    {
      organization_id: invite.organization_id,
      user_id: userId,
      role,
    },
    { onConflict: "organization_id,user_id" }
  );

  if (memberError) {
    return { error: memberError.message };
  }

  await admin
    .from("team_invitations")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      accepted_user_id: userId,
    })
    .eq("id", invite.id);

  return { success: true, email };
}

export async function updateTeamMemberRole(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const org = await requireAction("staff.manage_logins");
  const parsed = roleSchema.safeParse({
    memberId: formData.get("memberId"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("organization_members")
    .select("id, role, user_id")
    .eq("id", parsed.data.memberId)
    .eq("organization_id", org.organizationId)
    .single();

  if (!member) return { error: "Member not found" };
  if (member.role === "OWNER") {
    return { error: "Cannot change the owner role" };
  }

  const { error } = await supabase
    .from("organization_members")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.memberId)
    .eq("organization_id", org.organizationId);

  if (error) return { error: error.message };

  revalidatePath("/staff");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function removeTeamMember(memberId: string): Promise<ActionResult> {
  const org = await requireAction("staff.manage_logins");
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("organization_members")
    .select("id, role")
    .eq("id", memberId)
    .eq("organization_id", org.organizationId)
    .single();

  if (!member) return { error: "Member not found" };
  if (member.role === "OWNER") {
    return { error: "Cannot remove the organization owner" };
  }

  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("id", memberId)
    .eq("organization_id", org.organizationId);

  if (error) return { error: error.message };

  revalidatePath("/staff");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function canManageTeam(): Promise<boolean> {
  try {
    const { checkAction } = await import("@/lib/auth/permissions");
    return await checkAction("staff.manage_logins");
  } catch {
    return false;
  }
}
