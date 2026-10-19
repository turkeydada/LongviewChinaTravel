/// <reference types="@cloudflare/workers-types" />

/**
 * POST /api/events — 访客行为事件批量入库（D1）
 * ---------------------------------------------------------------
 * 前端 telemetry.ts 每 8 秒或离页时批量上报；只做匿名行为统计：
 * 页面访问 / 停留时长 / 滚动深度 / 点击 / 问卷放弃 / 手动事件镜像。
 * - 事件类型白名单校验，字段全部清洗 + 长度/数量上限；
 * - 每次请求 ≤40 条、body ≤64KB；
 * - 国家地区由 Cloudflare 按 IP 附加（CF-IPCountry），前端不传；
 * - 出错静默丢弃，不影响访客。
 *
 * 建表 SQL 见 数据库后端连接指南.md 附录。
 */

interface Env {
  DB: D1Database;
}

const ALLOWED = new Set([
  "page_view",
  "dwell",
  "scroll",
  "click",
  "interest",
  "journey",
  "lead",
  "abandon",
]);

function clean(s: unknown, max: number): string {
  if (typeof s !== "string") return "";
  return s.replace(/[\r\n\t\0-\x1F\x7F]/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, max);
}

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "https://longviewchinatravel.com",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "no-store",
    },
  });
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let data: {
    sid?: unknown;
    visitor?: unknown;
    device?: unknown;
    channel?: unknown;
    lang?: unknown;
    events?: unknown;
  };
  try {
    data = await request.json();
  } catch {
    return json({ ok: false }, 400);
  }

  const raw = Array.isArray(data.events) ? data.events : [];
  if (raw.length === 0) return json({ ok: true });
  if (raw.length > 40) return json({ ok: false }, 400);

  const sid = clean(data.sid, 40);
  const visitor = clean(data.visitor, 40);
  const device = clean(data.device, 10);
  const channel = clean(data.channel, 10);
  const lang = clean(data.lang, 8);
  const country = clean(request.headers.get("CF-IPCountry"), 4);
  const now = Date.now();

  const rows = raw
    .map((e) => {
      const ev = e as Record<string, unknown>;
      const type = clean(ev?.type, 16);
      if (!ALLOWED.has(type)) return null;
      const value = Number(ev?.value);
      return {
        type,
        page: clean(ev?.page, 80) || "#/",
        meta: clean(ev?.meta, 200),
        value: Number.isFinite(value) ? Math.max(0, Math.min(value, 1e9)) : 0,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .slice(0, 40);

  try {
    const stmts = rows.map((r) =>
      env.DB.prepare(
        "INSERT INTO events (session_id, visitor_id, type, page, meta, value, channel, device, country, lang, ts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(sid, visitor, r.type, r.page, r.meta, r.value, channel, device, country, lang, now)
    );
    if (stmts.length) await env.DB.batch(stmts);
  } catch {
    return json({ ok: false }, 500);
  }
  return json({ ok: true, received: rows.length, ts: now });
};

export const onRequestOptions: PagesFunction = () =>
  Response.json(
    { ok: true },
    {
      headers: {
        "Access-Control-Allow-Origin": "https://longviewchinatravel.com",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "no-store",
      },
    }
  );
