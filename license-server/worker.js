/**
 * Máy chủ license RapPhim TV — Cloudflare Worker + KV.
 *
 * Quản lý key Premium: cấp, thu hồi, gia hạn, hết hạn (cắt dần kiểu thuê bao).
 * App gọi POST /verify để kiểm tra; các endpoint /admin/* cần header X-Admin-Token.
 *
 * KV (binding LICENSES): key -> JSON { name, exp, revoked, createdAt }
 *   exp = epoch giây; 0 = vĩnh viễn.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type,x-admin-token",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });
}

function now() {
  return Math.floor(Date.now() / 1000);
}

function genKey() {
  const hex = crypto.randomUUID().replace(/-/g, "").toUpperCase();
  return `RAPTV-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
}

function active(lic) {
  return !lic.revoked && (!lic.exp || lic.exp === 0 || now() < lic.exp);
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    const url = new URL(req.url);
    const path = url.pathname;

    // --- Công khai: app kiểm tra 1 key --------------------------------------
    if (path === "/verify" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const key = (body.key || "").trim();
      if (!key) return json({ ok: false, error: "missing key" }, 400);
      const raw = await env.LICENSES.get(key);
      if (!raw) return json({ ok: false, reason: "not_found" });
      const lic = JSON.parse(raw);
      return json({
        ok: active(lic),
        tier: "premium",
        name: lic.name || "",
        exp: lic.exp || 0,
        revoked: !!lic.revoked,
      });
    }

    // --- Quản trị: cần X-Admin-Token ---------------------------------------
    const isAdmin = env.ADMIN_TOKEN && req.headers.get("x-admin-token") === env.ADMIN_TOKEN;
    const needAdmin = () => json({ error: "unauthorized" }, 401);

    if (path === "/admin/issue" && req.method === "POST") {
      if (!isAdmin) return needAdmin();
      const body = await req.json().catch(() => ({}));
      const key = (body.key || "").trim() || genKey();
      const days = Number(body.days) || 0;
      const exp = days > 0 ? now() + days * 86400 : 0;
      await env.LICENSES.put(
        key,
        JSON.stringify({ name: body.name || "", exp, revoked: false, createdAt: now() }),
      );
      return json({ ok: true, key, name: body.name || "", exp });
    }

    if (path === "/admin/extend" && req.method === "POST") {
      if (!isAdmin) return needAdmin();
      const body = await req.json().catch(() => ({}));
      const key = (body.key || "").trim();
      const days = Number(body.days) || 30;
      const raw = await env.LICENSES.get(key);
      if (!raw) return json({ ok: false, error: "not_found" }, 404);
      const lic = JSON.parse(raw);
      const base = lic.exp && lic.exp > now() ? lic.exp : now();
      lic.exp = base + days * 86400;
      lic.revoked = false;
      await env.LICENSES.put(key, JSON.stringify(lic));
      return json({ ok: true, key, exp: lic.exp });
    }

    if (path === "/admin/revoke" && req.method === "POST") {
      if (!isAdmin) return needAdmin();
      const body = await req.json().catch(() => ({}));
      const key = (body.key || "").trim();
      const raw = await env.LICENSES.get(key);
      if (!raw) return json({ ok: false, error: "not_found" }, 404);
      const lic = JSON.parse(raw);
      lic.revoked = true;
      await env.LICENSES.put(key, JSON.stringify(lic));
      return json({ ok: true, key });
    }

    if (path === "/admin/list" && req.method === "GET") {
      if (!isAdmin) return needAdmin();
      const listed = await env.LICENSES.list({ limit: 1000 });
      const keys = [];
      for (const k of listed.keys) {
        const raw = await env.LICENSES.get(k.name);
        if (raw) keys.push({ key: k.name, ...JSON.parse(raw), active: active(JSON.parse(raw)) });
      }
      return json({ ok: true, count: keys.length, keys });
    }

    return json({ error: "not_found", hint: "POST /verify {key}" }, 404);
  },
};
