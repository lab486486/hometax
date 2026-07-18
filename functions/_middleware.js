/**
 * Soft-gate for individual lecture videos + Pretty Link redirects.
 * Hub (/free-lecture/) stays public so guests can browse the curriculum.
 */

import { isLinkEnabled, loadLinks, normalizeSlug, RESERVED } from "./lib/links.js";

const COOKIE = "lecture_access";
const KADENCE_COOKIE = "kadence_css_access";
const CHEMICLOUD =
  "https://chemicloud.com/wordpress-hosting#a_aid=6818d638aa861&chan=code3";

function isProtectedLecturePath(pathname) {
  return /^\/lecture0[1-6]\/?$/.test(pathname);
}

function isKadenceCssPath(pathname) {
  return /^\/kadence-css\/?$/.test(pathname);
}

/** Single-segment path like /news-letter or /news-letter/ */
function shortLinkSlug(pathname) {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (clean === "/") return null;
  const parts = clean.slice(1).split("/");
  if (parts.length !== 1) return null;
  const slug = normalizeSlug(parts[0]);
  if (!slug || RESERVED.has(slug)) return null;
  if (slug.includes(".")) return null;
  return slug;
}

async function tokenFor(password, scope = "lecture") {
  const data = new TextEncoder().encode(`${scope}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getCookie(request, name) {
  const raw = request.headers.get("Cookie") || "";
  const parts = raw.split(";").map((p) => p.trim());
  for (const part of parts) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    if (part.slice(0, i) === name) return part.slice(i + 1);
  }
  return "";
}

function gateHtml(next, errored) {
  const error = errored
    ? `<p class="gate-error">비밀번호가 올바르지 않습니다. 다시 시도해 주세요.</p>`
    : "";
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>특강 입장 · 블로소득</title>
  <style>
    :root { --brand:#0c6e6b; --ink:#0f2744; --muted:#6b7f94; --line:#d9e3ee; --bg:#f7fafc; --soft:#e6f4f3; --err:#b42318; --notice:#6b7280; }
    * { box-sizing: border-box; }
    body { margin:0; min-height:100vh; display:grid; place-items:center; font-family:"Apple SD Gothic Neo","Pretendard","Noto Sans KR",system-ui,sans-serif; color:var(--ink); background:radial-gradient(900px 400px at 20% 0%, rgba(12,110,107,.16), transparent 55%), var(--bg); padding:1.5rem; }
    .card { width:min(100%, 28rem); background:#fff; border:1px solid var(--line); border-radius:1.25rem; padding:1.75rem; box-shadow:0 18px 40px rgba(15,39,68,.08); }
    .eyebrow { margin:0 0 .6rem; color:var(--brand); font-size:.8rem; font-weight:800; letter-spacing:.04em; text-transform:uppercase; }
    h1 { margin:0; font-size:1.4rem; letter-spacing:-.02em; line-height:1.35; }
    p { margin:.75rem 0 0; color:var(--muted); line-height:1.6; font-size:.95rem; }
    form { margin-top:1.25rem; display:grid; gap:.75rem; }
    label { font-weight:700; font-size:.9rem; }
    input { width:100%; min-height:2.85rem; border:1px solid var(--line); border-radius:.85rem; padding:.7rem .9rem; font:inherit; }
    input:focus { outline:2px solid color-mix(in srgb, var(--brand) 40%, white); border-color:var(--brand); }
    button { min-height:2.85rem; border:0; border-radius:999px; background:var(--brand); color:#fff; font:inherit; font-weight:700; cursor:pointer; }
    button:hover { background:#085552; }
    .gate-error { margin:.9rem 0 0; color:var(--err); background:#fff1f0; border:1px solid #ffcdc7; border-radius:.85rem; padding:.65rem .8rem; }
    .notice { margin:1.15rem 0 0; padding:.9rem 1rem; border:1px solid #c4c9d1; border-radius:1rem; background:#f3f4f6; color:#4b5563; font-size:.9rem; line-height:1.55; }
    .notice strong { color:#374151; }
    .notice a { color:var(--brand); font-weight:700; text-decoration:none; }
    .notice a:hover { text-decoration:underline; }
    .links { margin-top:1rem; display:flex; flex-wrap:wrap; gap:.85rem 1.1rem; }
    .links a { color:var(--muted); font-size:.9rem; text-decoration:none; }
    .links a:hover { color:var(--brand); }
  </style>
</head>
<body>
  <main class="card">
    <p class="eyebrow">Partner Access</p>
    <h1>특강 영상을 보려면 비밀번호가 필요합니다</h1>
    <p>케미클라우드 추천코드로 가입하신 분들께 안내된 비밀번호를 입력해 주세요.</p>
    ${error}
    <form method="POST" action="/api/lecture-auth?next=${encodeURIComponent(next)}">
      <label for="password">비밀번호</label>
      <input id="password" name="password" type="password" inputmode="numeric" autocomplete="current-password" required autofocus />
      <button type="submit">특강 시청하기</button>
    </form>
    <aside class="notice" role="note">
      <strong>비밀번호를 모르시나요?</strong><br />
      블로소득 추천코드로 <a href="${CHEMICLOUD}" rel="noopener noreferrer">케미클라우드 파트너</a>에 가입하시면
      특강 영상 6강과 전자책 가이드를 <strong>무료</strong>로 제공해 드립니다.
    </aside>
    <div class="links">
      <a href="/free-lecture/">← 특강 목록</a>
      <a href="/">메인으로</a>
    </div>
  </main>
</body>
</html>`;
}

function kadenceGateHtml(next, errored) {
  const error = errored
    ? `<p class="gate-error">비밀번호가 올바르지 않습니다. 다시 시도해 주세요.</p>`
    : "";
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>Kadence CSS · 블로소득</title>
  <style>
    :root { --brand:#0c6e6b; --ink:#0f2744; --muted:#6b7f94; --line:#d9e3ee; --bg:#f7fafc; --err:#b42318; }
    * { box-sizing: border-box; }
    body { margin:0; min-height:100vh; display:grid; place-items:center; font-family:"Apple SD Gothic Neo","Pretendard","Noto Sans KR",system-ui,sans-serif; color:var(--ink); background:radial-gradient(900px 400px at 20% 0%, rgba(12,110,107,.16), transparent 55%), var(--bg); padding:1.5rem; }
    .card { width:min(100%, 28rem); background:#fff; border:1px solid var(--line); border-radius:1.25rem; padding:1.5rem 1.35rem; box-shadow:0 18px 40px rgba(15,39,68,.08); }
    .eyebrow { margin:0 0 .6rem; color:var(--brand); font-size:.8rem; font-weight:800; letter-spacing:.04em; text-transform:uppercase; }
    h1 { margin:0; font-size:clamp(1.15rem, 4.6vw, 1.35rem); letter-spacing:-.02em; line-height:1.4; word-break:keep-all; overflow-wrap:anywhere; text-wrap:pretty; }
    p { margin:.75rem 0 0; color:var(--muted); line-height:1.6; font-size:.95rem; word-break:keep-all; }
    .lead { margin:.75rem 0 0; color:var(--muted); line-height:1.55; font-size:.95rem; word-break:keep-all; }
    .lead p { margin:0; }
    .lead a { color:var(--brand); font-weight:700; text-decoration:underline; text-underline-offset:.15em; }
    .lead a:hover { color:#085552; }
    form { margin-top:1.25rem; display:grid; gap:.75rem; }
    label { font-weight:700; font-size:.9rem; }
    input { width:100%; min-height:2.85rem; border:1px solid var(--line); border-radius:.85rem; padding:.7rem .9rem; font:inherit; font-size:16px; }
    input:focus { outline:2px solid color-mix(in srgb, var(--brand) 40%, white); border-color:var(--brand); }
    button { min-height:2.85rem; border:0; border-radius:999px; background:var(--brand); color:#fff; font:inherit; font-weight:700; cursor:pointer; }
    button:hover { background:#085552; }
    .gate-error { margin:.9rem 0 0; color:var(--err); background:#fff1f0; border:1px solid #ffcdc7; border-radius:.85rem; padding:.65rem .8rem; word-break:keep-all; }
    .links { margin-top:1rem; }
    .links a { color:var(--muted); font-size:.9rem; text-decoration:none; }
    .links a:hover { color:var(--brand); }
    @media (max-width:420px) {
      body { padding:1rem; }
      .card { padding:1.25rem 1.1rem; border-radius:1.1rem; }
      h1 { font-size:1.12rem; }
    }
  </style>
</head>
<body>
  <main class="card">
    <p class="eyebrow">Protected Page</p>
    <h1>해당 페이지를 보려면 비밀번호가 필요합니다</h1>
    <div class="lead">
      <p>안내받은 비밀번호를 입력해 주세요.<br />비밀번호는 <a href="https://youtu.be/f3R_Ox4S4x0" target="_blank" rel="noopener noreferrer">유튜브 영상 더보기</a> 란에 있습니다.</p>
    </div>
    ${error}
    <form method="POST" action="/api/kadence-auth?next=${encodeURIComponent(next)}">
      <label for="password">비밀번호</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required autofocus />
      <button type="submit">입장하기</button>
    </form>
    <div class="links">
      <a href="/">← 메인으로</a>
    </div>
  </main>
</body>
</html>`;
}

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);

  // Pretty Links: /slug → destination URL (stored in R2, enabled only)
  const slug = shortLinkSlug(url.pathname);
  if (slug && request.method === "GET") {
    const links = await loadLinks(env);
    const item = links[slug];
    if (isLinkEnabled(item)) {
      return Response.redirect(item.to, 302);
    }
  }

  if (isKadenceCssPath(url.pathname)) {
    const password = env.KADENCE_CSS_PASSWORD || "chemicloud";
    const expected = await tokenFor(password, "kadence-css");
    const cookie = getCookie(request, KADENCE_COOKIE);
    if (cookie && cookie === expected) {
      return next();
    }
    const errored = url.searchParams.get("error") === "1";
    const nextPath = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
    return new Response(kadenceGateHtml(nextPath, errored), {
      status: 401,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  if (!isProtectedLecturePath(url.pathname)) {
    return next();
  }

  const password = env.LECTURE_PASSWORD || "4900";
  const expected = await tokenFor(password, "lecture");
  const cookie = getCookie(request, COOKIE);

  if (cookie && cookie === expected) {
    return next();
  }

  const errored = url.searchParams.get("error") === "1";
  const nextPath = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
  return new Response(gateHtml(nextPath, errored), {
    status: 401,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
