/** Strip chars illegal in XML 1.0 text nodes (causes Naver/GSC parse 500s). */
export function sanitizeXmlText(value: string): string {
  return value.replace(
    // eslint-disable-next-line no-control-regex
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u0084\u0086-\u009F\uFDD0-\uFDEF\uFFFE\uFFFF]/g,
    "",
  );
}

export function escapeXml(value: string): string {
  return sanitizeXmlText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Percent-encode non-ASCII path segments for crawler-safe URLs. */
export function xmlUrl(value: string): string {
  try {
    return encodeURI(sanitizeXmlText(value));
  } catch {
    return escapeXml(value);
  }
}
