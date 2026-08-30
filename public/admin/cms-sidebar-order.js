/**
 * Reorder Decap CMS sidebar into three groups with dividers:
 * 1) Site settings  2) Monetization  3) Content collections
 *
 * Only mutates DOM when order actually differs (avoids loops with
 * coupang-nav / shortlinks MutationObservers).
 */
(function () {
  var GROUPS = [
    {
      id: "site",
      items: [
        { type: "collection", name: "site" },
        { type: "collection", name: "nav" },
      ],
    },
    {
      id: "monetize",
      items: [
        { type: "selector", sel: "a.cms-coupang-nav" },
        { type: "selector", sel: "a.cms-shortlinks-nav" },
        { type: "collection", name: "adsense" },
      ],
    },
    {
      id: "content",
      items: [
        { type: "collection", name: "blog" },
        { type: "collection", name: "gunmart" },
      ],
    },
  ];

  var started = false;
  var pending = false;
  var applying = false;
  var lastSignature = "";

  function getRoot() {
    return document.getElementById("nc-root") || document.body;
  }

  function getSidebar(root) {
    return root.querySelector("aside") || root.querySelector('[class*="Sidebar"]');
  }

  function findCollectionLink(sidebar, name) {
    var byData = sidebar.querySelector(
      'a.cms-collection-link[data-collection="' + name + '"]'
    );
    if (byData && !byData.classList.contains("cms-coupang-nav") && !byData.classList.contains("cms-shortlinks-nav")) {
      return byData;
    }
    var links = sidebar.querySelectorAll('a[href^="#/collections/"]');
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute("href") || "";
      var m = href.match(/^#\/collections\/([^/?#]+)\/?$/);
      if (m && m[1] === name) return links[i];
    }
    return null;
  }

  function findLink(sidebar, item) {
    if (item.type === "selector") return sidebar.querySelector(item.sel);
    return findCollectionLink(sidebar, item.name);
  }

  function rowOf(link) {
    if (!link) return null;
    var row = link.closest("li");
    if (row) return row;
    return link.parentElement;
  }

  function findList(sidebar) {
    var sample =
      findCollectionLink(sidebar, "site") ||
      findCollectionLink(sidebar, "blog") ||
      sidebar.querySelector('a[href^="#/collections/"]');
    if (!sample) return null;
    var row = rowOf(sample);
    return row && row.parentElement ? row.parentElement : null;
  }

  function ensureDivider(list, id) {
    var existing = list.querySelector('[data-cms-sidebar-divider="' + id + '"]');
    if (existing) return existing;

    var tag = list.firstElementChild ? list.firstElementChild.tagName : "LI";
    var row = document.createElement(tag);
    row.setAttribute("data-cms-sidebar-divider", id);
    row.className = "cms-sidebar-divider-row";
    row.setAttribute("aria-hidden", "true");

    var line = document.createElement("div");
    line.className = "cms-sidebar-divider";
    row.appendChild(line);
    return row;
  }

  function signatureOf(rows) {
    return rows
      .map(function (row) {
        if (row.getAttribute && row.getAttribute("data-cms-sidebar-divider")) {
          return "div:" + row.getAttribute("data-cms-sidebar-divider");
        }
        var a = row.querySelector && row.querySelector("a");
        if (!a) return "row";
        if (a.classList.contains("cms-coupang-nav")) return "coupang";
        if (a.classList.contains("cms-shortlinks-nav")) return "shortlinks";
        var href = a.getAttribute("href") || "";
        var m = href.match(/^#\/collections\/([^/?#]+)\/?$/);
        return m ? "col:" + m[1] : "a:" + href;
      })
      .join("|");
  }

  function applyOrder() {
    if (applying) return;
    var root = getRoot();
    var sidebar = getSidebar(root);
    if (!sidebar) return;

    var list = findList(sidebar);
    if (!list) return;

    var orderedRows = [];
    var seen = new Set();

    GROUPS.forEach(function (group, groupIndex) {
      if (groupIndex > 0) {
        var divider = ensureDivider(list, "after-" + GROUPS[groupIndex - 1].id);
        orderedRows.push(divider);
        seen.add(divider);
      }

      group.items.forEach(function (item) {
        var link = findLink(sidebar, item);
        var row = rowOf(link);
        if (!row || !list.contains(row)) return;
        if (seen.has(row)) return;
        orderedRows.push(row);
        seen.add(row);
      });
    });

    if (orderedRows.length < 2) return;

    var nextSignature = signatureOf(orderedRows);
    var currentPrefix = [];
    for (var i = 0; i < orderedRows.length; i++) {
      currentPrefix.push(list.children[i] || null);
    }
    var currentSignature = signatureOf(
      currentPrefix.filter(Boolean).length === orderedRows.length
        ? currentPrefix
        : []
    );

    // Already in the desired order — do not touch DOM.
    if (nextSignature && nextSignature === currentSignature) {
      lastSignature = nextSignature;
      // Still drop leftover dividers not in plan.
      list.querySelectorAll("[data-cms-sidebar-divider]").forEach(function (row) {
        if (!seen.has(row)) row.remove();
      });
      return;
    }

    if (nextSignature === lastSignature) {
      // Same desired order we already applied; avoid re-append churn.
      var mismatch = false;
      for (var j = 0; j < orderedRows.length; j++) {
        if (list.children[j] !== orderedRows[j]) {
          mismatch = true;
          break;
        }
      }
      if (!mismatch) return;
    }

    applying = true;
    window.__cmsSidebarOrdering = true;
    try {
      orderedRows.forEach(function (row) {
        list.appendChild(row);
      });
      list.querySelectorAll("[data-cms-sidebar-divider]").forEach(function (row) {
        if (!seen.has(row)) row.remove();
      });
      lastSignature = nextSignature;
    } finally {
      applying = false;
      window.setTimeout(function () {
        window.__cmsSidebarOrdering = false;
      }, 0);
    }
  }

  function schedule() {
    if (pending || applying) return;
    pending = true;
    window.requestAnimationFrame(function () {
      pending = false;
      applyOrder();
    });
  }

  function start() {
    if (started) return;
    started = true;
    var root = getRoot();
    var observer = new MutationObserver(function () {
      if (applying || window.__cmsSidebarOrdering) return;
      schedule();
    });
    observer.observe(root, { childList: true, subtree: true });
    window.addEventListener("hashchange", schedule);
    // Run after nav injectors have a chance to create links.
    window.setTimeout(schedule, 0);
    window.setTimeout(schedule, 200);
  }

  function waitForCms() {
    var root = getRoot();
    if (root && root.querySelector("aside, [class*='Sidebar']")) {
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
