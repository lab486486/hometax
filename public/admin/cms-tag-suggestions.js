/**
 * Frequent tags as a separate CMS-style section beside the tags field (5:5).
 * Clicking a chip adds it into the Decap tags list.
 * Data: /admin/tag-stats.json (generated on build).
 */
(function () {
  const WRAP_ATTR = "data-cms-tag-suggestions";
  const FREQ_ATTR = "data-cms-tag-frequent";
  const MAX = 5;
  let cachedTags = null;
  let loading = false;
  let adding = false;
  let observer = null;
  let paintToken = 0;

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

  function setReactInputValue(input, value) {
    var proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    var descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    if (descriptor && descriptor.set) descriptor.set.call(input, value);
    else input.value = value;

    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    try {
      input.dispatchEvent(new InputEvent("input", { bubbles: true, data: value, inputType: "insertText" }));
    } catch {
      /* older browsers */
    }
  }

  function findAddButton(field) {
    var byClass = field.querySelector('[class*="AddButton"]');
    if (byClass) return byClass;

    var buttons = field.querySelectorAll("button");
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      if (btn.classList.contains("cms-tag-chip")) continue;
      var t = (btn.textContent || "").replace(/\s+/g, " ").trim();
      if (/추가|Add/i.test(t) && !/삭제|Delete|Remove|제거/i.test(t)) return btn;
    }

    // Fallback: last non-remove button in the tags field.
    for (var j = buttons.length - 1; j >= 0; j--) {
      var candidate = buttons[j];
      if (candidate.classList.contains("cms-tag-chip")) continue;
      var label = (candidate.textContent || "").replace(/\s+/g, " ").trim();
      if (/삭제|Delete|Remove|제거/i.test(label)) continue;
      return candidate;
    }
    return null;
  }

  function findEmptyOrLastInput(field) {
    var inputs = field.querySelectorAll("input[type='text'], input:not([type]), textarea");
    var target = null;
    for (var i = inputs.length - 1; i >= 0; i--) {
      if (!String(inputs[i].value || "").trim()) {
        target = inputs[i];
        break;
      }
    }
    if (!target && inputs.length) target = inputs[inputs.length - 1];
    return target;
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  async function addTag(field, tag) {
    if (adding) return;
    var existing = currentTags(field);
    if (existing.indexOf(tag) !== -1) return;

    adding = true;
    if (observer) observer.disconnect();

    try {
      var target = findEmptyOrLastInput(field);
      var needAdd = !target || String(target.value || "").trim() !== "";

      if (needAdd) {
        var addBtn = findAddButton(field);
        if (addBtn) {
          addBtn.click();
          await wait(80);
          target = findEmptyOrLastInput(field);
        }
      }

      if (!target) {
        // One more try after React paint.
        await wait(120);
        target = findEmptyOrLastInput(field);
      }
      if (!target) return;

      // If last input already has a different value, click Add again.
      if (String(target.value || "").trim() && String(target.value || "").trim() !== tag) {
        var addAgain = findAddButton(field);
        if (addAgain) {
          addAgain.click();
          await wait(80);
          target = findEmptyOrLastInput(field);
        }
      }
      if (!target) return;

      target.focus();
      setReactInputValue(target, tag);
      target.blur();
      await wait(30);
    } finally {
      adding = false;
      if (observer) {
        var root = document.getElementById("nc-root") || document.body;
        observer.observe(root, { childList: true, subtree: true });
      }
      scan(true);
    }
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
      body.className = "cms-tag-suggestions-box";
      body.setAttribute(WRAP_ATTR, "1");
      section.appendChild(body);

      if (tagsField.nextSibling) {
        pane.insertBefore(section, tagsField.nextSibling);
      } else {
        pane.appendChild(section);
      }
    } else {
      section.dataset.cmsField = "tags_frequent";
      if (tagsField.nextElementSibling !== section) {
        pane.insertBefore(section, tagsField.nextSibling);
      }
    }

    return section;
  }

  function paintSuggestions(section, tagsField, tags) {
    var wrap = section.querySelector("[" + WRAP_ATTR + "]");
    if (!wrap) return;

    var selected = currentTags(tagsField);
    var nextKey = tags
      .map(function (item) {
        return item.name + ":" + (selected.indexOf(item.name) !== -1 ? "1" : "0");
      })
      .join("|");
    if (wrap.dataset.paintKey === nextKey) return;
    wrap.dataset.paintKey = nextKey;
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
      btn.dataset.tagName = item.name;
      btn.title = item.count ? item.name + " (" + item.count + ") · 클릭해서 추가" : item.name + " · 클릭해서 추가";
      if (selected.indexOf(item.name) !== -1) {
        btn.classList.add("is-selected");
        btn.disabled = true;
      }
      chips.appendChild(btn);
    });
  }

  function scan(force) {
    var root = document.getElementById("nc-root") || document.body;
    var field = root.querySelector('[data-cms-field="tags"]');
    if (!field) return;
    var token = ++paintToken;
    loadTags().then(function (tags) {
      if (!force && token !== paintToken) return;
      var section = ensureFrequentSection(field);
      if (!section) return;
      paintSuggestions(section, field, tags);
    });
  }

  function onChipClick(event) {
    var btn = event.target && event.target.closest ? event.target.closest(".cms-tag-chip") : null;
    if (!btn) return;
    if (!btn.closest("[" + FREQ_ATTR + "]")) return;
    if (btn.disabled) return;

    event.preventDefault();
    event.stopPropagation();

    var field = document.querySelector('[data-cms-field="tags"]');
    if (!field) return;
    var name = (btn.dataset.tagName || btn.textContent || "").trim();
    if (!name) return;
    addTag(field, name);
  }

  function start() {
    document.addEventListener("click", onChipClick, true);
    scan(true);
    var root = document.getElementById("nc-root") || document.body;
    var scheduled = false;
    observer = new MutationObserver(function () {
      if (adding || scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(function () {
        scheduled = false;
        if (!adding) scan(false);
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
