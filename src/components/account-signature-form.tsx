"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { SignatureCanvas } from "@/components/signature-canvas";
import { saveSignature } from "@/app/[locale]/account/actions";

export function AccountSignatureForm({
  userId,
  currentSignatureUrl,
}: {
  userId: string;
  currentSignatureUrl: string | null;
}) {
  const t = useTranslations("account.signature");
  const [signatureUrl, setSignatureUrl] = useState(currentSignatureUrl);
  const [drawing, setDrawing] = useState(!currentSignatureUrl);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave(blob: Blob) {
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const path = `profile/${userId}/${crypto.randomUUID()}.png`;

      const { error: uploadError } = await supabase.storage
        .from("signatures")
        .upload(path, blob, { contentType: "image/png" });

      if (uploadError) {
        setError("uploadError");
        return;
      }

      const { data } = supabase.storage.from("signatures").getPublicUrl(path);

      const result = await saveSignature({ url: data.publicUrl, path });
      if (result.error) {
        setError(result.error);
        return;
      }

      setSignatureUrl(data.publicUrl);
      setDrawing(false);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {!drawing && signatureUrl && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={signatureUrl} alt="" className="h-24 w-auto" />
          <button
            type="button"
            onClick={() => setDrawing(true)}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-background"
          >
            {t("redraw")}
          </button>
        </div>
      )}

      {drawing && <SignatureCanvas onSave={handleSave} saving={isPending} />}

      {error && <p className="text-sm text-red-700">{t(error)}</p>}
    </div>
  );
}
