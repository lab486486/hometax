import type { APIRoute } from "astro";
import { site } from "../site.config";
import { getSiteSettings } from "../utils/site-settings";
import { getAllPosts, postUrl } from "../utils/posts";
import { escapeXml, xmlUrl } from "../utils/xml";

const MAX_ITEMS = 100;

export const GET: APIRoute = async () => {
  const settings = getSiteSettings();
  const base = (settings.site_url || site.baseUrl).replace(/\/$/, "");
  const title = settings.title || site.title;
  const description = site.description;
  const posts = (await getAllPosts()).slice(0, MAX_ITEMS);

  const items = posts
    .map((post) => {
      const link = xmlUrl(`${base}${postUrl(post)}`);
      const pubDate = post.data.date.toUTCString();
      const desc = post.data.description || "";
      return `    <item>
      <title>${escapeXml(post.data.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(desc)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${xmlUrl(`${base}/`)}</link>
    <description>${escapeXml(description)}</description>
    <language>ko</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
};
