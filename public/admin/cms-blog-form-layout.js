/**
 * Blog entry form layout for Decap CMS.
 * Tags each field ControlContainer via FieldLabel text, then CSS grids:
 *   제목 | 날짜 (6:4, equal control height)
 *   디스크립션 | 커버 (6:4, equal control height)
 *   태그 | 자주 쓰는 태그 (5:5, equal control height)
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

  function clearInlineHeights(root) {
    root.querySelectorAll("[data-cms-pair-box]").forEach(function (el) {
      el.style.height = "";
      el.style.minHeight = "";
      el.removeAttribute("data-cms-pair-box");
    });
  }

  function clearLayout(root) {
    clearInlineHeights(root);
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

  function borderedBox(field, selectors) {
    if (!(field instanceof HTMLElement)) return null;
    for (var i = 0; i < selectors.length; i++) {
      var el = field.querySelector(selectors[i]);
      if (el instanceof HTMLElement) return el;
    }
    var nodes = field.querySelectorAll("div, textarea, input");
    for (var j = 0; j < nodes.length; j++) {
      var cand = nodes[j];
      if (!(cand instanceof HTMLElement)) continue;
      if (cand.closest("[data-cms-tag-frequent]")) continue;
      var style = window.getComputedStyle(cand);
      if (style.display === "none") continue;
      if (style.borderTopWidth === "0px" && style.borderLeftWidth === "0px") continue;
      var h = cand.getBoundingClientRect().height;
      if (h >= 28) return cand;
    }
    return null;
  }

  function titleBox(field) {
    return borderedBox(field, ["input"]);
  }

  function dateBox(field) {
    return borderedBox(field, ["[class*='DateTimeControl']", "[class*='DateTime']"]);
  }

  function descriptionBox(field) {
    return borderedBox(field, ["textarea"]);
  }

  function coverBox(field) {
    return borderedBox(field, [
      "[class*='ImageControl']",
      "[class*='ImageField']",
      "[class*='image-card']",
    ]);
  }

  function tagsBox(field) {
    return borderedBox(field, ["[class*='ListControl']", "[class*='list-control']"]);
  }

  function frequentBox(field) {
    if (!(field instanceof HTMLElement)) return null;
    return field.querySelector(".cms-tag-suggestions-box");
  }

  function lockHeight(el, h) {
    if (!(el instanceof HTMLElement) || !h) return;
    el.dataset.cmsPairBox = "1";
    el.style.boxSizing = "border-box";
    el.style.height = h + "px";
    el.style.minHeight = h + "px";
  }

  function matchPairBoxes(a, b) {
    if (!(a instanceof HTMLElement) || !(b instanceof HTMLElement)) return;
    a.style.height = "";
    a.style.minHeight = "";
    b.style.height = "";
    b.style.minHeight = "";
    a.removeAttribute("data-cms-pair-box");
    b.removeAttribute("data-cms-pair-box");

    var ha = Math.round(a.getBoundingClientRect().height);
    var hb = Math.round(b.getBoundingClientRect().height);
    var h = Math.max(ha, hb);
    if (h < 28) return;
    lockHeight(a, h);
    lockHeight(b, h);
  }

  function syncPairHeights(root) {
    matchPairBoxes(
      titleBox(root.querySelector('[data-cms-field="title"]')),
      dateBox(root.querySelector('[data-cms-field="date"]'))
    );
    matchPairBoxes(
      descriptionBox(root.querySelector('[data-cms-field="description"]')),
      coverBox(root.querySelector('[data-cms-field="cover_image"]'))
    );
    matchPairBoxes(
      tagsBox(root.querySelector('[data-cms-field="tags"]')),
      frequentBox(root.querySelector('[data-cms-field="tags_frequent"]'))
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
    window.addEventListener("resize", scheduleSync);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
