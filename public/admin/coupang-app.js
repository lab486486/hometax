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
  let loaded = false;

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
        throw new Error("ACCESS_KEY와 SECRET_KEY를 모두 입력해 주세요.");
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
      '<section class="cms-coupang-card">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px;">' +
      "<h2 style=\"margin:0\">API 키</h2>" +
      '<span class="cms-coupang-badge ' +
      (configured ? "on" : "off") +
      '">' +
      escapeHtml(sourceLabel()) +
      "</span>" +
      "</div>" +
      '<form id="coupang-form">' +
      '<div class="cms-coupang-field">' +
      '<label for="accessKey">COUPANG_ACCESS_KEY</label>' +
      '<input id="accessKey" name="accessKey" type="text" autocomplete="off" spellcheck="false" placeholder="Access Key" value="' +
      escapeHtml(accessKey) +
      '" />' +
      "</div>" +
      '<div class="cms-coupang-field">' +
      '<label for="secretKey">COUPANG_SECRET_KEY</label>' +
      '<input id="secretKey" name="secretKey" type="password" autocomplete="off" spellcheck="false" placeholder="Secret Key" value="' +
      escapeHtml(secretKey) +
      '" />' +
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
      '<pre class="cms-coupang-code">[coupang url="https://link.coupang.com/a/xxxxx" keyword="상품검색어"]</pre>' +
      "<ol>" +
      "<li><strong>url</strong> — 쿠팡 파트너스에서 만든 추적(단축) 링크</li>" +
      "<li><strong>keyword</strong> — 상품 제목·이미지를 찾을 검색어 (예: 높이조절 책상)</li>" +
      "</ol>" +
      "<p>예시</p>" +
      '<pre class="cms-coupang-code">[coupang url="https://link.coupang.com/a/gC1HCuU4mO" keyword="높이조절 책상"]</pre>' +
      "<p>키를 저장한 뒤 글을 발행하면, 박스가 실제 상품명과 썸네일을 불러옵니다. 키 발급: 쿠팡 파트너스 → 도구 → Open API.</p>" +
      "</section>";

    const form = document.getElementById("coupang-form");
    if (form) {
      form.addEventListener("submit", onSubmit);
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (busy) return;
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
      setStatus("저장됨 · 바로 적용됩니다 (글 페이지에서 상품 박스가 키를 사용합니다).", false);
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
      loaded = true;
      setStatus("", false);
    } catch (error) {
      setStatus(error.message || "불러오기 실패", true);
    }
    paint();
  }

  boot();
})();
