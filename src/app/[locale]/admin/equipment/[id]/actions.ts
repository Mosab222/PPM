"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { FLOOR_OPTIONS } from "@/lib/floor-options";

const FREQUENCIES = ["weekly", "monthly", "quarterly", "semiannual", "yearly"];
const STATUSES = ["compliant", "due", "overdue", "needs_attention", "decommissioned"];

function normalizeSegment(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export type UpdateEquipmentInput = {
  id: string;
  facilityCode: string;
  floor: string;
  room: string;
  roomName: string;
  area: string;
  weight: number | null;
  maintenanceFrequency: string;
  status: string;
  outOfService: boolean;
};

export type UpdateEquipmentResult = {
  error?: "unauthorized" | "invalidSegment" | "invalidWeight" | "missingFields" | "submitError";
};

export async function updateEquipment(input: UpdateEquipmentInput): Promise<UpdateEquipmentResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return { error: "unauthorized" };
  }

  const facility = normalizeSegment(input.facilityCode);
  const floor = input.floor.trim().toUpperCase();
  const room = normalizeSegment(input.room);

  if (
    !facility ||
    !room ||
    !FLOOR_OPTIONS.includes(floor as (typeof FLOOR_OPTIONS)[number])
  ) {
    return { error: "invalidSegment" };
  }

  const roomName = input.roomName.trim();
  const area = input.area.trim();
  if (!roomName || !area) {
    return { error: "missingFields" };
  }

  if (input.weight == null || Number.isNaN(input.weight) || input.weight <= 0) {
    return { error: "invalidWeight" };
  }

  if (!FREQUENCIES.includes(input.maintenanceFrequency) || !STATUSES.includes(input.status)) {
    return { error: "submitError" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("equipment")
    .update({
      facility_code: facility,
      floor,
      room_code: room,
      room_name: roomName,
      area,
      weight: input.weight,
      maintenance_frequency: input.maintenanceFrequency,
      status: input.status,
      manual_operational_override: input.outOfService ? "out_of_service" : null,
    })
    .eq("id", input.id);

  if (error) {
    return { error: "submitError" };
  }

  revalidatePath("/admin/equipment");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/reports");
  revalidatePath(`/eq/${input.id}`);
  return {};
}
