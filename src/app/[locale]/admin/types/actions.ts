"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";

const CODE_PATTERN = /^[A-Z0-9]+$/;

export type CreateTypeInput = {
  code: string;
  name: string;
  arabicName: string;
  description: string;
};

export type CreateTypeResult = {
  error?: "unauthorized" | "missingFields" | "codeExists" | "submitError";
};

export async function createEquipmentType(input: CreateTypeInput): Promise<CreateTypeResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return { error: "unauthorized" };
  }

  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();
  if (!CODE_PATTERN.test(code) || !name) {
    return { error: "missingFields" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("equipment_types").insert({
    code,
    name,
    arabic_name: input.arabicName.trim() || null,
    description: input.description.trim() || null,
    active: true,
  });

  if (error) {
    return { error: error.code === "23505" ? "codeExists" : "submitError" };
  }

  revalidatePath("/admin/types");
  return {};
}

export type UpdateTypeInput = {
  id: string;
  name: string;
  arabicName: string;
  description: string;
  active: boolean;
};

export type UpdateTypeResult = { error?: "unauthorized" | "missingFields" | "submitError" };

export async function updateEquipmentType(input: UpdateTypeInput): Promise<UpdateTypeResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return { error: "unauthorized" };
  }

  const name = input.name.trim();
  if (!name) {
    return { error: "missingFields" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("equipment_types")
    .update({
      name,
      arabic_name: input.arabicName.trim() || null,
      description: input.description.trim() || null,
      active: input.active,
    })
    .eq("id", input.id);

  if (error) {
    return { error: "submitError" };
  }

  revalidatePath("/admin/types");
  return {};
}

export type CreateSubtypeInput = {
  parentTypeId: string;
  code: string;
  name: string;
  arabicName: string;
  defaultWeight: number | null;
};

export type CreateSubtypeResult = {
  error?: "unauthorized" | "missingFields" | "codeExists" | "submitError";
};

export async function createEquipmentSubtype(
  input: CreateSubtypeInput
): Promise<CreateSubtypeResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return { error: "unauthorized" };
  }

  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();
  if (!input.parentTypeId || !CODE_PATTERN.test(code) || !name) {
    return { error: "missingFields" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("equipment_subtypes").insert({
    code,
    parent_type_id: input.parentTypeId,
    name,
    arabic_name: input.arabicName.trim() || null,
    default_weight: input.defaultWeight,
    active: true,
  });

  if (error) {
    return { error: error.code === "23505" ? "codeExists" : "submitError" };
  }

  revalidatePath("/admin/types");
  return {};
}

export type UpdateSubtypeInput = {
  id: string;
  name: string;
  arabicName: string;
  defaultWeight: number | null;
  active: boolean;
};

export type UpdateSubtypeResult = { error?: "unauthorized" | "missingFields" | "submitError" };

export async function updateEquipmentSubtype(
  input: UpdateSubtypeInput
): Promise<UpdateSubtypeResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return { error: "unauthorized" };
  }

  const name = input.name.trim();
  if (!name) {
    return { error: "missingFields" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("equipment_subtypes")
    .update({
      name,
      arabic_name: input.arabicName.trim() || null,
      default_weight: input.defaultWeight,
      active: input.active,
    })
    .eq("id", input.id);

  if (error) {
    return { error: "submitError" };
  }

  revalidatePath("/admin/types");
  return {};
}
