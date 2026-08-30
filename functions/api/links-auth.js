/**
 * Legacy password gate removed — shortlinks live under /admin/shortlinks
 */

export async function onRequest() {
  return Response.redirect("https://hometax.me/admin/shortlinks", 302);
}
