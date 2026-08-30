/**
 * Decap CMS editor UX:
 * - Keep side-by-side preview off by default (full writing focus).
 * - Place a Publish-shaped "미리보기" button next to Publish (navy).
 * - When preview is on, treat it as a centered modal (not a split pane).
 */
(function () {
  const STORAGE_KEY = "cms.preview-visible";
  const BTN_ATTR = "data-cms-preview-btn";
  const PROXY_ATTR = "data-cms-preview-proxy";
  const OPEN_CLASS = "cms-preview-modal-open";

  try {
    localStorage.setItem(STORAGE_KEY, "false");
  } catch {
    /* ignore private mode */
  }

  function isPreviewTitle(title) {
    const t = (title || "").trim();
    return (
      t === "미리보기 토글" ||
      t === "Toggle preview" ||
      t.includes("미리보기") ||
      /preview/i.test(t)
    );
  }

  function findPreviewToggle(root) {
    const candidates = root.querySelectorAll("button[title], [role='button'][title]");
    for (const el of candidates) {
      if (el.getAttribute(PROXY_ATTR) === "1") continue;
      if (isPreviewTitle(el.getAttribute("title"))) return el;
    }
    return null;
  }

  function isPublishLabel(text) {
    const t = (text || "").replace(/\s+/g, " ").trim();
    return (
      t === "Publish" ||
      t === "Publishing..." ||
      t === "게시" ||
      t === "게시 중..." ||
      /^Publish\b/i.test(t) ||
      t.startsWith("게시")
    );
  }

  /** Toolbar-level Publish control (dropdown wrapper), so preview sits beside it. */
  function findPublishControl(root) {
    const nodes = root.querySelectorAll("button, [role='button']");
    let publishBtn = null;
    for (const el of nodes) {
      if (el.getAttribute(PROXY_ATTR) === "1") continue;
      if (el.classList.contains("cms-preview-toggle-btn")) continue;
      const cls = typeof el.className === "string" ? el.className : "";
      if (/PublishButton/i.test(cls) || isPublishLabel(el.textContent)) {
        publishBtn = el;
        break;
      }
    }
    if (!publishBtn) return null;

    let el = publishBtn;
    for (let i = 0; i < 6 && el.parentElement; i++) {
      const parent = el.parentElement;
      try {
        const style = window.getComputedStyle(parent);
        const flexish =
          style.display === "flex" || style.display === "inline-flex";
        if (flexish && parent.childElementCount >= 2) {
          return el;
        }
      } catch {
        /* ignore */
      }
      el = parent;
    }
    return publishBtn;
  }

  function hideNativeToggle(btn) {
    if (!btn || btn.getAttribute(BTN_ATTR) === "1") return;
    btn.setAttribute(BTN_ATTR, "1");
    btn.classList.add("cms-preview-native-hidden");
    btn.setAttribute("aria-hidden", "true");
    btn.tabIndex = -1;
  }

  function ensureProxyButton(nativeBtn, publishBtn) {
    if (!nativeBtn || !publishBtn) return null;

    const host = publishBtn.parentElement;
    if (!host) return null;

    let proxy = host.querySelector(`[${PROXY_ATTR}="1"]`);
    if (!proxy) {
      proxy = document.createElement("button");
      proxy.type = "button";
      proxy.setAttribute(PROXY_ATTR, "1");
      proxy.className = "cms-preview-toggle-btn";
      proxy.setAttribute("title", "미리보기");
      proxy.setAttribute("aria-label", "미리보기");
      proxy.textContent = "미리보기";
      proxy.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        nativeBtn.click();
      });
    }

    if (proxy.nextElementSibling !== publishBtn) {
      host.insertBefore(proxy, publishBtn);
    }

    return proxy;
  }

  function syncProxyState(proxy, open) {
    if (!proxy) return;
    proxy.setAttribute("aria-pressed", open ? "true" : "false");
    proxy.classList.toggle("is-active", open);
  }

  function ensureBackdrop() {
    let backdrop = document.querySelector("[data-cms-preview-backdrop]");
    if (backdrop) return backdrop;
    backdrop = document.createElement("div");
    backdrop.className = "cms-preview-backdrop";
    backdrop.dataset.cmsPreviewBackdrop = "1";
    backdrop.addEventListener("click", () => {
      const btn = findPreviewToggle(document.getElementById("nc-root") || document.body);
      if (btn) btn.click();
    });
    document.body.appendChild(backdrop);
    return backdrop;
  }

  function ensureCloseButton() {
    let closeBtn = document.querySelector("[data-cms-preview-close]");
    if (closeBtn) return closeBtn;
    closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "cms-preview-close";
    closeBtn.dataset.cmsPreviewClose = "1";
    closeBtn.setAttribute("aria-label", "미리보기 닫기");
    closeBtn.textContent = "닫기";
    closeBtn.addEventListener("click", () => {
      const btn = findPreviewToggle(document.getElementById("nc-root") || document.body);
      if (btn) btn.click();
    });
    document.body.appendChild(closeBtn);
    return closeBtn;
  }

  function previewIsVisible(root) {
    return Boolean(
      root.querySelector('[class*="PreviewPaneFrame"]') ||
        root.querySelector('[class*="PreviewPaneContainer"] iframe') ||
        root.querySelector(".SplitPane .Pane2")
    );
  }

  function syncModalState(root, proxy) {
    const open = previewIsVisible(root);
    document.documentElement.classList.toggle(OPEN_CLASS, open);
    syncProxyState(proxy, open);
    ensureBackdrop();
    ensureCloseButton();
  }

  function scan(root) {
    const nativeBtn = findPreviewToggle(root);
    if (nativeBtn) hideNativeToggle(nativeBtn);

    const publishBtn = findPublishControl(root);
    const proxy = ensureProxyButton(nativeBtn, publishBtn);
    syncModalState(root, proxy);
  }

  function start() {
    ensureBackdrop();
    ensureCloseButton();
    const root = document.getElementById("nc-root") || document.body;
    scan(root);
    const observer = new MutationObserver(() => scan(root));
    observer.observe(root, { childList: true, subtree: true });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && document.documentElement.classList.contains(OPEN_CLASS)) {
        const btn = findPreviewToggle(root);
        if (btn) btn.click();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
