import { SkeletonBlock, SkeletonFilterBar, SkeletonTable } from "@/components/skeleton";

export default function EquipmentLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-6 w-28" />
        <div className="flex gap-3">
          <SkeletonBlock className="h-9 w-32" />
          <SkeletonBlock className="h-9 w-32" />
        </div>
      </div>
      <SkeletonFilterBar fields={4} />
      <SkeletonTable rows={8} columns={7} />
    </div>
  );
}
