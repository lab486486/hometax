/**
 * Frequent tags as a separate CMS-style section beside the tags field (5:5).
 * Data: /admin/tag-stats.json (generated on build).
 */
(function () {
  const WRAP_ATTR = "data-cms-tag-suggestions";
  const FREQ_ATTR = "data-cms-tag-frequent";
  const MAX = 5;
  let cachedTags = null;
  let loading = false;

  function loadTags() {
    if (cachedTags) return Promise.resolve(cachedTags);
    if (loading) {
      return new Promise(function (resolve) {
        var n = 0;
        var id = setInterval(function () {
          n += 1;
          if (cachedTags || n > 40) {
            clearInterval(id);
            resolve(cachedTags || []);
          }
        }, 50);
      });
    }
    loading = true;
    return fetch("/admin/tag-stats.json?v=" + Date.now(), { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("tag-stats missing");
        return res.json();
      })
      .then(function (data) {
        var list = Array.isArray(data) ? data : data && data.tags ? data.tags : [];
        cachedTags = list
          .map(function (item) {
            if (typeof item === "string") return { name: item, count: 0 };
            return { name: String(item.name || "").trim(), count: Number(item.count) || 0 };
          })
          .filter(function (item) {
            return item.name;
          })
          .sort(function (a, b) {
            return b.count - a.count || a.name.localeCompare(b.name, "ko");
          })
          .slice(0, MAX);
        return cachedTags;
      })
      .catch(function () {
        cachedTags = [];
        return cachedTags;
      })
      .finally(function () {
        loading = false;
      });
  }

  function currentTags(field) {
    var values = [];
    field.querySelectorAll("input, textarea").forEach(function (input) {
      var v = String(input.value || "").trim();
      if (v) values.push(v);
    });
    return values;
  }

  function findAddButton(field) {
    var buttons = field.querySelectorAll("button");
    for (var i = 0; i < buttons.length; i++) {
      var t = (buttons[i].textContent || "").replace(/\s+/g, " ").trim();
      if (buttons[i].classList.contains("cms-tag-chip")) continue;
      if (/추가|Add/i.test(t) && !/삭제|Delete|Remove/i.test(t)) return buttons[i];
    }
    return null;
  }

  function addTag(field, tag) {
    var existing = currentTags(field);
    if (existing.indexOf(tag) !== -1) return;

    var addBtn = findAddButton(field);
    if (addBtn) addBtn.click();

    window.setTimeout(function () {
      var inputs = field.querySelectorAll("input[type='text'], input:not([type]), textarea");
      var target = null;
      for (var i = inputs.length - 1; i >= 0; i--) {
        if (!String(inputs[i].value || "").trim()) {
          target = inputs[i];
          break;
        }
      }
      if (!target && inputs.length) target = inputs[inputs.length - 1];
      if (!target) return;

      var setter =
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value") ||
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
      if (setter && setter.set) setter.set.call(target, tag);
      else target.value = tag;

      target.dispatchEvent(new Event("input", { bubbles: true }));
      target.dispatchEvent(new Event("change", { bubbles: true }));
    }, 40);
  }

  function copySampleClasses(from, to) {
    if (!from) return;
    from.classList.forEach(function (cls) {
      if (cls.indexOf("cms-") === 0) return;
      to.classList.add(cls);
    });
  }

  function ensureFrequentSection(tagsField) {
    var pane = tagsField.parentElement;
    if (!pane) return null;

    // Remove old in-field suggestion UI from previous version.
    tagsField.querySelectorAll("[" + WRAP_ATTR + "], [data-cms-tag-row]").forEach(function (node) {
      node.remove();
    });

    var section = pane.querySelector("[" + FREQ_ATTR + "]");
    if (!section) {
      section = document.createElement("div");
      section.setAttribute(FREQ_ATTR, "1");
      section.dataset.cmsField = "tags_frequent";
      copySampleClasses(tagsField, section);

      var sampleLabel = tagsField.querySelector('[class*="FieldLabel"]');
      var label = document.createElement(sampleLabel ? sampleLabel.tagName : "div");
      copySampleClasses(sampleLabel, label);
      if (!label.className) label.className = "cms-tag-frequent-label";
      label.textContent = "자주 쓰는 태그";
      section.appendChild(label);

      var body = document.createElement("div");
      body.className = "cms-tag-suggestions";
      body.setAttribute(WRAP_ATTR, "1");
      section.appendChild(body);

      if (tagsField.nextSibling) {
        pane.insertBefore(section, tagsField.nextSibling);
      } else {
        pane.appendChild(section);
      }
    } else {
      section.dataset.cmsField = "tags_frequent";
      if (section.nextElementSibling !== tagsField && tagsField.nextElementSibling !== section) {
        pane.insertBefore(section, tagsField.nextSibling);
      }
    }

    return section;
  }

  function paintSuggestions(section, tagsField, tags) {
    var wrap = section.querySelector("[" + WRAP_ATTR + "]");
    if (!wrap) return;

    var selected = currentTags(tagsField);
    wrap.innerHTML = "";

    if (!tags.length) {
      var empty = document.createElement("p");
      empty.className = "cms-tag-suggestions-empty";
      empty.textContent = "아직 표시할 태그가 없습니다.";
      wrap.appendChild(empty);
      return;
    }

    var chips = document.createElement("div");
    chips.className = "cms-tag-suggestions-chips";
    wrap.appendChild(chips);

    tags.forEach(function (item) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cms-tag-chip";
      btn.textContent = item.name;
      btn.title = item.count ? item.name + " (" + item.count + ")" : item.name;
      if (selected.indexOf(item.name) !== -1) {
        btn.classList.add("is-selected");
        btn.disabled = true;
      }
      btn.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        addTag(tagsField, item.name);
      });
      chips.appendChild(btn);
    });
  }

  function scan() {
    var root = document.getElementById("nc-root") || document.body;
    var field = root.querySelector('[data-cms-field="tags"]');
    if (!field) return;
    loadTags().then(function (tags) {
      var section = ensureFrequentSection(field);
      if (!section) return;
      paintSuggestions(section, field, tags);
    });
  }

  function start() {
    scan();
    var root = document.getElementById("nc-root") || document.body;
    var scheduled = false;
    var observer = new MutationObserver(function () {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(function () {
        scheduled = false;
        scan();
      });
    });
    observer.observe(root, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
