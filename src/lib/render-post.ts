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
      return part.replace(
        /<\/?(?:h[1-6]|b|strong)(?:\s[^>]*)?>/gi,
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
          // only insert if enough paragraphs overall
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

export async function renderPostHtml(body: string): Promise<string> {
  const escaped = escapeLiteralHtmlExamples(body);
  const withBoxes = await expandCoupangShortcodes(escaped);
  const withYt = embedYouTubeLinks(withBoxes);
  let html = marked.parse(withYt, { async: false }) as string;
  html = hydrateYouTubeAnchors(html);
  html = injectBodyAds(html, getAdsenseConfig());
  return html;
}
