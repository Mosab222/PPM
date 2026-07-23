"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { copySignatureSnapshot } from "@/lib/signature";

export type ApprovalActionResult = {
  successCount?: number;
  error?: "unauthorized" | "dbRejected" | "someAlreadyDecided" | "missingReason" | "noSignature";
  detail?: string;
  succeededCount?: number;
  lostCount?: number;
  signatureWarning?: boolean;
};

async function writeDecision(
  logIds: string[],
  decision: "approve" | "reject",
  reason?: string,
  note?: string
): Promise<ApprovalActionResult> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "head" && user.role !== "manager")) {
    return { error: "unauthorized" };
  }
  if (!user.signature_url || !user.signature_storage_path) {
    return { error: "noSignature" };
  }
  if (logIds.length === 0) {
    return { successCount: 0 };
  }
  if (decision === "reject" && !reason?.trim()) {
    return { error: "missingReason" };
  }

  const isHead = user.role === "head";
  const fromStatus = isHead ? "pending_head" : "pending_manager";
  const signatureField = isHead ? "head_signature_url" : "manager_signature_url";
  const nowIso = new Date().toISOString();

  const trimmedNote = note?.trim() || undefined;

  const basePayload =
    decision === "approve"
      ? isHead
        ? {
            approval_status: "pending_manager",
            head_user_id: user.id,
            head_decision_at: nowIso,
            ...(trimmedNote ? { late_approval_note: trimmedNote } : {}),
          }
        : {
            approval_status: "approved",
            manager_user_id: user.id,
            manager_decision_at: nowIso,
            ...(trimmedNote ? { late_approval_note: trimmedNote } : {}),
          }
      : isHead
        ? {
            approval_status: "rejected",
            rejection_reason: reason!.trim(),
            rejected_by_role: "head",
            head_user_id: user.id,
            head_decision_at: nowIso,
          }
        : {
            approval_status: "rejected",
            rejection_reason: reason!.trim(),
            rejected_by_role: "manager",
            manager_user_id: user.id,
            manager_decision_at: nowIso,
          };

  const supabase = await createClient();

  // Each log gets its OWN copy of the signer's current signature (a real,
  // independent storage object per log -- see copySignatureSnapshot), so a
  // bulk action can no longer be a single combined UPDATE across all
  // logIds: every row needs a different signature_url value. Looping is
  // fine here -- this queue is always small (single-department hospital).
  //
  // The `.eq("approval_status", fromStatus)` guard on each row (on top of
  // what RLS already restricts to) is what makes the race case clean: if
  // someone else already decided this log, the row simply won't match here
  // anymore -- no exception, just zero rows returned for that one. The
  // guard trigger (trg_guard_approval_columns) is the second line of
  // defense for anything that slips past this.
  const succeededIds: string[] = [];
  const lostIds: string[] = [];
  let dbErrorDetail: string | null = null;
  let signatureWarning = false;

  for (const logId of logIds) {
    const snapshot = await copySignatureSnapshot(supabase, {
      fromPath: user.signature_storage_path,
      logId,
      role: isHead ? "head" : "manager",
    });

    const updatePayload = snapshot.url ? { ...basePayload, [signatureField]: snapshot.url } : basePayload;
    if (!snapshot.url) signatureWarning = true;

    const { data, error } = await supabase
      .from("maintenance_logs")
      .update(updatePayload)
      .eq("id", logId)
      .eq("approval_status", fromStatus)
      .select("id");

    if (error) {
      dbErrorDetail = error.message;
      continue;
    }
    if (data && data.length > 0) {
      succeededIds.push(logId);
    } else {
      lostIds.push(logId);
    }
  }

  revalidatePath("/approvals");
  for (const id of logIds) revalidatePath(`/approvals/${id}`);

  if (dbErrorDetail && succeededIds.length === 0) {
    return { error: "dbRejected", detail: dbErrorDetail };
  }
  if (lostIds.length > 0) {
    return {
      error: "someAlreadyDecided",
      succeededCount: succeededIds.length,
      lostCount: lostIds.length,
      signatureWarning,
    };
  }

  return { successCount: succeededIds.length, signatureWarning };
}

export async function approveLogs(logIds: string[], note?: string): Promise<ApprovalActionResult> {
  return writeDecision(logIds, "approve", undefined, note);
}

export async function rejectLogs(logIds: string[], reason: string): Promise<ApprovalActionResult> {
  return writeDecision(logIds, "reject", reason);
}
