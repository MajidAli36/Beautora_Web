import { redirect } from "next/navigation";

/** Legacy path — compact admin lives at /platform */
export default function PlatformSubscriptionsRedirect() {
  redirect("/platform");
}
