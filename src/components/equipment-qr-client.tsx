"use client";

import { useEffect, useState } from "react";
import { QrCodeDisplay } from "@/components/qr-code-display";

export function EquipmentQrClient({ id, code }: { id: string; code: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    setUrl(`${window.location.origin}/ar/eq/${id}`);
  }, [id]);

  if (!url) return null;

  return <QrCodeDisplay url={url} code={code} />;
}
