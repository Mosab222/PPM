"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { approveLogs, rejectLogs, type ApprovalActionResult } from "@/app/[locale]/approvals/actions";

export function ApprovalActions({
  logIds,
  onAfterAction,
}: {
  logIds: string[];
  onAfterAction: "refresh" | "navigateToQueue";
}) {
  const t = useTranslations("approvals");
  const router = useRouter();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const disabled = logIds.length === 0 || isPending;

  function afterSuccess() {
    setShowRejectModal(false);
    setReason("");
    if (onAfterAction === "navigateToQueue") {
      router.push("/approvals");
    } else {
      router.refresh();
    }
  }

  function handleResult(result: ApprovalActionResult) {
    if (result.error === "someAlreadyDecided") {
      setError(
        t("errors.someAlreadyDecided", {
          succeeded: result.succeededCount ?? 0,
          lost: result.lostCount ?? 0,
        })
      );
      setShowRejectModal(false);
      setReason("");
      router.refresh();
      return;
    }
    if (result.error === "dbRejected") {
      setError(t("errors.dbRejected", { detail: result.detail ?? "" }));
      return;
    }
    if (result.error) {
      setError(t(`errors.${result.error}`));
      return;
    }
    if (result.signatureWarning) {
      setError(t("errors.signatureWarning"));
    }
    afterSuccess();
  }

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await approveLogs(logIds);
      handleResult(result);
    });
  }

  function handleRejectConfirm() {
    if (!reason.trim()) {
      setError(t("errors.missingReason"));
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await rejectLogs(logIds, reason.trim());
      handleResult(result);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={handleApprove}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? t("processing") : t("approve")}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setShowRejectModal(true)}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {t("reject")}
        </button>
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-card p-6">
            <h3 className="text-lg font-semibold">{t("rejectModal.title")}</h3>
            <p className="mt-1 text-sm text-muted">{t("rejectModal.body", { count: logIds.length })}</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder={t("rejectModal.placeholder")}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setShowRejectModal(false);
                  setReason("");
                  setError(null);
                }}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-background"
              >
                {t("rejectModal.cancel")}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleRejectConfirm}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {isPending ? t("processing") : t("rejectModal.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
