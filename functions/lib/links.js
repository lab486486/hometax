const LINKS_KEY = "config/links.json";
const GITHUB_REPO = "lab486486/hometax";

export const RESERVED = new Set([
  "",
  "api",
  "images",
  "favicon.webp",
  "favicon.svg",
  "robots.txt",
  "sitemap-index.xml",
  "sitemap-0.xml",
  "sitemap.xml",
  "rss.xml",
  "og.jpg",
  "404",
  "index",
  "_astro",
  "_headers",
  "_redirects",
  "admin",
  "category",
  "calculator",
  "m",
  "guide",
]);

/** Seed only when R2 has no links file yet. Keep empty — user adds links in admin. */
export const DEFAULT_LINKS = {};

/** Active for redirect? Missing enabled (old data) counts as on. */
export function isLinkEnabled(item) {
  return Boolean(item?.to) && item.enabled !== false;
}

export function normalizeSlug(raw) {
  return String(raw || "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
}

export function isValidSlug(slug) {
  return /^[a-z0-9][a-z0-9-]{0,62}$/.test(slug) && !RESERVED.has(slug);
}

export function isValidUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function loadLinks(env) {
  if (!env.MEDIA_BUCKET) return { ...DEFAULT_LINKS };
  try {
    const obj = await env.MEDIA_BUCKET.get(LINKS_KEY);
    if (!obj) {
      await saveLinks(env, DEFAULT_LINKS);
      return { ...DEFAULT_LINKS };
    }
    const data = await obj.json();
    if (!data || typeof data !== "object") return { ...DEFAULT_LINKS };
    return data;
  } catch {
    return { ...DEFAULT_LINKS };
  }
}

export async function saveLinks(env, links) {
  if (!env.MEDIA_BUCKET) {
    throw new Error("MEDIA_BUCKET binding missing");
  }
  await env.MEDIA_BUCKET.put(LINKS_KEY, JSON.stringify(links, null, 2), {
    httpMetadata: {
      contentType: "application/json; charset=utf-8",
      cacheControl: "no-store",
    },
  });
}

export function getBearerToken(request) {
  const auth = request.headers.get("Authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

/** Admin access = GitHub token that can read the hometax repo (same as Decap). */
export async function hasAdminAccess(request) {
  const token = getBearerToken(request);
  if (!token) return false;

  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "hometax-admin",
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}
