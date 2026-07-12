import { SkeletonBlock, SkeletonFilterBar, SkeletonTable } from "@/components/skeleton";

export default function ReportsLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-6 w-28" />
        <SkeletonBlock className="h-9 w-32" />
      </div>
      <SkeletonFilterBar fields={7} />
      <SkeletonBlock className="h-4 w-40" />
      <SkeletonTable rows={8} columns={8} />
    </div>
  );
}
