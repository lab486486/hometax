window.AdsenseGitHub = (function () {
  const REPO = "lab486486/blogincome";
  const BRANCH = "main";

  function getToken() {
    const keys = ["decap-cms-user", "netlify-cms-user"];
    for (const key of keys) {
      const raw = localStorage.getItem(key);
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

  function encodeContent(text) {
    return btoa(unescape(encodeURIComponent(text)));
  }

  function decodeContent(encoded) {
    return decodeURIComponent(escape(atob(encoded.replace(/\n/g, ""))));
  }

  async function fetchFile(path) {
    const token = getToken();
    if (!token) throw new Error("로그인이 필요합니다.");

    const url =
      "https://api.github.com/repos/" +
      REPO +
      "/contents/" +
      path +
      "?ref=" +
      BRANCH;

    const res = await fetch(url, {
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/vnd.github+json",
      },
    });

    if (!res.ok) throw new Error("파일을 불러오지 못했습니다.");

    const payload = await res.json();
    return {
      data: JSON.parse(decodeContent(payload.content)),
      sha: payload.sha || "",
    };
  }

  async function saveFile(path, data, sha, message) {
    const token = getToken();
    if (!token) throw new Error("로그인이 필요합니다.");

    const body = JSON.stringify(data, null, 2) + "\n";
    const request = {
      message: message,
      content: encodeContent(body),
      branch: BRANCH,
    };
    if (sha) request.sha = sha;

    const res = await fetch(
      "https://api.github.com/repos/" + REPO + "/contents/" + path,
      {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      },
    );

    if (!res.ok) {
      const err = await res.json().catch(function () {
        return {};
      });
      throw new Error(err.message || "저장 실패");
    }

    const payload = await res.json();
    return payload.content && payload.content.sha ? payload.content.sha : sha;
  }

  return {
    REPO: REPO,
    BRANCH: BRANCH,
    getToken: getToken,
    fetchFile: fetchFile,
    saveFile: saveFile,
  };
})();
