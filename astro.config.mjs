// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { site } from "./src/site.config.ts";
import { adsense } from "./src/integrations/adsense.ts";

export default defineConfig({
  site: site.baseUrl,
  output: "static",
  trailingSlash: "always",
  integrations: [
    sitemap({
      filter: (page) => !page.includes("/404") && !page.includes("/admin"),
    }),
    adsense(),
  ],
  build: {
    inlineStylesheets: "always",
  },
});
