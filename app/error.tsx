"use client";

import { Button } from "@/components/ui/Button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <p className="text-[15px] font-medium text-ink">Something went wrong</p>
      <p className="mt-1 text-sm text-muted">We couldn&apos;t load this page. Check your connection and try again.</p>
      <div className="mt-4 flex gap-2">
        <Button onClick={() => reset()}>Try again</Button>
        <Button href="/" variant="secondary">Go home</Button>
      </div>
    </div>
  );
}
