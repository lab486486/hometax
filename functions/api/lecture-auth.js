/**
 * Lecture soft-gate auth
 * POST /api/lecture-auth  body: { password } or form field password
 * Sets HttpOnly cookie lecture_access=<token>
 */

const COOKIE = "lecture_access";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

async function tokenFor(password) {
  const data = new TextEncoder().encode(`lecture:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const contentType = request.headers.get("content-type") || "";
  let password = "";

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    password = String(body.password || "");
  } else {
    const form = await request.formData().catch(() => null);
    password = String(form?.get("password") || "");
  }

  const expected = env.LECTURE_PASSWORD || "4900";
  if (password !== expected) {
    const accept = request.headers.get("accept") || "";
    if (accept.includes("text/html")) {
      const next = new URL(request.url).searchParams.get("next") || "/free-lecture/";
      return Response.redirect(new URL(`${next}?error=1`, request.url), 303);
    }
    return Response.json({ ok: false, error: "invalid_password" }, { status: 401 });
  }

  const token = await tokenFor(password);
  const url = new URL(request.url);
  const next = url.searchParams.get("next") || "/free-lecture/";
  const secure = url.protocol === "https:" ? "; Secure" : "";
  const headers = new Headers({
    "Set-Cookie": `${COOKIE}=${token}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; SameSite=Lax${secure}`,
    Location: next,
  });

  const accept = request.headers.get("accept") || "";
  if (accept.includes("application/json") && !accept.includes("text/html")) {
    return Response.json(
      { ok: true },
      {
        headers: {
          "Set-Cookie": `${COOKIE}=${token}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; SameSite=Lax${secure}`,
        },
      },
    );
  }

  return new Response(null, { status: 303, headers });
}
