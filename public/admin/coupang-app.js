(function () {
  const root = document.getElementById("app");
  if (!root) return;

  let accessKey = "";
  let secretKey = "";
  let source = "none";
  let updatedAt = "";
  let configured = false;
  let statusText = "";
  let statusError = false;
  let busy = false;
  let builderUrl = "https://link.coupang.com/a/";
  let builderKeyword = "";
  let generatedCode = "";
  let copyHint = "";
  let urlClearedOnce = false;

  function getToken() {
    const keys = ["decap-cms-user", "netlify-cms-user"];
    for (let i = 0; i < keys.length; i++) {
      const raw = localStorage.getItem(keys[i]);
      if (!raw) continue;
      try {
        const data = JSON.parse(raw);
        if (typeof data.token === "string") return data.token;
      } catch {
        /* ignore */
      }
    }
    return null;
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function setStatus(text, isError) {
    statusText = text || "";
    statusError = Boolean(isError);
  }

  function readBuilderFields() {
    const urlEl = document.getElementById("builderUrl");
    const keywordEl = document.getElementById("builderKeyword");
    if (urlEl) builderUrl = String(urlEl.value || "").trim();
    if (keywordEl) builderKeyword = String(keywordEl.value || "").trim();
  }

  function buildShortcode(url, keyword) {
    const safeUrl = String(url || "").trim();
    const safeKeyword = String(keyword || "").trim();
    return '[coupang url="' + safeUrl + '" keyword="' + safeKeyword + '"]';
  }

  async function api(method, body) {
    const token = getToken();
    if (!token) throw new Error("GitHub 로그인이 필요합니다. 관리자 페이지에서 먼저 로그인해 주세요.");

    const res = await fetch("/api/coupang-keys", {
      method: method,
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(function () {
      return null;
    });
    if (!res.ok || !data?.ok) {
      if (res.status === 401) throw new Error("권한이 없습니다. 관리자 페이지에서 다시 로그인해 주세요.");
      if (data?.error === "both_keys_required") {
        throw new Error("Access Key와 Secret Key를 모두 입력해 주세요.");
      }
      throw new Error(data?.error || "요청에 실패했습니다.");
    }
    return data;
  }

  function sourceLabel() {
    if (source === "r2") return "관리자 저장값 사용 중";
    if (source === "env") return "Cloudflare 환경변수 사용 중";
    return "미설정";
  }

  function bindHelpActions() {
    const urlInput = document.getElementById("builderUrl");
    const genBtn = document.getElementById("builderGenerate");
    const copyBtn = document.getElementById("builderCopy");
    const resetBtn = document.getElementById("builderReset");

    if (urlInput) {
      urlInput.addEventListener("focus", function () {
        if (urlClearedOnce) return;
        urlClearedOnce = true;
        urlInput.value = "";
        builderUrl = "";
      });
      urlInput.addEventListener("mousedown", function (event) {
        if (urlClearedOnce) return;
        event.preventDefault();
        urlClearedOnce = true;
        urlInput.value = "";
        builderUrl = "";
        urlInput.focus();
      });
    }

    if (genBtn) {
      genBtn.addEventListener("click", function () {
        readBuilderFields();
        if (!builderUrl) {
          copyHint = "단축 링크(url)를 입력해 주세요.";
          paint();
          return;
        }
        if (!builderKeyword) {
          copyHint = "keyword를 입력해 주세요.";
          paint();
          return;
        }
        generatedCode = buildShortcode(builderUrl, builderKeyword);
        copyHint = "";
        paint();
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener("click", async function () {
        if (!generatedCode) return;
        try {
          await navigator.clipboard.writeText(generatedCode);
          copyHint = "클립보드에 복사되었습니다.";
        } catch {
          copyHint = "복사에 실패했습니다. 코드를 직접 선택해 복사해 주세요.";
        }
        paint();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        generatedCode = "";
        builderUrl = "https://link.coupang.com/a/";
        builderKeyword = "";
        urlClearedOnce = false;
        copyHint = "";
        paint();
      });
    }
  }

  function paint() {
    const loginHint = getToken()
      ? ""
      : '<p class="cms-coupang-status is-error">관리자 페이지(<a href="/admin/">/admin/</a>)에서 GitHub 로그인 후 이 창을 다시 열어 주세요.</p>';

    const statusHtml = statusText
      ? '<p class="cms-coupang-status' +
        (statusError ? " is-error" : "") +
        '">' +
        escapeHtml(statusText) +
        "</p>"
      : "";

    const resultHtml = generatedCode
      ? '<div class="cms-coupang-result">' +
        '<pre class="cms-coupang-code cms-coupang-code-result">' +
        escapeHtml(generatedCode) +
        "</pre>" +
        "</div>"
      : "";

    const actionButtonsHtml = generatedCode
      ? '<button type="button" class="cms-coupang-btn" id="builderCopy">복사하기</button>' +
        '<span class="cms-coupang-action-sep" aria-hidden="true">|</span>' +
        '<button type="button" class="cms-coupang-btn ghost" id="builderReset">초기화</button>'
      : '<button type="button" class="cms-coupang-btn" id="builderGenerate">본문 코드받기</button>';

    const hintHtml = copyHint
      ? '<p class="cms-coupang-builder-hint">' + escapeHtml(copyHint) + "</p>"
      : "";

    root.innerHTML =
      '<div class="cms-coupang-top">' +
      '<div class="cms-coupang-head">' +
      "<h1>쿠팡파트너스 API Key</h1>" +
      "<p>상품 박스의 제목·이미지를 불러올 Open API 키를 저장합니다.</p>" +
      "</div>" +
      '<a class="cms-coupang-back" href="/admin/">← 관리자로</a>' +
      "</div>" +
      loginHint +
      statusHtml +
      '<div class="cms-coupang-grid">' +
      '<section class="cms-coupang-card cms-coupang-card-keys">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px;">' +
      '<h2 style="margin:0">API 키</h2>' +
      '<span class="cms-coupang-badge ' +
      (configured ? "on" : "off") +
      '">' +
      escapeHtml(sourceLabel()) +
      "</span>" +
      "</div>" +
      '<form id="coupang-form">' +
      '<div class="cms-coupang-field">' +
      '<label for="accessKey">Access Key</label>' +
      '<input id="accessKey" name="accessKey" class="cms-coupang-key-input" type="text" autocomplete="off" spellcheck="false" placeholder="Access Key" value="' +
      escapeHtml(accessKey) +
      '" />' +
      "</div>" +
      '<div class="cms-coupang-field">' +
      '<label for="secretKey">Secret Key</label>' +
      '<input id="secretKey" name="secretKey" class="cms-coupang-key-input" type="password" autocomplete="off" spellcheck="false" placeholder="Secret Key" value="' +
      escapeHtml(secretKey) +
      '" />' +
      "</div>" +
      '<div class="cms-coupang-notes">' +
      "<p>쿠팡API 키 발급 위치:</p>" +
      "<p>쿠팡 파트너스 → 추가 기능 → 파트너스 API</p>" +
      "<p>* Access Key, Secret Key는 암호화 저장</p>" +
      "</div>" +
      '<div class="cms-coupang-actions">' +
      '<button type="submit" class="cms-coupang-btn"' +
      (busy ? " disabled" : "") +
      ">" +
      (busy ? "저장 중…" : "저장") +
      "</button>" +
      (updatedAt
        ? '<span class="cms-coupang-meta">마지막 저장: ' + escapeHtml(updatedAt) + "</span>"
        : "") +
      "</div>" +
      "</form>" +
      "</section>" +
      '<section class="cms-coupang-card cms-coupang-help">' +
      "<h2>본문에서 사용 방법</h2>" +
      "<p>글쓰기 본문에 아래 형식으로 넣으면 쿠팡 파트너스 상품 박스가 삽입됩니다.</p>" +
      '<pre class="cms-coupang-code">[coupang url="파트너스단축링크" keyword="상품검색어"]</pre>' +
      "<ol>" +
      "<li><strong>url</strong> — 쿠팡 파트너스에서 만든 추적(단축) 링크</li>" +
      "<li><strong>keyword</strong> — 이 키워드를 기반으로 쿠팡 내에서 상품 썸네일을 불러옴</li>" +
      "</ol>" +
      '<div class="cms-coupang-builder">' +
      '<p class="cms-coupang-builder-title">예시 · 본문 코드 만들기</p>' +
      '<div class="cms-coupang-field">' +
      '<label for="builderUrl">단축 링크 (url)</label>' +
      '<input id="builderUrl" type="url" autocomplete="off" spellcheck="false" placeholder="https://link.coupang.com/a/xxxxx" value="' +
      escapeHtml(builderUrl) +
      '" />' +
      "</div>" +
      '<div class="cms-coupang-field">' +
      '<label for="builderKeyword">keyword</label>' +
      '<input id="builderKeyword" type="text" autocomplete="off" spellcheck="false" placeholder="예 : 입력한 키워드의 사진이 썸네일로 나옵니다" value="' +
      escapeHtml(builderKeyword) +
      '" />' +
      "</div>" +
      '<div class="cms-coupang-actions">' +
      actionButtonsHtml +
      "</div>" +
      resultHtml +
      hintHtml +
      "</div>" +
      "</section>" +
      "</div>";

    const form = document.getElementById("coupang-form");
    if (form) form.addEventListener("submit", onSubmit);
    bindHelpActions();
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (busy) return;
    readBuilderFields();
    const form = event.currentTarget;
    const nextAccess = String(form.accessKey.value || "").trim();
    const nextSecret = String(form.secretKey.value || "").trim();
    busy = true;
    setStatus("저장 중…", false);
    paint();
    try {
      const data = await api("PUT", { accessKey: nextAccess, secretKey: nextSecret });
      accessKey = data.accessKey || nextAccess;
      secretKey = data.secretKey || nextSecret;
      source = data.source || "r2";
      updatedAt = data.updatedAt || "";
      configured = Boolean(data.configured);
      setStatus("저장됨 · 바로 적용됩니다 (AES-GCM 암호화 저장).", false);
    } catch (error) {
      setStatus(error.message || "저장 실패", true);
    } finally {
      busy = false;
      paint();
    }
  }

  async function boot() {
    paint();
    if (!getToken()) return;
    try {
      const data = await api("GET");
      accessKey = data.accessKey || "";
      secretKey = data.secretKey || "";
      source = data.source || "none";
      updatedAt = data.updatedAt || "";
      configured = Boolean(data.configured);
      setStatus("", false);
    } catch (error) {
      setStatus(error.message || "불러오기 실패", true);
    }
    paint();
  }

  boot();
})();
