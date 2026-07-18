/**
 * POST /api/forms
 * Sends application form payloads via Resend.
 */

const TITLES = {
  wordpress: "워드프레스 전자책 & 특강 신청",
  cafe24: "카페24 워드프레스 이전 신청서",
  cloudways: "클라우드웨이즈 이전 신청서",
};

const REDIRECTS = {
  wordpress: "/wordpress/",
  cafe24: "/cafe24/",
  cloudways: "/cloudways/",
};

function redirect(request, formType, status) {
  const base = REDIRECTS[formType] || "/";
  const q = status === "ok" ? "sent=1" : "error=1";
  return Response.redirect(new URL(`${base}?${q}`, request.url), 303);
}

function text(form, key) {
  return String(form.get(key) || "").trim();
}

function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isMigrateForm(formType) {
  return formType === "cafe24" || formType === "cloudways";
}

function buildBody(formType, form) {
  const lines = [`[신청서] ${TITLES[formType] || formType}`, ""];
  const push = (label, value) => {
    if (!value) return;
    lines.push(`${label}: ${value}`);
  };

  push("이메일", text(form, "email"));
  push("케미클라우드 인보이스", text(form, "invoice"));

  if (isMigrateForm(formType)) {
    push("워드프레스 관리자 ID/패스워드", text(form, "wpAdmin"));
    push("도메인 연결 정보", text(form, "domainInfo"));
  }

  push("입력사항", text(form, "notes"));
  lines.push("", `제출 시각: ${new Date().toISOString()}`);
  return lines.join("\n");
}

function validate(formType, form) {
  const email = text(form, "email");
  const invoice = text(form, "invoice");
  if (!isEmail(email) || !invoice) return false;

  if (formType === "wordpress") return true;

  if (isMigrateForm(formType)) {
    return Boolean(text(form, "wpAdmin"));
  }

  return false;
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return new Response("Bad request", { status: 400 });
  }

  // Honeypot
  if (text(form, "website")) {
    return redirect(request, "wordpress", "ok");
  }

  const formType = text(form, "formType");
  if (!TITLES[formType]) {
    return new Response("Unknown form", { status: 400 });
  }

  if (!validate(formType, form)) {
    return redirect(request, formType, "error");
  }

  const apiKey = env.RESEND_API_KEY;
  const to = env.FORM_TO_EMAIL || "lab486486@gmail.com";
  const from = env.FORM_FROM_EMAIL || "Blogincome Forms <onboarding@resend.dev>";

  if (!apiKey) {
    console.error("RESEND_API_KEY missing");
    return redirect(request, formType, "error");
  }

  const subject = `[블로소득] ${TITLES[formType]} — ${text(form, "email")}`;
  const body = buildBody(formType, form);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: text(form, "email"),
      subject,
      text: body,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("Resend error", res.status, errText);
    return redirect(request, formType, "error");
  }

  return redirect(request, formType, "ok");
}
