/// <reference types="@cloudflare/workers-types" />

/**
 * GET /api/session?sid=xxx — 单会话完整旅程（D1 · visit_log）
 * ---------------------------------------------------------------
 * 鉴权：X-Admin-Token == 环境变量 ADMIN_TOKEN。
 * 返回该会话的全部行为事件（按时间正序，上限 500 条）：
 * 页面流转路径、每页停留、滚动深度、点击、语言切换、表单行为。
 */

interface Env {
  DB: D1Database;
  ADMIN_TOKEN: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const token = request.headers.get("X-Admin-Token") ?? "";
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    return Response.json({ success: false, msg: "Unauthorized" }, { status: 401 });
  }

  const sid = (new URL(request.url).searchParams.get("sid") ?? "").slice(0, 40);
  if (!sid) return Response.json({ success: false, msg: "missing sid" }, { status: 400 });

  try {
    const rows = await env.DB.prepare(
      `SELECT ts, type, page, meta, value, country, city, device, os, browser, lang
       FROM visit_log WHERE session_id = ? ORDER BY ts ASC LIMIT 500`
    )
      .bind(sid)
      .all<{ ts: number; type: string; page: string; meta: string; value: number; country: string; city: string; device: string; os: string; browser: string; lang: string }>();

    return Response.json(
      { success: true, sid, events: rows.results ?? [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return Response.json({ success: false, msg: "Database error" }, { status: 500 });
  }
};
