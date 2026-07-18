/**
 * Kadence CSS page soft-gate
 * POST /api/kadence-auth
 */

const COOKIE = "kadence_css_access";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const DEFAULT_PASSWORD = "chemicloud";

async function tokenFor(password) {
  const data = new TextEncoder().encode(`kadence-css:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const form = await request.formData().catch(() => null);
  const password = String(form?.get("password") || "");
  const expected = env.KADENCE_CSS_PASSWORD || DEFAULT_PASSWORD;
  const next =
    new URL(request.url).searchParams.get("next") || "/kadence-css/";

  if (password !== expected) {
    return Response.redirect(new URL(`${next}?error=1`, request.url), 303);
  }

  const token = await tokenFor(password);
  const url = new URL(request.url);
  const secure = url.protocol === "https:" ? "; Secure" : "";

  return new Response(null, {
    status: 303,
    headers: {
      Location: next,
      "Set-Cookie": `${COOKIE}=${token}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; SameSite=Lax${secure}`,
    },
  });
}
