/**
 * Sidebar: "단축링크 생성" → open standalone manager in a new tab.
 * Creates the link once; final order is owned by cms-sidebar-order.js.
 */
(function () {
  const PAGE = "/admin/shortlinks";
  const ICON =
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M9.5 7a4.5 4.5 0 0 1 6.36 0l1.14 1.14a1 1 0 0 0 1.42-1.42l-1.14-1.14a6.5 6.5 0 0 0-9.2 0l-1.14 1.14a1 1 0 1 0 1.42 1.42L9.5 7Zm5 10a4.5 4.5 0 0 1-6.36 0l-1.14-1.14a1 1 0 1 0-1.42 1.42l1.14 1.14a6.5 6.5 0 0 0 9.2 0l1.14-1.14a1 1 0 0 0-1.42-1.42L14.5 17Zm-6.07-2.36a1 1 0 0 0 1.42 0l4.5-4.5a1 1 0 1 0-1.42-1.42l-4.5 4.5a1 1 0 0 0 0 1.42Z"/></svg>';
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

    const decapLink = sidebar.querySelector('a[href="#/collections/shortlinks"]');
    if (decapLink) {
      const decapRow = decapLink.closest("li");
      if (decapRow) decapRow.style.display = "none";
      else decapLink.style.display = "none";
    }

    const list = findCollectionList(sidebar);
    if (!list) return;

    const sample =
      sidebar.querySelector('a[href="#/collections/adsense"]') ||
      sidebar.querySelector('a[href="#/collections/nav"]') ||
      sidebar.querySelector('a[href^="#/collections/"]');
    if (!sample) return;
    const sampleRow = sample.closest("li") || sample.parentElement;

    let link = sidebar.querySelector("a.cms-shortlinks-nav");
    if (!link) {
      link = document.createElement("a");
      link.className = "cms-shortlinks-nav cms-collection-link";
      link.dataset.collection = "shortlinks";
      copySampleClasses(sample, link);

      const icon = document.createElement("span");
      icon.className = "cms-collection-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = ICON;
      link.appendChild(icon);

      const label = document.createElement("span");
      label.className = "cms-shortlinks-label";
      label.textContent = "단축링크 생성";
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

    if (!link.querySelector(".cms-shortlinks-external")) {
      const external = document.createElement("span");
      external.className = "cms-shortlinks-external";
      external.setAttribute("aria-hidden", "true");
      external.title = "새 창에서 열기";
      external.innerHTML = EXTERNAL_ICON;
      link.appendChild(external);
    }

    link.href = PAGE;
    link.target = "_blank";
    link.rel = "noopener";
    link.title = "새 창에서 단축링크 관리";
  }

  function redirectLegacyHash() {
    const hash = location.hash || "";
    if (
      hash === "#/shortlinks" ||
      hash.indexOf("#/shortlinks?") === 0 ||
      hash === "#/collections/shortlinks" ||
      hash === "#/collections/shortlinks/" ||
      hash.indexOf("#/collections/shortlinks/") === 0
    ) {
      location.hash = "#/collections/site";
      window.open(PAGE, "_blank", "noopener");
    }
  }

  function sync() {
    const root = getRoot();
    if (!root) return;
    redirectLegacyHash();
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
