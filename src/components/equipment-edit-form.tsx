"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { updateEquipment } from "@/app/[locale]/admin/equipment/[id]/actions";

export type EditableEquipment = {
  id: string;
  building_code: string | null;
  floor: string | null;
  location: string | null;
  weight: number | null;
  maintenance_frequency: string | null;
  status: string | null;
};

const FREQUENCIES = ["weekly", "monthly", "quarterly", "semiannual", "yearly"] as const;
const STATUSES = ["compliant", "due", "overdue", "needs_attention", "decommissioned"] as const;

export function EquipmentEditForm({ equipment }: { equipment: EditableEquipment }) {
  const t = useTranslations("admin.equipment.form");
  const tStatus = useTranslations("equipment.status_value");
  const [buildingCode, setBuildingCode] = useState(equipment.building_code ?? "");
  const [floor, setFloor] = useState(equipment.floor ?? "");
  const [location, setLocation] = useState(equipment.location ?? "");
  const [weight, setWeight] = useState(equipment.weight != null ? String(equipment.weight) : "");
  const [frequency, setFrequency] = useState(equipment.maintenance_frequency ?? "monthly");
  const [status, setStatus] = useState(equipment.status ?? "compliant");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    setSaved(false);

    const weightValue = Number(weight);
    if (
      !buildingCode.trim() ||
      !floor.trim() ||
      !location.trim() ||
      !weight.trim() ||
      Number.isNaN(weightValue) ||
      weightValue <= 0
    ) {
      setError("invalidWeight");
      return;
    }

    startTransition(async () => {
      const result = await updateEquipment({
        id: equipment.id,
        buildingCode,
        floor,
        location,
        weight: weightValue,
        maintenanceFrequency: frequency,
        status,
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
        <p className="break-all font-mono text-sm text-muted">{equipment.id}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">{t("building")}</label>
          <input
            type="text"
            value={buildingCode}
            onChange={(e) => setBuildingCode(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">{t("floor")}</label>
          <input
            type="text"
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">{t("location")}</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
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
