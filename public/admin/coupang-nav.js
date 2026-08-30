/**
 * Sidebar: "쿠팡파트너스 API Key" → /admin/coupang (new tab)
 * Creates the link once; final order is owned by cms-sidebar-order.js.
 */
(function () {
  const PAGE = "/admin/coupang";
  const ICON =
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M7 7h10a2 2 0 0 1 2 2v1H5V9a2 2 0 0 1 2-2Zm12 5H5v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5ZM9 15.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/></svg>';
  const EXTERNAL_ICON =
    '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3ZM5 5h6v2H7v10h10v-4h2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/></svg>';

  let started = false;
  let pending = false;

  function getRoot() {
    return document.getElementById("nc-root");
  }

  function getSidebar(root) {
    return root.querySelector("aside") || root.querySelector('[class*="Sidebar"]');
  }

  function copySampleClasses(from, to) {
    if (!from) return;
    from.classList.forEach(function (cls) {
      if (cls.indexOf("cms-") === 0) return;
      to.classList.add(cls);
    });
  }

  function findCollectionList(sidebar) {
    var sample =
      sidebar.querySelector('a[href="#/collections/adsense"]') ||
      sidebar.querySelector('a[href="#/collections/nav"]') ||
      sidebar.querySelector('a[href^="#/collections/"]');
    if (!sample) return null;
    var row = sample.closest("li") || sample.parentElement;
    return row && row.parentElement ? row.parentElement : null;
  }

  function ensureOwnRow(list, link, sampleRow) {
    var row = link.closest("li");
    // Stuck inside another collection's <li> with sibling links — pull out.
    if (row && row.querySelectorAll("a").length > 1) {
      row = null;
    }
    if (row) return row;

    var tag = sampleRow && sampleRow.tagName ? sampleRow.tagName : "LI";
    row = document.createElement(tag);
    row.appendChild(link);
    list.appendChild(row);
    return row;
  }

  function ensureNavLink(root) {
    if (window.__cmsSidebarOrdering) return;

    const sidebar = getSidebar(root);
    if (!sidebar) return;

    const list = findCollectionList(sidebar);
    if (!list) return;

    const sample =
      sidebar.querySelector('a[href="#/collections/adsense"]') ||
      sidebar.querySelector('a[href="#/collections/nav"]') ||
      sidebar.querySelector('a[href^="#/collections/"]');
    if (!sample) return;
    const sampleRow = sample.closest("li") || sample.parentElement;

    let link = sidebar.querySelector("a.cms-coupang-nav");
    if (!link) {
      link = document.createElement("a");
      link.className = "cms-coupang-nav cms-collection-link";
      link.dataset.collection = "coupang";
      copySampleClasses(sample, link);

      const icon = document.createElement("span");
      icon.className = "cms-collection-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = ICON;
      link.appendChild(icon);

      const label = document.createElement("span");
      label.className = "cms-coupang-label";
      label.textContent = "쿠팡파트너스 API Key";
      link.appendChild(label);

      link.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        window.open(PAGE, "_blank", "noopener");
      });

      ensureOwnRow(list, link, sampleRow);
    } else {
      ensureOwnRow(list, link, sampleRow);
    }

    if (!link.querySelector(".cms-coupang-external")) {
      const external = document.createElement("span");
      external.className = "cms-coupang-external";
      external.setAttribute("aria-hidden", "true");
      external.title = "새 창에서 열기";
      external.innerHTML = EXTERNAL_ICON;
      link.appendChild(external);
    }

    link.href = PAGE;
    link.target = "_blank";
    link.rel = "noopener";
    link.title = "쿠팡파트너스 API Key 설정";
  }

  function sync() {
    const root = getRoot();
    if (!root) return;
    ensureNavLink(root);
  }

  function schedule() {
    if (pending || window.__cmsSidebarOrdering) return;
    pending = true;
    window.requestAnimationFrame(function () {
      pending = false;
      sync();
    });
  }

  function start() {
    if (started) return;
    started = true;
    const root = getRoot();
    if (!root) return;
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    window.addEventListener("hashchange", schedule);
    schedule();
  }

  function waitForCms() {
    const root = getRoot();
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
