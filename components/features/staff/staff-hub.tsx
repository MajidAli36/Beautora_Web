"use client";

import type { TeamInvitation, TeamMember } from "@/lib/actions/team";
import type { RolePermissionMatrix } from "@/lib/actions/role-permissions";
import { TeamManagement } from "@/components/features/staff/team-management";
import { RolePermissionsEditor } from "@/components/features/staff/role-permissions-editor";
import { StaffForm } from "@/components/features/staff/staff-forms";
import { StaffRowActions } from "@/components/features/staff/staff-row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginatedList } from "@/components/ui/table-pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Fingerprint, Plus } from "lucide-react";
import Link from "next/link";

type StaffRow = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  job_title: string | null;
  pin_code: string | null;
  thumb_id: string | null;
  thumb_enrolled_at: string | null;
  is_active: boolean;
  online_booking_enabled: boolean;
};

type StaffHubProps = {
  staffList: StaffRow[];
  teamMembers: TeamMember[];
  invitations: TeamInvitation[];
  roleMatrix: RolePermissionMatrix[];
  canManage: boolean;
  canTeam: boolean;
  canInvite: boolean;
  canConfigureRoles?: boolean;
};

function loginByEmail(teamMembers: TeamMember[]) {
  const map = new Map<string, TeamMember>();
  for (const member of teamMembers) {
    map.set(member.email.toLowerCase(), member);
  }
  return map;
}

export function StaffHub({
  staffList,
  teamMembers,
  invitations,
  roleMatrix,
  canManage,
  canTeam,
  canInvite,
  canConfigureRoles = false,
}: StaffHubProps) {
  const logins = loginByEmail(teamMembers);
  const defaultTab = "roster";

  return (
    <Tabs defaultValue={defaultTab} className="space-y-4">
      <TabsList className="h-auto flex-wrap">
        <TabsTrigger value="roster">Salon team</TabsTrigger>
        {canTeam && <TabsTrigger value="logins">App logins</TabsTrigger>}
        {canConfigureRoles && (
          <TabsTrigger value="access">Role access</TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="roster" className="space-y-4">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Salon team</CardTitle>
              <CardDescription>
                Employee profiles for thumb attendance, appointments, and payroll. Open a profile to
                set monthly/hourly pay. Generate wages from{" "}
                <Link href="/payroll" className="font-medium underline-offset-2 hover:underline">
                  Payroll
                </Link>
                . To appear on the public booking page, use <strong>Show on booking</strong> and set
                weekly hours under Online booking.
              </CardDescription>
            </div>
            {canManage && (
              <Dialog>
                <DialogTrigger
                  render={
                    <Button type="button">
                      <Plus className="mr-1.5 size-4" />
                      Add staff
                    </Button>
                  }
                />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add staff member</DialogTitle>
                    <DialogDescription>
                      Create a salon profile. Invite the same email under App logins so they can
                      sign in to the dashboard.
                    </DialogDescription>
                  </DialogHeader>
                  <StaffForm />
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            <PaginatedList
              items={staffList}
              empty={
                <p className="text-sm text-muted-foreground">
                  No staff profiles yet. Add your first team member above.
                </p>
              }
              search={{
                placeholder: "Search name, title, phone, email, status…",
                getText: (s) => {
                  const login = s.email ? logins.get(s.email.toLowerCase()) : undefined;
                  return [
                    s.full_name,
                    s.job_title ?? "",
                    s.phone ?? "",
                    s.email ?? "",
                    s.is_active ? "active" : "inactive",
                    s.thumb_id ? "enrolled" : "not enrolled",
                    login?.roleLabel ?? "no login",
                    s.online_booking_enabled ? "visible on book" : "hidden",
                  ].join(" ");
                },
                emptyFiltered: (
                  <p className="text-sm text-muted-foreground">No staff match your search.</p>
                ),
              }}
            >
              {(slice) => (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Thumb</TableHead>
                        <TableHead>App login</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Online booking</TableHead>
                        <TableHead className="text-right"> </TableHead>
                        {canManage && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {slice.map((s) => {
                        const login = s.email
                          ? logins.get(s.email.toLowerCase())
                          : undefined;
                        return (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">{s.full_name}</TableCell>
                            <TableCell>{s.job_title ?? "—"}</TableCell>
                            <TableCell className="text-sm">
                              <div>{s.phone ?? "—"}</div>
                              {s.email && (
                                <div className="text-muted-foreground">{s.email}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              {s.thumb_id ? (
                                <Badge variant="default" className="gap-1">
                                  <Fingerprint className="size-3" />
                                  Enrolled
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">Not enrolled</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {login ? (
                                <Badge variant="outline">{login.roleLabel}</Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">No login</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={s.is_active ? "default" : "secondary"}>
                                {s.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={s.online_booking_enabled ? "default" : "secondary"}
                              >
                                {s.online_booking_enabled ? "Visible on /book" : "Hidden"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                render={<Link href={`/staff/${s.id}`} />}
                              >
                                View
                              </Button>
                            </TableCell>
                            {canManage && (
                              <TableCell className="text-right">
                                <StaffRowActions
                                  staffId={s.id}
                                  name={s.full_name}
                                  isActive={s.is_active}
                                  onlineBookingEnabled={s.online_booking_enabled}
                                />
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </PaginatedList>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-none text-muted-foreground">
          <span className="shrink-0">Related:</span>
          <Link href="/attendance" className="text-primary underline-offset-2 hover:underline">
            Attendance
          </Link>
          <span aria-hidden className="text-muted-foreground/70">
            ·
          </span>
          <Link
            href="/online-booking"
            className="text-primary underline-offset-2 hover:underline"
          >
            Online booking schedules
          </Link>
          <span aria-hidden className="text-muted-foreground/70">
            ·
          </span>
          <Link href="/finances" className="text-primary underline-offset-2 hover:underline">
            Staff payments
          </Link>
        </div>
      </TabsContent>

      {canTeam && (
        <TabsContent value="logins">
          <TeamManagement
            members={teamMembers}
            invitations={invitations}
            canInvite={canInvite}
          />
        </TabsContent>
      )}

      {canConfigureRoles && (
        <TabsContent value="access">
          <RolePermissionsEditor matrix={roleMatrix} />
        </TabsContent>
      )}
    </Tabs>
  );
}
