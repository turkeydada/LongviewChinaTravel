/// <reference types="@cloudflare/workers-types" />

/**
 * GET /api/leads?since=<timestamp> — 后台同步云端询盘
 * ---------------------------------------------------------------
 * 鉴权：请求头必须携带 X-Admin-Token，与 Pages 环境变量 ADMIN_TOKEN 一致。
 * token 在 Cloudflare 后台设置（Pages → Settings → Environment variables），
 * 不会出现在代码里。后台 #/admin 页面保存过 token 后自动携带。
 *
 * 只返回后台尚未同步过的数据（since 增量），减少传输量。
 */

interface Env {
  DB: D1Database;
  ADMIN_TOKEN: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const token = request.headers.get("X-Admin-Token") ?? "";
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    return Response.json(
      { success: false, msg: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  let since = 0;
  try {
    const url = new URL(request.url);
    since = Number(url.searchParams.get("since") ?? 0) || 0;
  } catch {
    since = 0;
  }

  try {
    const { results } = await env.DB.prepare(
      "SELECT payload, created_at FROM leads WHERE created_at > ? ORDER BY created_at ASC LIMIT 500"
    )
      .bind(since)
      .all<{ payload: string; created_at: number }>();

    return Response.json(
      {
        success: true,
        leads: (results ?? []).map((r) => {
          try {
            return JSON.parse(r.payload);
          } catch {
            return null;
          }
        }).filter(Boolean),
        serverTime: Date.now(),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return Response.json(
      { success: false, msg: "Database error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
};
