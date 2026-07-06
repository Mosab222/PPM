import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";

type EquipmentRow = {
  id: string;
  type_code: string;
  subtype_code: string;
  facility_code: string | null;
  floor: string | null;
  room_code: string | null;
  status: string | null;
  next_maintenance_date: string | null;
};

type EquipmentSubtype = {
  code: string;
  name: string;
  arabic_name: string | null;
  parent_type_id: string;
};

type EquipmentType = {
  id: string;
  code: string;
  name: string;
  arabic_name: string | null;
};

const STATUS_VALUES = ["compliant", "due", "overdue", "needs_attention", "decommissioned"] as const;

export default async function EquipmentListPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; facility?: string; subtype?: string; status?: string }>;
}) {
  const { locale } = await params;
  const { q, facility, subtype, status } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("admin.equipment");
  const tStatus = await getTranslations("equipment.status_value");

  const supabase = await createClient();

  const [{ data: types }, { data: subtypes }] = await Promise.all([
    supabase.from("equipment_types").select("id, code, name, arabic_name").returns<EquipmentType[]>(),
    supabase
      .from("equipment_subtypes")
      .select("code, name, arabic_name, parent_type_id")
      .returns<EquipmentSubtype[]>(),
  ]);

  const typesById = new Map((types ?? []).map((type) => [type.id, type]));
  const subtypeLabels = new Map(
    (subtypes ?? []).map((s) => {
      const parentType = typesById.get(s.parent_type_id);
      const subtypeName = (locale === "ar" ? s.arabic_name : s.name) || s.name;
      const typeName = parentType ? (locale === "ar" ? parentType.arabic_name : parentType.name) || parentType.name : "";
      return [s.code, typeName ? `${typeName} — ${subtypeName}` : subtypeName];
    })
  );

  let query = supabase.from("equipment").select("*").eq("deleted", false);

  if (q) {
    query = query.or(`id.ilike.%${q}%,room_code.ilike.%${q}%`);
  }
  if (facility) {
    query = query.ilike("facility_code", `%${facility}%`);
  }
  if (subtype) {
    query = query.eq("subtype_code", subtype);
  }
  if (status) {
    query = query.eq("status", status);
  }

  const { data: equipment } = await query
    .order("id", { ascending: true })
    .returns<EquipmentRow[]>();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("listTitle")}</h1>
        <Link
          href="/admin/equipment/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {t("addNew")}
        </Link>
      </div>

      <form method="GET" className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <div>
          <label className="mb-1 block text-xs text-muted">{t("search")}</label>
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder={t("searchPlaceholder")}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">{t("filterFacility")}</label>
          <input
            type="text"
            name="facility"
            defaultValue={facility ?? ""}
            className="w-32 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">{t("filterSubtype")}</label>
          <select
            name="subtype"
            defaultValue={subtype ?? ""}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="">{t("allSubtypes")}</option>
            {(subtypes ?? []).map((s) => (
              <option key={s.code} value={s.code}>
                {subtypeLabels.get(s.code)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">{t("filterStatus")}</label>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="">{t("allStatuses")}</option>
            {STATUS_VALUES.map((value) => (
              <option key={value} value={value}>
                {tStatus(value)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md border border-border px-4 py-1.5 text-sm font-medium hover:bg-background"
        >
          {t("applyFilters")}
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-start text-sm">
          <thead>
            <tr className="border-b border-border text-start text-muted">
              <th className="px-4 py-2 text-start font-medium">{t("table.code")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("table.type")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("table.facility")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("table.floor")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("table.room")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("table.status")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("table.nextMaintenance")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("table.view")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("table.edit")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("table.qr")}</th>
            </tr>
          </thead>
          <tbody>
            {(equipment ?? []).map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2 font-mono">{row.id}</td>
                <td className="px-4 py-2">{subtypeLabels.get(row.subtype_code) ?? row.subtype_code}</td>
                <td className="px-4 py-2">{row.facility_code ?? "—"}</td>
                <td className="px-4 py-2">{row.floor ?? "—"}</td>
                <td className="px-4 py-2">{row.room_code ?? "—"}</td>
                <td className="px-4 py-2">
                  {row.status ? <StatusBadge status={row.status} /> : "—"}
                </td>
                <td className="px-4 py-2">{formatDate(row.next_maintenance_date, locale)}</td>
                <td className="px-4 py-2">
                  <Link href={`/eq/${row.id}`} className="text-primary underline">
                    {t("table.view")}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <Link href={`/admin/equipment/${row.id}`} className="text-primary underline">
                    {t("table.edit")}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <Link href={`/admin/equipment/${row.id}/qr`} className="text-primary underline">
                    {t("table.qr")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!equipment || equipment.length === 0) && (
          <p className="p-6 text-center text-muted">{t("empty")}</p>
        )}
      </div>
    </div>
  );
}
