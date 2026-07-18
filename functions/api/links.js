/**
 * Short-link admin API (GitHub token auth — same as Decap CMS login)
 * GET  /api/links
 * POST /api/links  JSON { action: upsert|delete|toggle, ... }
 */

import {
  hasAdminAccess,
  isValidSlug,
  isValidUrl,
  loadLinks,
  normalizeSlug,
  saveLinks,
} from "../lib/links.js";

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (!(await hasAdminAccess(request))) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  if (request.method === "GET") {
    const links = await loadLinks(env);
    return json({ ok: true, links });
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const action = String(body.action || "upsert");
  const slug = normalizeSlug(body.slug);
  const links = await loadLinks(env);

  if (action === "delete") {
    if (slug in links) {
      delete links[slug];
      await saveLinks(env, links);
    }
    return json({ ok: true, links });
  }

  if (action === "toggle") {
    if (slug in links && isValidUrl(links[slug]?.to || "")) {
      const enabled = body.enabled === true || body.enabled === 1 || body.enabled === "1";
      links[slug] = {
        ...links[slug],
        enabled,
        updatedAt: new Date().toISOString(),
      };
      await saveLinks(env, links);
    }
    return json({ ok: true, links });
  }

  const to = String(body.to || "").trim();
  const note = String(body.note || "").trim();

  if (!isValidSlug(slug) || !isValidUrl(to)) {
    return json({ ok: false, error: "invalid_slug_or_url" }, 400);
  }

  const prev = links[slug];
  links[slug] = {
    to,
    note,
    enabled: prev ? prev.enabled !== false : false,
    updatedAt: new Date().toISOString(),
  };

  await saveLinks(env, links);
  return json({ ok: true, links });
}
