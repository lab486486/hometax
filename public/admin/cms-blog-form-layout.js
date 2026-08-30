/**
 * Blog entry form layout for Decap CMS.
 * Tags each field ControlContainer via FieldLabel text, then CSS grids:
 *   제목 | 날짜 (6:4) — CSS stretch fills equal height (like description|cover)
 *   디스크립션 | 커버 (6:4) — CSS stretch
 *   태그 | 자주 쓰는 태그 (5:5) — JS equalizes bordered control boxes
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

  function findBorderedControl(field) {
    if (!(field instanceof HTMLElement)) return null;
    var nodes = field.querySelectorAll("div, ul, ol, input, textarea");
    var best = null;
    var bestScore = 0;
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (!(el instanceof HTMLElement)) continue;
      if (el.closest("[data-cms-tag-frequent]")) continue;
      if (el.className && String(el.className).indexOf("ControlHints") !== -1) continue;
      var style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      var bt = parseFloat(style.borderTopWidth) || 0;
      var bl = parseFloat(style.borderLeftWidth) || 0;
      if (bt < 1 && bl < 1) continue;
      var rect = el.getBoundingClientRect();
      if (rect.height < 28 || rect.width < 40) continue;
      // Prefer outer-ish controls: larger area, but not the whole field.
      var score = rect.width * Math.min(rect.height, 240);
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }
    return best;
  }

  function lockEqualHeights(a, b) {
    if (!(a instanceof HTMLElement) || !(b instanceof HTMLElement)) return;
    a.style.height = "";
    a.style.minHeight = "";
    b.style.height = "";
    b.style.minHeight = "";
    var h = Math.max(
      Math.round(a.getBoundingClientRect().height),
      Math.round(b.getBoundingClientRect().height)
    );
    if (h < 28) return;
    a.style.boxSizing = "border-box";
    b.style.boxSizing = "border-box";
    a.style.height = h + "px";
    a.style.minHeight = h + "px";
    b.style.height = h + "px";
    b.style.minHeight = h + "px";
  }

  function syncTagPairHeights(root) {
    var tagsField = root.querySelector('[data-cms-field="tags"]');
    var freqField = root.querySelector('[data-cms-field="tags_frequent"]');
    if (!tagsField || !freqField) return;
    var tagsControl = findBorderedControl(tagsField);
    var freqBox = freqField.querySelector(".cms-tag-suggestions-box");
    lockEqualHeights(tagsControl, freqBox);
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
      syncTagPairHeights(root);
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
