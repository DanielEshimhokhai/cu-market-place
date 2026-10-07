"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";

/** Image with a quiet fade-in, or a neutral labelled placeholder when there's no photo. */
export function ProductImage({ src, alt, placeholder, sizes, priority, className }: {
  src: string | null; alt: string; placeholder: string; sizes: string; priority?: boolean; className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  if (!src) {
    return (
      <div className={cn("absolute inset-0 flex items-center justify-center bg-subtle p-3 text-center text-xs text-faint", className)}>
        {placeholder}
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      onLoad={() => setLoaded(true)}
      // Images that finished loading before hydration never fire onLoad.
      ref={(img) => {
        if (img?.complete && img.naturalWidth > 0) setLoaded(true);
      }}
      className={cn("object-cover transition-opacity duration-150", loaded ? "opacity-100" : "opacity-0", className)}
    />
  );
}
