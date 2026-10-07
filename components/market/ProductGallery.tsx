"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { cn } from "@/lib/cn";

export function ProductGallery({ images, title, placeholder }: { images: string[]; title: string; placeholder: string }) {
  const [index, setIndex] = useState(0);
  const strip = useRef<HTMLDivElement>(null);

  if (!images.length) {
    return (
      <div className="-mx-4 flex aspect-[4/5] items-center justify-center bg-subtle text-sm text-faint md:mx-0 md:rounded-card">
        {placeholder}
      </div>
    );
  }

  const go = (i: number) => {
    const next = (i + images.length) % images.length;
    setIndex(next);
    strip.current?.scrollTo({ left: next * strip.current.clientWidth, behavior: "smooth" });
  };

  return (
    <div
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
      tabIndex={images.length > 1 ? 0 : -1}
      aria-roledescription="carousel"
      aria-label={`${title} photos`}
      className="outline-none"
    >
      {/* Mobile: swipeable strip. Desktop: single main image. */}
      <div
        ref={strip}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory overflow-x-auto md:mx-0 md:overflow-hidden md:rounded-card"
      >
        {images.map((src, i) => (
          <div key={src} className="relative aspect-[4/5] w-full shrink-0 snap-center bg-subtle">
            <Image
              src={src}
              alt={i === 0 ? title : `${title}, photo ${i + 1}`}
              fill
              priority={i === 0}
              sizes="(min-width: 768px) 560px, 100vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          <div className="mt-3 flex justify-center gap-1.5 md:hidden" aria-hidden>
            {images.map((src, i) => (
              <span key={src} className={cn("size-1.5 rounded-full transition-colors duration-150", i === index ? "bg-ink" : "bg-line-strong")} />
            ))}
          </div>
          <div className="mt-3 hidden gap-2 md:flex">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "relative size-16 overflow-hidden rounded-control bg-subtle ring-offset-2 ring-offset-canvas transition-shadow duration-150",
                  i === index ? "ring-[1.5px] ring-ink" : "opacity-80 hover:opacity-100",
                )}
              >
                <Image src={src} alt="" fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
