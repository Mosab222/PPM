"use client";

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground print:hidden"
    >
      {label}
    </button>
  );
}
