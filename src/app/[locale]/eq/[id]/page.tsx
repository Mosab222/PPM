import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { formatDate, formatTime } from "@/lib/format";
import { ResultBadge } from "@/components/result-badge";
import { StatusBadge } from "@/components/status-badge";
import { Link } from "@/i18n/navigation";

type EquipmentHistoryRow = {
  equipment_code: string;
  subtype_code: string | null;
  building_code: string | null;
  floor: string | null;
  location: string | null;
  weight: number | null;
  status: string | null;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  maintenance_log_id: string | null;
  maintenance_date: string | null;
  maintenance_time: string | null;
  technician_name: string | null;
  result: string | null;
  photo_urls: string[] | null;
};

async function getEquipmentHistory(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("equipment_public_history")
    .select("*")
    .eq("equipment_code", id)
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
  searchParams: Promise<{ submitted?: string; result?: string; issues?: string }>;
}) {
  const { locale, id } = await params;
  const { submitted, result: submittedResult, issues } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("equipment");
  const tFooter = await getTranslations("footer");

  const rows = await getEquipmentHistory(id);

  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <h1 className="text-xl font-bold text-red-700">{t("notFound")}</h1>
        <p className="mt-2 text-muted">{t("notFoundBody")}</p>
      </div>
    );
  }

  const equipment = rows[0];
  const history = rows.filter((row) => row.maintenance_date !== null);
  const user = await getCurrentUser();
  const canExecuteMaintenance = Boolean(user && user.is_active);

  const details: Array<[string, React.ReactNode]> = [
    [t("subtype"), equipment.subtype_code ?? "—"],
    [t("building"), equipment.building_code ?? "—"],
    [t("floor"), equipment.floor ?? "—"],
    [t("location"), equipment.location ?? "—"],
    [t("weight"), equipment.weight != null ? String(equipment.weight) : "—"],
    [t("status"), equipment.status ? <StatusBadge status={equipment.status} /> : "—"],
    [t("lastMaintenanceDate"), formatDate(equipment.last_maintenance_date, locale)],
    [t("nextMaintenanceDate"), formatDate(equipment.next_maintenance_date, locale)],
  ];

  const issuesCount = Number(issues ?? 0);

  return (
    <div className="flex flex-col gap-6">
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
        {canExecuteMaintenance && (
          <Link
            href={`/eq/${id}/execute`}
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
