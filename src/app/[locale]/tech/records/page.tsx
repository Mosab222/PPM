import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { formatDate, formatTime } from "@/lib/format";
import { ResultBadge } from "@/components/result-badge";
import { Link } from "@/i18n/navigation";

type OwnLogRow = {
  id: string;
  equipment_id: string;
  work_order_number: string | null;
  maintenance_date: string | null;
  maintenance_time: string | null;
  result: string | null;
};

export default async function MyRecordsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("tech.records");

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/login?next=/${locale}/tech/records`);
  }

  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("maintenance_logs")
    .select("id, equipment_id, work_order_number, maintenance_date, maintenance_time, result")
    .eq("technician_id", user.id)
    .eq("status", "completed")
    .eq("deleted", false)
    .order("maintenance_date", { ascending: false, nullsFirst: false })
    .order("maintenance_time", { ascending: false, nullsFirst: false })
    .returns<OwnLogRow[]>();

  const rows = logs ?? [];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">{t("title")}</h1>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-start text-sm">
          <thead>
            <tr className="border-b border-border text-start text-muted">
              <th className="px-4 py-2 text-start font-medium">{t("table.workOrder")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("table.code")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("table.date")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("table.time")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("table.result")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2 font-mono">{row.work_order_number ?? "—"}</td>
                <td className="px-4 py-2 font-mono">
                  <Link href={`/eq/${row.equipment_id}`} className="text-primary underline">
                    {row.equipment_id}
                  </Link>
                </td>
                <td className="px-4 py-2">{formatDate(row.maintenance_date, locale)}</td>
                <td className="px-4 py-2">{formatTime(row.maintenance_time, locale)}</td>
                <td className="px-4 py-2">
                  {row.result ? <ResultBadge result={row.result} /> : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-center text-muted">{t("empty")}</p>}
      </div>
    </div>
  );
}
