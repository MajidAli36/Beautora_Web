import type { Metadata } from "next";
import { ThumbAttendanceKiosk } from "@/components/features/attendance/thumb-kiosk";
import { buildPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Thumb attendance kiosk",
  description: "Beautora fingerprint attendance kiosk — private store device screen.",
  path: "/kiosk/attendance",
  noIndex: true,
});

export default function AttendanceKioskPage() {
  return <ThumbAttendanceKiosk />;
}
