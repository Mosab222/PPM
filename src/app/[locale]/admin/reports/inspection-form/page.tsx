import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { BackButton } from "@/components/back-button";
import { PrintButton } from "@/components/print-button";
import { PrintSingleButton } from "@/components/print-single-button";
import { TypeSubtypeFilter, type FilterType, type FilterSubtype } from "@/components/type-subtype-filter";
import { formatDate, formatNumber } from "@/lib/format";
import { riyadhDateString } from "@/lib/timezone";

type EquipmentLookup = {
  id: string;
  code: string;
  type_code: string | null;
  subtype_code: string | null;
  floor: string | null;
  zone: string | null;
  room_code: string | null;
  room_name: string | null;
  area: string | null;
  maintenance_frequency: string | null;
};

type ChecklistTemplateNameRow = {
  id: string;
  name: string;
  arabic_name: string | null;
};

type MaintenanceLogRow = {
  id: string;
  equipment_id: string;
  checklist_template_id: string;
  work_order_number: string | null;
  maintenance_date: string | null;
  maintenance_time: string | null;
  technician_name: string | null;
  approval_status: string | null;
  head_user_id: string | null;
  manager_user_id: string | null;
  rejected_by_role: string | null;
  rejection_reason: string | null;
};

type ApproverRow = { id: string; full_name: string | null; arabic_name: string | null };

type ChecklistItemRow = {
  id: string;
  checklist_template_id: string;
  question: string;
  arabic_question: string | null;
  item_type: "yes_no" | "number" | "text" | "photo";
  is_required: boolean;
  is_critical: boolean;
  display_order: number;
};

type ResponseRow = {
  maintenance_log_id: string;
  checklist_item_id: string;
  answer: string | null;
  is_passed: boolean | null;
};

type PhotoRow = {
  id: string;
  maintenance_log_id: string;
  photo_url: string;
};

const NO_MATCH_SENTINEL = "__no_match__";

function InfoField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-muted">{label}</p>
      <p className={`font-medium ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function answerDisplay(
  row: { item: ChecklistItemRow; answer: string | null; isPassed: boolean | null },
  locale: string,
  yesLabel: string,
  noLabel: string
) {
  if (row.item.item_type === "yes_no") {
    if (row.answer === "yes") return { text: yesLabel, colorClass: "text-green-700" };
    if (row.answer === "no") return { text: noLabel, colorClass: "text-red-700" };
    return { text: "—", colorClass: "text-muted" };
  }
  if (row.answer == null && row.isPassed == null) return { text: "—", colorClass: "text-muted" };
  const colorClass =
    row.isPassed === true ? "text-green-700" : row.isPassed === false ? "text-red-700" : "text-foreground";
  return { text: row.answer ?? "—", colorClass };
}

export default async function InspectionFormReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    type?: string;
    subtype?: string;
    floor?: string;
    area?: string;
    from?: string;
    to?: string;
    photos?: string;
  }>;
}) {
  const { locale } = await params;
  const { type, subtype, floor, area, from, to, photos: photosParam } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("admin.reports.inspectionForm");
  const tChecklist = await getTranslations("checklist");
  const tFreq = await getTranslations("admin.equipment.form");

  const attachPhotos = photosParam === "1";

  const supabase = await createClient();

  // Fired now, awaited later (near where its results are used) -- these
  // filter-option lookups don't depend on anything else in this function, so
  // there's no reason to make them wait for the equipment/logs/checklist
  // chain below to finish first.
  const filterListsPromise = Promise.all([
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
    supabase.from("equipment").select("floor").eq("deleted", false).not("floor", "is", null),
    supabase.from("equipment").select("area").eq("deleted", false).not("area", "is", null),
  ]);

  let equipmentQuery = supabase
    .from("equipment")
    .select("id, code, type_code, subtype_code, floor, zone, room_code, room_name, area, maintenance_frequency")
    .eq("deleted", false);

  if (type) equipmentQuery = equipmentQuery.eq("type_code", type);
  if (subtype) equipmentQuery = equipmentQuery.eq("subtype_code", subtype);
  if (floor) equipmentQuery = equipmentQuery.eq("floor", floor);
  if (area) equipmentQuery = equipmentQuery.eq("area", area);

  const { data: equipment } = await equipmentQuery.returns<EquipmentLookup[]>();
  const equipmentRows = equipment ?? [];
  const equipmentMap = new Map(equipmentRows.map((e) => [e.id, e]));
  const equipmentIds = equipmentRows.map((e) => e.id);

  let logQuery = supabase
    .from("maintenance_logs")
    .select(
      "id, equipment_id, checklist_template_id, work_order_number, maintenance_date, maintenance_time, technician_name, approval_status, head_user_id, manager_user_id, rejected_by_role, rejection_reason"
    )
    .eq("status", "completed")
    .eq("deleted", false)
    .in("equipment_id", equipmentIds.length > 0 ? equipmentIds : [NO_MATCH_SENTINEL]);

  if (from) logQuery = logQuery.gte("maintenance_date", from);
  if (to) logQuery = logQuery.lte("maintenance_date", to);

  const { data: logs } = await logQuery
    .order("maintenance_date", { ascending: false, nullsFirst: false })
    .order("maintenance_time", { ascending: false, nullsFirst: false })
    .returns<MaintenanceLogRow[]>();

  const logRows = logs ?? [];
  const logIds = logRows.map((l) => l.id);
  const templateIds = Array.from(new Set(logRows.map((l) => l.checklist_template_id)));

  let responseRows: ResponseRow[] = [];
  let itemRows: ChecklistItemRow[] = [];
  let photoRows: PhotoRow[] = [];
  let templateNameById = new Map<string, string>();
  let approverNameById = new Map<string, string>();

  const approverIds = Array.from(
    new Set(
      logRows.flatMap((l) => [l.head_user_id, l.manager_user_id]).filter((id): id is string => id != null)
    )
  );
  if (approverIds.length > 0) {
    const { data: approvers } = await supabase
      .from("users")
      .select("id, full_name, arabic_name")
      .in("id", approverIds)
      .returns<ApproverRow[]>();
    approverNameById = new Map(
      (approvers ?? []).map((a) => [a.id, (locale === "ar" ? a.arabic_name : a.full_name) || a.full_name || a.arabic_name || ""])
    );
  }

  if (logIds.length > 0) {
    const [{ data: responses }, { data: items }, { data: photoData }, { data: templateRows }] = await Promise.all([
      supabase
        .from("maintenance_responses")
        .select("maintenance_log_id, checklist_item_id, answer, is_passed")
        .in("maintenance_log_id", logIds)
        .returns<ResponseRow[]>(),
      supabase
        .from("checklist_items")
        .select("id, checklist_template_id, question, arabic_question, item_type, is_required, is_critical, display_order")
        .in("checklist_template_id", templateIds)
        .order("display_order", { ascending: true })
        .returns<ChecklistItemRow[]>(),
      supabase
        .from("maintenance_photos")
        .select("id, maintenance_log_id, photo_url")
        .in("maintenance_log_id", logIds)
        .order("created_at", { ascending: true })
        .returns<PhotoRow[]>(),
      // Title source of truth: each printed form's header uses ITS OWN
      // template's name, instead of a single hardcoded string -- a report
      // run can span multiple equipment types/templates at once.
      supabase
        .from("checklist_templates")
        .select("id, name, arabic_name")
        .in("id", templateIds)
        .returns<ChecklistTemplateNameRow[]>(),
    ]);
    responseRows = responses ?? [];
    itemRows = items ?? [];
    photoRows = photoData ?? [];
    templateNameById = new Map(
      (templateRows ?? []).map((tpl) => [tpl.id, (locale === "ar" ? tpl.arabic_name : tpl.name) || tpl.name])
    );
  }

  const responseMap = new Map<string, ResponseRow>();
  for (const r of responseRows) responseMap.set(`${r.maintenance_log_id}:${r.checklist_item_id}`, r);

  const itemsByTemplate = new Map<string, ChecklistItemRow[]>();
  for (const item of itemRows) {
    if (item.item_type === "photo") continue; // no real answer to show — same as the live checklist form
    const list = itemsByTemplate.get(item.checklist_template_id) ?? [];
    list.push(item);
    itemsByTemplate.set(item.checklist_template_id, list);
  }

  const photosByLog = new Map<string, PhotoRow[]>();
  for (const p of photoRows) {
    const list = photosByLog.get(p.maintenance_log_id) ?? [];
    list.push(p);
    photosByLog.set(p.maintenance_log_id, list);
  }

  const forms = logRows
    .filter((log) => equipmentMap.has(log.equipment_id))
    .map((log) => ({
      log,
      equipment: equipmentMap.get(log.equipment_id)!,
      rows: (itemsByTemplate.get(log.checklist_template_id) ?? []).map((item) => {
        const response = responseMap.get(`${log.id}:${item.id}`);
        return { item, answer: response?.answer ?? null, isPassed: response?.is_passed ?? null };
      }),
      photos: photosByLog.get(log.id) ?? [],
      // "Evaluated by" fills in as soon as the head has made ANY decision on
      // this log (approve-to-next-stage or reject) -- it means "someone
      // evaluated this," not "this passed." "Approved by" is stricter: it
      // only fills in on true final approval, never on rejection.
      evaluatedByName: log.head_user_id ? approverNameById.get(log.head_user_id) ?? null : null,
      approvedByName:
        log.approval_status === "approved" && log.manager_user_id
          ? approverNameById.get(log.manager_user_id) ?? null
          : null,
    }));

  const [{ data: types }, { data: subtypes }, { data: floorRows }, { data: areaRows }] = await filterListsPromise;

  const floors = Array.from(new Set((floorRows ?? []).map((r) => r.floor as string))).sort();
  const areas = Array.from(new Set((areaRows ?? []).map((r) => r.area as string))).sort();

  const generatedOn = formatDate(riyadhDateString(), locale);
  const yesLabel = tChecklist("yes");
  const noLabel = tChecklist("no");

  return (
    <div className="flex flex-col gap-4">
      <BackButton />
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-xl font-bold">{t("title")}</h1>
        <PrintButton label={t("printAll")} />
      </div>

      <form
        method="GET"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4 print:hidden"
      >
        <div>
          <label className="mb-1 block text-xs text-muted">{t("filters.fromDate")}</label>
          <input
            type="date"
            name="from"
            defaultValue={from ?? ""}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">{t("filters.toDate")}</label>
          <input
            type="date"
            name="to"
            defaultValue={to ?? ""}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
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
        <label className="flex items-center gap-2 pb-1.5 text-sm">
          <input type="checkbox" name="photos" value="1" defaultChecked={attachPhotos} className="h-4 w-4" />
          {t("filters.attachPhotos")}
        </label>
        <button
          type="submit"
          className="rounded-md border border-border px-4 py-1.5 text-sm font-medium hover:bg-background"
        >
          {t("filters.apply")}
        </button>
        <Link
          href="/admin/reports/inspection-form"
          className="rounded-md px-4 py-1.5 text-sm font-medium text-muted hover:bg-background"
        >
          {t("filters.reset")}
        </Link>
      </form>

      <p className="text-sm text-muted print:hidden">
        {t("resultCount", { count: formatNumber(forms.length, locale) })}
      </p>

      <div id="pms-print-area" className="pms-print-area flex flex-col gap-6">
        {forms.length === 0 ? (
          <p className="rounded-lg border border-border bg-card p-6 text-center text-muted">{t("empty")}</p>
        ) : (
          forms.map((form, index) => (
            <div
              key={form.log.id}
              data-form-group={form.log.id}
              className={`inspection-group flex flex-col gap-3 ${index > 0 ? "inspection-group-break" : ""}`}
            >
              <div className="inspection-form-page flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
                <div className="flex justify-end print:hidden">
                  <PrintSingleButton groupId={form.log.id} label={t("printOnlyThis")} />
                </div>

                <div dir="ltr" className="grid grid-cols-3 items-center gap-3 border-b-4 border-primary pb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/zahran.png" alt="Zahran" className="h-12 w-auto justify-self-start object-contain" />
                  <div className="text-center">
                    <h2 className="text-base font-bold text-primary">
                      {templateNameById.get(form.log.checklist_template_id) ?? t("formTitleFallback")}
                    </h2>
                    <p className="mt-0.5 text-xs font-medium">{t("facilityName")}</p>
                    <p className="mt-0.5 text-[10px] text-muted">{t("generatedOn", { date: generatedOn })}</p>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/kaauh.png" alt="KAAUH" className="h-12 w-auto justify-self-end object-contain" />
                </div>

                <div className="grid grid-cols-5 gap-x-4 gap-y-2 rounded-md border border-border p-3 text-xs">
                  <InfoField label={t("info.workOrder")} value={form.log.work_order_number ?? "—"} mono />
                  <InfoField label={t("info.date")} value={formatDate(form.log.maintenance_date, locale)} />
                  <InfoField label={t("info.code")} value={form.equipment.code} mono />
                  <InfoField label={t("info.floor")} value={form.equipment.floor ?? "—"} />
                  <InfoField label={t("info.zone")} value={form.equipment.zone ?? "—"} />
                  <InfoField label={t("info.room")} value={form.equipment.room_code ?? "—"} />
                  <InfoField label={t("info.roomName")} value={form.equipment.room_name ?? "—"} />
                  <InfoField label={t("info.area")} value={form.equipment.area ?? "—"} />
                  <InfoField
                    label={t("info.frequency")}
                    value={
                      form.equipment.maintenance_frequency
                        ? tFreq(`frequency_value.${form.equipment.maintenance_frequency}`)
                        : "—"
                    }
                  />
                </div>

                <table className="inspection-checklist w-full text-start text-xs">
                  <thead>
                    <tr className="border-b-2 border-primary bg-primary/10">
                      <th className="px-2 py-1 text-start font-medium">{t("checklist.seq")}</th>
                      <th className="px-2 py-1 text-start font-medium">{t("checklist.question")}</th>
                      <th className="px-2 py-1 text-start font-medium">{t("checklist.answer")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.rows.map((row, index) => {
                      const questionText =
                        (locale === "ar" ? row.item.arabic_question : row.item.question) || row.item.question;
                      const display = answerDisplay(row, locale, yesLabel, noLabel);
                      return (
                        <tr
                          key={row.item.id}
                          className={`border-b border-border last:border-0 ${
                            index % 2 === 1 ? "bg-background/60" : ""
                          }`}
                        >
                          <td className="px-2 py-1">{index + 1}</td>
                          <td className="px-2 py-1">{questionText}</td>
                          <td className={`px-2 py-1 font-medium ${display.colorClass}`}>{display.text}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div dir="ltr" className="mt-2 grid grid-cols-3 gap-3 text-center text-[10px]">
                  <div className="rounded-md border border-border p-2">
                    <p className="font-medium">{t("signatures.inspectedBy")}</p>
                    <p className="mt-5 border-t border-border pt-1">{form.log.technician_name ?? "—"}</p>
                  </div>
                  <div className="rounded-md border border-border p-2">
                    <p className="font-medium">{t("signatures.evaluatedBy")}</p>
                    <p className="mt-5 border-t border-border pt-1">{form.evaluatedByName || " "}</p>
                  </div>
                  <div className="rounded-md border border-border p-2">
                    <p className="font-medium">{t("signatures.approvedBy")}</p>
                    <p className="mt-5 border-t border-border pt-1">{form.approvedByName || " "}</p>
                  </div>
                </div>
              </div>

              {attachPhotos && form.photos.length > 0 && (
                <div className="inspection-photo-page flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
                  <div
                    dir="ltr"
                    className="flex items-center justify-between border-b-2 border-primary pb-2 text-xs font-medium"
                  >
                    <span className="font-mono">{form.equipment.code}</span>
                    <span>{formatDate(form.log.maintenance_date, locale)}</span>
                    <span className="font-mono">{form.log.work_order_number ?? "—"}</span>
                  </div>
                  <p className="text-sm font-bold">{t("photosPageTitle")}</p>
                  <div className="grid grid-cols-3 gap-3">
                    {form.photos.map((photo) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={photo.id}
                        src={photo.photo_url}
                        alt=""
                        className="h-40 w-full rounded-md border border-border object-cover"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
