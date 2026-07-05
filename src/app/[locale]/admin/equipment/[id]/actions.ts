"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";

const SEGMENT_PATTERN = /^[A-Z0-9]+$/;
const FREQUENCIES = ["weekly", "monthly", "quarterly", "semiannual", "yearly"];
const STATUSES = ["compliant", "due", "overdue", "needs_attention", "decommissioned"];

export type UpdateEquipmentInput = {
  id: string;
  buildingCode: string;
  floor: string;
  location: string;
  weight: number | null;
  maintenanceFrequency: string;
  status: string;
};

export type UpdateEquipmentResult = {
  error?: "unauthorized" | "invalidSegment" | "invalidWeight" | "submitError";
};

export async function updateEquipment(input: UpdateEquipmentInput): Promise<UpdateEquipmentResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return { error: "unauthorized" };
  }

  const building = input.buildingCode.trim().toUpperCase();
  const floor = input.floor.trim().toUpperCase();
  const location = input.location.trim().toUpperCase();

  if (![building, floor, location].every((segment) => SEGMENT_PATTERN.test(segment))) {
    return { error: "invalidSegment" };
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
      building_code: building,
      floor,
      location,
      weight: input.weight,
      maintenance_frequency: input.maintenanceFrequency,
      status: input.status,
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
