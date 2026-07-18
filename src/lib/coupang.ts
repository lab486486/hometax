/**
 * WordPress-style shortcode:
 *   [coupang url="https://link.coupang.com/..." keyword="상품명"]
 *
 * At build time, resolves title/image via Coupang Partners API when
 * COUPANG_ACCESS_KEY + COUPANG_SECRET_KEY are set. Button always uses the
 * affiliate URL you provide.
 */

export type CoupangProduct = {
  url: string;
  title: string;
  image: string;
  description: string;
  keyword?: string;
};

const SHORTCODE_RE = /\[coupang\s+([^\]]+)\]/gi;

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of raw.matchAll(/(\w+)="([^"]*)"/g)) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function gmtSignedDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const yy = String(d.getUTCFullYear()).slice(2);
  return `${yy}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
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

async function coupangFetch(
  path: string,
  query: Record<string, string>,
  accessKey: string,
  secretKey: string,
  method: "GET" | "POST" = "GET",
): Promise<unknown> {
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

export async function resolveCoupangProduct(
  url: string,
  keyword: string,
  accessKey: string,
  secretKey: string,
): Promise<CoupangProduct> {
  let title = "쿠팡 추천 상품";
  let image = "https://via.placeholder.com/150?text=COUPANG";
  const description = "실시간 가격 및 혜택은 아래 링크에서 확인하세요.";

  if (keyword) {
    const json = (await coupangFetch(
      "/v2/providers/affiliate_open_api/apis/openapi/products/search",
      { keyword, limit: "1" },
      accessKey,
      secretKey,
    )) as { data?: { productData?: Array<{ productName?: string; productImage?: string }> } } | null;

    const product = json?.data?.productData?.[0];
    if (product?.productName) title = product.productName;
    if (product?.productImage) image = product.productImage;
  }

  return { url, title, image, description, keyword };
}

export function renderCoupangBox(product: CoupangProduct, defer = false): string {
  const dataAttrs = defer
    ? ` data-coupang-url="${escapeHtml(product.url)}" data-coupang-keyword="${escapeHtml(product.keyword || "")}"`
    : "";

  return `<aside class="cp-box-v5"${dataAttrs}>
  <div class="cp-badge-wrap"><span class="cp-badge">BEST 추천</span></div>
  <div class="cp-title" title="${escapeHtml(product.title)}">${escapeHtml(product.title)}</div>
  <div class="cp-desc" title="${escapeHtml(product.description)}">${escapeHtml(product.description)}</div>
  <div class="cp-btn-wrap"><a href="${escapeHtml(product.url)}" target="_blank" rel="noopener noreferrer sponsored" class="cp-btn">실시간 최저가</a></div>
  <div class="cp-ftc">이 포스팅은 쿠팡 파트너스 활동의 일환으로 수수료를 제공받을 수 있습니다.</div>
  <div class="cp-img-wrap"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}" loading="lazy" decoding="async" /></div>
</aside>`;
}

export async function expandCoupangShortcodes(markdown: string): Promise<string> {
  const fromImport = (import.meta as ImportMeta & { env?: Record<string, string> }).env || {};
  const fromProcess =
    typeof process !== "undefined" && process.env ? process.env : ({} as NodeJS.ProcessEnv);
  const accessKey = (fromImport.COUPANG_ACCESS_KEY || fromProcess.COUPANG_ACCESS_KEY || "").trim();
  const secretKey = (fromImport.COUPANG_SECRET_KEY || fromProcess.COUPANG_SECRET_KEY || "").trim();
  const hasKeys = Boolean(accessKey && secretKey);

  const matches = [...markdown.matchAll(SHORTCODE_RE)];
  if (matches.length === 0) return markdown;

  let result = markdown;
  for (const match of matches) {
    const full = match[0];
    const attrs = parseAttrs(match[1] || "");
    const url = attrs.url || "";
    const keyword = attrs.keyword || "";
    if (!url) {
      result = result.replace(full, "");
      continue;
    }

    let html: string;
    if (hasKeys) {
      try {
        const product = await resolveCoupangProduct(url, keyword, accessKey, secretKey);
        html = renderCoupangBox(product, false);
      } catch {
        html = renderCoupangBox(
          {
            url,
            keyword,
            title: keyword || "쿠팡 추천 상품",
            image: "https://via.placeholder.com/150?text=COUPANG",
            description: "실시간 가격 및 혜택은 아래 링크에서 확인하세요.",
          },
          true,
        );
      }
    } else {
      html = renderCoupangBox(
        {
          url,
          keyword,
          title: keyword || "쿠팡 추천 상품 불러오는 중…",
          image: "https://via.placeholder.com/150?text=COUPANG",
          description: "실시간 가격 및 혜택은 아래 링크에서 확인하세요.",
        },
        true,
      );
    }

    result = result.replace(full, `\n\n${html}\n\n`);
  }

  return result;
}
