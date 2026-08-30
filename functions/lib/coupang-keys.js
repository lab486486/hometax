import { hasAdminAccess } from "./links.js";

const COUPANG_KEYS_PATH = "config/coupang.json";

export { hasAdminAccess };

export async function loadCoupangKeys(env) {
  const fromEnv = {
    accessKey: String(env.COUPANG_ACCESS_KEY || "").trim(),
    secretKey: String(env.COUPANG_SECRET_KEY || "").trim(),
  };

  if (!env.MEDIA_BUCKET) {
    return {
      accessKey: fromEnv.accessKey,
      secretKey: fromEnv.secretKey,
      source: fromEnv.accessKey && fromEnv.secretKey ? "env" : "none",
      updatedAt: "",
    };
  }

  try {
    const obj = await env.MEDIA_BUCKET.get(COUPANG_KEYS_PATH);
    if (obj) {
      const data = await obj.json();
      const accessKey = String(data?.accessKey || data?.COUPANG_ACCESS_KEY || "").trim();
      const secretKey = String(data?.secretKey || data?.COUPANG_SECRET_KEY || "").trim();
      if (accessKey && secretKey) {
        return {
          accessKey,
          secretKey,
          source: "r2",
          updatedAt: String(data?.updatedAt || ""),
        };
      }
    }
  } catch {
    /* fall through */
  }

  return {
    accessKey: fromEnv.accessKey,
    secretKey: fromEnv.secretKey,
    source: fromEnv.accessKey && fromEnv.secretKey ? "env" : "none",
    updatedAt: "",
  };
}

export async function saveCoupangKeys(env, accessKey, secretKey) {
  if (!env.MEDIA_BUCKET) {
    throw new Error("MEDIA_BUCKET binding missing");
  }
  const payload = {
    accessKey: String(accessKey || "").trim(),
    secretKey: String(secretKey || "").trim(),
    updatedAt: new Date().toISOString(),
  };
  await env.MEDIA_BUCKET.put(COUPANG_KEYS_PATH, JSON.stringify(payload, null, 2), {
    httpMetadata: {
      contentType: "application/json; charset=utf-8",
      cacheControl: "no-store",
    },
  });
  return payload;
}
