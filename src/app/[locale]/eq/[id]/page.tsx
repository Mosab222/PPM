import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { formatDate, formatMonthYear, formatTime } from "@/lib/format";
import { ResultBadge } from "@/components/result-badge";
import { SchedulingStatusBadge } from "@/components/scheduling-status-badge";
import { OperationalStatusBadge } from "@/components/operational-status-badge";
import { Link } from "@/i18n/navigation";
import { classifySchedulingStatus, monthKey, previousMonthKey } from "@/lib/scheduling";
import { classifyOperationalStatus } from "@/lib/operational-status";
import { isUuid } from "@/lib/is-uuid";

type EquipmentHistoryRow = {
  equipment_id: string;
  equipment_code: string;
  type_code: string | null;
  subtype_code: string | null;
  facility_code: string | null;
  floor: string | null;
  zone: string | null;
  room_code: string | null;
  room_name: string | null;
  area: string | null;
  weight: number | null;
  status: string | null;
  created_at: string;
  maintenance_frequency: string | null;
  manual_operational_override: string | null;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  maintenance_log_id: string | null;
  work_order_number: string | null;
  maintenance_date: string | null;
  maintenance_time: string | null;
  technician_name: string | null;
  result: string | null;
  approval_status: string | null;
  photo_urls: string[] | null;
};

async function getEquipmentHistory(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("equipment_public_history")
    .select("*")
    .eq(isUuid(id) ? "equipment_id" : "equipment_code", id)
    .order("maintenance_date", { ascending: false, nullsFirst: false })
    .order("maintenance_time", { ascending: false, nullsFirst: false });

  return data as EquipmentHistoryRow[] | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: id };
}

export default async function EquipmentPublicPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ submitted?: string; result?: string; issues?: string; returnTo?: string }>;
}) {
  const { locale, id } = await params;
  const { submitted, result: submittedResult, issues, returnTo } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("equipment");
  const tFooter = await getTranslations("footer");

  const rows = await getEquipmentHistory(id);

  if (!rows || rows.length === 0) {
    return (
      <div className="mx-auto w-full max-w-4xl rounded-lg border border-border bg-card p-8 text-center">
        {returnTo && (
          <Link href={returnTo} className="mb-4 inline-block text-sm text-primary underline">
            {t("backToList")}
          </Link>
        )}
        <h1 className="text-xl font-bold text-red-700">{t("notFound")}</h1>
        <p className="mt-2 text-muted">{t("notFoundBody")}</p>
      </div>
    );
  }

  const equipment = rows[0];
  const history = rows.filter((row) => row.maintenance_date !== null);
  const user = await getCurrentUser();
  const canExecuteMaintenance = Boolean(user && user.is_active);

  const todayIso = new Date().toISOString();
  const currentMonth = monthKey(todayIso);
  const previousMonth = previousMonthKey(currentMonth);

  // rows[0] is just whatever log is newest -- it could be pending or
  // rejected, not necessarily approved -- so scheduling/operational status
  // must scan the full history rather than trusting rows[0] directly. `rows`
  // is already ordered newest-first by the query, so filtering preserves order.
  const approvedRows = rows.filter((row) => row.approval_status === "approved" && row.maintenance_date !== null);
  const hasPendingApproval = rows.some(
    (row) => row.approval_status === "pending_head" || row.approval_status === "pending_manager"
  );
  const latestApproved = approvedRows[0];
  const latestApprovedMonth = latestApproved?.maintenance_date ? monthKey(latestApproved.maintenance_date) : null;

  const schedulingBucket = classifySchedulingStatus({
    frequency: equipment.maintenance_frequency,
    createdAt: equipment.created_at,
    hasCurrentMonthApproval: latestApprovedMonth === currentMonth,
    hasPreviousMonthApproval: latestApprovedMonth === previousMonth,
    hasPendingApproval,
    todayIso,
  });

  const operationalStatus = classifyOperationalStatus({
    manualOverride: equipment.manual_operational_override,
    latestCompletedResult: latestApproved?.result ?? null,
  });

  const details: Array<[string, React.ReactNode]> = [
    [t("subtype"), equipment.subtype_code ?? "—"],
    [t("facility"), equipment.facility_code ?? "—"],
    [t("floor"), equipment.floor ?? "—"],
    [t("zone"), equipment.zone ?? "—"],
    [t("room"), equipment.room_code ?? "—"],
    [t("roomName"), equipment.room_name ?? "—"],
    [t("area"), equipment.area ?? "—"],
    [t("weight"), equipment.weight != null ? String(equipment.weight) : "—"],
    [t("lastMaintenanceDate"), formatDate(equipment.last_maintenance_date, locale)],
    [t("nextMaintenanceDate"), formatMonthYear(equipment.next_maintenance_date, locale)],
  ];

  const issuesCount = Number(issues ?? 0);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      {returnTo && (
        <Link href={returnTo} className="self-start text-sm text-primary underline">
          {t("backToList")}
        </Link>
      )}

      {submitted === "1" && (
        <div
          className={`rounded-lg border p-4 text-center text-sm font-medium ${
            submittedResult === "passed"
              ? "border-green-300 bg-green-50 text-green-800"
              : "border-amber-300 bg-amber-50 text-amber-800"
          }`}
        >
          {submittedResult === "passed"
            ? t("banner.passed")
            : t("banner.needsAttention", { count: issuesCount })}
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted">{t("code")}</p>
        <p className="mt-1 break-all font-mono text-2xl font-bold tracking-wide text-primary">
          {equipment.equipment_code}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">{t("schedulingStatus")}</span>
            <SchedulingStatusBadge status={schedulingBucket} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">{t("operationalStatus")}</span>
            <OperationalStatusBadge status={operationalStatus} />
          </div>
        </div>
        {canExecuteMaintenance && (
          <Link
            href={`/eq/${equipment.equipment_id}/execute${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
            prefetch={false}
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            {t("executeMaintenance")}
          </Link>
        )}
      </div>

      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">{t("details")}</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          {details.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">{t("historyTitle")}</h2>
        {history.length === 0 ? (
          <p className="text-muted">{t("historyEmpty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-start text-muted">
                  <th className="py-2 text-start font-medium">{t("table.workOrder")}</th>
                  <th className="py-2 text-start font-medium">{t("table.date")}</th>
                  <th className="py-2 text-start font-medium">{t("table.time")}</th>
                  <th className="py-2 text-start font-medium">{t("table.technician")}</th>
                  <th className="py-2 text-start font-medium">{t("table.result")}</th>
                  <th className="py-2 text-start font-medium">{t("table.photos")}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row, index) => (
                  <tr key={index} className="border-b border-border last:border-0">
                    <td className="py-2 font-mono">{row.work_order_number ?? "—"}</td>
                    <td className="py-2">{formatDate(row.maintenance_date, locale)}</td>
                    <td className="py-2">{formatTime(row.maintenance_time, locale)}</td>
                    <td className="py-2">{row.technician_name ?? "—"}</td>
                    <td className="py-2">
                      {row.result ? <ResultBadge result={row.result} /> : "—"}
                    </td>
                    <td className="py-2">
                      {row.photo_urls && row.photo_urls.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {row.photo_urls.map((url) => (
                            <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt=""
                                className="h-10 w-10 rounded-md border border-border object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-center text-xs text-muted">{tFooter("publicNotice")}</p>
    </div>
  );
}
