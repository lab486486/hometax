/**
 * Legacy /x-links → standalone shortlinks admin page
 */

export async function onRequest() {
  return Response.redirect("https://hometax.me/admin/shortlinks", 302);
}
