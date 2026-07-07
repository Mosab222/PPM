"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";

export type ChecklistResponseInput = {
  checklistItemId: string;
  isRequired: boolean;
  isCritical: boolean;
  answer: string | null;
  isPassed: boolean | null;
  note: string | null;
  fallbackDescription: string;
};

export type SubmitMaintenanceInput = {
  equipmentId: string;
  templateId: string;
  locale: string;
  existingLogId?: string | null;
  responses: ChecklistResponseInput[];
};

export type SubmitMaintenanceResult = { error?: string };

export type MaintenancePhoto = {
  id: string;
  photo_url: string;
  storage_path: string;
};

export type EnsureMaintenanceLogResult = {
  logId?: string;
  existingPhotos?: MaintenancePhoto[];
  error?: "uploadError";
};

// Lazily creates (or resumes) the technician's in-progress log for this
// equipment. Only ever called from a real user action (adding a photo),
// never from page render, so Next.js link-prefetching can't trigger it.
export async function ensureMaintenanceLog(input: {
  equipmentId: string;
  templateId: string;
}): Promise<EnsureMaintenanceLogResult> {
  const user = await getCurrentUser();
  if (!user || !user.is_active) {
    return { error: "uploadError" };
  }

  const supabase = await createClient();

  const { data: existingLog } = await supabase
    .from("maintenance_logs")
    .select("id")
    .eq("equipment_id", input.equipmentId)
    .eq("technician_id", user.id)
    .eq("status", "in_progress")
    .maybeSingle();

  if (existingLog) {
    const { data: photos } = await supabase
      .from("maintenance_photos")
      .select("id, photo_url, storage_path")
      .eq("maintenance_log_id", existingLog.id)
      .order("created_at", { ascending: true });

    return { logId: existingLog.id, existingPhotos: (photos as MaintenancePhoto[]) ?? [] };
  }

  const { data: newLog, error } = await supabase
    .from("maintenance_logs")
    .insert({
      equipment_id: input.equipmentId,
      checklist_template_id: input.templateId,
      technician_id: user.id,
      technician_name: user.full_name ?? user.arabic_name ?? user.email,
      status: "in_progress",
    })
    .select("id")
    .single();

  if (error || !newLog) {
    return { error: "uploadError" };
  }

  return { logId: newLog.id, existingPhotos: [] };
}

export async function recordMaintenancePhoto(input: {
  logId: string;
  storagePath: string;
  photoUrl: string;
}): Promise<{ id?: string; error?: "uploadError" }> {
  const user = await getCurrentUser();
  if (!user || !user.is_active) {
    return { error: "uploadError" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maintenance_photos")
    .insert({
      maintenance_log_id: input.logId,
      storage_path: input.storagePath,
      photo_url: input.photoUrl,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "uploadError" };
  }

  return { id: data.id };
}

export async function deleteMaintenancePhoto(input: {
  photoId: string;
  storagePath: string;
}): Promise<{ error?: "removeError" }> {
  const user = await getCurrentUser();
  if (!user || !user.is_active) {
    return { error: "removeError" };
  }

  const supabase = await createClient();

  await supabase.storage.from("maintenance-photos").remove([input.storagePath]);

  const { error } = await supabase.from("maintenance_photos").delete().eq("id", input.photoId);

  if (error) {
    return { error: "removeError" };
  }

  return {};
}

export async function submitMaintenance(
  input: SubmitMaintenanceInput
): Promise<SubmitMaintenanceResult> {
  const user = await getCurrentUser();
  if (!user || !user.is_active) {
    return { error: "unauthorized" };
  }

  const supabase = await createClient();

  // Only required/critical failing items count as issues; a failing
  // optional item is still recorded in its response row but doesn't
  // escalate the log's overall result or create a maintenance_issues row.
  const failingItems = input.responses.filter(
    (r) => (r.isRequired || r.isCritical) && r.isPassed === false
  );
  const result = failingItems.length > 0 ? "needs_attention" : "passed";

  // Assigned atomically (per-year sequence, e.g. "2600001") right before the
  // log is marked completed, so every completed maintenance gets exactly one.
  const { data: workOrderNumber, error: workOrderError } = await supabase.rpc(
    "next_work_order_number"
  );

  if (workOrderError || !workOrderNumber) {
    return { error: "submitError" };
  }

  let logId = input.existingLogId ?? null;

  if (logId) {
    // A photo was already added during this session, which lazily created
    // an in_progress log — finalize that same row instead of inserting a new one.
    const { error: updateError } = await supabase
      .from("maintenance_logs")
      .update({
        status: "completed",
        result,
        issues_found: failingItems.length,
        work_order_number: workOrderNumber,
      })
      .eq("id", logId)
      .eq("technician_id", user.id);

    if (updateError) {
      return { error: "submitError" };
    }
  } else {
    const { data: log, error: logError } = await supabase
      .from("maintenance_logs")
      .insert({
        equipment_id: input.equipmentId,
        checklist_template_id: input.templateId,
        technician_id: user.id,
        technician_name: user.full_name ?? user.arabic_name ?? user.email,
        status: "completed",
        result,
        issues_found: failingItems.length,
        work_order_number: workOrderNumber,
      })
      .select("id")
      .single();

    if (logError || !log) {
      return { error: "submitError" };
    }
    logId = log.id;
  }

  const { error: responsesError } = await supabase.from("maintenance_responses").insert(
    input.responses.map((r) => ({
      maintenance_log_id: logId,
      checklist_item_id: r.checklistItemId,
      answer: r.answer,
      is_passed: r.isPassed,
      notes: r.note?.trim() || null,
    }))
  );

  if (responsesError) {
    return { error: "submitError" };
  }

  if (failingItems.length > 0) {
    const { error: issuesError } = await supabase.from("maintenance_issues").insert(
      failingItems.map((r) => ({
        maintenance_log_id: logId,
        equipment_id: input.equipmentId,
        checklist_item_id: r.checklistItemId,
        issue_description: r.note?.trim() || r.fallbackDescription,
        severity: r.isCritical ? "critical" : "medium",
      }))
    );

    if (issuesError) {
      return { error: "submitError" };
    }
  }

  redirect(
    `/${input.locale}/eq/${input.equipmentId}?submitted=1&result=${result}&issues=${failingItems.length}`
  );
}
