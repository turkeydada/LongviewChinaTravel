/// <reference types="@cloudflare/workers-types" />

/**
 * GET /api/analytics — 后台数据分析聚合（D1 · visit_log SQL 汇总，一次请求拿全部）
 * ---------------------------------------------------------------
 * 鉴权与 /api/leads 相同：X-Admin-Token == 环境变量 ADMIN_TOKEN。
 * 返回板块：访客概览 / 每日趋势 / 页面行为 / 交互事件 / 流量来源 /
 *           表单流失漏斗 / UTM 渠道归因。
 * 统计范围默认最近 30 天，可用 ?days=7 调整（1–90）。
 *
 * 说明：visit_log 行为日志按 30 天滚动自动清理；询盘 leads 表永久保留。
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
      cities,
      pageViews,
      pageDwell,
      pageScroll,
      clicks,
      interests,
      visitorSessions,
      singlePageSessions,
      funnel,
      utmSources,
      utmMedia,
      realLeads,
      abandonsAgg,
    ] = await Promise.all([
      // 总访问量 / 独立访客 / 会话数
      db.prepare(
        `SELECT COUNT(*) AS views,
                COUNT(DISTINCT session_id) AS sessions,
                COUNT(DISTINCT visitor_hash) AS visitors
         FROM visit_log WHERE type = 'page_view' AND visitor_hash != '' AND ts > ?`
      )
        .bind(since)
        .first<{ views: number; sessions: number; visitors: number }>(),
      // 每日趋势
      db.prepare(
        `SELECT date(ts / 1000, 'unixepoch') AS d, COUNT(*) AS c
         FROM visit_log WHERE type = 'page_view' AND ts > ? GROUP BY d ORDER BY d`
      )
        .bind(since)
        .all<{ d: string; c: number }>(),
      // 设备分布
      db.prepare(
        `SELECT device AS k, COUNT(*) AS c, COUNT(DISTINCT session_id) AS u
         FROM visit_log WHERE type = 'page_view' AND ts > ? GROUP BY device ORDER BY c DESC`
      )
        .bind(since)
        .all<{ k: string; c: number; u: number }>(),
      // 渠道分布
      db.prepare(
        `SELECT channel AS k, COUNT(*) AS c, COUNT(DISTINCT session_id) AS u
         FROM visit_log WHERE type = 'page_view' AND ts > ? GROUP BY channel ORDER BY c DESC`
      )
        .bind(since)
        .all<{ k: string; c: number; u: number }>(),
      // 国家 Top 10
      db.prepare(
        `SELECT country AS k, COUNT(*) AS c, COUNT(DISTINCT session_id) AS u
         FROM visit_log WHERE type = 'page_view' AND ts > ? AND country != ''
         GROUP BY country ORDER BY c DESC LIMIT 10`
      )
        .bind(since)
        .all<{ k: string; c: number; u: number }>(),
      // 城市 Top 10
      db.prepare(
        `SELECT city AS k, COUNT(*) AS c, COUNT(DISTINCT session_id) AS u
         FROM visit_log WHERE type = 'page_view' AND ts > ? AND city != ''
         GROUP BY city ORDER BY c DESC LIMIT 10`
      )
        .bind(since)
        .all<{ k: string; c: number; u: number }>(),
      // 各页面访问量
      db.prepare(
        `SELECT page AS k, COUNT(*) AS c, COUNT(DISTINCT session_id) AS u
         FROM visit_log WHERE type = 'page_view' AND ts > ? GROUP BY page ORDER BY c DESC`
      )
        .bind(since)
        .all<{ k: string; c: number; u: number }>(),
      // 各页面停留时长（平均 / 最长，秒）
      db.prepare(
        `SELECT page AS k, ROUND(AVG(value) / 1000) AS avg_s, MAX(value) / 1000 AS max_s
         FROM visit_log WHERE type = 'dwell' AND ts > ? GROUP BY page`
      )
        .bind(since)
        .all<{ k: string; avg_s: number; max_s: number }>(),
      // 各页面平均滚动深度
      db.prepare(
        `SELECT page AS k, ROUND(AVG(value)) AS avg_pct
         FROM visit_log WHERE type = 'scroll' AND ts > ? GROUP BY page`
      )
        .bind(since)
        .all<{ k: string; avg_pct: number }>(),
      // 点击 Top 12（次数 / 点击人数）
      db.prepare(
        `SELECT meta AS k, COUNT(*) AS c, COUNT(DISTINCT session_id) AS u
         FROM visit_log WHERE type = 'click' AND ts > ? GROUP BY meta ORDER BY c DESC LIMIT 12`
      )
        .bind(since)
        .all<{ k: string; c: number; u: number }>(),
      // 服务兴趣点击 Top 12
      db.prepare(
        `SELECT meta AS k, COUNT(*) AS c, COUNT(DISTINCT session_id) AS u
         FROM visit_log WHERE type = 'interest' AND ts > ? GROUP BY meta ORDER BY c DESC LIMIT 12`
      )
        .bind(since)
        .all<{ k: string; c: number; u: number }>(),
      // 每个访客的会话数（新客 / 回访判定用，按 IP 哈希识别同一访客）
      db.prepare(
        `SELECT visitor_hash AS v, COUNT(DISTINCT session_id) AS s
         FROM visit_log WHERE visitor_hash != '' AND ts > ? GROUP BY visitor_hash`
      )
        .bind(since)
        .all<{ v: string; s: number }>(),
      // 单页会话数（跳出率近似）
      db.prepare(
        `SELECT COUNT(*) AS c FROM (
           SELECT session_id FROM visit_log
           WHERE type = 'page_view' AND ts > ? GROUP BY session_id HAVING COUNT(*) = 1
         )`
      )
        .bind(since)
        .first<{ c: number }>(),
      // 表单流失漏斗（会话口径：落地 → 打开问卷 → 填写 → 提交）
      db.prepare(
        `SELECT
           COUNT(DISTINCT CASE WHEN type = 'page_view' THEN session_id END) AS landed,
           COUNT(DISTINCT CASE WHEN type = 'form_view' THEN session_id END) AS viewed,
           COUNT(DISTINCT CASE WHEN type = 'form_field' THEN session_id END) AS fielded,
           COUNT(DISTINCT CASE WHEN type = 'form_submit' THEN session_id END) AS submitted
         FROM visit_log WHERE ts > ?`
      )
        .bind(since)
        .first<{ landed: number; viewed: number; fielded: number; submitted: number }>(),
      // UTM 来源归因 Top 12（会话数 / 提交转化）
      db.prepare(
        `SELECT utm_source AS k,
                COUNT(DISTINCT session_id) AS u,
                COUNT(DISTINCT CASE WHEN type = 'form_submit' THEN session_id END) AS conv
         FROM visit_log WHERE ts > ? AND utm_source != ''
         GROUP BY utm_source ORDER BY u DESC LIMIT 12`
      )
        .bind(since)
        .all<{ k: string; u: number; conv: number }>(),
      // UTM 媒介归因 Top 12
      db.prepare(
        `SELECT utm_medium AS k,
                COUNT(DISTINCT session_id) AS u,
                COUNT(DISTINCT CASE WHEN type = 'form_submit' THEN session_id END) AS conv
         FROM visit_log WHERE ts > ? AND utm_medium != ''
         GROUP BY utm_medium ORDER BY u DESC LIMIT 12`
      )
        .bind(since)
        .all<{ k: string; u: number; conv: number }>(),
      // 真实询盘数（leads 表，永久保留，不随行为日志滚动删除）
      db.prepare(`SELECT COUNT(*) AS c FROM leads WHERE created_at > ?`)
        .bind(since)
        .first<{ c: number }>(),
      // 问卷放弃数（行为日志口径）
      db.prepare(
        `SELECT COUNT(DISTINCT session_id) AS c FROM visit_log
         WHERE type = 'form_abandon' AND ts > ?`
      )
        .bind(since)
        .first<{ c: number }>(),
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
          leads: realLeads?.c ?? 0,
          abandons: abandonsAgg?.c ?? 0,
        },
        trend: trend.results ?? [],
        devices: devices.results ?? [],
        channels: channels.results ?? [],
        countries: countries.results ?? [],
        cities: cities.results ?? [],
        pages: (pageViews.results ?? []).map((p) => {
          const dwell = (pageDwell.results ?? []).find((d) => d.k === p.k);
          const scroll = (pageScroll.results ?? []).find((s) => s.k === p.k);
          return { page: p.k, views: p.c, users: p.u, avgDwell: dwell?.avg_s ?? 0, maxDwell: dwell?.max_s ?? 0, avgScroll: scroll?.avg_pct ?? 0 };
        }),
        clicks: clicks.results ?? [],
        interests: interests.results ?? [],
        funnel: funnel ?? { landed: 0, viewed: 0, fielded: 0, submitted: 0 },
        utmSources: utmSources.results ?? [],
        utmMedia: utmMedia.results ?? [],
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
