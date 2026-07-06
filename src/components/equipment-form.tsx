"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createEquipment } from "@/app/[locale]/admin/equipment/new/actions";
import { QrCodeDisplay } from "@/components/qr-code-display";

export type EquipmentType = {
  id: string;
  code: string;
  name: string;
  arabic_name: string | null;
};

export type EquipmentSubtype = {
  id: string;
  code: string;
  parent_type_id: string;
  name: string;
  arabic_name: string | null;
  default_weight: number | null;
};

const FREQUENCIES = ["weekly", "monthly", "quarterly", "semiannual", "yearly"] as const;

function normalizeSegment(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function EquipmentForm({
  types,
  subtypes,
  locale,
}: {
  types: EquipmentType[];
  subtypes: EquipmentSubtype[];
  locale: string;
}) {
  const t = useTranslations("admin.equipment.form");
  const tSuccess = useTranslations("admin.equipment.success");
  const [typeId, setTypeId] = useState("");
  const [subtypeId, setSubtypeId] = useState("");
  const [facilityCode, setFacilityCode] = useState("");
  const [floor, setFloor] = useState("");
  const [room, setRoom] = useState("");
  const [roomName, setRoomName] = useState("");
  const [area, setArea] = useState("");
  const [weight, setWeight] = useState("");
  const [frequency, setFrequency] = useState<string>("monthly");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [created, setCreated] = useState<{ equipmentId: string; url: string } | null>(null);

  const availableSubtypes = useMemo(
    () => subtypes.filter((s) => s.parent_type_id === typeId),
    [subtypes, typeId]
  );

  const previewCode = useMemo(() => {
    const type = types.find((t) => t.id === typeId);
    const subtype = subtypes.find((s) => s.id === subtypeId);
    const facilitySeg = normalizeSegment(facilityCode) || "—";
    const floorSeg = normalizeSegment(floor) || "—";
    const roomSeg = normalizeSegment(room) || "—";
    return `${facilitySeg}-${type?.code ?? "—"}-${subtype?.code ?? "—"}-XXXX-${floorSeg}-${roomSeg}`;
  }, [types, subtypes, typeId, subtypeId, facilityCode, floor, room]);

  function typeLabel(type: EquipmentType) {
    return (locale === "ar" ? type.arabic_name : type.name) || type.name;
  }

  function subtypeLabel(subtype: EquipmentSubtype) {
    return (locale === "ar" ? subtype.arabic_name : subtype.name) || subtype.name;
  }

  function handleTypeChange(value: string) {
    setTypeId(value);
    setSubtypeId("");
  }

  function handleSubtypeChange(value: string) {
    setSubtypeId(value);
    const subtype = subtypes.find((s) => s.id === value);
    if (subtype?.default_weight != null) {
      setWeight(String(subtype.default_weight));
    }
  }

  function resetForm() {
    setTypeId("");
    setSubtypeId("");
    setFacilityCode("");
    setFloor("");
    setRoom("");
    setRoomName("");
    setArea("");
    setWeight("");
    setFrequency("monthly");
    setError(null);
    setCreated(null);
  }

  function handleSubmit() {
    const type = types.find((t) => t.id === typeId);
    const subtype = subtypes.find((s) => s.id === subtypeId);
    const weightValue = Number(weight);

    if (
      !type ||
      !subtype ||
      !normalizeSegment(facilityCode) ||
      !normalizeSegment(floor) ||
      !normalizeSegment(room) ||
      !weight.trim() ||
      Number.isNaN(weightValue) ||
      weightValue <= 0
    ) {
      setError("submitError");
      return;
    }

    if (!roomName.trim() || !area.trim()) {
      setError("missingFields");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createEquipment({
        typeCode: type.code,
        subtypeCode: subtype.code,
        facilityCode,
        floor,
        room,
        roomName,
        area,
        weight: weightValue,
        maintenanceFrequency: frequency,
      });

      if (result.error || !result.equipmentId) {
        setError(result.error ?? "submitError");
        return;
      }

      const url = `${window.location.origin}/ar/eq/${result.equipmentId}`;
      setCreated({ equipmentId: result.equipmentId, url });
    });
  }

  if (created) {
    return (
      <div className="flex flex-col items-center gap-4">
        <h2 className="text-lg font-semibold text-green-800">{tSuccess("title")}</h2>
        <QrCodeDisplay url={created.url} code={created.equipmentId} />
        <div className="flex gap-3 print:hidden">
          <button
            type="button"
            onClick={resetForm}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-background"
          >
            {tSuccess("addAnother")}
          </button>
          <Link
            href="/admin/equipment"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            {tSuccess("viewList")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium">{t("codePreview")}</label>
        <p dir="ltr" className="break-all rounded-md border border-border bg-background px-3 py-2 text-center font-mono text-sm font-semibold text-primary">
          {previewCode}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">{t("facility")}</label>
          <input
            type="text"
            value={facilityCode}
            onChange={(e) => setFacilityCode(e.target.value)}
            dir="ltr"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">{t("type")}</label>
          <select
            value={typeId}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">{t("selectType")}</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {typeLabel(type)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">{t("subtype")}</label>
          <select
            value={subtypeId}
            onChange={(e) => handleSubtypeChange(e.target.value)}
            disabled={!typeId}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-60"
          >
            <option value="">{t("selectSubtype")}</option>
            {availableSubtypes.map((subtype) => (
              <option key={subtype.id} value={subtype.id}>
                {subtypeLabel(subtype)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">{t("floor")}</label>
          <input
            type="text"
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            dir="ltr"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">{t("room")}</label>
          <input
            type="text"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            dir="ltr"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">{t("roomName")}</label>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">{t("area")}</label>
          <input
            type="text"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">{t("weight")}</label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">{t("frequency")}</label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {FREQUENCIES.map((value) => (
              <option key={value} value={value}>
                {t(`frequency_value.${value}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-700">{t(`errors.${error}`)}</p>}

      <button
        type="button"
        disabled={isPending}
        onClick={handleSubmit}
        className="self-start rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-60"
      >
        {isPending ? t("submitting") : t("submit")}
      </button>
    </div>
  );
}
