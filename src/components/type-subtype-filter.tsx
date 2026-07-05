"use client";

import { useMemo, useState } from "react";

export type FilterType = {
  id: string;
  code: string;
  name: string;
  arabic_name: string | null;
};

export type FilterSubtype = {
  id: string;
  code: string;
  parent_type_id: string;
  name: string;
  arabic_name: string | null;
};

export function TypeSubtypeFilter({
  types,
  subtypes,
  locale,
  defaultTypeCode,
  defaultSubtypeCode,
  typeLabel,
  subtypeLabel,
  allTypesLabel,
  allSubtypesLabel,
}: {
  types: FilterType[];
  subtypes: FilterSubtype[];
  locale: string;
  defaultTypeCode?: string;
  defaultSubtypeCode?: string;
  typeLabel: string;
  subtypeLabel: string;
  allTypesLabel: string;
  allSubtypesLabel: string;
}) {
  const initialTypeId = types.find((t) => t.code === defaultTypeCode)?.id ?? "";
  const [typeId, setTypeId] = useState(initialTypeId);
  const [subtypeCode, setSubtypeCode] = useState(defaultSubtypeCode ?? "");

  const availableSubtypes = useMemo(
    () => (typeId ? subtypes.filter((s) => s.parent_type_id === typeId) : subtypes),
    [subtypes, typeId]
  );

  function label(name: string, arabicName: string | null) {
    return (locale === "ar" ? arabicName : name) || name;
  }

  function handleTypeChange(code: string) {
    const nextTypeId = types.find((t) => t.code === code)?.id ?? "";
    setTypeId(nextTypeId);
    if (nextTypeId && subtypeCode) {
      const stillValid = subtypes.some(
        (s) => s.parent_type_id === nextTypeId && s.code === subtypeCode
      );
      if (!stillValid) {
        setSubtypeCode("");
      }
    }
  }

  const selectedType = types.find((t) => t.id === typeId);

  return (
    <>
      <div>
        <label className="mb-1 block text-xs text-muted">{typeLabel}</label>
        <select
          name="type"
          value={selectedType?.code ?? ""}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
        >
          <option value="">{allTypesLabel}</option>
          {types.map((type) => (
            <option key={type.id} value={type.code}>
              {label(type.name, type.arabic_name)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted">{subtypeLabel}</label>
        <select
          name="subtype"
          value={subtypeCode}
          onChange={(e) => setSubtypeCode(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
        >
          <option value="">{allSubtypesLabel}</option>
          {availableSubtypes.map((subtype) => (
            <option key={subtype.id} value={subtype.code}>
              {label(subtype.name, subtype.arabic_name)}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
