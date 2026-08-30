/**
 * Blog entry form layout for Decap CMS.
 * Tags each field ControlContainer via FieldLabel text, then CSS grids:
 *   제목 | 날짜 (6:4)
 *   디스크립션 | 커버 (6:4, same height)
 *   태그 | 자주 쓰는 태그 (5:5)
 *   퍼머링크 / 본문 full width
 */
(function () {
  var FIELD_RULES = [
    { re: /^제목/, name: "title" },
    { re: /^날짜/, name: "date" },
    { re: /^퍼머링크/, name: "slug" },
    { re: /^커버/, name: "cover_image" },
    { re: /^자주\s*쓰는\s*태그/, name: "tags_frequent" },
    { re: /^태그|^카테고리/, name: "tags" },
    { re: /^디스크립션|^설명/, name: "description" },
    { re: /^본문/, name: "body" },
  ];

  function matchFieldName(text) {
    var cleaned = String(text || "")
      .replace(/\s+/g, " ")
      .trim();
    for (var i = 0; i < FIELD_RULES.length; i++) {
      if (FIELD_RULES[i].re.test(cleaned)) return FIELD_RULES[i].name;
    }
    return "";
  }

  function closestControlContainer(el) {
    if (!(el instanceof Element)) return null;
    return el.closest('[class*="ControlContainer"]') || el.closest("[data-cms-tag-frequent]");
  }

  function clearLayout(root) {
    root.querySelectorAll(".cms-blog-form-layout").forEach(function (pane) {
      pane.classList.remove("cms-blog-form-layout");
    });
    root.querySelectorAll("[data-cms-field]").forEach(function (node) {
      if (node.getAttribute("data-cms-tag-frequent") === "1") {
        node.dataset.cmsField = "tags_frequent";
        return;
      }
      delete node.dataset.cmsField;
    });
  }

  function controlSurface(field) {
    if (!(field instanceof HTMLElement)) return null;
    var input = field.querySelector("textarea, input, [class*='ImageControl'], [class*='DateTimeControl']");
    if (input) {
      var box = input.closest("div");
      if (box && box !== field) return box;
    }
    var kids = field.children;
    for (var i = kids.length - 1; i >= 0; i--) {
      var el = kids[i];
      if (!(el instanceof HTMLElement)) continue;
      if (el.className && String(el.className).indexOf("FieldLabel") !== -1) continue;
      if (el.className && String(el.className).indexOf("ControlHints") !== -1) continue;
      return el;
    }
    return null;
  }

  function matchPairHeights(a, b) {
    if (!(a instanceof HTMLElement) || !(b instanceof HTMLElement)) return;
    var sa = controlSurface(a);
    var sb = controlSurface(b);
    if (!sa || !sb) return;
    sa.style.minHeight = "";
    sb.style.minHeight = "";
    var ha = Math.round(sa.getBoundingClientRect().height);
    var hb = Math.round(sb.getBoundingClientRect().height);
    var h = Math.max(ha, hb);
    if (h < 32) return;
    sa.style.minHeight = h + "px";
    sb.style.minHeight = h + "px";
    a.style.minHeight = "";
    b.style.minHeight = "";
    var fa = Math.round(a.getBoundingClientRect().height);
    var fb = Math.round(b.getBoundingClientRect().height);
    var fh = Math.max(fa, fb);
    if (fh > 0) {
      a.style.minHeight = fh + "px";
      b.style.minHeight = fh + "px";
    }
  }

  function syncPairHeights(root) {
    matchPairHeights(
      root.querySelector('[data-cms-field="title"]'),
      root.querySelector('[data-cms-field="date"]')
    );
    matchPairHeights(
      root.querySelector('[data-cms-field="description"]'),
      root.querySelector('[data-cms-field="cover_image"]')
    );
  }

  function sync() {
    var root = document.getElementById("nc-root") || document.body;
    clearLayout(root);

    var labels = root.querySelectorAll('[class*="FieldLabel"]');
    if (!labels.length) return;

    var tagged = [];
    labels.forEach(function (label) {
      var name = matchFieldName(label.textContent || "");
      if (!name) return;
      var container = closestControlContainer(label);
      if (!(container instanceof HTMLElement)) return;
      container.dataset.cmsField = name;
      tagged.push(container);
    });

    if (tagged.length < 4) return;

    // Prefer the shared parent of title + date (true row siblings).
    var title = root.querySelector('[data-cms-field="title"]');
    var date = root.querySelector('[data-cms-field="date"]');
    var description = root.querySelector('[data-cms-field="description"]');
    var cover = root.querySelector('[data-cms-field="cover_image"]');

    var pane = null;
    if (
      title &&
      date &&
      title.parentElement &&
      title.parentElement === date.parentElement
    ) {
      pane = title.parentElement;
    } else if (
      description &&
      cover &&
      description.parentElement &&
      description.parentElement === cover.parentElement
    ) {
      pane = description.parentElement;
    } else if (tagged[0] && tagged[0].parentElement) {
      pane = tagged[0].parentElement;
    }

    if (!(pane instanceof HTMLElement)) return;

    // Ensure the main meta fields are direct children of the grid pane.
    var childNames = {};
    Array.prototype.forEach.call(pane.children, function (child) {
      if (child instanceof HTMLElement && child.dataset.cmsField) {
        childNames[child.dataset.cmsField] = true;
      }
    });

    if (!childNames.title || !childNames.date) return;

    pane.classList.add("cms-blog-form-layout");
    window.requestAnimationFrame(function () {
      syncPairHeights(root);
    });
  }

  var scheduled = false;
  function scheduleSync() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(function () {
      scheduled = false;
      sync();
    });
  }

  function start() {
    scheduleSync();
    var root = document.getElementById("nc-root") || document.body;
    var observer = new MutationObserver(scheduleSync);
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    window.addEventListener("hashchange", scheduleSync);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
