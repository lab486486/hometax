(function () {
  const COLLECTION = "site";
  const SESSION_KEY = "site-open-entry";
  const REQUIRED_SLUGS = new Set(["general"]);

  const ENTRIES = [
    {
      slug: "general",
      label: "사이트 상세 설정하기",
      file: "src/data/site.json",
      saveMessage: "CMS: 사이트 설정 저장",
      fields: [
        {
          name: "title",
          label: "사이트 제목",
          type: "text",
          hint: "상단 로고·브라우저 탭 제목에 표시됩니다.",
        },
        {
          name: "site_url",
          label: "사이트 주소",
          type: "text",
          hint: "이 주소를 변경해도 사이트 설정에는 영향이 없습니다.",
        },
        {
          name: "copyright_name",
          label: "카피라이트 이름",
          type: "text",
          hint: "하단 © 옆에 표시되는 이름입니다. 클릭하면 사이트 주소로 이동합니다.",
        },
      ],
    },
    {
      slug: "google_search_console",
      label: "구글 서치콘솔",
      file: "src/data/site/google-search-console.json",
      saveMessage: "CMS: 구글 서치콘솔 저장",
      fields: [
        {
          name: "code",
          label: "소유권 확인 코드",
          type: "textarea",
          hint: "Search Console → HTML 태그의 meta 태그 전체 또는 content 값",
        },
      ],
    },
    {
      slug: "naver_search_advisor",
      label: "네이버 서치어드바이저",
      file: "src/data/site/naver-search-advisor.json",
      saveMessage: "CMS: 네이버 서치어드바이저 저장",
      fields: [
        {
          name: "code",
          label: "소유권 확인 코드",
          type: "textarea",
          hint: "서치어드바이저 → HTML 태그의 meta 태그 전체 또는 content 값",
        },
      ],
    },
    {
      slug: "bing_webmaster",
      label: "빙 웹마스터도구",
      file: "src/data/site/bing-webmaster.json",
      saveMessage: "CMS: 빙 웹마스터도구 저장",
      fields: [
        {
          name: "code",
          label: "소유권 확인 코드",
          type: "textarea",
          hint: "Bing Webmaster → meta 태그 전체 또는 content 값",
        },
      ],
    },
    {
      slug: "daum_webmaster",
      label: "다음 웹마스터 도구",
      file: "src/data/site/daum-webmaster.json",
      saveMessage: "CMS: 다음 웹마스터 도구 저장",
      fields: [
        {
          name: "code",
          label: "소유권 확인 코드",
          type: "textarea",
          hint: "Daum 웹마스터 → meta 태그 전체 또는 content 값",
        },
      ],
    },
    {
      slug: "analytics",
      label: "애널리틱스",
      file: "src/data/site/analytics.json",
      saveMessage: "CMS: 애널리틱스 저장",
      fields: [
        {
          name: "code",
          label: "추적 코드",
          type: "textarea",
          hint: "gtag.js script 전체 또는 측정 ID(G-XXXXXXXX)",
        },
      ],
    },
  ];

  const entryMap = Object.fromEntries(
    ENTRIES.map(function (entry) {
      return [entry.slug, entry];
    }),
  );

  let openSlug = "";

  function isCollectionListView() {
    const hash = location.hash || "";
    return (
      hash.includes("/collections/" + COLLECTION) &&
      !hash.match(new RegExp("/collections/" + COLLECTION + "/entries/[^/?#]+"))
    );
  }

  function redirectEntryToList() {
    const hash = location.hash || "";
    const match = hash.match(
      new RegExp("/collections/" + COLLECTION + "/entries/([^/?#]+)"),
    );
    if (!match) return false;
    sessionStorage.setItem(SESSION_KEY, match[1]);
    location.hash = "#/collections/" + COLLECTION;
    return true;
  }

  function findSiteEntriesList() {
    const anchor =
      findCardLink("general") ||
      document.querySelector('a[href*="/collections/' + COLLECTION + '/entries/"]');
    if (!anchor) return null;

    const row = anchor.closest("li") || anchor.parentElement;
    if (!row || !row.parentElement) return null;

    return {
      list: row.parentElement,
      rowTag: row.tagName || "LI",
      sampleLink: anchor,
    };
  }

  function ensureSiteEntryCards() {
    const mount = findSiteEntriesList();
    if (!mount) return;

    ENTRIES.forEach(function (entry) {
      if (findCardLink(entry.slug)) return;

      const row = document.createElement(mount.rowTag);
      const link = document.createElement("a");
      link.href = "#/collections/" + COLLECTION + "/entries/" + entry.slug;
      link.dataset.cmsSiteEntry = entry.slug;

      if (mount.sampleLink) {
        mount.sampleLink.classList.forEach(function (cls) {
          if (!cls.startsWith("adsense-accordion") && !cls.startsWith("is-")) {
            link.classList.add(cls);
          }
        });
      }

      const title = document.createElement("h2");
      title.textContent = entry.label;
      link.appendChild(title);
      row.appendChild(link);
      mount.list.appendChild(row);
    });
  }

  function findCardLink(slug) {
    const hrefPart = "/collections/" + COLLECTION + "/entries/" + slug;
    const links = document.querySelectorAll('a[href*="' + hrefPart + '"]');
    let best = null;
    let bestWidth = 0;
    for (const link of links) {
      const width = link.getBoundingClientRect().width;
      if (width > bestWidth) {
        best = link;
        bestWidth = width;
      }
    }
    return best;
  }

  function panelSelector(slug) {
    return (
      '.adsense-accordion-panel[data-collection="' +
      COLLECTION +
      '"][data-slug="' +
      slug +
      '"]'
    );
  }

  function cardSelector(slug) {
    return (
      '.adsense-accordion-card[data-collection="' +
      COLLECTION +
      '"][data-slug="' +
      slug +
      '"]'
    );
  }

  function closePanel(slug) {
    const panel = document.querySelector(panelSelector(slug));
    const card = document.querySelector(cardSelector(slug));
    if (panel) panel.classList.remove("is-open");
    if (card) card.classList.remove("is-open");
    if (openSlug === slug) openSlug = "";
  }

  function closeAllPanels() {
    ENTRIES.forEach(function (entry) {
      closePanel(entry.slug);
    });
  }

  function setStatus(panel, message, isError) {
    const status = panel.querySelector(".adsense-accordion-status");
    if (!status) return;
    status.textContent = message || "";
    status.classList.toggle("is-error", Boolean(isError));
    status.hidden = !message;
  }

  function renderField(field, value) {
    const id = "site-field-" + field.name + "-" + Math.random().toString(36).slice(2, 7);
    const wrapper = document.createElement("div");
    wrapper.className = "adsense-field";

    if (field.type === "boolean") {
      wrapper.innerHTML =
        '<label class="adsense-check">' +
        '<input type="checkbox" name="' +
        field.name +
        '" ' +
        (value ? "checked" : "") +
        " />" +
        "<span>" +
        field.label +
        "</span>" +
        "</label>";
    } else if (field.type === "number") {
      wrapper.innerHTML =
        '<label class="adsense-label" for="' +
        id +
        '">' +
        field.label +
        "</label>" +
        '<input class="adsense-input" id="' +
        id +
        '" type="number" name="' +
        field.name +
        '" value="' +
        (value ?? "") +
        '" min="' +
        (field.min ?? "") +
        '" max="' +
        (field.max ?? "") +
        '" />';
    } else if (field.type === "textarea") {
      wrapper.innerHTML =
        '<label class="adsense-label" for="' +
        id +
        '">' +
        field.label +
        "</label>" +
        '<textarea class="adsense-textarea" id="' +
        id +
        '" name="' +
        field.name +
        '" rows="6"></textarea>';
      wrapper.querySelector("textarea").value = value ?? "";
    } else {
      wrapper.innerHTML =
        '<label class="adsense-label" for="' +
        id +
        '">' +
        field.label +
        "</label>" +
        '<input class="adsense-input" id="' +
        id +
        '" type="text" name="' +
        field.name +
        '" value="' +
        String(value ?? "").replace(/"/g, "&quot;") +
        '" />';
    }

    if (field.hint) {
      const hint = document.createElement("p");
      hint.className = "adsense-field-hint";
      hint.textContent = field.hint;
      wrapper.appendChild(hint);
    }

    return wrapper;
  }

  function readFormData(form, fields) {
    const data = {};
    fields.forEach(function (field) {
      const input = form.elements.namedItem(field.name);
      if (!input) return;
      if (field.type === "boolean") {
        data[field.name] = input.checked;
      } else if (field.type === "number") {
        data[field.name] = Number(input.value || 0);
      } else {
        data[field.name] = input.value;
      }
    });
    return data;
  }

  async function openPanel(entry, cardLink) {
    const gh = window.AdsenseGitHub;
    if (!gh || !gh.getToken()) {
      alert("로그인 후 사용할 수 있습니다.");
      return;
    }

    if (openSlug === entry.slug) {
      closePanel(entry.slug);
      return;
    }

    closeAllPanels();

    const panel = document.querySelector(panelSelector(entry.slug));
    if (!panel) return;

    const fieldsWrap = panel.querySelector(".adsense-accordion-fields");
    fieldsWrap.innerHTML = '<p class="adsense-accordion-loading">불러오는 중…</p>';
    setStatus(panel, "");

    panel.classList.add("is-open");
    cardLink.classList.add("is-open");
    openSlug = entry.slug;

    try {
      const file = await gh.fetchFile(entry.file);
      panel.dataset.sha = file.sha;
      fieldsWrap.innerHTML = "";
      entry.fields.forEach(function (field) {
        fieldsWrap.appendChild(renderField(field, file.data[field.name]));
      });
    } catch (error) {
      fieldsWrap.innerHTML = "";
      setStatus(panel, error.message || "불러오기 실패", true);
    }
  }

  function createPanel(entry) {
    const panel = document.createElement("div");
    panel.className = "adsense-accordion-panel";
    panel.dataset.collection = COLLECTION;
    panel.dataset.slug = entry.slug;
    if (REQUIRED_SLUGS.has(entry.slug)) {
      panel.classList.add("adsense-accordion-panel--required");
    }
    panel.innerHTML =
      '<div class="adsense-accordion-inner">' +
      '<form class="adsense-accordion-form">' +
      '<div class="adsense-accordion-fields"></div>' +
      '<div class="adsense-accordion-actions">' +
      '<button type="submit" class="adsense-btn adsense-btn-save">저장</button>' +
      '<button type="button" class="adsense-btn adsense-btn-cancel">닫기</button>' +
      "</div>" +
      '<p class="adsense-accordion-status" hidden></p>' +
      "</form>" +
      "</div>";

    const form = panel.querySelector(".adsense-accordion-form");
    const cancelBtn = panel.querySelector(".adsense-btn-cancel");

    cancelBtn.addEventListener("click", function () {
      closePanel(entry.slug);
    });

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const gh = window.AdsenseGitHub;
      const saveBtn = panel.querySelector(".adsense-btn-save");
      saveBtn.disabled = true;
      setStatus(panel, "저장 중…");

      try {
        const data = readFormData(form, entry.fields);
        const sha = await gh.saveFile(
          entry.file,
          data,
          panel.dataset.sha || "",
          entry.saveMessage,
        );
        panel.dataset.sha = sha;
        setStatus(panel, "저장됨 · 1~3분 후 사이트 반영");
        window.setTimeout(function () {
          closePanel(entry.slug);
        }, 900);
      } catch (error) {
        setStatus(panel, error.message || "저장 실패", true);
      } finally {
        saveBtn.disabled = false;
      }
    });

    return panel;
  }

  function enhanceCards() {
    if (!isCollectionListView()) {
      openSlug = "";
      return;
    }

    ensureSiteEntryCards();

    ENTRIES.forEach(function (entry) {
      const link = findCardLink(entry.slug);
      if (!link || link.dataset.siteAccordionReady === "1") return;

      link.dataset.siteAccordionReady = "1";
      link.classList.add("adsense-accordion-card");
      link.dataset.collection = COLLECTION;
      link.dataset.slug = entry.slug;
      if (REQUIRED_SLUGS.has(entry.slug)) {
        link.classList.add("adsense-accordion-card--required");
      }
      link.setAttribute("role", "button");
      link.setAttribute("aria-expanded", "false");

      const chevron = document.createElement("span");
      chevron.className = "adsense-accordion-chevron";
      chevron.setAttribute("aria-hidden", "true");
      chevron.textContent = "▾";
      link.appendChild(chevron);

      const heading = link.querySelector("h2, h3, h4");
      if (heading) {
        heading.classList.add("adsense-accordion-title");
      } else if (!link.querySelector(".adsense-accordion-title")) {
        const title = document.createElement("span");
        title.className = "adsense-accordion-title";
        const nodes = [];
        link.childNodes.forEach(function (node) {
          if (node === chevron) return;
          nodes.push(node);
        });
        nodes.forEach(function (node) {
          title.appendChild(node);
        });
        link.insertBefore(title, chevron);
      }

      if (REQUIRED_SLUGS.has(entry.slug)) {
        const titleEl = link.querySelector(".adsense-accordion-title");
        if (titleEl) {
          titleEl.style.setProperty("color", "#ffd600", "important");
          titleEl.style.setProperty("-webkit-text-fill-color", "#ffd600", "important");
        }
      }

      const panel = createPanel(entry);
      link.insertAdjacentElement("afterend", panel);

      link.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        openPanel(entry, link);
        link.setAttribute("aria-expanded", openSlug === entry.slug ? "true" : "false");
      });
    });

    const pending = sessionStorage.getItem(SESSION_KEY);
    if (pending && entryMap[pending]) {
      sessionStorage.removeItem(SESSION_KEY);
      const link = findCardLink(pending);
      if (link) openPanel(entryMap[pending], link);
    }
  }

  function watch() {
    if (redirectEntryToList()) return;

    const root = document.getElementById("nc-root") || document.body;
    const observer = new MutationObserver(function () {
      if (redirectEntryToList()) return;
      if (!isCollectionListView()) {
        openSlug = "";
        return;
      }
      enhanceCards();
    });
    observer.observe(root, { childList: true, subtree: true });
    window.addEventListener("hashchange", function () {
      if (redirectEntryToList()) return;
      enhanceCards();
    });
    enhanceCards();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", watch);
  } else {
    watch();
  }
})();
