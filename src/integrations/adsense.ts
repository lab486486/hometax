import type { AstroIntegration } from "astro";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { getAdsenseConfig } from "../utils/adsense";

/** ads.txt only — body ads are injected in render-post.ts (marked HTML). */
export function adsense(): AstroIntegration {
  return {
    name: "adsense",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        const line = getAdsenseConfig().ads_txt?.trim();
        if (!line) return;
        const outPath = fileURLToPath(new URL("ads.txt", dir));
        await fs.writeFile(outPath, `${line}\n`, "utf8");
      },
    },
  };
}
