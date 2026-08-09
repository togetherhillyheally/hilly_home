"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";

type Props = {
  src: string;
  caption: string;
  offset: number;
};

export function ScreenshotFrame({ src, caption, offset }: Props) {
  const [failed, setFailed] = useState(false);
  const rotate = offset === 0 ? "-rotate-2" : offset === 1 ? "" : "rotate-2";

  return (
    <figure
      className={`flex-shrink-0 group ${rotate} hover:rotate-0 transition-transform`}
    >
      <div className="relative w-[180px] sm:w-[200px] aspect-[9/19] rounded-[2rem] bg-neutral-900 p-2 shadow-xl shadow-neutral-900/10 ring-1 ring-neutral-200">
        <div className="relative w-full h-full rounded-[1.5rem] overflow-hidden bg-neutral-900">
          {failed ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-neutral-500">
              <ImageIcon className="h-8 w-8" />
              <span className="text-[10px] font-mono px-2 text-center leading-tight">
                {src.split("/").pop()}
              </span>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={caption}
              className="absolute inset-0 w-full h-full object-contain"
              onError={() => setFailed(true)}
            />
          )}
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs font-medium text-neutral-500">
        {caption}
      </figcaption>
    </figure>
  );
}
