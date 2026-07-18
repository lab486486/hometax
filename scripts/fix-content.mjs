#!/usr/bin/env node
/**
 * Full-pass cleanup for imported WordPress markdown.
 * - rejoins spaced "- item" / "1. item" runs into real lists
 * - strips &nbsp; / empty headings / empty bullet lines
 * - normalizes blank lines and table cell noise
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentRoot = path.join(root, "src/content");

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".md")) out.push(p);
  }
  return out;
}

function splitFrontmatter(raw) {
  if (!raw.startsWith("---")) return { fm: null, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { fm: null, body: raw };
  const fm = raw.slice(0, end + 4);
  const body = raw.slice(end + 4);
  return { fm, body };
}

const bulletRe = /^[ \t\u00a0]*([-*•●○◦▪▫–—])\s+(\S.*)$/;
const numberedRe = /^[ \t\u00a0]*(\d+)[\.\)]\s+(\S.*)$/;

function collectRun(lines, i, matcher) {
  const items = [];
  let cursor = i;
  while (cursor < lines.length) {
    if (lines[cursor].trim() === "" || /^[ \t\u00a0]*$/.test(lines[cursor]) || lines[cursor].trim() === "&nbsp;") {
      let j = cursor + 1;
      while (
        j < lines.length &&
        (lines[j].trim() === "" ||
          lines[j].trim() === "&nbsp;" ||
          /^[ \t\u00a0]*$/.test(lines[j]))
      ) {
        j += 1;
      }
      if (j < lines.length && matcher(lines[j])) {
        cursor = j;
        continue;
      }
      break;
    }
    const m = matcher(lines[cursor]);
    if (!m) break;
    items.push(m);
    cursor += 1;
  }
  return { items, next: cursor };
}

function isHtmlHeavy(line) {
  return /<\/?(table|thead|tbody|tr|th|td|ul|ol|li|div|p)\b/i.test(line);
}

function normalizeLists(body) {
  const lines = body.split("\n");
  const out = [];
  let i = 0;
  let inTable = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/<table\b/i.test(line)) inTable += 1;
    if (/<\/table>/i.test(line)) inTable = Math.max(0, inTable - 1);

    // Never rewrite list-looking lines inside HTML tables
    if (inTable > 0 || isHtmlHeavy(line)) {
      out.push(line);
      i += 1;
      continue;
    }

    const asBullet = (ln) => {
      if (isHtmlHeavy(ln)) return null;
      const m = ln.match(bulletRe);
      return m ? { kind: "ul", text: m[2].trim() } : null;
    };
    const asNum = (ln) => {
      if (isHtmlHeavy(ln)) return null;
      const m = ln.match(numberedRe);
      return m ? { kind: "ol", n: Number(m[1]), text: m[2].trim() } : null;
    };

    if (asBullet(line)) {
      const { items, next } = collectRun(lines, i, asBullet);
      if (items.length >= 1) {
        if (out.length && out[out.length - 1].trim() !== "") out.push("");
        for (const it of items) out.push(`- ${it.text}`);
        out.push("");
        i = next;
        continue;
      }
    }

    if (asNum(line)) {
      const { items, next } = collectRun(lines, i, asNum);
      if (items.length >= 2) {
        if (out.length && out[out.length - 1].trim() !== "") out.push("");
        items.forEach((it, idx) => out.push(`${idx + 1}. ${it.text}`));
        out.push("");
        i = next;
        continue;
      }
    }

    out.push(line);
    i += 1;
  }
  return out.join("\n");
}

function cleanTables(body) {
  // Remove &nbsp; only cells / empty paragraphs inside tables
  return body.replace(/<table[\s\S]*?<\/table>/gi, (table) => {
    let t = table;
    t = t.replace(/&nbsp;/gi, " ");
    t = t.replace(/\u00a0/g, " ");
    t = t.replace(/<p>\s*<\/p>/gi, "");
    t = t.replace(/\s+style="[^"]*"/gi, "");
    t = t.replace(/\s+class="(?!store-info|store-name|store-address|store-tel|store-details)[^"]*"/gi, "");
    // collapse whitespace between tags a bit
    t = t.replace(/>\s+</g, "><");
    t = t.replace(/><(thead|tbody|tr|tr|th|td)/gi, ">\n<$1");
    return t;
  });
}

function cleanBody(body) {
  let s = body;

  // unicode / entity spaces
  s = s.replace(/\u00a0/g, " ");
  s = s.replace(/&nbsp;/gi, " ");
  s = s.replace(/&#160;/gi, " ");

  // lines that are only spaces
  s = s
    .split("\n")
    .map((ln) => ln.replace(/[ \t]+$/g, ""))
    .join("\n");
  s = s.replace(/^\s+$/gm, "");

  // empty headings: ## / ### with nothing
  s = s.replace(/^#{1,6}\s*$/gm, "");

  // empty bullets
  s = s.replace(/^[-*]\s*$/gm, "");

  s = cleanTables(s);
  s = normalizeLists(s);

  // too many blank lines
  s = s.replace(/\n{3,}/g, "\n\n");
  // trim ends
  s = s.replace(/^\n+/, "\n").replace(/\n*$/, "\n");
  return s;
}

const files = walk(contentRoot);
let changed = 0;
const report = { files: 0, changed: 0 };

for (const file of files) {
  report.files += 1;
  const raw = fs.readFileSync(file, "utf8");
  const { fm, body } = splitFrontmatter(raw);
  if (!fm) continue;
  const next = cleanBody(body);
  if (next !== body) {
    fs.writeFileSync(file, fm + next, "utf8");
    changed += 1;
  }
}
report.changed = changed;
console.log(JSON.stringify(report, null, 2));
