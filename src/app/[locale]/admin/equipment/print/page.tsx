import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { BulkQrGrid, type PrintEquipment } from "@/components/bulk-qr-grid";
import { BackButton } from "@/components/back-button";
import { PrintButton } from "@/components/print-button";
import { TypeSubtypeFilter, type FilterType, type FilterSubtype } from "@/components/type-subtype-filter";
import { formatNumber } from "@/lib/format";

type EquipmentRow = PrintEquipment & {
  facility_code: string | null;
  floor: string | null;
  type_code: string | null;
  subtype_code: string | null;
  area: string | null;
};

export default async function PrintQrLabelsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    facility?: string;
    type?: string;
    subtype?: string;
    floor?: string;
    area?: string;
  }>;
}) {
  const { locale } = await params;
  const { facility, type, subtype, floor, area } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("admin.equipment.print");

  const supabase = await createClient();

  let query = supabase
    .from("equipment")
    .select("id, code, room_name, area, facility_code, floor, type_code, subtype_code")
    .eq("deleted", false);

  if (facility) query = query.eq("facility_code", facility);
  if (type) query = query.eq("type_code", type);
  if (subtype) query = query.eq("subtype_code", subtype);
  if (floor) query = query.eq("floor", floor);
  if (area) query = query.eq("area", area);

  const { data: equipment } = await query.order("code", { ascending: true }).returns<EquipmentRow[]>();
  const rows = equipment ?? [];

  const [{ data: types }, { data: subtypes }, { data: facilityRows }, { data: floorRows }, { data: areaRows }] =
    await Promise.all([
      supabase
        .from("equipment_types")
        .select("id, code, name, arabic_name")
        .eq("active", true)
        .returns<FilterType[]>(),
      supabase
        .from("equipment_subtypes")
        .select("id, code, parent_type_id, name, arabic_name")
        .eq("active", true)
        .returns<FilterSubtype[]>(),
      supabase.from("equipment").select("facility_code").eq("deleted", false).not("facility_code", "is", null),
      supabase.from("equipment").select("floor").eq("deleted", false).not("floor", "is", null),
      supabase.from("equipment").select("area").eq("deleted", false).not("area", "is", null),
    ]);

  const facilities = Array.from(new Set((facilityRows ?? []).map((r) => r.facility_code as string))).sort();
  const floors = Array.from(new Set((floorRows ?? []).map((r) => r.floor as string))).sort();
  const areas = Array.from(new Set((areaRows ?? []).map((r) => r.area as string))).sort();

  return (
    <div className="flex flex-col gap-4">
      <BackButton />
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-xl font-bold">{t("title")}</h1>
        <PrintButton label={t("printButton")} />
      </div>

      <form
        method="GET"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4 print:hidden"
      >
        <div>
          <label className="mb-1 block text-xs text-muted">{t("filters.facility")}</label>
          <select
            name="facility"
            defaultValue={facility ?? ""}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="">{t("filters.allFacilities")}</option>
            {facilities.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <TypeSubtypeFilter
          types={types ?? []}
          subtypes={subtypes ?? []}
          locale={locale}
          defaultTypeCode={type}
          defaultSubtypeCode={subtype}
          typeLabel={t("filters.type")}
          subtypeLabel={t("filters.subtype")}
          allTypesLabel={t("filters.allTypes")}
          allSubtypesLabel={t("filters.allSubtypes")}
        />
        <div>
          <label className="mb-1 block text-xs text-muted">{t("filters.floor")}</label>
          <select
            name="floor"
            defaultValue={floor ?? ""}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="">{t("filters.allFloors")}</option>
            {floors.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">{t("filters.area")}</label>
          <select
            name="area"
            defaultValue={area ?? ""}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="">{t("filters.allAreas")}</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md border border-border px-4 py-1.5 text-sm font-medium hover:bg-background"
        >
          {t("filters.apply")}
        </button>
        <Link
          href="/admin/equipment/print"
          className="rounded-md px-4 py-1.5 text-sm font-medium text-muted hover:bg-background"
        >
          {t("filters.reset")}
        </Link>
      </form>

      <p className="text-sm text-muted print:hidden">{t("resultCount", { count: formatNumber(rows.length, locale) })}</p>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-6 text-center text-muted print:hidden">
          {t("empty")}
        </p>
      ) : (
        <BulkQrGrid equipment={rows} />
      )}
    </div>
  );
}
