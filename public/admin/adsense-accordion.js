(function () {
  const REQUIRED_SLUGS = new Set(["head_script", "ads_txt"]);

  const ENTRIES = [
    {
      slug: "head_script",
      label: "애드센스 코드 입력",
      file: "src/data/adsense/head-script.json",
      saveMessage: "CMS: 애드센스 코드 저장",
      fields: [
        {
          name: "script",
          label: "기본 script 코드",
          type: "textarea",
          hint: "AdSense → 코드 가져오기 → 사이트 전체 script 태그",
        },
      ],
    },
    {
      slug: "ads_txt",
      label: "ads.txt 입력",
      file: "src/data/adsense/ads-txt.json",
      saveMessage: "CMS: ads.txt 저장",
      fields: [
        {
          name: "content",
          label: "ads.txt 한 줄",
          type: "text",
          hint: "google.com, pub-XXXXXXXX, DIRECT, f08c47fec0942fa0",
        },
      ],
    },
    {
      slug: "display",
      label: "디스플레이 광고",
      file: "src/data/adsense/display.json",
      saveMessage: "CMS: 디스플레이 광고 저장",
      fields: [
        {
          name: "code",
          label: "광고 코드",
          type: "textarea",
          hint: "코드를 입력하고 표시 위치를 선택하면, 상단 광고 활성화가 켜진 상태에서 자동으로 노출됩니다.",
        },
        { name: "above_title", label: "제목 위", type: "boolean" },
        {
          name: "before_content",
          label: "본문 시작 전 (날짜·태그 아래)",
          type: "boolean",
        },
        { name: "after_h2", label: "H2 소제목 다음", type: "boolean" },
        { name: "after_h3", label: "H3 소제목 다음", type: "boolean" },
        {
          name: "after_h4",
          label: "H4 소제목 다음",
          type: "boolean",
          hint: "체크한 위치마다 본문 안에 삽입됩니다.",
        },
      ],
    },
    {
      slug: "infeed",
      label: "인피드 광고",
      file: "src/data/adsense/infeed.json",
      saveMessage: "CMS: 인피드 광고 저장",
      fields: [
        {
          name: "code",
          label: "광고 코드",
          type: "textarea",
          hint: "코드를 입력하면 상단 광고 활성화가 켜진 상태에서 메인(/) 글 목록에 표시됩니다.",
        },
        {
          name: "position",
          label: "삽입 위치 (몇 번째 글 뒤)",
          type: "number",
          min: 1,
          max: 20,
          hint: "2이면 두 번째 글 카드 바로 아래",
        },
      ],
    },
    {
      slug: "inarticle",
      label: "인아티클 광고",
      file: "src/data/adsense/inarticle.json",
      saveMessage: "CMS: 인아티클 광고 저장",
      fields: [
        {
          name: "code",
          label: "광고 코드",
          type: "textarea",
          hint: "코드를 입력하면 상단 광고 활성화가 켜진 상태에서 본문 안에 표시됩니다.",
        },
        {
          name: "min_paragraphs",
          label: "최소 문단 수",
          type: "number",
          min: 1,
          max: 50,
          hint: "기본 6 — 이보다 짧으면 광고 없음",
        },
        {
          name: "insert_after_paragraph",
          label: "삽입 위치 (몇 번째 문단 아래)",
          type: "number",
          min: 1,
          max: 50,
          hint: "기본 3 — 조건 충족 시 해당 문단 아래 1개",
        },
      ],
    },
    {
      slug: "multiplex",
      label: "멀티플렉스 광고",
      file: "src/data/adsense/multiplex.json",
      saveMessage: "CMS: 멀티플렉스 광고 저장",
      fields: [
        {
          name: "code",
          label: "광고 코드",
          type: "textarea",
          hint: "코드를 입력하면 상단 광고 활성화가 켜진 상태에서 글 본문 맨 아래에 표시됩니다.",
        },
      ],
    },
  ];

  const entryMap = Object.fromEntries(ENTRIES.map(function (entry) {
    return [entry.slug, entry];
  }));

  let openSlug = "";
  let enhanced = false;

  function isCollectionListView() {
    const hash = location.hash || "";
    return (
      hash.includes("/collections/adsense") &&
      !hash.match(/\/collections\/adsense\/entries\/[^/?#]+/)
    );
  }

  function redirectEntryToList() {
    const hash = location.hash || "";
    const match = hash.match(/\/collections\/adsense\/entries\/([^/?#]+)/);
    if (!match) return false;
    sessionStorage.setItem("adsense-open-entry", match[1]);
    location.hash = "#/collections/adsense";
    return true;
  }

  function findCardLink(slug) {
    const hrefPart = "/collections/adsense/entries/" + slug;
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

  function closePanel(slug) {
    const panel = document.querySelector('.adsense-accordion-panel[data-slug="' + slug + '"]');
    const card = document.querySelector('.adsense-accordion-card[data-slug="' + slug + '"]');
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
    const id = "adsense-field-" + field.name + "-" + Math.random().toString(36).slice(2, 7);
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

    let panel = document.querySelector('.adsense-accordion-panel[data-slug="' + entry.slug + '"]');
    if (!panel) return;

    const form = panel.querySelector(".adsense-accordion-form");
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
      enhanced = false;
      openSlug = "";
      return;
    }
    if (enhanced) return;

    let mounted = 0;
    ENTRIES.forEach(function (entry) {
      const link = findCardLink(entry.slug);
      if (!link || link.dataset.adsenseAccordionReady === "1") return;

      link.dataset.adsenseAccordionReady = "1";
      link.classList.add("adsense-accordion-card");
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

      mounted += 1;
    });

    if (mounted > 0) enhanced = true;

    const pending = sessionStorage.getItem("adsense-open-entry");
    if (pending && entryMap[pending]) {
      sessionStorage.removeItem("adsense-open-entry");
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
        enhanced = false;
        return;
      }
      enhanceCards();
    });
    observer.observe(root, { childList: true, subtree: true });
    window.addEventListener("hashchange", function () {
      if (redirectEntryToList()) return;
      enhanced = false;
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
