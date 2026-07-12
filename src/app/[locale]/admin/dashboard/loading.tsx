import { SkeletonBlock, SkeletonChartArea, SkeletonFilterBar, SkeletonSummaryCards } from "@/components/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      <SkeletonBlock className="h-6 w-32" />
      <SkeletonFilterBar fields={6} />
      <SkeletonSummaryCards count={4} />
      <SkeletonChartArea />
    </div>
  );
}
