"use client";

import { useActionState, useCallback, useState, useTransition } from "react";
import {
  inviteTeamMember,
  removeTeamMember,
  resendTeamInvitation,
  resetTeamMemberPassword,
  revokeTeamInvitation,
  updateTeamMemberRole,
} from "@/lib/actions/team";
import { useActionToast } from "@/hooks/use-action-toast";
import type { TeamInvitation, TeamMember } from "@/lib/actions/team";
import { ROLE_LABELS } from "@/lib/permissions/roles";
import type { MemberRole } from "@/types";
import type { ActionResult } from "@/types/commerce";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginatedList } from "@/components/ui/table-pagination";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { notify } from "@/lib/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const ASSIGNABLE_ROLES: MemberRole[] = [
  "ADMIN",
  "MANAGER",
  "CASHIER",
  "RECEPTIONIST",
  "STAFF",
];

type TeamManagementProps = {
  members: TeamMember[];
  invitations: TeamInvitation[];
  canInvite: boolean;
};

export function TeamManagement({
  members,
  invitations,
  canInvite,
}: TeamManagementProps) {
  const [inviteState, inviteAction, invitePending] = useActionState(
    inviteTeamMember,
    {} as ActionResult
  );
  useActionToast(inviteState, {
    successMessage: "Invite sent. They’ll get an email to accept and create their account.",
  });
  const [role, setRole] = useState<MemberRole>("RECEPTIONIST");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>App logins</CardTitle>
          <CardDescription>
            Active dashboard accounts. Roles control sidebar access — fine-tune pages per role in
            the Role access tab.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PaginatedList
            items={members}
            empty={<p className="text-sm text-muted-foreground">No app logins yet.</p>}
            search={{
              placeholder: "Search email or role…",
              getText: (member) => [member.email, member.roleLabel, member.role].join(" "),
              emptyFiltered: (
                <p className="text-sm text-muted-foreground">No logins match your search.</p>
              ),
            }}
          >
            {(slice) => (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Login email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="w-[220px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slice.map((member) => (
                      <TeamMemberRow
                        key={member.id}
                        member={member}
                        canResetPassword={canInvite}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </PaginatedList>
        </CardContent>
      </Card>

      {canInvite ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Invite teammate</CardTitle>
              <CardDescription>
                Send an email invite for receptionist, manager, or another role. They accept the
                link, create their own password, and join this salon. That email cannot be used to
                open a new store or partner account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={inviteAction} className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Work email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="off"
                    placeholder="reception@salon.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <input type="hidden" name="role" value={role} />
                  <Select value={role} onValueChange={(v) => setRole(v as MemberRole)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSIGNABLE_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={invitePending}>
                    {invitePending ? "Sending invite…" : "Send invite email"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending invites</CardTitle>
              <CardDescription>
                Invites expire in 7 days. Resend if they didn’t get the email (check spam).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invitations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending invites.</p>
              ) : (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="w-[200px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitations.map((invite) => (
                        <PendingInviteRow key={invite.id} invite={invite} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Invite teammate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Add <code className="rounded bg-muted px-1 py-0.5">SUPABASE_SERVICE_ROLE_KEY</code> to
              your env to send invites from the app.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PendingInviteRow({ invite }: { invite: TeamInvitation }) {
  const [pending, startTransition] = useTransition();

  return (
    <TableRow>
      <TableCell className="font-medium">{invite.email}</TableCell>
      <TableCell>
        <Badge variant="secondary">{invite.roleLabel}</Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {invite.status === "expired" ? "Expired" : formatDate(invite.expiresAt)}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await resendTeamInvitation(invite.id);
                if (result.error) notify.error(result.error);
                else notify.success("Invite email resent.");
              })
            }
          >
            Resend
          </Button>
          <ConfirmAction
            title="Revoke invite?"
            description={`Revoke the invite for ${invite.email}? They will no longer be able to join with that link.`}
            confirmLabel="Revoke"
            pendingLabel="Revoking…"
            variant="ghost"
            className="text-destructive"
            disabled={pending}
            onConfirm={async () => revokeTeamInvitation(invite.id)}
            successMessage="Invite revoked."
          >
            Revoke
          </ConfirmAction>
        </div>
      </TableCell>
    </TableRow>
  );
}

function TeamMemberRow({
  member,
  canResetPassword,
}: {
  member: TeamMember;
  canResetPassword: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [role, setRole] = useState(member.role);
  const [updateState, updateAction] = useActionState(updateTeamMemberRole, {} as ActionResult);
  useActionToast(updateState, { successMessage: "Role updated." });

  const isOwner = member.role === "OWNER";

  return (
    <TableRow>
      <TableCell className="font-medium">{member.email}</TableCell>
      <TableCell>
        {isOwner ? (
          <Badge>{member.roleLabel}</Badge>
        ) : (
          <form action={updateAction} className="flex items-center gap-2">
            <input type="hidden" name="memberId" value={member.id} />
            <input type="hidden" name="role" value={role} />
            <Select value={role} onValueChange={(v) => setRole(v as MemberRole)}>
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={pending || role === member.role}
            >
              Save
            </Button>
          </form>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDate(member.joinedAt)}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          {!isOwner && canResetPassword && <ResetPasswordDialog member={member} />}
          {!isOwner && (
            <ConfirmAction
              title="Remove app login?"
              description={`Remove ${member.email} from this salon? They will not be able to sign in. Salon staff profile is kept separately.`}
              confirmLabel="Remove"
              pendingLabel="Removing…"
              variant="ghost"
              className="text-destructive"
              disabled={pending}
              onConfirm={async () => removeTeamMember(member.id)}
              successMessage="Team member removed."
            >
              Remove
            </ConfirmAction>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function ResetPasswordDialog({ member }: { member: TeamMember }) {
  const [open, setOpen] = useState(false);
  const resetAction = useCallback(
    async (prev: ActionResult, formData: FormData) => {
      const result = await resetTeamMemberPassword(prev, formData);
      if (result.success) setOpen(false);
      return result;
    },
    []
  );
  const [resetState, formAction, resetPending] = useActionState(resetAction, {} as ActionResult);
  useActionToast(resetState, { successMessage: "Password updated." });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" size="sm" variant="outline">
            Reset password
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            Set a new password for {member.email}. Share it securely with them.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="memberId" value={member.id} />
          <div className="space-y-2">
            <Label htmlFor={`pw-${member.id}`}>New password</Label>
            <Input
              id={`pw-${member.id}`}
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" disabled={resetPending}>
            {resetPending ? "Saving…" : "Update password"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
