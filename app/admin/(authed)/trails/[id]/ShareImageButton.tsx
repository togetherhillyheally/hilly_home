"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";
import ShareImagePanel from "./ShareImagePanel";
import type { TrailSharePreview } from "@/lib/trail-preview";

type Props = {
  trailId: string;
  trailName: string;
  seriesName: string | null;
  courseSummary: string | null;
  distanceKm: number | null;
  totalAscentM: number | null;
  mapType: "adventure" | "stamp";
  coordinates: TrailSharePreview["coordinates"];
};

export default function ShareImageButton(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-3 h-9 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-gray-200 text-sm font-medium transition-colors"
      >
        <ImageIcon className="h-4 w-4" />
        공유 이미지
      </button>
      <ShareImagePanel
        open={open}
        onClose={() => setOpen(false)}
        {...props}
      />
    </>
  );
}
