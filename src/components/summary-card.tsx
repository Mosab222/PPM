export function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: "green" | "amber" | "red" | "blue";
}) {
  const colorClass =
    color === "green"
      ? "text-green-700"
      : color === "amber"
        ? "text-amber-700"
        : color === "red"
          ? "text-red-700"
          : color === "blue"
            ? "text-blue-700"
            : "text-foreground";

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${colorClass}`}>{value}</p>
    </div>
  );
}
