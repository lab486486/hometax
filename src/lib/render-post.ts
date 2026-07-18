import { marked } from "marked";
import { expandCoupangShortcodes } from "./coupang";
import {
  getAdsenseConfig,
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
    const slot = adSlotHtml(display.code, "ad-slot-display");
    if (slot) {
      if (display.after_h2) out = out.replace(/<\/h2>/gi, `</h2>${slot}`);
      if (display.after_h3) out = out.replace(/<\/h3>/gi, `</h3>${slot}`);
      if (display.after_h4) out = out.replace(/<\/h4>/gi, `</h4>${slot}`);
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

function enhanceTables(html: string): string {
  return html.replace(/<table(\s[^>]*)?>[\s\S]*?<\/table>/gi, (table) => {
    let t = table;

    // Drop noisy store meta rows (lat/lng / hidden detail links)
    t = t.replace(
      /<tr[^>]*>\s*<th[^>]*>\s*(위도|경도|세부정보)\s*<\/th>[\s\S]*?<\/tr>/gi,
      "",
    );

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
    const cls = isStore ? "post-table store-info" : "post-table";

    if (/class=["'][^"']*["']/i.test(t)) {
      t = t.replace(/class=["']([^"']*)["']/i, (_m, c) => {
        const merged = `${c} ${cls}`.replace(/\s+/g, " ").trim();
        return `class="${merged}"`;
      });
    } else {
      t = t.replace(/<table/i, `<table class="${cls}"`);
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
  html = injectBodyAds(html, getAdsenseConfig());
  return html;
}
