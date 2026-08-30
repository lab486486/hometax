/**
 * Legacy collection hashes → consolidated list+create collections.
 * blog_new / gunmart_new were removed; keep old bookmarks working.
 */
(function () {
  const REDIRECTS = {
    "#/collections/blog_new": "#/collections/blog",
    "#/collections/blog_new/": "#/collections/blog",
    "#/collections/blog_new/new": "#/collections/blog/new",
    "#/collections/gunmart_new": "#/collections/gunmart",
    "#/collections/gunmart_new/": "#/collections/gunmart",
    "#/collections/gunmart_new/new": "#/collections/gunmart/new",
  };

  function redirectLegacy() {
    const hash = location.hash || "";
    if (REDIRECTS[hash]) {
      location.hash = REDIRECTS[hash];
      return;
    }
    // Entry deep links: #/collections/blog_new/entries/slug → blog
    const blogEntry = hash.match(/^#\/collections\/blog_new\/(entries\/.+)$/);
    if (blogEntry) {
      location.hash = "#/collections/blog/" + blogEntry[1];
      return;
    }
    const gunEntry = hash.match(/^#\/collections\/gunmart_new\/(entries\/.+)$/);
    if (gunEntry) {
      location.hash = "#/collections/gunmart/" + gunEntry[1];
    }
  }

  function start() {
    window.addEventListener("hashchange", redirectLegacy);
    redirectLegacy();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
