/**
 * Legacy password gate removed — shortlinks live under /admin/shortlinks
 */

export async function onRequest() {
  return Response.redirect("https://blogincome.kr/admin/shortlinks", 302);
}
