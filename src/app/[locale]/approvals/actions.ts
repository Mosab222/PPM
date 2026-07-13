"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";

export type ApprovalActionResult = {
  successCount?: number;
  error?: "unauthorized" | "dbRejected" | "someAlreadyDecided" | "missingReason";
  detail?: string;
  succeededCount?: number;
  lostCount?: number;
};

async function writeDecision(
  logIds: string[],
  decision: "approve" | "reject",
  reason?: string
): Promise<ApprovalActionResult> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "head" && user.role !== "manager")) {
    return { error: "unauthorized" };
  }
  if (logIds.length === 0) {
    return { successCount: 0 };
  }
  if (decision === "reject" && !reason?.trim()) {
    return { error: "missingReason" };
  }

  const isHead = user.role === "head";
  const fromStatus = isHead ? "pending_head" : "pending_manager";
  const nowIso = new Date().toISOString();

  const updatePayload =
    decision === "approve"
      ? isHead
        ? { approval_status: "pending_manager", head_user_id: user.id, head_decision_at: nowIso }
        : { approval_status: "approved", manager_user_id: user.id, manager_decision_at: nowIso }
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

  // The `.eq("approval_status", fromStatus)` guard (on top of what RLS
  // already restricts to) is what makes the race case clean: if someone else
  // already decided this log, the row simply won't match here anymore -- no
  // exception, just fewer rows returned than requested. Comparing requested
  // vs. returned ids tells us exactly which ones lost the race. The guard
  // trigger (trg_guard_approval_columns) is the second line of defense for
  // anything that slips past this -- its exception surfaces as "dbRejected"
  // rather than failing silently.
  const { data, error } = await supabase
    .from("maintenance_logs")
    .update(updatePayload)
    .in("id", logIds)
    .eq("approval_status", fromStatus)
    .select("id");

  if (error) {
    return { error: "dbRejected", detail: error.message };
  }

  const succeededIds = new Set((data ?? []).map((r) => r.id as string));
  const lostIds = logIds.filter((id) => !succeededIds.has(id));

  revalidatePath("/approvals");
  for (const id of logIds) revalidatePath(`/approvals/${id}`);

  if (lostIds.length > 0) {
    return { error: "someAlreadyDecided", succeededCount: succeededIds.size, lostCount: lostIds.length };
  }

  return { successCount: succeededIds.size };
}

export async function approveLogs(logIds: string[]): Promise<ApprovalActionResult> {
  return writeDecision(logIds, "approve");
}

export async function rejectLogs(logIds: string[], reason: string): Promise<ApprovalActionResult> {
  return writeDecision(logIds, "reject", reason);
}
