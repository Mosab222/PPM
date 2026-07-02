"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";

export type CreateEquipmentInput = {
  typeCode: string;
  subtypeCode: string;
  buildingCode: string;
  floor: string;
  location: string;
  weight: number | null;
  maintenanceFrequency: string;
};

export type CreateEquipmentResult = {
  equipmentId?: string;
  error?: "unauthorized" | "invalidSegment" | "submitError";
};

const SEGMENT_PATTERN = /^[A-Z0-9]+$/;

export async function createEquipment(
  input: CreateEquipmentInput
): Promise<CreateEquipmentResult> {
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

  const supabase = await createClient();

  const { data: sequenceNumber, error: sequenceError } = await supabase.rpc(
    "next_sequence_number",
    {
      p_type_code: input.typeCode,
      p_subtype_code: input.subtypeCode,
    }
  );

  if (sequenceError || sequenceNumber == null) {
    return { error: "submitError" };
  }

  const paddedSequence = String(sequenceNumber).padStart(4, "0");
  const equipmentId = `${input.typeCode}-${input.subtypeCode}-${paddedSequence}-${building}-${floor}-${location}`;

  const { error: insertError } = await supabase.from("equipment").insert({
    id: equipmentId,
    type_code: input.typeCode,
    subtype_code: input.subtypeCode,
    sequence_number: sequenceNumber,
    building_code: building,
    floor,
    location,
    weight: input.weight,
    maintenance_frequency: input.maintenanceFrequency,
    created_by: user.id,
  });

  if (insertError) {
    return { error: "submitError" };
  }

  return { equipmentId };
}
