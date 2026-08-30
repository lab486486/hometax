/**
 * Tag suggestions under the tags field: top 5 by post count, click to add.
 * Data: /admin/tag-stats.json (generated on build).
 */
(function () {
  const WRAP_ATTR = "data-cms-tag-suggestions";
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
    field.querySelectorAll('[class*="ListItem"] [class*="ObjectWidgetTopBar"], [class*="ListItem"]').forEach(function () {
      /* inputs cover most cases */
    });
    return values;
  }

  function findAddButton(field) {
    var buttons = field.querySelectorAll("button");
    for (var i = 0; i < buttons.length; i++) {
      var t = (buttons[i].textContent || "").replace(/\s+/g, " ").trim();
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

      var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value") ||
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
      if (setter && setter.set) setter.set.call(target, tag);
      else target.value = tag;

      target.dispatchEvent(new Event("input", { bubbles: true }));
      target.dispatchEvent(new Event("change", { bubbles: true }));
    }, 40);
  }

  function ensureSuggestions(field, tags) {
    if (!(field instanceof HTMLElement)) return;
    var wrap = field.querySelector("[" + WRAP_ATTR + "]");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "cms-tag-suggestions";
      wrap.setAttribute(WRAP_ATTR, "1");
      field.appendChild(wrap);
    }

    var selected = currentTags(field);
    wrap.innerHTML = "";

    if (!tags.length) {
      wrap.hidden = true;
      return;
    }
    wrap.hidden = false;

    var label = document.createElement("span");
    label.className = "cms-tag-suggestions-label";
    label.textContent = "자주 쓰는 태그";
    wrap.appendChild(label);

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
        addTag(field, item.name);
      });
      wrap.appendChild(btn);
    });
  }

  function scan() {
    var root = document.getElementById("nc-root") || document.body;
    var field = root.querySelector('[data-cms-field="tags"]');
    if (!field) return;
    loadTags().then(function (tags) {
      ensureSuggestions(field, tags);
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
