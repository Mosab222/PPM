import { SkeletonBlock, SkeletonChartArea, SkeletonFilterBar, SkeletonSummaryCards } from "@/components/skeleton";

export default function StatusLoading() {
  return (
    <div className="flex flex-col gap-6">
      <SkeletonBlock className="h-6 w-40" />
      <SkeletonFilterBar fields={4} />
      <SkeletonSummaryCards count={4} />
      <SkeletonChartArea />
      <SkeletonChartArea className="h-48" />
    </div>
  );
}
