import { marked } from "marked";
import { expandCoupangShortcodes } from "./coupang";
import {
  getAdsenseConfig,
  getAfterTocAdCode,
  hasAfterTocAd,
  hasDisplayInBody,
  hasInarticleAd,
  type AdsenseConfig,
} from "../utils/adsense";

marked.setOptions({
  gfm: true,
  breaks: false,
});

function liteYoutubeHtml(videoId: string, label = "YouTube 영상 재생"): string {
  const poster = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  return `<button type="button" class="lite-yt" data-id="${videoId}" aria-label="${label}" style="background-image:url(${poster})"><span class="lite-yt-play" aria-hidden="true"></span></button>`;
}

function embedYouTubeLinks(markdown: string): string {
  let out = markdown.replace(
    /^\[([^\]]*)\]\((https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})[^)]*)\)\s*$/gm,
    (_m, label: string, _url: string, id: string) => liteYoutubeHtml(id, label || "YouTube 영상 재생"),
  );
  out = out.replace(
    /^(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})\S*)\s*$/gm,
    (_m, _url: string, id: string) => liteYoutubeHtml(id),
  );
  return out;
}

function hydrateYouTubeAnchors(html: string): string {
  return html.replace(
    /<p>\s*<a href="https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})[^"]*"[^>]*>([\s\S]*?)<\/a>\s*<\/p>/gi,
    (_m, id: string, label: string) => {
      const text = label.replace(/<[^>]+>/g, "").trim() || "YouTube 영상 재생";
      return liteYoutubeHtml(id, text);
    },
  );
}

function escapeLiteralHtmlExamples(markdown: string): string {
  return markdown
    .split(/(`[^`]*`)/g)
    .map((part) => {
      if (part.startsWith("`") && part.endsWith("`")) return part;
      // Only escape bare tag examples in prose, not real markdown headings
      return part.replace(
        /(?<![#\w])<\/?(?:b|strong)(?:\s[^>]*)?>/gi,
        (tag) => `\`${tag}\``,
      );
    })
    .join("");
}

function adSlotHtml(code: string, className: string): string {
  const trimmed = code.trim();
  if (!trimmed) return "";
  return `<div class="ad-slot ${className}">${trimmed}</div>`;
}

function injectBodyAds(html: string, config: AdsenseConfig): string {
  let out = html;

  if (hasDisplayInBody(config)) {
    const { display } = config;
    // First h2: prefer code_after_toc (former TOC unit); first h3: display.code
    if (display.after_h2) {
      const h2Code = (display.code_after_toc || display.code || "").trim();
      const slot = adSlotHtml(h2Code, "ad-slot-display ad-slot-after-h2");
      if (slot) out = out.replace(/<\/h2>/i, `</h2>${slot}`);
    }
    if (display.after_h3) {
      const h3Code = (display.code || "").trim();
      const slot = adSlotHtml(h3Code, "ad-slot-display ad-slot-after-h3");
      if (slot) out = out.replace(/<\/h3>/i, `</h3>${slot}`);
    }
    if (display.after_h4) {
      const slot = adSlotHtml(display.code, "ad-slot-display");
      if (slot) out = out.replace(/<\/h4>/i, `</h4>${slot}`);
    }
  }

  if (hasInarticleAd(config)) {
    const { inarticle } = config;
    const minParagraphs = Math.max(1, inarticle.min_paragraphs ?? 6);
    const insertAfter = Math.max(1, inarticle.insert_after_paragraph ?? 3);
    const parts = out.split(/(<\/p>)/i);
    let pCount = 0;
    let rebuilt = "";
    let inserted = false;
    for (let i = 0; i < parts.length; i++) {
      rebuilt += parts[i];
      if (/^<\/p>$/i.test(parts[i])) {
        pCount += 1;
        if (!inserted && pCount === insertAfter) {
          const totalPs = (out.match(/<\/p>/gi) || []).length;
          if (totalPs >= minParagraphs) {
            rebuilt += adSlotHtml(inarticle.code, "ad-slot-inarticle");
            inserted = true;
          }
        }
      }
    }
    out = rebuilt;
  }

  return out;
}

function slugifyHeading(text: string, used: Map<string, number>): string {
  let base = text
    .replace(/<[^>]+>/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\uac00-\ud7a3\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!base) base = "section";
  const count = used.get(base) ?? 0;
  used.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}

type TocItem = { level: 2 | 3; id: string; text: string };

/** Add ids to h2/h3 and prepend a TOC when headings exist. */
function injectToc(html: string): string {
  const used = new Map<string, number>();
  const items: TocItem[] = [];

  const withIds = html.replace(
    /<h([23])(\s[^>]*)?>([\s\S]*?)<\/h\1>/gi,
    (_m, levelStr: string, attrs = "", inner: string) => {
      const level = Number(levelStr) as 2 | 3;
      const text = inner.replace(/<[^>]+>/g, "").trim();
      if (!text) return _m;
      const existingId = attrs.match(/\sid=["']([^"']+)["']/i)?.[1];
      const id = existingId || slugifyHeading(text, used);
      const cleanAttrs = attrs.replace(/\s+id=["'][^"']*["']/i, "");
      items.push({ level, id, text });
      return `<h${level}${cleanAttrs} id="${id}">${inner}</h${level}>`;
    },
  );

  if (items.length === 0) return withIds;

  const tocItems = items
    .map((item) => {
      const cls = item.level === 3 ? ' class="toc-h3"' : "";
      return `<li${cls}><a href="#${item.id}">${item.text}</a></li>`;
    })
    .join("");

  const toc = `<nav class="post-toc" aria-label="목차">
<details open>
<summary>목차</summary>
<ol>${tocItems}</ol>
</details>
</nav>`;

  // Insert before the first h2/h3
  const firstHeading = withIds.search(/<h[23][\s>]/i);
  if (firstHeading === -1) return toc + withIds;
  return withIds.slice(0, firstHeading) + toc + withIds.slice(firstHeading);
}

function injectBeforeTocAd(html: string, config: AdsenseConfig): string {
  if (!hasAfterTocAd(config)) return html;
  const slot = adSlotHtml(getAfterTocAdCode(config), "ad-slot-display ad-slot-before-toc");
  if (!slot) return html;
  if (/class=["'][^"']*post-toc/i.test(html)) {
    return html.replace(/(<nav class="post-toc"[\s\S]*?<\/nav>)/i, `${slot}$1`);
  }
  return html;
}

function cellText(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function enhanceTables(html: string): string {
  return html.replace(/<table(\s[^>]*)?>[\s\S]*?<\/table>/gi, (table) => {
    let t = table;

    const lat = t.match(/<th[^>]*>\s*위도\s*<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i)?.[1];
    const lng = t.match(/<th[^>]*>\s*경도\s*<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i)?.[1];
    const latNum = Number.parseFloat(cellText(lat || ""));
    const lngNum = Number.parseFloat(cellText(lng || ""));
    const nameFromClass = t.match(
      /<th[^>]*class=["'][^"']*store-name[^"']*["'][^>]*>([\s\S]*?)<\/th>/i,
    )?.[1];
    const nameFromFirst = t.match(/<th[^>]*>([\s\S]*?)<\/th>/i)?.[1];
    const storeName = cellText(nameFromClass || nameFromFirst || "") || "군마트";

    // Drop noisy store meta rows (lat/lng / hidden detail links)
    t = t.replace(
      /<tr[^>]*>\s*<th[^>]*>\s*(위도|경도|세부정보)\s*<\/th>[\s\S]*?<\/tr>/gi,
      "",
    );

    if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
      const mapUrl = `https://map.kakao.com/link/map/${encodeURIComponent(storeName)}/${latNum},${lngNum}`;
      const mapRow = `<tr><th>지도</th><td><a class="store-map-link" href="${mapUrl}" target="_blank" rel="noopener noreferrer">카카오맵에서 보기</a></td></tr>`;
      if (/<\/tbody>/i.test(t)) {
        t = t.replace(/<\/tbody>/i, `${mapRow}</tbody>`);
      } else {
        t = t.replace(/<\/table>/i, `${mapRow}</table>`);
      }
    }

    // Convert dash lines inside table cells into mini lists
    t = t.replace(/<(td|th)([^>]*)>([\s\S]*?)<\/\1>/gi, (_m, tag, attrs, inner) => {
      const text = String(inner);
      if (!/^\s*-\s+/m.test(text) || /<ul|<ol|<li/i.test(text)) {
        return `<${tag}${attrs}>${inner}</${tag}>`;
      }
      const lines = text
        .split(/\n|<br\s*\/?>/i)
        .map((l) => l.trim())
        .filter(Boolean);
      const bullets = lines.filter((l) => /^[-•]\s+/.test(l));
      if (bullets.length >= 2 && bullets.length === lines.length) {
        const lis = bullets
          .map((l) => `<li>${l.replace(/^[-•]\s+/, "")}</li>`)
          .join("");
        return `<${tag}${attrs}><ul class="cell-list">${lis}</ul></${tag}>`;
      }
      return `<${tag}${attrs}>${inner}</${tag}>`;
    });

    const isStore = /\bstore-info\b/i.test(t) || /\barmy-store\b/i.test(t);

    if (/class=["'][^"']*["']/i.test(t)) {
      t = t.replace(/class=["']([^"']*)["']/i, (_m, c: string) => {
        const parts = new Set(`${c} post-table${isStore ? " store-info" : ""}`.split(/\s+/).filter(Boolean));
        return `class="${[...parts].join(" ")}"`;
      });
    } else {
      t = t.replace(
        /<table/i,
        `<table class="post-table${isStore ? " store-info" : ""}"`,
      );
    }

    return `<div class="table-wrap">${t}</div>`;
  });
}

export async function renderPostHtml(body: string): Promise<string> {
  const escaped = escapeLiteralHtmlExamples(body);
  const withBoxes = await expandCoupangShortcodes(escaped);
  const withYt = embedYouTubeLinks(withBoxes);
  let html = marked.parse(withYt, { async: false }) as string;
  html = hydrateYouTubeAnchors(html);
  html = enhanceTables(html);
  html = injectToc(html);
  const adsense = getAdsenseConfig();
  html = injectBeforeTocAd(html, adsense);
  html = injectBodyAds(html, adsense);
  return html;
}
