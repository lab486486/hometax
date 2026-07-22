import { existsSync } from "node:fs";
import { join } from "node:path";

/** Map `/images/wp/.../foo.jpeg` → `/images/cards/wp/.../foo.webp` */
export function cardImagePath(src?: string | null): string | undefined {
  if (!src) return undefined;
  const trimmed = src.trim();
  if (!trimmed.startsWith("/images/")) return trimmed;

  const withoutImages = trimmed.slice("/images/".length);
  const webp = withoutImages.replace(/\.(jpe?g|png|gif|webp)$/i, ".webp");
  return `/images/cards/${webp}`;
}

/** Prefer optimized card thumb when present at build time. */
export function resolveCardImage(src?: string | null): string | undefined {
  if (!src) return undefined;
  const card = cardImagePath(src);
  if (!card) return src;

  const abs = join(process.cwd(), "public", card.replace(/^\//, ""));
  if (existsSync(abs)) return card;
  return src;
}
