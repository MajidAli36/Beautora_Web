"use client";

import { useActionState, useState, useTransition } from "react";
import {
  createChair,
  deleteChair,
  renameChair,
  setChairActive,
  type ChairRow,
} from "@/lib/actions/chairs";
import { useActionToast } from "@/hooks/use-action-toast";
import { notify } from "@/lib/toast";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginatedList } from "@/components/ui/table-pagination";
import type { ActionResult } from "@/types/commerce";

type Props = {
  chairs: ChairRow[];
  canManage: boolean;
};

function RenameRow({ chair }: { chair: ChairRow }) {
  const [name, setName] = useState(chair.name);
  const [pending, startTransition] = useTransition();

  function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      notify.error("Chair name required");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", chair.id);
      fd.set("name", trimmed);
      const result = await renameChair({} as ActionResult, fd);
      if (result.error) notify.error(result.error);
      else notify.success("Chair renamed.");
    });
  }

  return (
    <div className="flex items-center gap-1">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 w-32"
          maxLength={40}
          required
        />
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={save}>
          {pending ? "…" : "Save"}
        </Button>
    </div>
  );
}

export function ChairsManager({ chairs, canManage }: Props) {
  const [createState, createAction, creating] = useActionState(createChair, {} as ActionResult);
  useActionToast(createState, { successMessage: "Chair added." });
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Add chair</CardTitle>
            <CardDescription>
              Add as many chairs/stations as your salon has. They appear in the Queue form.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createAction} className="flex flex-wrap items-end gap-3">
              <div className="min-w-[200px] flex-1 space-y-2">
                <Label htmlFor="chair-name">Name</Label>
                <Input
                  id="chair-name"
                  name="name"
                  required
                  placeholder="e.g. Chair 1, Station A"
                  maxLength={40}
                />
              </div>
              <Button type="submit" disabled={creating}>
                {creating ? "Adding…" : "Add chair"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Chairs ({chairs.length})</CardTitle>
          <CardDescription>Active chairs can be selected when issuing a queue token.</CardDescription>
        </CardHeader>
        <CardContent>
          <PaginatedList
            items={chairs}
            empty={
              <p className="text-sm text-muted-foreground">
                No chairs yet.{" "}
                {canManage ? "Add your first chair above." : "Ask a manager to add chairs."}
              </p>
            }
          >
            {(slice) => (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      {canManage && <TableHead className="min-w-[11rem] sm:w-[280px]">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slice.map((chair) => (
                      <TableRow key={chair.id}>
                        <TableCell className="font-medium">{chair.name}</TableCell>
                        <TableCell>
                          <Badge variant={chair.is_active ? "default" : "secondary"}>
                            {chair.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        {canManage && (
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-2">
                              <RenameRow chair={chair} />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={pending}
                                onClick={() =>
                                  startTransition(async () => {
                                    const result = await setChairActive(
                                      chair.id,
                                      !chair.is_active
                                    );
                                    if (result?.error) notify.error(result.error);
                                    else
                                      notify.success(
                                        chair.is_active ? "Chair disabled." : "Chair enabled."
                                      );
                                  })
                                }
                              >
                                {chair.is_active ? "Disable" : "Enable"}
                              </Button>
                              <ConfirmAction
                                title="Delete chair?"
                                description={`Delete “${chair.name}”? Existing queue tokens keep the old chair name.`}
                                confirmLabel="Delete"
                                pendingLabel="Deleting…"
                                variant="ghost"
                                onConfirm={async () => deleteChair(chair.id)}
                                successMessage="Chair deleted."
                              >
                                Delete
                              </ConfirmAction>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </PaginatedList>
        </CardContent>
      </Card>
    </div>
  );
}
