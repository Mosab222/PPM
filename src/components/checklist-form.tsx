"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { submitMaintenance, type MaintenancePhoto } from "@/app/[locale]/eq/[id]/execute/actions";
import type { ChecklistItem } from "@/app/[locale]/eq/[id]/execute/page";
import { PhotoSection } from "@/components/photo-section";

type ItemState = {
  answer: string;
  isPassed: boolean | null;
  note: string;
};

function initialState(items: ChecklistItem[]): Record<string, ItemState> {
  const state: Record<string, ItemState> = {};
  for (const item of items) {
    state[item.id] = { answer: "", isPassed: null, note: "" };
  }
  return state;
}

function isItemAnswered(item: ChecklistItem, state: ItemState) {
  if (item.item_type === "photo") return true;
  if (item.item_type === "yes_no") return state.answer === "yes" || state.answer === "no";
  if (item.item_type === "number") return state.answer.trim() !== "" && state.isPassed !== null;
  return state.answer.trim() !== "" && state.isPassed !== null; // text
}

export function ChecklistForm({
  equipmentId,
  templateId,
  locale,
  items,
  initialLogId,
  initialPhotos,
}: {
  equipmentId: string;
  templateId: string;
  locale: string;
  items: ChecklistItem[];
  initialLogId: string | null;
  initialPhotos: MaintenancePhoto[];
}) {
  const t = useTranslations("checklist");
  const tResult = useTranslations("equipment.result");
  const [values, setValues] = useState<Record<string, ItemState>>(() => initialState(items));
  const [showErrors, setShowErrors] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [logId, setLogId] = useState<string | null>(initialLogId);
  const [photos, setPhotos] = useState<MaintenancePhoto[]>(initialPhotos);

  function updateItem(itemId: string, patch: Partial<ItemState>) {
    setValues((prev) => ({ ...prev, [itemId]: { ...prev[itemId], ...patch } }));
  }

  function questionText(item: ChecklistItem) {
    return (locale === "ar" ? item.arabic_question : item.question) || item.question;
  }

  function handleSubmit() {
    const missingRequired = items.some(
      (item) => item.is_required && item.item_type !== "photo" && !isItemAnswered(item, values[item.id])
    );

    if (missingRequired) {
      setShowErrors(true);
      return;
    }

    setSubmitError(null);
    const responses = items.map((item) => {
      const state = values[item.id];
      const isPassed =
        item.item_type === "photo"
          ? null
          : item.item_type === "yes_no"
            ? state.answer === "yes"
            : state.isPassed;

      return {
        checklistItemId: item.id,
        isRequired: item.is_required,
        isCritical: item.is_critical,
        answer: item.item_type === "photo" ? null : state.answer || null,
        isPassed,
        note: state.note || null,
        fallbackDescription: questionText(item),
      };
    });

    startTransition(async () => {
      const result = await submitMaintenance({
        equipmentId,
        templateId,
        locale,
        existingLogId: logId,
        responses,
      });
      if (result?.error) {
        setSubmitError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => {
        const state = values[item.id];
        const answered = isItemAnswered(item, state);
        const invalid = showErrors && item.is_required && item.item_type !== "photo" && !answered;

        return (
          <section
            key={item.id}
            className={`rounded-lg border bg-card p-4 ${invalid ? "border-red-400" : "border-border"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">
                {questionText(item)}
                {item.is_required && <span className="ms-1 text-red-600">*</span>}
              </p>
              {item.is_critical && (
                <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                  {t("critical")}
                </span>
              )}
            </div>
            {item.help_text && <p className="mt-1 text-xs text-muted">{item.help_text}</p>}

            <div className="mt-3">
              {item.item_type === "yes_no" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateItem(item.id, { answer: "yes", isPassed: true })}
                    className={`rounded-md border px-4 py-1.5 text-sm font-medium ${
                      state.answer === "yes"
                        ? "border-green-600 bg-green-100 text-green-800"
                        : "border-border"
                    }`}
                  >
                    {t("yes")}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateItem(item.id, { answer: "no", isPassed: false })}
                    className={`rounded-md border px-4 py-1.5 text-sm font-medium ${
                      state.answer === "no" ? "border-red-600 bg-red-100 text-red-800" : "border-border"
                    }`}
                  >
                    {t("no")}
                  </button>
                </div>
              )}

              {item.item_type === "number" && (
                <div className="flex flex-col gap-2">
                  <input
                    type="number"
                    value={state.answer}
                    onChange={(e) => updateItem(item.id, { answer: e.target.value })}
                    placeholder={t("numberPlaceholder")}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm sm:w-48"
                  />
                  <PassFailToggle
                    value={state.isPassed}
                    onChange={(v) => updateItem(item.id, { isPassed: v })}
                    passedLabel={tResult("passed")}
                    failedLabel={tResult("failed")}
                    prompt={t("didItPass")}
                  />
                </div>
              )}

              {item.item_type === "text" && (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={state.answer}
                    onChange={(e) => updateItem(item.id, { answer: e.target.value })}
                    rows={3}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                  <PassFailToggle
                    value={state.isPassed}
                    onChange={(v) => updateItem(item.id, { isPassed: v })}
                    passedLabel={tResult("passed")}
                    failedLabel={tResult("failed")}
                    prompt={t("didItPass")}
                  />
                </div>
              )}

              {item.item_type === "photo" && (
                <p className="rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted">
                  {t("photoPending")}
                </p>
              )}
            </div>

            <input
              type="text"
              value={state.note}
              onChange={(e) => updateItem(item.id, { note: e.target.value })}
              placeholder={t("notePlaceholder")}
              className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />

            {invalid && <p className="mt-1 text-xs text-red-600">{t("required")}</p>}
          </section>
        );
      })}

      <PhotoSection
        equipmentId={equipmentId}
        templateId={templateId}
        logId={logId}
        photos={photos}
        onLogIdChange={setLogId}
        setPhotos={setPhotos}
      />

      {showErrors && items.some((item) => item.is_required && item.item_type !== "photo" && !isItemAnswered(item, values[item.id])) && (
        <p className="text-sm text-red-700">{t("validationError")}</p>
      )}
      {submitError && <p className="text-sm text-red-700">{t(submitError as "submitError")}</p>}

      <button
        type="button"
        disabled={isPending}
        onClick={handleSubmit}
        className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-60"
      >
        {isPending ? t("submitting") : t("submit")}
      </button>
    </div>
  );
}

function PassFailToggle({
  value,
  onChange,
  passedLabel,
  failedLabel,
  prompt,
}: {
  value: boolean | null;
  onChange: (value: boolean) => void;
  passedLabel: string;
  failedLabel: string;
  prompt: string;
}) {
  return (
    <div>
      <p className="mb-1 text-xs text-muted">{prompt}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`rounded-md border px-4 py-1.5 text-sm font-medium ${
            value === true ? "border-green-600 bg-green-100 text-green-800" : "border-border"
          }`}
        >
          {passedLabel}
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`rounded-md border px-4 py-1.5 text-sm font-medium ${
            value === false ? "border-red-600 bg-red-100 text-red-800" : "border-border"
          }`}
        >
          {failedLabel}
        </button>
      </div>
    </div>
  );
}
