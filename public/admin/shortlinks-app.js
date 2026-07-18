(function () {
  const root = document.getElementById("app");
  if (!root) return;

  let links = {};
  let editSlug = "";
  let statusText = "";
  let statusError = false;
  let busy = false;

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

  function isEnabled(item) {
    return Boolean(item?.to) && item.enabled !== false;
  }

  function setStatus(text, isError) {
    statusText = text || "";
    statusError = Boolean(isError);
  }

  async function api(method, body) {
    const token = getToken();
    if (!token) throw new Error("GitHub 로그인이 필요합니다. 관리자 페이지에서 먼저 로그인해 주세요.");

    const res = await fetch("/api/links", {
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
      if (data?.error === "invalid_slug_or_url") {
        throw new Error("짧은 주소 또는 URL 형식이 올바르지 않습니다.");
      }
      throw new Error(data?.error || "요청에 실패했습니다.");
    }
    return data;
  }

  function paint() {
    const editItem = editSlug && links[editSlug] ? links[editSlug] : null;
    const isEditing = Boolean(editItem);
    const rows = Object.entries(links)
      .sort(function (a, b) {
        return a[0].localeCompare(b[0]);
      })
      .map(function (entry) {
        const slug = entry[0];
        const item = entry[1] || {};
        const on = isEnabled(item);
        const to = item.to || "";
        const note = item.note || "";
        return (
          '<tr class="' +
          (on ? "" : "row-off") +
          '">' +
          '<td class="slug"><code>/' +
          escapeHtml(slug) +
          "</code></td>" +
          '<td class="status"><span class="cms-shortlinks-badge ' +
          (on ? "on" : "off") +
          '">' +
          (on ? "활성" : "비활성") +
          "</span></td>" +
          '<td class="url" title="' +
          escapeHtml(to) +
          '"><a href="' +
          escapeHtml(to) +
          '" target="_blank" rel="noopener">' +
          escapeHtml(to) +
          "</a></td>" +
          '<td class="note">' +
          escapeHtml(note) +
          "</td>" +
          '<td class="actions"><div class="cms-shortlinks-actions">' +
          '<button type="button" class="cms-shortlinks-btn ghost" data-action="edit" data-slug="' +
          escapeHtml(slug) +
          '">수정</button>' +
          '<button type="button" class="cms-shortlinks-btn ' +
          (on ? "ghost" : "ok") +
          '" data-action="toggle" data-slug="' +
          escapeHtml(slug) +
          '" data-enabled="' +
          (on ? "0" : "1") +
          '">' +
          (on ? "비활성화" : "활성화") +
          "</button>" +
          '<button type="button" class="cms-shortlinks-btn danger" data-action="delete" data-slug="' +
          escapeHtml(slug) +
          '">삭제</button>' +
          "</div></td></tr>"
        );
      })
      .join("");

    const statusHtml = statusText
      ? '<p class="cms-shortlinks-status' +
        (statusError ? " is-error" : "") +
        '">' +
        escapeHtml(statusText) +
        "</p>"
      : "";

    const loginHint = getToken()
      ? ""
      : '<p class="cms-shortlinks-status is-error">관리자 페이지(<a href="/admin/">/admin/</a>)에서 GitHub 로그인 후 이 창을 다시 열어 주세요.</p>';

    root.innerHTML =
      '<div class="cms-shortlinks-top">' +
      '<div class="cms-shortlinks-head">' +
      "<h1>단축링크 생성</h1>" +
      "<p>예: /news-letter → 실제 긴 URL로 이동 · 새 링크는 비활성으로 추가됩니다</p>" +
      "</div>" +
      '<a class="cms-shortlinks-back" href="/admin/">← 관리자로</a>' +
      "</div>" +
      loginHint +
      statusHtml +
      '<section class="cms-shortlinks-card">' +
      '<div class="cms-shortlinks-form-head">' +
      "<strong>" +
      (isEditing ? "수정 중: /" + escapeHtml(editSlug) : "링크 추가") +
      "</strong>" +
      (isEditing
        ? '<button type="button" class="cms-shortlinks-cancel" data-action="cancel-edit">수정 취소</button>'
        : "") +
      "</div>" +
      '<form class="cms-shortlinks-form">' +
      '<label>짧은 주소<input name="slug" placeholder="news-letter" value="' +
      (isEditing ? escapeHtml(editSlug) : "") +
      '" required pattern="[A-Za-z0-9][A-Za-z0-9-]{0,62}" ' +
      (isEditing ? "readonly" : "") +
      " /></label>" +
      '<label>목적지 URL<input name="to" type="url" placeholder="https://..." value="' +
      (isEditing ? escapeHtml(editItem.to || "") : "") +
      '" required /></label>' +
      '<label>메모<input name="note" placeholder="뉴스레터" value="' +
      (isEditing ? escapeHtml(editItem.note || "") : "") +
      '" /></label>' +
      '<button type="submit" class="cms-shortlinks-btn"' +
      (busy || !getToken() ? " disabled" : "") +
      ">" +
      (isEditing ? "수정 저장" : "추가 (비활성)") +
      "</button>" +
      "</form>" +
      '<p class="cms-shortlinks-hint">추가 후 목적지를 확인한 뒤 <strong>활성화</strong>를 누르면 공개됩니다. 예약어(free-lecture, lecture01…, admin 등)는 사용할 수 없습니다.</p>' +
      "</section>" +
      '<section class="cms-shortlinks-card">' +
      '<table class="cms-shortlinks-table"><thead><tr>' +
      '<th class="slug">짧은 주소</th><th class="status">상태</th><th>목적지</th><th class="note">메모</th><th class="actions">관리</th>' +
      "</tr></thead><tbody>" +
      (rows || '<tr><td colspan="5">등록된 링크가 없습니다.</td></tr>') +
      "</tbody></table></section>";
  }

  root.addEventListener("click", async function (event) {
    const btn = event.target.closest("[data-action]");
    if (!btn || busy) return;
    const action = btn.getAttribute("data-action");
    const slug = btn.getAttribute("data-slug") || "";

    try {
      if (action === "edit") {
        editSlug = slug;
        setStatus("");
        paint();
        return;
      }
      if (action === "cancel-edit") {
        editSlug = "";
        setStatus("");
        paint();
        return;
      }
      if (action === "toggle") {
        busy = true;
        const enabled = btn.getAttribute("data-enabled") === "1";
        const data = await api("POST", { action: "toggle", slug: slug, enabled: enabled });
        links = data.links || {};
        setStatus(enabled ? "활성화했습니다." : "비활성화했습니다.");
        paint();
        return;
      }
      if (action === "delete") {
        if (!confirm("삭제할까요?")) return;
        busy = true;
        const data = await api("POST", { action: "delete", slug: slug });
        links = data.links || {};
        if (editSlug === slug) editSlug = "";
        setStatus("삭제했습니다.");
        paint();
      }
    } catch (error) {
      setStatus(error.message || "오류", true);
      paint();
    } finally {
      busy = false;
    }
  });

  root.addEventListener("submit", async function (event) {
    const form = event.target;
    if (!form || !form.classList.contains("cms-shortlinks-form")) return;
    event.preventDefault();
    if (busy) return;

    const fd = new FormData(form);
    const slug = String(fd.get("slug") || "");
    const to = String(fd.get("to") || "");
    const note = String(fd.get("note") || "");
    const wasEditing = Boolean(editSlug);

    busy = true;
    setStatus("저장 중…");
    paint();

    try {
      const data = await api("POST", {
        action: "upsert",
        slug: slug,
        to: to,
        note: note,
      });
      links = data.links || {};
      editSlug = "";
      setStatus(
        wasEditing ? "수정했습니다." : "추가했습니다. (비활성 · 확인 후 활성화하세요)",
      );
      paint();
    } catch (error) {
      setStatus(error.message || "저장 실패", true);
      paint();
    } finally {
      busy = false;
    }
  });

  function denyAndGoBack() {
    window.alert("로그인 후 이용바랍니다.");
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.replace("/admin/");
    }
  }

  async function boot() {
    if (!getToken()) {
      denyAndGoBack();
      return;
    }

    try {
      const data = await api("GET");
      links = data.links || {};
      setStatus("");
      paint();
    } catch (error) {
      if (
        !getToken() ||
        /권한|로그인/i.test(String(error.message || ""))
      ) {
        denyAndGoBack();
        return;
      }
      setStatus(error.message || "목록을 불러오지 못했습니다.", true);
      paint();
    }
  }

  boot();
})();
