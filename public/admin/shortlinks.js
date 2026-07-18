/**
 * Sidebar: "단축링크 생성" → open standalone manager in a new tab
 * (placed above AdSense)
 */
(function () {
  const PAGE = "/admin/shortlinks";
  const ICON =
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M9.5 7a4.5 4.5 0 0 1 6.36 0l1.14 1.14a1 1 0 0 0 1.42-1.42l-1.14-1.14a6.5 6.5 0 0 0-9.2 0l-1.14 1.14a1 1 0 1 0 1.42 1.42L9.5 7Zm5 10a4.5 4.5 0 0 1-6.36 0l-1.14-1.14a1 1 0 1 0-1.42 1.42l1.14 1.14a6.5 6.5 0 0 0 9.2 0l1.14-1.14a1 1 0 0 0-1.42-1.42L14.5 17Zm-6.07-2.36a1 1 0 0 0 1.42 0l4.5-4.5a1 1 0 1 0-1.42-1.42l-4.5 4.5a1 1 0 0 0 0 1.42Z"/></svg>';
  // Square with arrow going out = open in new window
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

  function ensureNavLink(root) {
    const sidebar = getSidebar(root);
    if (!sidebar) return;

    // Drop the old Decap collection entry if config still has it briefly.
    const decapLink = sidebar.querySelector('a[href="#/collections/shortlinks"]');
    if (decapLink) decapLink.style.display = "none";

    let link = sidebar.querySelector("a.cms-shortlinks-nav");
    const adsense =
      sidebar.querySelector('a[href="#/collections/adsense"]') ||
      sidebar.querySelector('a[href*="#/collections/adsense"]');
    const sample =
      adsense ||
      sidebar.querySelector('a[href="#/collections/nav"]') ||
      sidebar.querySelector('a[href^="#/collections/"]');
    if (!sample || !sample.parentElement) return;

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

    // Keep it directly above AdSense.
    if (adsense && adsense.parentElement === sample.parentElement) {
      if (link.nextElementSibling !== adsense) {
        adsense.parentElement.insertBefore(link, adsense);
      }
    } else if (!link.isConnected) {
      sample.parentElement.insertBefore(link, sample);
    }
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
    if (pending) return;
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
