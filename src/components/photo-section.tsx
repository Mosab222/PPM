"use client";

import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image";
import {
  ensureMaintenanceLog,
  recordMaintenancePhoto,
  deleteMaintenancePhoto,
  type MaintenancePhoto,
} from "@/app/[locale]/eq/[id]/execute/actions";

const MAX_PHOTOS = 5;

export function PhotoSection({
  equipmentId,
  templateId,
  logId,
  photos,
  onLogIdChange,
  setPhotos,
}: {
  equipmentId: string;
  templateId: string;
  logId: string | null;
  photos: MaintenancePhoto[];
  onLogIdChange: (id: string) => void;
  setPhotos: Dispatch<SetStateAction<MaintenancePhoto[]>>;
}) {
  const t = useTranslations("checklist.photo");
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<"uploadError" | "removeError" | null>(null);

  const remaining = MAX_PHOTOS - photos.length;

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || remaining <= 0) return;
    setError(null);
    setBusy(true);

    try {
      let currentLogId = logId;
      if (!currentLogId) {
        const result = await ensureMaintenanceLog({ equipmentId, templateId });
        if (result.error || !result.logId) {
          setError(result.error ?? "uploadError");
          return;
        }
        currentLogId = result.logId;
        onLogIdChange(currentLogId);
        if (result.existingPhotos?.length) {
          setPhotos(result.existingPhotos);
        }
      }

      const files = Array.from(fileList).slice(0, remaining);
      const supabase = createClient();

      for (const file of files) {
        const blob = await compressImage(file);
        const fileName = `${crypto.randomUUID()}.jpg`;
        const storagePath = `${equipmentId}/${currentLogId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("maintenance-photos")
          .upload(storagePath, blob, { contentType: "image/jpeg" });

        if (uploadError) {
          setError("uploadError");
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("maintenance-photos")
          .getPublicUrl(storagePath);

        const record = await recordMaintenancePhoto({
          logId: currentLogId,
          storagePath,
          photoUrl: urlData.publicUrl,
        });

        if (record.error || !record.id) {
          await supabase.storage.from("maintenance-photos").remove([storagePath]);
          setError(record.error ?? "uploadError");
          break;
        }

        const newPhoto: MaintenancePhoto = {
          id: record.id,
          photo_url: urlData.publicUrl,
          storage_path: storagePath,
        };
        setPhotos((prev) => [...prev, newPhoto]);
      }
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove(photo: MaintenancePhoto) {
    setRemovingId(photo.id);
    setError(null);
    const result = await deleteMaintenancePhoto({
      photoId: photo.id,
      storagePath: photo.storage_path,
    });
    if (!result.error) {
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } else {
      setError(result.error);
    }
    setRemovingId(null);
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{t("title")}</h3>
        <span className="text-xs text-muted">
          {t("countLabel", { count: photos.length, max: MAX_PHOTOS })}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative h-20 w-20 overflow-hidden rounded-md border border-border"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.photo_url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => handleRemove(photo)}
              disabled={removingId === photo.id}
              className="absolute end-0 top-0 flex h-5 w-5 items-center justify-center rounded-bl-md bg-red-600 text-xs text-white disabled:opacity-60"
              aria-label={t("remove")}
            >
              ×
            </button>
          </div>
        ))}

        {remaining > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex h-20 w-20 flex-col items-center justify-center rounded-md border border-dashed border-border text-xs text-muted disabled:opacity-60"
          >
            {busy ? t("uploading") : `+ ${t("add")}`}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && <p className="mt-2 text-xs text-red-700">{t(error)}</p>}
    </section>
  );
}
