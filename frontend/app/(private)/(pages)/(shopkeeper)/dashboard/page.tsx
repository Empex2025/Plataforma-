import { AudienceRegionCard } from "./_components/audience-region-card"
import { DashboardToolbar } from "./_components/dashboard-toolbar"
import { EngagementCard } from "./_components/engagement-card"
import { KpiCard } from "./_components/kpi-card"
import { ReachCard } from "./_components/reach-card"
import { RecentReviewsCard } from "./_components/recent-reviews-card"
import { TopProductsCard } from "./_components/top-products-card"
import { TrafficSourcesCard } from "./_components/traffic-sources-card"
import { VerificationBanner } from "./_components/verification-banner"
import { secondaryKpis, topKpis } from "./_data"

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <VerificationBanner />
      <DashboardToolbar />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {topKpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <EngagementCard />
        </div>
        <TopProductsCard />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {secondaryKpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ReachCard />
        </div>
        <div className="flex flex-col gap-4">
          <AudienceRegionCard />
          <TrafficSourcesCard />
        </div>
      </div>

      <RecentReviewsCard />
    </div>
  )
}
