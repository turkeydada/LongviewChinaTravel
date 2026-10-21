/// <reference types="@cloudflare/workers-types" />

/**
 * GET /api/sessions — 访客会话明细列表（D1 · visit_log）
 * ---------------------------------------------------------------
 * 鉴权：X-Admin-Token == 环境变量 ADMIN_TOKEN。
 * 按会话聚合，最近会话在前，默认 50 条，可用 ?limit= 调整（≤100）、?offset= 翻页。
 * 每条含：时间、地理、设备/系统/浏览器、渠道、UTM、页数、停留时长、表单结果。
 */

interface Env {
  DB: D1Database;
  ADMIN_TOKEN: string;
}

const DAY_MS = 86400_000;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const token = request.headers.get("X-Admin-Token") ?? "";
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    return Response.json({ success: false, msg: "Unauthorized" }, { status: 401 });
  }

  let limit = 50;
  let offset = 0;
  let days = 30;
  try {
    const sp = new URL(request.url).searchParams;
    const l = Number(sp.get("limit") ?? 50);
    if (Number.isFinite(l)) limit = Math.min(100, Math.max(1, Math.round(l)));
    const o = Number(sp.get("offset") ?? 0);
    if (Number.isFinite(o)) offset = Math.max(0, Math.round(o));
    const d = Number(sp.get("days") ?? 30);
    if (Number.isFinite(d)) days = Math.min(90, Math.max(1, Math.round(d)));
  } catch {
    /* 默认值 */
  }
  const since = Date.now() - days * DAY_MS;

  try {
    const rows = await env.DB.prepare(
      `SELECT
         session_id AS sid,
         MIN(ts) AS started_at,
         MAX(ts) AS last_ts,
         SUM(CASE WHEN type = 'dwell' THEN value ELSE 0 END) AS dwell_ms,
         SUM(CASE WHEN type = 'page_view' THEN 1 ELSE 0 END) AS pages,
         COUNT(*) AS events,
         MAX(country) AS country,
         MAX(region) AS region,
         MAX(city) AS city,
         MAX(device) AS device,
         MAX(os) AS os,
         MAX(browser) AS browser,
         MAX(channel) AS channel,
         MAX(utm_source) AS utm_source,
         MAX(utm_medium) AS utm_medium,
         MAX(lang) AS lang,
         SUM(CASE WHEN type = 'form_submit' THEN 1 ELSE 0 END) AS submitted,
         SUM(CASE WHEN type = 'form_abandon' THEN 1 ELSE 0 END) AS abandoned
       FROM visit_log
       WHERE ts > ?
       GROUP BY session_id
       ORDER BY last_ts DESC
       LIMIT ? OFFSET ?`
    )
      .bind(since, limit, offset)
      .all<{
        sid: string; started_at: number; last_ts: number; dwell_ms: number; pages: number; events: number;
        country: string; region: string; city: string; device: string; os: string; browser: string;
        channel: string; utm_source: string; utm_medium: string; lang: string;
        submitted: number; abandoned: number;
      }>();

    return Response.json(
      { success: true, sessions: rows.results ?? [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return Response.json({ success: false, msg: "Database error" }, { status: 500 });
  }
};
