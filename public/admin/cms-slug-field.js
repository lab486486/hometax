(function () {
  const BLOG_COLLECTIONS = new Set(["blog", "blog_new"]);

  function slugifyTitle(title) {
    return String(title)
      .normalize("NFC")
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s_-]/gu, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function getSiteBase() {
    const meta = window.__cmsSiteBase;
    if (meta) return meta;
    return window.location.origin.replace(/\/$/, "");
  }

  function isBlogEditorHash() {
    const hash = location.hash || "";
    return (
      hash.includes("/collections/blog/entries/") ||
      hash.includes("/collections/blog_new/new") ||
      hash.includes("/collections/blog_new/entries/")
    );
  }

  function findFieldControl(root, fieldName) {
    const fields = root.querySelectorAll("[class*='FieldLabel']");
    for (const label of fields) {
      const text = (label.textContent || "").trim();
      if (!text) continue;
      const container =
        label.closest("[class*='ControlContainer']") ||
        label.closest("div[class*='css-']")?.parentElement;
      if (!container) continue;

      const input =
        container.querySelector(`input[name='${fieldName}']`) ||
        container.querySelector(`input[id$='-${fieldName}']`) ||
        container.querySelector("input[type='text']");

      if (!input) continue;

      if (fieldName === "title" && text.includes("제목")) return input;
      if (fieldName === "slug" && (text.includes("슬러그") || text.includes("퍼머링크"))) {
        return input;
      }
    }

    return (
      root.querySelector(`input[name='${fieldName}']`) ||
      root.querySelector(`input[id$='-${fieldName}']`)
    );
  }

  function ensurePreview(slugInput) {
    const container = slugInput.closest("[class*='ControlContainer']") || slugInput.parentElement;
    if (!container) return null;

    let preview = container.querySelector("[data-cms-slug-preview]");
    if (!preview) {
      preview = document.createElement("p");
      preview.dataset.cmsSlugPreview = "1";
      preview.style.margin = "8px 0 0";
      preview.style.fontSize = "13px";
      preview.style.color = "#555";
      preview.style.wordBreak = "break-all";
      container.appendChild(preview);
    }
    return preview;
  }

  function updatePreview(slugInput, preview) {
    const slug = (slugInput.value || "").trim();
    preview.textContent = slug
      ? `미리보기: ${getSiteBase()}/posts/${slug}/`
      : "미리보기: 슬러그를 입력하면 URL이 표시됩니다.";
  }

  function bindEditor(root) {
    const titleInput = findFieldControl(root, "title");
    const slugInput = findFieldControl(root, "slug");
    if (!titleInput || !slugInput) return false;
    if (slugInput.dataset.cmsSlugBound === "1") return true;

    slugInput.dataset.cmsSlugBound = "1";
    let slugTouched = Boolean((slugInput.value || "").trim());

    const preview = ensurePreview(slugInput);
    updatePreview(slugInput, preview);

    slugInput.addEventListener("input", function () {
      slugTouched = true;
      updatePreview(slugInput, preview);
    });

    titleInput.addEventListener("input", function () {
      if (slugTouched) return;
      const next = slugifyTitle(titleInput.value || "");
      slugInput.value = next;
      slugInput.dispatchEvent(new Event("input", { bubbles: true }));
      updatePreview(slugInput, preview);
    });

    return true;
  }

  function scanEditor() {
    if (!isBlogEditorHash()) return;
    const root = document.getElementById("nc-root");
    if (!root) return;
    bindEditor(root);
  }

  if (window.CMS && typeof window.CMS.registerEventListener === "function") {
    window.CMS.registerEventListener({
      name: "preSave",
      handler: function ({ entry }) {
        const collection = entry.get("collection");
        if (!BLOG_COLLECTIONS.has(collection)) return;

        const data = entry.get("data");
        const title = String(data.get("title") || "").trim();
        let slug = String(data.get("slug") || "").trim();

        if (!slug && title) {
          slug = slugifyTitle(title);
          entry = entry.setIn(["data", "slug"], slug);
        }

        if (slug) {
          entry = entry.setIn(["data", "slug"], slugifyTitle(slug) || slug);
        }

        return entry;
      },
    });
  }

  let started = false;
  function start() {
    if (started) return;
    started = true;
    window.addEventListener("hashchange", scanEditor);
    const observer = new MutationObserver(scanEditor);
    const root = document.getElementById("nc-root");
    if (root) observer.observe(root, { childList: true, subtree: true });
    scanEditor();
  }

  function waitForCms() {
    const root = document.getElementById("nc-root");
    if (root && root.firstElementChild) {
      start();
      return;
    }
    window.requestAnimationFrame(waitForCms);
  }

  fetch("/admin/site-meta.json", { cache: "no-store" })
    .then(function (res) {
      return res.ok ? res.json() : null;
    })
    .then(function (data) {
      if (data && data.site_url) {
        window.__cmsSiteBase = String(data.site_url).replace(/\/$/, "");
      }
    })
    .catch(function () {
      /* ignore */
    })
    .finally(waitForCms);
})();
