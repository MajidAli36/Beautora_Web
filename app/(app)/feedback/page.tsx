import { PageHeader } from "@/components/layout/page-header";
import { redirect } from "next/navigation";
import { canUseFeedback } from "@/lib/auth/permissions";
import { getCustomers } from "@/lib/actions/customers";
import { getStaff } from "@/lib/actions/staff";
import { getFeedbackDashboard } from "@/lib/actions/feedback";
import { FeedbackHub } from "@/components/features/feedback/feedback-hub";
import {
  FEEDBACK_DIMENSIONS,
  type FeedbackDimensionKey,
} from "@/lib/feedback/dimensions";
import { getLocalDateString, startOfLocalMonth } from "@/lib/dates/local";

type FeedbackPageProps = {
  searchParams: Promise<{ from?: string; to?: string }>;
};

function emptyDashboard(from: string, to: string) {
  return {
    from,
    to,
    totalResponses: 0,
    overallAverage: 0,
    overallExperienceAverage: 0,
    dimensionAverages: FEEDBACK_DIMENSIONS.map((d) => ({
      key: d.key as FeedbackDimensionKey,
      label: d.label,
      average: 0,
      needsImprovement: false,
    })),
    needsImprovement: [],
    recent: [],
    lowScores: [],
    allReviews: [],
  };
}

export default async function FeedbackPage({ searchParams }: FeedbackPageProps) {
  const canAccess = await canUseFeedback();
  if (!canAccess) redirect("/dashboard");

  const params = await searchParams;
  const to = params.to ?? getLocalDateString();
  const from = params.from ?? startOfLocalMonth(to);

  const [customers, staffList, dashboard] = await Promise.all([
    getCustomers().catch((err) => {
      console.error("[feedback] customers load failed", err);
      return [];
    }),
    getStaff().catch((err) => {
      console.error("[feedback] staff load failed", err);
      return [];
    }),
    getFeedbackDashboard(from, to).catch((err) => {
      console.error("[feedback] dashboard load failed", err);
      return emptyDashboard(from, to);
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Feedback"
        description="Reception can collect ratings for registered customers or walk-ins (even without a profile), optionally credit a stylist, and browse all reviews openly."
      />

      <FeedbackHub
        customers={customers.map((c) => ({
          id: c.id,
          first_name: c.first_name,
          last_name: c.last_name,
          phone: c.phone,
        }))}
        staff={staffList
          .filter((s) => s.is_active !== false)
          .map((s) => ({ id: s.id, full_name: s.full_name }))}
        dashboard={dashboard}
      />
    </div>
  );
}
