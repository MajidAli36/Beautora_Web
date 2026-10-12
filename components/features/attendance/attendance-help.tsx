"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Fingerprint,
  Link2,
  LogIn,
  RefreshCw,
  AlertTriangle,
  Keyboard,
} from "lucide-react";

function HelpSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-[#172033]">
        <span className="flex size-7 items-center justify-center rounded-lg bg-teal-50 text-[#0FA99A]">
          <Icon className="size-3.5" />
        </span>
        {title}
      </h3>
      <div className="space-y-1.5 pl-9 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

export function AttendanceGuideButton() {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5">
            <BookOpen className="size-3.5" />
            Guide
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Attendance guide</DialogTitle>
          <DialogDescription>
            How thumb scanning, linking, and backups work in Beautora.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 pb-2">
          <HelpSection icon={Fingerprint} title="Thumb check-in / check-out">
            <p>
              Link each staff member to their ZK Machine User ID. The first scan checks them in;
              the next scan checks them out.
            </p>
            <p>
              Keep the SyncOps Device Agent running on the salon PC so machine punches sync
              automatically (ADMS). You can also use Punch on this page for an instant web save.
            </p>
          </HelpSection>
          <HelpSection icon={Link2} title="Machine User ID">
            <p>
              On the ZK device, open the user list and note each person’s User ID (e.g.{" "}
              <code className="text-foreground">2</code>). Enter that exact ID under the staff row
              and click Link ID / Update ID.
            </p>
            <p>
              If the website ID and ZK User ID do not match, punches will not attach to the right
              person.
            </p>
          </HelpSection>
          <HelpSection icon={LogIn} title="Manual backup">
            <p>
              Use Manual In / Manual Out when the scanner is offline or a punch was missed. Manual
              sessions appear in the log with a Manual badge.
            </p>
          </HelpSection>
          <HelpSection icon={RefreshCw} title="Sync scanner">
            <p>
              Sync Scanner pulls recent punches from the Device Agent into Beautora. Use it after
              reconnecting the agent or if a punch did not appear in the log.
            </p>
          </HelpSection>
          <HelpSection icon={AlertTriangle} title="Troubleshooting">
            <ul className="list-disc space-y-1 pl-4">
              <li>Start Device Agent on this PC and confirm the status badge is online.</li>
              <li>Open Devices and connect the attendance terminal if needed.</li>
              <li>Confirm Linked ID matches the ZK User ID exactly.</li>
              <li>Allow local network access if the browser prompts for it.</li>
            </ul>
          </HelpSection>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AttendanceCheatsheetButton() {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5">
            <Keyboard className="size-3.5" />
            Cheatsheet
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick cheatsheet</DialogTitle>
          <DialogDescription>Compact reference for daily attendance.</DialogDescription>
        </DialogHeader>
        <dl className="space-y-3 pb-2 text-sm">
          {[
            ["1st thumb scan", "Check-in"],
            ["Next thumb scan", "Check-out"],
            ["Punch button", "Instant web check-in / check-out"],
            ["Manual In / Out", "Backup when scanner is unavailable"],
            ["Link / Update ID", "Match staff to ZK Machine User ID"],
            ["Capture from machine", "Read User ID from a live thumb press"],
            ["Sync Scanner", "Pull missed punches from the agent"],
            ["Kiosk", "Fullscreen thumb station for reception"],
          ].map(([term, def]) => (
            <div
              key={term}
              className="flex items-start justify-between gap-4 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2.5"
            >
              <dt className="font-medium text-[#172033]">{term}</dt>
              <dd className="text-right text-muted-foreground">{def}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
