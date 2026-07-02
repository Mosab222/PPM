"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useTranslations } from "next-intl";

export function QrCodeDisplay({ url, code }: { url: string; code: string }) {
  const t = useTranslations("admin.equipment.success");
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { width: 320, margin: 2 }).then((generated) => {
      if (!cancelled) setDataUrl(generated);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div>
      <div id="qr-print-area" className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-muted">{t("qrTitle")}</p>
        {dataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt={code} className="h-48 w-48" />
        )}
        <p className="break-all text-center font-mono text-lg font-bold text-primary">{code}</p>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2 print:hidden">
        <a
          href={dataUrl ?? "#"}
          download={`${code}.png`}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-background"
        >
          {t("download")}
        </a>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-background"
        >
          {t("print")}
        </button>
      </div>
    </div>
  );
}
