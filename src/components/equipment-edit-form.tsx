"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { updateEquipment } from "@/app/[locale]/admin/equipment/[id]/actions";
import { OperationalStatusBadge } from "@/components/operational-status-badge";
import type { OperationalStatus } from "@/lib/operational-status";
import { FLOOR_OPTIONS } from "@/lib/floor-options";
import { ZONE_OPTIONS } from "@/lib/zone-options";

export type EditableEquipment = {
  id: string;
  code: string;
  facility_code: string | null;
  floor: string | null;
  zone: string | null;
  room_code: string | null;
  room_name: string | null;
  area: string | null;
  weight: number | null;
  maintenance_frequency: string | null;
  status: string | null;
  manual_operational_override: string | null;
};

const FREQUENCIES = ["weekly", "monthly", "quarterly", "semiannual", "yearly"] as const;
const STATUSES = ["compliant", "due", "overdue", "needs_attention", "decommissioned"] as const;

export function EquipmentEditForm({
  equipment,
  operationalStatus,
}: {
  equipment: EditableEquipment;
  operationalStatus: OperationalStatus;
}) {
  const t = useTranslations("admin.equipment.form");
  const tStatus = useTranslations("equipment.status_value");
  const [facilityCode, setFacilityCode] = useState(equipment.facility_code ?? "");
  const [floor, setFloor] = useState(equipment.floor ?? "");
  const [zone, setZone] = useState(equipment.zone ?? "");
  const [room, setRoom] = useState(equipment.room_code ?? "");
  const [roomName, setRoomName] = useState(equipment.room_name ?? "");
  const [area, setArea] = useState(equipment.area ?? "");
  const [weight, setWeight] = useState(equipment.weight != null ? String(equipment.weight) : "");
  const [frequency, setFrequency] = useState(equipment.maintenance_frequency ?? "monthly");
  const [status, setStatus] = useState(equipment.status ?? "compliant");
  const [outOfService, setOutOfService] = useState(
    equipment.manual_operational_override === "out_of_service"
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    setSaved(false);

    const weightValue = Number(weight);
    if (!facilityCode.trim() || !floor || !zone || !room.trim()) {
      setError("invalidSegment");
      return;
    }
    if (!roomName.trim() || !area.trim()) {
      setError("missingFields");
      return;
    }
    if (!weight.trim() || Number.isNaN(weightValue) || weightValue <= 0) {
      setError("invalidWeight");
      return;
    }

    startTransition(async () => {
      const result = await updateEquipment({
        id: equipment.id,
        facilityCode,
        floor,
        zone,
        room,
        roomName,
        area,
        weight: weightValue,
        maintenanceFrequency: frequency,
        status,
        outOfService,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium">{t("code")}</label>
        <p className="break-all font-mono text-sm text-muted">{equipment.code}</p>
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
          <label className="mb-1 block text-sm font-medium">{t("floor")}</label>
          <select
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">{t("selectFloor")}</option>
            {FLOOR_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {t(`floor_value.${value}`)} ({value})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">{t("zone")}</label>
          <select
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">{t("selectZone")}</option>
            {ZONE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {t(`zone_value.${value}`)} ({value})
              </option>
            ))}
          </select>
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

        <div>
          <label className="mb-1 block text-sm font-medium">{t("status")}</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {tStatus(value)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-md border border-border p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">{t("operationalStatus")}</span>
          <OperationalStatusBadge status={operationalStatus} />
        </div>
        <p className="mt-1 text-xs text-muted">{t("operationalStatusHint")}</p>
        <label className="mt-3 flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={outOfService}
            onChange={(e) => setOutOfService(e.target.checked)}
          />
          {t("outOfService")}
        </label>
      </div>

      {error && <p className="text-sm text-red-700">{t(`errors.${error}`)}</p>}
      {saved && <p className="text-sm text-green-700">{t("saved")}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={handleSave}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {isPending ? t("saving") : t("save")}
        </button>
        <Link
          href="/admin/equipment"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-background"
        >
          {t("back")}
        </Link>
      </div>
    </div>
  );
}
