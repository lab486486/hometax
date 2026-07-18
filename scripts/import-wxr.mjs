#!/usr/bin/env node
/**
 * WordPress WXR → Astro content markdown
 * Usage: node scripts/import-wxr.mjs ["path/to/export.xml"]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const xmlPath =
  process.argv[2] ||
  path.join(root, "hometax 2026-07-18.xml");

const blogDir = path.join(root, "src/content/blog");
const gunmartDir = path.join(root, "src/content/gunmart");
const imgDir = path.join(root, "public/images/wp");
const downloadImages = process.env.DOWNLOAD_IMAGES !== "0";

function decodeCdata(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}

function extractTag(block, tag) {
  const re = new RegExp(
    `<${tag}(?:\\s[^>]*)?>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))</${tag}>`,
    "i",
  );
  const m = block.match(re);
  if (!m) return "";
  return (m[1] ?? m[2] ?? "").trim();
}

function extractMeta(block, key) {
  const re = /<wp:postmeta>\s*<wp:meta_key><!\[CDATA\[(.*?)\]\]><\/wp:meta_key>\s*<wp:meta_value><!\[CDATA\[([\s\S]*?)\]\]><\/wp:meta_value>\s*<\/wp:postmeta>/g;
  let m;
  while ((m = re.exec(block))) {
    if (m[1] === key) return m[2];
  }
  return "";
}

function categories(block) {
  const out = [];
  const re =
    /<category domain="([^"]+)" nicename="([^"]*)"><!\[CDATA\[(.*?)\]\]><\/category>/g;
  let m;
  while ((m = re.exec(block))) {
    out.push({ domain: m[1], nicename: decodeURIComponentSafe(m[2]), name: m[3] });
  }
  return out;
}

function decodeURIComponentSafe(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function slugFromPost(block) {
  const postName = extractTag(block, "wp:post_name");
  if (postName) return decodeURIComponentSafe(postName);
  const link = extractTag(block, "link");
  try {
    const u = new URL(link);
    const parts = u.pathname.split("/").filter(Boolean);
    return decodeURIComponentSafe(parts[parts.length - 1] || "");
  } catch {
    return "";
  }
}

function isGunmart(title, cats, tags) {
  // Only location/hours PX mart pages + bestseller list — keep military welfare guides in blog
  if (/군마트|영외마트|콘도마트|간성마트|미추홀마트|불암산마트|백석마트|충장마트|아인스빌|신산마트/.test(title)) {
    return true;
  }
  if (/군마트 추천템|PX 충성클럽|전국 군마트 지도/.test(title)) return true;
  if (/마트 위치/.test(title) && /영업시간|전화번호|PX/.test(title)) return true;
  const catNames = cats.map((c) => c.name);
  if (catNames.includes("국군복지단") && /마트|위치|영업시간/.test(title)) return true;
  return false;
}

function yamlQuote(s) {
  return JSON.stringify(s ?? "");
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function htmlToMarkdown(html) {
  let s = html;
  // WordPress blocks / shortcodes noise
  s = s.replace(/\[\/?caption[^\]]*\]/gi, "");
  s = s.replace(/\[gallery[^\]]*\]/gi, "");

  // headings
  s = s.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, t) => `\n# ${stripHtml(t)}\n\n`);
  s = s.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, t) => `\n## ${stripHtml(t)}\n\n`);
  s = s.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, t) => `\n### ${stripHtml(t)}\n\n`);
  s = s.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, t) => `\n#### ${stripHtml(t)}\n\n`);

  // images
  s = s.replace(
    /<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/gi,
    (_, src, alt) => `\n\n![${alt || ""}](${src})\n\n`,
  );
  s = s.replace(
    /<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']+)["'][^>]*\/?>/gi,
    (_, alt, src) => `\n\n![${alt || ""}](${src})\n\n`,
  );
  s = s.replace(/<img[^>]*src=["']([^"']+)["'][^>]*\/?>/gi, (_, src) => `\n\n![](${src})\n\n`);

  // links (non-nested simple)
  s = s.replace(
    /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_, href, text) => `[${stripHtml(text)}](${href})`,
  );

  // lists
  s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, t) => `- ${stripHtml(t)}\n`);
  s = s.replace(/<\/?ul[^>]*>/gi, "\n");
  s = s.replace(/<\/?ol[^>]*>/gi, "\n");

  // bold / italic
  s = s.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**");
  s = s.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, "*$2*");

  // paragraphs / breaks
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, t) => `${t.trim()}\n\n`);
  s = s.replace(/<\/?(div|span|section|article|figure|figcaption)[^>]*>/gi, "");

  // keep tables as HTML
  // strip remaining tags except table-related
  s = s.replace(/<(?!\/?(table|thead|tbody|tr|th|td)\b)[^>]+>/gi, "");

  s = s.replace(/\n{3,}/g, "\n\n").trim() + "\n";
  return s;
}

function rewriteImageUrls(md, urlMap) {
  let out = md;
  for (const [from, to] of urlMap) {
    out = out.split(from).join(to);
    // also protocol-relative / encoded variants
    try {
      const u = new URL(from);
      out = out.split(u.pathname).join(to);
    } catch {
      /* ignore */
    }
  }
  return out;
}

async function download(url, dest) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
      Referer: "https://hometax.me/",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
}

function localImagePath(remoteUrl) {
  try {
    const u = new URL(remoteUrl);
    if (!u.pathname.includes("/wp-content/uploads/")) return null;
    // Decode %XX so on-disk names match browser-decoded request paths
    const rel = decodeURIComponentSafe(
      u.pathname.replace(/^\/wp-content\/uploads\//, ""),
    );
    return {
      abs: path.join(imgDir, rel),
      publicPath: `/images/wp/${rel}`,
    };
  } catch {
    return null;
  }
}

function collectUrls(md) {
  const urls = new Set();
  for (const m of md.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/g)) urls.add(m[1]);
  for (const m of md.matchAll(/src=["'](https?:\/\/[^"']+)["']/g)) urls.add(m[1]);
  return [...urls];
}

function frontmatter({ title, slug, date, description, tags, cover }) {
  const lines = [
    "---",
    `title: ${yamlQuote(title)}`,
    `slug: ${yamlQuote(slug)}`,
    `date: ${date.slice(0, 10)}`,
    `description: ${yamlQuote(description)}`,
    "tags:",
    ...tags.map((t) => `  - ${yamlQuote(t)}`),
  ];
  if (cover) lines.push(`cover_image: ${yamlQuote(cover)}`);
  lines.push("---", "");
  return lines.join("\n");
}

function safeFilename(slug) {
  return slug.replace(/[\/\\?%*:|"<>]/g, "-").slice(0, 180) || "post";
}

async function main() {
  if (!fs.existsSync(xmlPath)) {
    console.error("XML not found:", xmlPath);
    process.exit(1);
  }

  const xml = fs.readFileSync(xmlPath, "utf8");
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);

  // attachment id → url
  const attachById = new Map();
  for (const it of items) {
    if (extractTag(it, "wp:post_type") !== "attachment") continue;
    const id = extractTag(it, "wp:post_id");
    const url = extractTag(it, "wp:attachment_url");
    if (id && url) attachById.set(id, url);
  }

  fs.mkdirSync(blogDir, { recursive: true });
  fs.mkdirSync(gunmartDir, { recursive: true });
  // clear previous imports (keep folder)
  for (const dir of [blogDir, gunmartDir]) {
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith(".md")) fs.unlinkSync(path.join(dir, f));
    }
  }

  let blogCount = 0;
  let gunCount = 0;
  let imgOk = 0;
  let imgFail = 0;
  const report = [];

  for (const it of items) {
    if (extractTag(it, "wp:post_type") !== "post") continue;
    if (extractTag(it, "wp:status") !== "publish") continue;

    const title = extractTag(it, "title");
    const slug = slugFromPost(it);
    const date = extractTag(it, "wp:post_date") || extractTag(it, "pubDate");
    const content = extractTag(it, "content:encoded");
    const excerpt = extractTag(it, "excerpt:encoded");
    const cats = categories(it).filter((c) => c.domain === "category");
    const tags = categories(it).filter((c) => c.domain === "post_tag");
    const yoastDesc =
      extractMeta(it, "_yoast_wpseo_metadesc") ||
      extractMeta(it, "rank_math_description");
    const thumbId = extractMeta(it, "_thumbnail_id");
    const fifu = extractMeta(it, "fifu_image_url");
    let coverRemote = fifu || (thumbId ? attachById.get(thumbId) : "") || "";

    const description =
      yoastDesc ||
      excerpt ||
      stripHtml(content).slice(0, 140) ||
      title;

    const gun = isGunmart(title, cats, tags);
    const tagNames = [
      ...new Set(
        [...cats, ...tags]
          .map((c) => c.name.trim())
          .filter(Boolean)
          .map((n) =>
            decodeURIComponentSafe(n)
              .replace(/[\/\\]/g, "-")
              .replace(/\s+/g, " ")
              .trim(),
          )
          .filter(Boolean),
      ),
    ];
    if (!tagNames.length) tagNames.push(gun ? "군마트" : "홈택스");

    let body = htmlToMarkdown(content);

    // download / rewrite images
    const urlMap = [];
    const urls = collectUrls(body);
    if (coverRemote) urls.push(coverRemote);

    let coverLocal = "";
    for (const url of [...new Set(urls)]) {
      if (!url.includes("hometax.me") && !url.includes("/wp-content/uploads/")) continue;
      const local = localImagePath(url);
      if (!local) continue;
      if (downloadImages) {
        try {
          if (!fs.existsSync(local.abs)) {
            await download(url, local.abs);
          }
          imgOk += 1;
          urlMap.push([url, local.publicPath]);
          if (url === coverRemote) coverLocal = local.publicPath;
        } catch (e) {
          imgFail += 1;
          console.warn("img fail", url, e.message);
        }
      } else {
        urlMap.push([url, local.publicPath]);
        if (url === coverRemote) coverLocal = local.publicPath;
      }
    }

    body = rewriteImageUrls(body, urlMap);
    // rewrite absolute hometax post links to root-relative decoded paths
    body = body.replace(
      /https?:\/\/hometax\.me\/([^)\s"']+)\/?/g,
      (_, p) => {
        const decoded = decodeURIComponentSafe(p.replace(/\/$/, ""));
        if (decoded.startsWith("wp-content/")) return `https://hometax.me/${p}`;
        return `/${decoded}/`;
      },
    );

    const fm = frontmatter({
      title,
      slug,
      date,
      description: description.slice(0, 200),
      tags: tagNames,
      cover: coverLocal || undefined,
    });

    const dir = gun ? gunmartDir : blogDir;
    const file = path.join(dir, `${safeFilename(slug)}.md`);
    fs.writeFileSync(file, fm + body, "utf8");
    if (gun) gunCount += 1;
    else blogCount += 1;
    report.push({ gun, slug, title, file: path.relative(root, file) });
  }

  fs.writeFileSync(
    path.join(root, "scripts/import-report.json"),
    JSON.stringify({ blogCount, gunCount, imgOk, imgFail, posts: report }, null, 2),
  );

  console.log(
    JSON.stringify(
      { blogCount, gunCount, imgOk, imgFail, total: blogCount + gunCount },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
