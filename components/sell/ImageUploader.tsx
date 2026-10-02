"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { resizeImage } from "@/lib/image-resize";
import { createBrowserClient } from "@/lib/supabase/client";

export type UploadedImage = { key: string; path: string | null; url: string; uploading: boolean; error?: string };
const MAX = 8;

/** Uploads straight from the browser to product-images/{businessId}/… and exposes the ordered paths via a hidden input. */
export function ImageUploader({ businessId, initial, error, onChange }: {
  businessId: string; initial: { path: string; url: string }[]; error?: string; onChange?: () => void;
}) {
  const [items, setItems] = useState<UploadedImage[]>(() => initial.map((i) => ({ key: i.path, path: i.path, url: i.url, uploading: false })));
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const update = (fn: (prev: UploadedImage[]) => UploadedImage[]) => {
    setItems(fn);
    onChange?.();
  };

  const add = async (files: FileList | File[]) => {
    const list = [...files].filter((f) => f.type.startsWith("image/")).slice(0, MAX - items.length);
    for (const file of list) {
      const key = crypto.randomUUID();
      const preview = URL.createObjectURL(file);
      update((prev) => [...prev, { key, path: null, url: preview, uploading: true }]);
      try {
        const blob = await resizeImage(file);
        const path = `${businessId}/${key}.webp`;
        const { error: upErr } = await createBrowserClient().storage.from("product-images").upload(path, blob, { contentType: "image/webp" });
        if (upErr) throw upErr;
        update((prev) => prev.map((i) => (i.key === key ? { ...i, path, uploading: false } : i)));
      } catch {
        update((prev) => prev.map((i) => (i.key === key ? { ...i, uploading: false, error: "Upload failed" } : i)));
      }
    }
  };

  const move = (from: number, to: number) =>
    update((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return next;
    });

  const paths = items.filter((i) => i.path && !i.error).map((i) => i.path);
  const busy = items.some((i) => i.uploading);

  return (
    <div>
      <input type="hidden" name="images" value={JSON.stringify(paths)} />
      <input type="hidden" name="images_busy" value={busy ? "1" : ""} />
      <div
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setOver(true);
          }
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          if (e.dataTransfer.files.length) {
            e.preventDefault();
            setOver(false);
            void add(e.dataTransfer.files);
          }
        }}
        className={cn("grid grid-cols-3 gap-2 rounded-card sm:grid-cols-4", over && "ring-2 ring-accent ring-offset-2 ring-offset-canvas")}
      >
        {items.map((img, i) => (
          <div
            key={img.key}
            draggable={!img.uploading}
            onDragStart={() => setDragKey(img.key)}
            onDragEnd={() => setDragKey(null)}
            onDragOver={(e) => dragKey && e.preventDefault()}
            onDrop={(e) => {
              if (!dragKey) return;
              e.preventDefault();
              move(items.findIndex((x) => x.key === dragKey), i);
              setDragKey(null);
            }}
            className={cn("group relative aspect-square overflow-hidden rounded-control border border-line bg-subtle", dragKey === img.key && "opacity-50")}
          >
            <Image src={img.url} alt={`Photo ${i + 1}`} fill sizes="160px" className={cn("object-cover", img.uploading && "opacity-60")} unoptimized={img.url.startsWith("blob:")} />
            {i === 0 && <span className="absolute top-1.5 left-1.5 rounded-[4px] bg-ink/80 px-1.5 py-0.5 text-[11px] font-medium text-white">Cover</span>}
            {img.uploading && <span className="absolute inset-x-0 bottom-0 h-1 animate-pulse bg-accent" aria-label="Uploading" />}
            {img.error && <span className="absolute inset-x-0 bottom-0 bg-danger px-1.5 py-0.5 text-[11px] text-white">{img.error}</span>}
            <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => update((prev) => prev.filter((x) => x.key !== img.key))} className="absolute top-1.5 right-1.5 inline-flex size-7 items-center justify-center rounded-full bg-surface/90 text-ink hover:bg-surface">
              <X size={14} />
            </button>
            <div className="absolute right-1.5 bottom-1.5 flex gap-1">
              <button type="button" aria-label={`Move photo ${i + 1} earlier`} disabled={i === 0} onClick={() => move(i, i - 1)} className="inline-flex size-7 items-center justify-center rounded-full bg-surface/90 text-ink disabled:opacity-40">
                <ArrowLeft size={14} />
              </button>
              <button type="button" aria-label={`Move photo ${i + 1} later`} disabled={i === items.length - 1} onClick={() => move(i, i + 1)} className="inline-flex size-7 items-center justify-center rounded-full bg-surface/90 text-ink disabled:opacity-40">
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ))}
        {items.length < MAX && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-control border border-dashed border-line-strong bg-surface text-xs text-muted hover:bg-subtle hover:text-ink"
          >
            <ImagePlus size={20} strokeWidth={1.5} aria-hidden />
            {items.length ? "Add more" : "Add photos"}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && add(e.target.files)} />
      <p className="mt-2 text-xs text-muted">Up to {MAX} photos. The first one is the cover; drag or use the arrows to reorder. Large photos are resized automatically.</p>
      {error && <p role="alert" className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
