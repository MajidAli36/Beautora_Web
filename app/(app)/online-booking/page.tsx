import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ date?: string; focus?: string; tab?: string }>;
};

/** Online booking is merged into Appointments — keep old URLs working. */
export default async function OnlineBookingRedirectPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  qs.set("tab", params.tab === "setup" ? "setup" : params.focus === "deposits" ? "incoming" : "online");
  if (params.date) qs.set("date", params.date);
  if (params.focus === "deposits") qs.set("focus", "deposits");
  redirect(`/appointments?${qs.toString()}`);
}
