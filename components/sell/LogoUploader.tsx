"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { setLogo } from "@/lib/actions/business";
import { resizeImage } from "@/lib/image-resize";
import { createBrowserClient } from "@/lib/supabase/client";

export function LogoUploader({ businessId, name, logoUrl }: { businessId: string; name: string; logoUrl: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const blob = await resizeImage(file, 512, 0.85, true);
      const path = `${businessId}/logo-${Date.now().toString(36)}.webp`;
      const { error } = await createBrowserClient().storage.from("business-media").upload(path, blob, { contentType: "image/webp" });
      if (error) throw error;
      const r = await setLogo(path);
      if (!r.ok) throw new Error(r.error);
      toast.show("Logo updated");
      router.refresh();
    } catch {
      toast.show("Couldn't upload that image. Try a JPG or PNG under 10MB.", { tone: "danger" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name} src={logoUrl} size={64} square />
      <div className="flex gap-2">
        <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        <Button variant="secondary" size="sm" loading={busy} onClick={() => input.current?.click()}>
          {logoUrl ? "Change logo" : "Upload logo"}
        </Button>
        {logoUrl && (
          <Button variant="ghost" size="sm" disabled={busy} onClick={async () => { await setLogo(null); router.refresh(); }}>
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
