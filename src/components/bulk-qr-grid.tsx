"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export type PrintEquipment = {
  id: string;
  room_name: string | null;
  area: string | null;
};

export function BulkQrGrid({ equipment }: { equipment: PrintEquipment[] }) {
  const [dataUrls, setDataUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    async function generate() {
      const origin = window.location.origin;
      const entries = await Promise.all(
        equipment.map(async (eq) => {
          const url = `${origin}/ar/eq/${eq.id}`;
          const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 1 });
          return [eq.id, dataUrl] as const;
        })
      );
      if (!cancelled) {
        setDataUrls(Object.fromEntries(entries));
      }
    }

    generate();
    return () => {
      cancelled = true;
    };
  }, [equipment]);

  return (
    <div
      id="bulk-qr-print-area"
      className="qr-print-grid grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
    >
      {equipment.map((eq) => (
        <div
          key={eq.id}
          className="qr-label flex flex-col items-center gap-1 rounded-md border border-border p-3 text-center"
        >
          {dataUrls[eq.id] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrls[eq.id]} alt={eq.id} className="h-24 w-24" />
          ) : (
            <div className="h-24 w-24 animate-pulse rounded bg-background" />
          )}
          <p dir="ltr" className="break-all font-mono text-[10px] font-bold text-primary">
            {eq.id}
          </p>
          {eq.room_name && <p className="text-[10px]">{eq.room_name}</p>}
          {eq.area && <p className="text-[10px] text-muted">{eq.area}</p>}
        </div>
      ))}
    </div>
  );
}
