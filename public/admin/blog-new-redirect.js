(function () {
  const NEW_POST_HASH = "#/collections/blog_new/new";
  const LIST_HASHES = new Set(["#/collections/blog_new", "#/collections/blog_new/"]);
  const ALLOW_LIST_KEY = "blog-new-allow-list";

  let started = false;
  let lastHash = location.hash || "";

  function openNewPostEditor() {
    const hash = location.hash || "";

    if (sessionStorage.getItem(ALLOW_LIST_KEY) === "1") {
      sessionStorage.removeItem(ALLOW_LIST_KEY);
      return;
    }

    if (!LIST_HASHES.has(hash)) return;
    location.hash = NEW_POST_HASH;
  }

  function onHashChange() {
    const hash = location.hash || "";
    const prev = lastHash;
    lastHash = hash;

    if (prev === NEW_POST_HASH && LIST_HASHES.has(hash)) {
      sessionStorage.setItem(ALLOW_LIST_KEY, "1");
      return;
    }

    openNewPostEditor();
  }

  function start() {
    if (started) return;
    started = true;
    window.addEventListener("hashchange", onHashChange);
    openNewPostEditor();
  }

  function waitForCms() {
    const root = document.getElementById("nc-root");
    if (root && root.firstElementChild) {
      start();
      return;
    }
    window.requestAnimationFrame(waitForCms);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", waitForCms);
  } else {
    waitForCms();
  }
})();
