import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { Link } from "@/i18n/navigation";
import { BackButton } from "@/components/back-button";
import { ResultBadge } from "@/components/result-badge";
import { ApprovalActions } from "@/components/approval-actions";
import { formatDate, formatTime } from "@/lib/format";

type LogDetail = {
  id: string;
  equipment_id: string;
  checklist_template_id: string;
  technician_name: string | null;
  maintenance_date: string | null;
  maintenance_time: string | null;
  result: string | null;
  issues_found: number;
  approval_status: string;
  work_order_number: string | null;
};

type EquipmentLookup = {
  id: string;
  code: string;
  type_code: string | null;
  subtype_code: string | null;
  floor: string | null;
  zone: string | null;
  room_code: string | null;
  room_name: string | null;
};

type ChecklistItemRow = {
  id: string;
  question: string;
  arabic_question: string | null;
  item_type: "yes_no" | "number" | "text" | "photo";
  is_required: boolean;
  is_critical: boolean;
  display_order: number;
};

type ResponseRow = {
  checklist_item_id: string;
  answer: string | null;
  is_passed: boolean | null;
  notes: string | null;
};

type PhotoRow = { id: string; photo_url: string };

function answerDisplay(
  item: ChecklistItemRow,
  response: ResponseRow | null,
  yesLabel: string,
  noLabel: string
) {
  if (item.item_type === "yes_no") {
    if (response?.answer === "yes") return { text: yesLabel, colorClass: "text-green-700" };
    if (response?.answer === "no") return { text: noLabel, colorClass: "text-red-700" };
    return { text: "—", colorClass: "text-muted" };
  }
  if (!response || (response.answer == null && response.is_passed == null)) {
    return { text: "—", colorClass: "text-muted" };
  }
  const colorClass =
    response.is_passed === true ? "text-green-700" : response.is_passed === false ? "text-red-700" : "text-foreground";
  return { text: response.answer ?? "—", colorClass };
}

export default async function ApprovalDetailPage({
  params,
}: {
  params: Promise<{ locale: string; logId: string }>;
}) {
  const { locale, logId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("approvals");
  const tChecklist = await getTranslations("checklist");

  const user = await getCurrentUser();
  if (!user || user.role === "technician") {
    redirect(`/${locale}/login`);
  }

  const supabase = await createClient();

  const { data: log } = await supabase
    .from("maintenance_logs")
    .select(
      "id, equipment_id, checklist_template_id, technician_name, maintenance_date, maintenance_time, result, issues_found, approval_status, work_order_number"
    )
    .eq("id", logId)
    .single<LogDetail>();

  if (!log) notFound();

  const canAct =
    (user.role === "head" && log.approval_status === "pending_head") ||
    (user.role === "manager" && log.approval_status === "pending_manager");

  const [{ data: equipment }, { data: items }, { data: responses }, { data: photos }] = await Promise.all([
    supabase
      .from("equipment")
      .select("id, code, type_code, subtype_code, floor, zone, room_code, room_name")
      .eq("id", log.equipment_id)
      .single<EquipmentLookup>(),
    supabase
      .from("checklist_items")
      .select("id, question, arabic_question, item_type, is_required, is_critical, display_order")
      .eq("checklist_template_id", log.checklist_template_id)
      .order("display_order", { ascending: true })
      .returns<ChecklistItemRow[]>(),
    supabase
      .from("maintenance_responses")
      .select("checklist_item_id, answer, is_passed, notes")
      .eq("maintenance_log_id", log.id)
      .returns<ResponseRow[]>(),
    supabase
      .from("maintenance_photos")
      .select("id, photo_url")
      .eq("maintenance_log_id", log.id)
      .order("created_at", { ascending: true })
      .returns<PhotoRow[]>(),
  ]);

  const responseMap = new Map((responses ?? []).map((r) => [r.checklist_item_id, r]));
  const rows = (items ?? [])
    .filter((item) => item.item_type !== "photo")
    .map((item) => ({ item, response: responseMap.get(item.id) ?? null }));

  const yesLabel = tChecklist("yes");
  const noLabel = tChecklist("no");

  return (
    <div className="flex flex-col gap-4">
      <BackButton />

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-lg font-bold text-primary">{equipment?.code ?? "—"}</p>
            <p className="text-sm text-muted">
              {[equipment?.floor, equipment?.zone, equipment?.room_code].filter(Boolean).join(" / ") || "—"}
            </p>
          </div>
          {log.result && <ResultBadge result={log.result} />}
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted">{t("detail.workOrder")}</dt>
            <dd className="font-medium">{log.work_order_number ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{t("detail.date")}</dt>
            <dd className="font-medium">{formatDate(log.maintenance_date, locale)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{t("detail.time")}</dt>
            <dd className="font-medium">{formatTime(log.maintenance_time, locale)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{t("detail.technician")}</dt>
            <dd className="font-medium">{log.technician_name ?? "—"}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-3 text-lg font-semibold">{t("detail.checklistTitle")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead>
              <tr className="border-b border-border text-start text-muted">
                <th className="px-2 py-1.5 text-start font-medium">{t("detail.question")}</th>
                <th className="px-2 py-1.5 text-start font-medium">{t("detail.answer")}</th>
                <th className="px-2 py-1.5 text-start font-medium">{t("detail.notes")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ item, response }) => {
                const questionText = (locale === "ar" ? item.arabic_question : item.question) || item.question;
                const display = answerDisplay(item, response, yesLabel, noLabel);
                return (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="px-2 py-1.5">{questionText}</td>
                    <td className={`px-2 py-1.5 font-medium ${display.colorClass}`}>{display.text}</td>
                    <td className="px-2 py-1.5 text-muted">{response?.notes ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-3 text-lg font-semibold">{t("detail.photosTitle")}</h2>
        {photos && photos.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photos.map((photo) => (
              <a key={photo.id} href={photo.photo_url} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.photo_url}
                  alt=""
                  className="h-32 w-full rounded-md border border-border object-cover"
                />
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">{t("detail.noPhotos")}</p>
        )}
      </div>

      {canAct ? (
        <ApprovalActions logIds={[log.id]} onAfterAction="navigateToQueue" />
      ) : user.role === "admin" ? (
        <p className="text-sm text-muted">{t("detail.readOnlyAdmin")}</p>
      ) : (
        <p className="text-sm text-muted">{t("detail.alreadyDecided")}</p>
      )}

      <Link href="/approvals" className="self-start text-sm text-primary underline">
        {t("detail.backToQueue")}
      </Link>
    </div>
  );
}
