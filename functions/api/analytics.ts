/// <reference types="@cloudflare/workers-types" />

/**
 * GET /api/analytics — 后台数据分析聚合（D1 SQL 汇总，一次请求拿全部）
 * ---------------------------------------------------------------
 * 鉴权与 /api/leads 相同：X-Admin-Token == 环境变量 ADMIN_TOKEN。
 * 返回四大板块数据：访客概览 / 页面行为 / 交互事件 / 流量来源。
 * 统计范围默认最近 30 天，可用 ?days=7 调整（1–90）。
 *
 * 建表 SQL 见 数据库后端连接指南.md 附录。
 */

interface Env {
  DB: D1Database;
  ADMIN_TOKEN: string;
}

const DAY_MS = 86400_000;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const token = request.headers.get("X-Admin-Token") ?? "";
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    return Response.json(
      { success: false, msg: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  let days = 30;
  try {
    const d = Number(new URL(request.url).searchParams.get("days") ?? 30);
    if (Number.isFinite(d)) days = Math.min(90, Math.max(1, Math.round(d)));
  } catch {
    /* 默认 30 天 */
  }
  const since = Date.now() - days * DAY_MS;

  const db = env.DB;
  try {
    const [
      totals,
      trend,
      devices,
      channels,
      countries,
      pageViews,
      pageDwell,
      pageScroll,
      clicks,
      interests,
      visitorSessions,
      singlePageSessions,
      leadsAgg,
    ] = await Promise.all([
      // 总访问量 / 独立访客 / 会话数
      db.prepare(
        `SELECT COUNT(*) AS views,
                COUNT(DISTINCT session_id) AS sessions,
                COUNT(DISTINCT visitor_id) AS visitors
         FROM events WHERE type = 'page_view' AND ts > ?`
      )
        .bind(since)
        .first<{ views: number; sessions: number; visitors: number }>(),
      // 每日趋势
      db.prepare(
        `SELECT date(ts / 1000, 'unixepoch') AS d, COUNT(*) AS c
         FROM events WHERE type = 'page_view' AND ts > ? GROUP BY d ORDER BY d`
      )
        .bind(since)
        .all<{ d: string; c: number }>(),
      // 设备分布
      db.prepare(
        `SELECT device AS k, COUNT(*) AS c, COUNT(DISTINCT session_id) AS u
         FROM events WHERE type = 'page_view' AND ts > ? GROUP BY device ORDER BY c DESC`
      )
        .bind(since)
        .all<{ k: string; c: number; u: number }>(),
      // 渠道分布
      db.prepare(
        `SELECT channel AS k, COUNT(*) AS c, COUNT(DISTINCT session_id) AS u
         FROM events WHERE type = 'page_view' AND ts > ? GROUP BY channel ORDER BY c DESC`
      )
        .bind(since)
        .all<{ k: string; c: number; u: number }>(),
      // 国家地区 Top 10
      db.prepare(
        `SELECT country AS k, COUNT(*) AS c, COUNT(DISTINCT session_id) AS u
         FROM events WHERE type = 'page_view' AND ts > ? AND country != ''
         GROUP BY country ORDER BY c DESC LIMIT 10`
      )
        .bind(since)
        .all<{ k: string; c: number; u: number }>(),
      // 各页面访问量
      db.prepare(
        `SELECT page AS k, COUNT(*) AS c, COUNT(DISTINCT session_id) AS u
         FROM events WHERE type = 'page_view' AND ts > ? GROUP BY page ORDER BY c DESC`
      )
        .bind(since)
        .all<{ k: string; c: number; u: number }>(),
      // 各页面停留时长（平均 / 最长，秒）
      db.prepare(
        `SELECT page AS k, ROUND(AVG(value) / 1000) AS avg_s, MAX(value) / 1000 AS max_s
         FROM events WHERE type = 'dwell' AND ts > ? GROUP BY page`
      )
        .bind(since)
        .all<{ k: string; avg_s: number; max_s: number }>(),
      // 各页面平均滚动深度
      db.prepare(
        `SELECT page AS k, ROUND(AVG(value)) AS avg_pct
         FROM events WHERE type = 'scroll' AND ts > ? GROUP BY page`
      )
        .bind(since)
        .all<{ k: string; avg_pct: number }>(),
      // 点击 Top 12（次数 / 点击人数）
      db.prepare(
        `SELECT meta AS k, COUNT(*) AS c, COUNT(DISTINCT session_id) AS u
         FROM events WHERE type = 'click' AND ts > ? GROUP BY meta ORDER BY c DESC LIMIT 12`
      )
        .bind(since)
        .all<{ k: string; c: number; u: number }>(),
      // 服务兴趣点击 Top 12
      db.prepare(
        `SELECT meta AS k, COUNT(*) AS c, COUNT(DISTINCT session_id) AS u
         FROM events WHERE type = 'interest' AND ts > ? GROUP BY meta ORDER BY c DESC LIMIT 12`
      )
        .bind(since)
        .all<{ k: string; c: number; u: number }>(),
      // 每个访客的会话数（新客 / 回访判定用）
      db.prepare(
        `SELECT visitor_id AS v, COUNT(DISTINCT session_id) AS s
         FROM events WHERE ts > ? GROUP BY visitor_id`
      )
        .bind(since)
        .all<{ v: string; s: number }>(),
      // 单页会话数（跳出率近似）
      db.prepare(
        `SELECT COUNT(*) AS c FROM (
           SELECT session_id FROM events
           WHERE type = 'page_view' AND ts > ? GROUP BY session_id HAVING COUNT(*) = 1
         )`
      )
        .bind(since)
        .first<{ c: number }>(),
      // 表单提交 / 放弃
      db.prepare(
        `SELECT
           SUM(CASE WHEN type = 'lead' THEN 1 ELSE 0 END) AS leads,
           SUM(CASE WHEN type = 'abandon' THEN 1 ELSE 0 END) AS abandons
         FROM events WHERE ts > ?`
      )
        .bind(since)
        .first<{ leads: number | null; abandons: number | null }>(),
    ]);

    const vs = visitorSessions.results ?? [];
    const returning = vs.filter((r) => r.s > 1).length;
    const views = totals?.views ?? 0;
    const sessions = totals?.sessions ?? 1;

    return Response.json(
      {
        success: true,
        rangeDays: days,
        totals: {
          views,
          visitors: totals?.visitors ?? 0,
          sessions: totals?.sessions ?? 0,
          bouncePct: sessions ? Math.round(((singlePageSessions?.c ?? 0) / sessions) * 100) : 0,
          newPct: vs.length ? Math.round(((vs.length - returning) / vs.length) * 100) : 100,
          leads: leadsAgg?.leads ?? 0,
          abandons: leadsAgg?.abandons ?? 0,
        },
        trend: trend.results ?? [],
        devices: devices.results ?? [],
        channels: channels.results ?? [],
        countries: countries.results ?? [],
        pages: (pageViews.results ?? []).map((p) => {
          const dwell = (pageDwell.results ?? []).find((d) => d.k === p.k);
          const scroll = (pageScroll.results ?? []).find((s) => s.k === p.k);
          return { page: p.k, views: p.c, users: p.u, avgDwell: dwell?.avg_s ?? 0, maxDwell: dwell?.max_s ?? 0, avgScroll: scroll?.avg_pct ?? 0 };
        }),
        clicks: clicks.results ?? [],
        interests: interests.results ?? [],
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
