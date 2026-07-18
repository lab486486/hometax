/**
 * Site + media config for hometax.me
 */
export const site = {
  name: "홈택스 가이드",
  title: "홈택스 가이드",
  description:
    "종합소득세·연말정산·지원금·서류 발급까지. 홈택스와 생활 세금 실무를 쉽게 정리합니다.",
  baseUrl: "https://hometax.me",
  lang: "ko",
  /** Empty = same-origin /images. Set after R2 upload. */
  mediaBaseUrl: "",
  youtube: "",
  chemicloud: "",
  lecture: "/",
  newsletter: "/",
  cafe24: "/",
  cloudways: "/",
  ebook: "/",
  wordpress: "/",
} as const;

/** Resolve an image path against Pages or R2. */
export function media(path: string): string {
  const cleaned = path.replace(/^\//, "");
  const base = site.mediaBaseUrl.replace(/\/$/, "");
  if (base) return `${base}/${cleaned}`;
  return `/${cleaned}`;
}

/** Origin for preconnect when media is on R2. */
export function mediaOrigin(): string | undefined {
  if (!site.mediaBaseUrl) return undefined;
  try {
    return new URL(site.mediaBaseUrl).origin;
  } catch {
    return undefined;
  }
}
