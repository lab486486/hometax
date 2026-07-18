(function () {
  const ROOT_HASHES = new Set(["", "#", "#/"]);
  const DEFAULT_COLLECTION = "#/collections/site";

  let started = false;

  function redirectAdminRoot() {
    const hash = location.hash || "";
    if (!ROOT_HASHES.has(hash)) return;
    if (hash === DEFAULT_COLLECTION) return;
    location.hash = DEFAULT_COLLECTION;
  }

  function start() {
    if (started) return;
    started = true;
    window.addEventListener("hashchange", redirectAdminRoot);
    redirectAdminRoot();
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
