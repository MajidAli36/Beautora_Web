import { listPlatformUsers } from "@/lib/actions/platform-admin";
import { PlatformUsersPanel } from "@/components/platform/platform-users-panel";
import { PlatformAdminSubheader } from "@/components/platform/platform-admin-subheader";

export const dynamic = "force-dynamic";

export default async function PlatformUsersPage() {
  const users = await listPlatformUsers();
  const pending = users.filter((u) => u.status === "pending").length;
  const active = users.filter((u) => u.status === "active").length;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <PlatformAdminSubheader
        title="Users"
        description={`Separate users directory — ${active} active, ${pending} pending, ${users.length} total. Filter by role, store, city, and country. Send personal notes by email anytime.`}
      />
      <PlatformUsersPanel users={users} enableSearch />
    </div>
  );
}
