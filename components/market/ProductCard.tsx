import Link from "next/link";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import type { ProductCardData } from "@/lib/types";
import { Price } from "./Price";
import { ProductImage } from "./ProductImage";
import { Rating } from "./Rating";
import { SaveButton } from "./SaveButton";
import { VerifiedBadge } from "./VerifiedBadge";

export const CARD_SIZES = "(min-width:1280px) 216px, (min-width:1024px) 22vw, (min-width:640px) 30vw, 46vw";

function cardBadge(p: ProductCardData): { tone: BadgeTone; text: string } | null {
  if (p.stock === 0) return { tone: "neutral", text: "Sold out" };
  if (p.stock !== null && p.stock <= 3) return { tone: "warning", text: `Only ${p.stock} left` };
  if (p.kind === "service") return { tone: "neutral", text: "Service" };
  if (p.condition === "used") return { tone: "neutral", text: "Used" };
  if (p.condition === "like_new") return { tone: "neutral", text: "Like new" };
  return null;
}

type Props = { product: ProductCardData; saved?: boolean; priority?: boolean; className?: string };

export function ProductCard({ product: p, saved = false, priority, className }: Props) {
  const badge = cardBadge(p);
  return (
    <Link href={`/p/${p.slug}`} className={cn("group relative block min-w-0", className)}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-subtle">
        <ProductImage
          src={p.image}
          alt={p.title}
          placeholder={p.title}
          sizes={CARD_SIZES}
          priority={priority}
          className="group-hover:brightness-[.97]"
        />
        <SaveButton productId={p.id} saved={saved} />
        {badge && (
          <Badge tone={badge.tone} className={cn("absolute bottom-2 left-2", badge.tone === "neutral" && "bg-surface/95")}>
            {badge.text}
          </Badge>
        )}
      </div>
      <div className="space-y-0.5 pt-2">
        <h3 className="line-clamp-2 text-sm leading-5 font-medium text-ink">{p.title}</h3>
        <Price kobo={p.price_kobo} compareAt={p.compare_at_kobo} />
        <p className="flex min-w-0 items-center gap-1 text-xs text-muted">
          <span className="truncate">{p.business.name}</span>
          {p.business.verified && <VerifiedBadge />}
        </p>
        <p className="flex min-w-0 items-center gap-1 text-xs text-muted">
          <Rating avg={p.rating_avg} count={p.rating_count} className="shrink-0" />
          {p.location && (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{p.location.name}</span>
            </>
          )}
        </p>
      </div>
    </Link>
  );
}
