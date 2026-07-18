/**
 * Legacy /x-links → standalone shortlinks admin page
 */

export async function onRequest() {
  return Response.redirect("https://blogincome.kr/admin/shortlinks", 302);
}
