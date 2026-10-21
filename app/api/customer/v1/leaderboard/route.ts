import { jsonCached, jsonError, resolveCustomerAppRequest } from "@/lib/customer-apps/api";
import {
  computeLeaderboard,
  getLeaderboardRules,
} from "@/lib/customer-apps/engagement";
import { listLeaderboardTiers } from "@/lib/customer-apps/domain";

export const revalidate = 60;

export async function GET(request: Request) {
  const ctx = await resolveCustomerAppRequest(request);
  if ("error" in ctx) return jsonError(ctx.error, ctx.status);

  const rules = await getLeaderboardRules(ctx.app.id);
  if (!rules.enabled || !rules.show_on_customer_app) {
    return jsonError("Leaderboard is not enabled for this app", 403);
  }

  const [rows, tiers] = await Promise.all([
    computeLeaderboard(ctx.app.id, ctx.organizationIds, rules),
    listLeaderboardTiers(ctx.app.id),
  ]);

  return jsonCached({
    title: rules.title,
    metric: rules.metric,
    windowDays: rules.window_days,
    note: rules.rules_note,
    rows,
    tiers: tiers.map((t) => ({
      rank: t.rank,
      title: t.title,
      description: t.description,
      rewardKind: t.reward_kind,
      rewardImageUrl: t.reward_image_url,
      serviceId: t.service_id,
      appProductId: t.app_product_id,
      customRewardLabel: t.custom_reward_label,
    })),
  });
}
