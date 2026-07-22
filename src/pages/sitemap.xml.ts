import type { APIRoute } from "astro";
import { site } from "../site.config";
import { getSiteSettings } from "../utils/site-settings";
import { getAllPosts, postUrl } from "../utils/posts";
import { calculators } from "../data/calculators";
import { xmlUrl } from "../utils/xml";

function urlEntry(loc: string, lastmod?: Date, priority = "0.6"): string {
  const last = lastmod
    ? `\n    <lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>`
    : "";
  return `  <url>
    <loc>${xmlUrl(loc)}</loc>${last}
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export const GET: APIRoute = async () => {
  const settings = getSiteSettings();
  const base = (settings.site_url || site.baseUrl).replace(/\/$/, "");
  const posts = await getAllPosts();
  const tags = new Set<string>();
  for (const post of posts) {
    for (const tag of post.data.tags) tags.add(tag.toLowerCase());
  }

  const urls: string[] = [
    urlEntry(`${base}/`, new Date(), "1.0"),
    urlEntry(`${base}/calculator/`, undefined, "0.8"),
    ...calculators.map((c) => urlEntry(`${base}/calculator/${c.slug}/`, undefined, "0.7")),
    ...[...tags].map((tag) =>
      urlEntry(`${base}/category/${encodeURIComponent(tag)}/`, undefined, "0.6"),
    ),
    ...posts.map((post) => urlEntry(`${base}${postUrl(post)}`, post.data.date, "0.7")),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
};
