(function () {
  const FILE_PATH = "src/data/adsense/enabled.json";
  const TOGGLE_LABEL = "광고 활성화";
  const ENTRY_HREF_PART = "/collections/adsense/entries/";

  let fileSha = "";
  let saving = false;
  let injected = false;

  function isCollectionListView() {
    const hash = location.hash || "";
    return (
      hash.includes("/collections/adsense") &&
      !hash.match(/\/collections\/adsense\/entries\/[^/?#]+/)
    );
  }

  async function fetchEnabled() {
    const gh = window.AdsenseGitHub;
    if (!gh || !gh.getToken()) return { enabled: false, sha: "" };
    try {
      const file = await gh.fetchFile(FILE_PATH);
      fileSha = file.sha;
      return { enabled: Boolean(file.data.enabled), sha: file.sha };
    } catch {
      return { enabled: false, sha: "" };
    }
  }

  async function saveEnabled(enabled) {
    const gh = window.AdsenseGitHub;
    if (!gh) throw new Error("로그인이 필요합니다.");
    fileSha = await gh.saveFile(
      FILE_PATH,
      { enabled: enabled },
      fileSha,
      enabled ? "CMS: 광고 활성화 ON" : "CMS: 광고 활성화 OFF",
    );
  }

  function setStatus(el, message, isError) {
    const status = el.querySelector(".adsense-toggle-status");
    if (!status) return;
    status.textContent = message || "";
    status.classList.toggle("is-error", Boolean(isError));
    status.hidden = !message;
  }

  function createToggleCard() {
    const host = document.createElement("div");
    host.className = "adsense-toggle-host";

    const card = document.createElement("div");
    card.className = "adsense-toggle-card";
    card.setAttribute("role", "group");
    card.setAttribute("aria-label", TOGGLE_LABEL);
    card.innerHTML =
      '<div class="adsense-toggle-main">' +
      '<div class="adsense-toggle-group">' +
      '<div class="adsense-toggle-row">' +
      '<span class="adsense-toggle-label">' +
      TOGGLE_LABEL +
      "</span>" +
      '<label class="adsense-switch" aria-label="' +
      TOGGLE_LABEL +
      '">' +
      '<input type="checkbox" class="adsense-toggle-input" />' +
      '<span class="adsense-switch-slider"></span>' +
      "</label>" +
      "</div>" +
      '<p class="adsense-toggle-hint">(이 버튼을 누르면 코드가 입력된 광고가 사이트에 표시됩니다)</p>' +
      "</div>" +
      "</div>" +
      '<p class="adsense-toggle-status" hidden></p>';

    host.appendChild(card);

    const input = card.querySelector(".adsense-toggle-input");
    input.addEventListener("change", async function () {
      if (saving) {
        input.checked = !input.checked;
        return;
      }

      const next = input.checked;
      saving = true;
      input.disabled = true;
      setStatus(card, "저장 중…");

      try {
        await saveEnabled(next);
        setStatus(card, "저장됨 · 1~3분 후 사이트 반영");
        window.setTimeout(function () {
          setStatus(card, "");
        }, 4000);
      } catch (error) {
        input.checked = !next;
        setStatus(card, error.message || "저장 실패", true);
      } finally {
        saving = false;
        input.disabled = false;
      }
    });

    return host;
  }

  function findEntryLinks() {
    const links = document.querySelectorAll('a[href*="' + ENTRY_HREF_PART + '"]');
    const visible = [];
    for (const link of links) {
      if (link.getBoundingClientRect().width > 80) visible.push(link);
    }
    return visible;
  }

  function findEntriesListWrapper() {
    const links = findEntryLinks();
    if (!links.length) return null;

    let container = links[0].parentElement;
    while (container && container !== document.body) {
      const count = container.querySelectorAll('a[href*="' + ENTRY_HREF_PART + '"]').length;
      if (count === links.length) return container;
      container = container.parentElement;
    }

    return links[0].parentElement;
  }

  function removeToggleCard() {
    const existing = document.querySelector(".adsense-toggle-host");
    if (existing) existing.remove();
    injected = false;
  }

  function syncToggleLayout(host) {
    const link = findEntryLinks()[0];
    if (!link || !host) return;

    function apply() {
      const rect = link.getBoundingClientRect();
      const style = window.getComputedStyle(link);
      const width = Math.round(rect.width);
      if (width > 0) host.style.width = width + "px";

      const main = host.querySelector(".adsense-toggle-main");
      if (main) {
        main.style.paddingLeft = style.paddingLeft;
        main.style.paddingRight = style.paddingRight;
      }
    }

    apply();
    window.requestAnimationFrame(apply);
  }

  async function injectToggle() {
    if (!isCollectionListView()) {
      removeToggleCard();
      return;
    }

    if (injected && document.querySelector(".adsense-toggle-host")) return;

    const wrapper = findEntriesListWrapper();
    if (!wrapper || !wrapper.parentElement) return;

    removeToggleCard();

    const host = createToggleCard();
    wrapper.insertBefore(host, wrapper.firstChild);
    syncToggleLayout(host);
    injected = true;

    const input = host.querySelector(".adsense-toggle-input");
    const gh = window.AdsenseGitHub;
    input.disabled = true;

    try {
      const state = await fetchEnabled();
      input.checked = state.enabled;
      if (!gh || !gh.getToken()) {
        setStatus(host.querySelector(".adsense-toggle-card"), "로그인 후 사용 가능", true);
      }
    } catch {
      setStatus(host.querySelector(".adsense-toggle-card"), "상태 불러오기 실패", true);
    } finally {
      input.disabled = !gh || !gh.getToken();
    }
  }

  function watchCollectionList() {
    const root = document.getElementById("nc-root") || document.body;
    const observer = new MutationObserver(function () {
      injectToggle();
    });
    observer.observe(root, { childList: true, subtree: true });
    window.addEventListener("hashchange", injectToggle);
    window.addEventListener("resize", function () {
      const host = document.querySelector(".adsense-toggle-host");
      if (host) syncToggleLayout(host);
    });
    injectToggle();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", watchCollectionList);
  } else {
    watchCollectionList();
  }
})();
