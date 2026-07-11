"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { FLOOR_OPTIONS } from "@/lib/floor-options";
import { ZONE_OPTIONS } from "@/lib/zone-options";

export type CreateEquipmentInput = {
  typeCode: string;
  subtypeCode: string;
  facilityCode: string;
  floor: string;
  zone: string;
  room: string;
  roomName: string;
  area: string;
  weight: number | null;
  maintenanceFrequency: string;
};

export type CreateEquipmentResult = {
  id?: string;
  code?: string;
  error?: "unauthorized" | "invalidSegment" | "missingFields" | "submitError";
};

// Strips anything that isn't a letter or digit rather than rejecting the
// input outright, e.g. "G-1014" -> "G1014" -- matches the code-generation
// spec, which never wants dashes/spaces baked into an ID segment.
function normalizeSegment(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function createEquipment(
  input: CreateEquipmentInput
): Promise<CreateEquipmentResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return { error: "unauthorized" };
  }

  const facility = normalizeSegment(input.facilityCode);
  const floor = input.floor.trim().toUpperCase();
  const zone = input.zone.trim().toUpperCase();
  const room = normalizeSegment(input.room);

  if (
    !facility ||
    !room ||
    !FLOOR_OPTIONS.includes(floor as (typeof FLOOR_OPTIONS)[number]) ||
    !ZONE_OPTIONS.includes(zone as (typeof ZONE_OPTIONS)[number])
  ) {
    return { error: "invalidSegment" };
  }

  const roomName = input.roomName.trim();
  const area = input.area.trim();
  if (!roomName || !area) {
    return { error: "missingFields" };
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

  const { data: inserted, error: insertError } = await supabase
    .from("equipment")
    .insert({
      type_code: input.typeCode,
      subtype_code: input.subtypeCode,
      sequence_number: sequenceNumber,
      facility_code: facility,
      floor,
      zone,
      room_code: room,
      room_name: roomName,
      area,
      weight: input.weight,
      maintenance_frequency: input.maintenanceFrequency,
      created_by: user.id,
    })
    .select("id, code")
    .single();

  if (insertError || !inserted) {
    return { error: "submitError" };
  }

  return { id: inserted.id, code: inserted.code };
}
