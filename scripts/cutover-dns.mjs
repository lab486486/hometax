#!/usr/bin/env node
/**
 * Point blogincome.kr (Cloudflare DNS) at the Pages project.
 * Uses the local Wrangler OAuth token.
 *
 * Usage: node scripts/cutover-dns.mjs
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const cfg = path.join(os.homedir(), "Library/Preferences/.wrangler/config/default.toml");
const token = fs.readFileSync(cfg, "utf8").match(/oauth_token\s*=\s*"([^"]+)"/)?.[1];
if (!token) {
  console.error("Wrangler OAuth token not found. Run: wrangler login");
  process.exit(1);
}

const accountId = "66b716eb6832b9626c866772cf2f3e11";
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

const zones = await (
  await fetch("https://api.cloudflare.com/client/v4/zones?name=blogincome.kr", { headers })
).json();
const zoneId = zones.result?.[0]?.id;
if (!zoneId) {
  console.error("Zone blogincome.kr not found in this Cloudflare account");
  process.exit(1);
}

const dns = await (
  await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?per_page=100`, {
    headers,
  })
).json();
const records = dns.result || [];

console.log(
  "Current DNS:",
  records.map((r) => `${r.type} ${r.name} -> ${r.content}`).join("\n"),
);

const apexConflicts = records.filter(
  (r) =>
    r.name === "blogincome.kr" &&
    (r.type === "A" ||
      r.type === "AAAA" ||
      (r.type === "CNAME" && !String(r.content).includes("pages.dev"))),
);

for (const r of apexConflicts) {
  console.log(`Deleting ${r.type} ${r.name} -> ${r.content}`);
  const del = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${r.id}`,
    { method: "DELETE", headers },
  );
  console.log(await del.json());
}

const hasPagesCname = records.some(
  (r) =>
    r.name === "blogincome.kr" &&
    r.type === "CNAME" &&
    String(r.content).includes("pages.dev"),
);

if (!hasPagesCname) {
  const create = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      type: "CNAME",
      name: "blogincome.kr",
      content: "blogincome.pages.dev",
      proxied: true,
      ttl: 1,
    }),
  });
  console.log("Create apex CNAME:", JSON.stringify(await create.json(), null, 2));
}

const hasWww = records.some((r) => r.name === "www.blogincome.kr");
if (!hasWww) {
  const createWww = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      type: "CNAME",
      name: "www",
      content: "blogincome.pages.dev",
      proxied: true,
      ttl: 1,
    }),
  });
  console.log("Create www CNAME:", JSON.stringify(await createWww.json(), null, 2));
}

const domains = await (
  await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/blogincome/domains`,
    { headers },
  )
).json();
console.log("Pages domains:", JSON.stringify(domains.result, null, 2));
console.log("Done. Wait 30–60s then check https://blogincome.kr/");
