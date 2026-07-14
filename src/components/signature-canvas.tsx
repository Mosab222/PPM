"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import SignaturePad from "signature_pad";

// Fixed logical size (not responsive) -- signature_pad maps pointer
// coordinates against this exact canvas size, and dynamically resizing it
// after strokes exist would require rescaling/clearing anyway. A wide,
// short aspect ratio (3:1) matches how real signatures are actually drawn.
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 200;

export function SignatureCanvas({
  onSave,
  saving,
}: {
  onSave: (blob: Blob) => void;
  saving: boolean;
}) {
  const t = useTranslations("account.signature");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = CANVAS_WIDTH * ratio;
    canvas.height = CANVAS_HEIGHT * ratio;
    canvas.getContext("2d")?.scale(ratio, ratio);

    const pad = new SignaturePad(canvas, { backgroundColor: "rgba(0,0,0,0)" });
    pad.addEventListener("endStroke", () => setIsEmpty(pad.isEmpty()));
    padRef.current = pad;

    return () => pad.off();
  }, []);

  function handleClear() {
    padRef.current?.clear();
    setIsEmpty(true);
  }

  function handleSave() {
    const pad = padRef.current;
    const canvas = canvasRef.current;
    if (!pad || !canvas || pad.isEmpty()) return;
    canvas.toBlob((blob) => {
      if (blob) onSave(blob);
    }, "image/png");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-md border border-border bg-white">
        <canvas
          ref={canvasRef}
          style={{ width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px` }}
          className="touch-none"
        />
      </div>
      <p className="text-xs text-muted">{t("drawHint")}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleClear}
          disabled={saving}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-background disabled:opacity-50"
        >
          {t("clear")}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isEmpty || saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {saving ? t("saving") : t("save")}
        </button>
      </div>
    </div>
  );
}
