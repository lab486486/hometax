/**
 * Resolve Coupang product title/image for shortcode boxes.
 * POST { url, keyword } → { url, title, image, description }
 *
 * Secrets (Pages → Settings → Environment variables):
 *   COUPANG_ACCESS_KEY
 *   COUPANG_SECRET_KEY
 */

function gmtSignedDate() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const yy = String(d.getUTCFullYear()).slice(2);
  return `${yy}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

async function hmacSha256Hex(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function coupangFetch(path, query, accessKey, secretKey, method = "GET") {
  const queryString =
    method === "GET" ? new URLSearchParams(query).toString() : JSON.stringify(query);
  const datetime = gmtSignedDate();
  const message = `${datetime}${method}${path}${method === "GET" ? queryString : ""}`;
  const signature = await hmacSha256Hex(secretKey, message);
  const authorization = `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`;
  const apiUrl =
    method === "GET"
      ? `https://api-gateway.coupang.com${path}?${queryString}`
      : `https://api-gateway.coupang.com${path}`;

  const res = await fetch(apiUrl, {
    method,
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json;charset=UTF-8",
      Accept: "application/json",
    },
    body: method === "POST" ? queryString : undefined,
  });
  if (!res.ok) return null;
  return res.json();
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const accessKey = (env.COUPANG_ACCESS_KEY || "").trim();
  const secretKey = (env.COUPANG_SECRET_KEY || "").trim();
  if (!accessKey || !secretKey) {
    return Response.json(
      { error: "COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY not configured" },
      { status: 500 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const url = String(body.url || "").trim();
  const keyword = String(body.keyword || "").trim();
  if (!url) {
    return Response.json({ error: "url required" }, { status: 400 });
  }

  let title = keyword || "쿠팡 추천 상품";
  let image = "https://via.placeholder.com/150?text=COUPANG";
  const description = "실시간 가격 및 혜택은 아래 링크에서 확인하세요.";

  if (keyword) {
    const json = await coupangFetch(
      "/v2/providers/affiliate_open_api/apis/openapi/products/search",
      { keyword, limit: "1" },
      accessKey,
      secretKey,
    );
    const product = json?.data?.productData?.[0];
    if (product?.productName) title = product.productName;
    if (product?.productImage) image = product.productImage;
  }

  return Response.json({ url, title, image, description, keyword });
}
