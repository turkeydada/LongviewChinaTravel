/// <reference types="@cloudflare/workers-types" />

/**
 * GET /api/export?kind=visits|leads — CSV 一键导出
 * ---------------------------------------------------------------
 * 鉴权：X-Admin-Token == 环境变量 ADMIN_TOKEN。
 * - visits：最近 30 天全部访问行为日志（visit_log，含地理/设备/UTM）
 * - leads：全部顾客询盘表单（leads 表，永久保存）+ 表单明细 payload
 * 输出标准 CSV（UTF-8 带 BOM，Excel 直接打开不乱码），Content-Disposition 附件下载。
 */

interface Env {
  DB: D1Database;
  ADMIN_TOKEN: string;
}

const RETENTION_MS = 30 * 86400_000;

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.join(",")];
  for (const r of rows) lines.push(r.map(csvCell).join(","));
  return "\uFEFF" + lines.join("\r\n");
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const token = request.headers.get("X-Admin-Token") ?? "";
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    return Response.json({ success: false, msg: "Unauthorized" }, { status: 401 });
  }

  const kind = new URL(request.url).searchParams.get("kind") ?? "visits";
  const now = Date.now();

  try {
    if (kind === "leads") {
      const rows = await env.DB.prepare(
        `SELECT id, type, name, email, payload, created_at FROM leads ORDER BY created_at DESC LIMIT 5000`
      )
        .all<{ id: number; type: string; name: string; email: string; payload: string; created_at: number }>();
      const csv = toCsv(
        ["id", "type", "name", "email", "submitted_at", "details_json"],
        (rows.results ?? []).map((r) => [
          r.id,
          r.type,
          r.name,
          r.email,
          new Date(r.created_at).toISOString(),
          r.payload,
        ])
      );
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="leads-all-${new Date().toISOString().slice(0, 10)}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    // visits：近 30 天行为日志
    const rows = await env.DB.prepare(
      `SELECT ts, session_id, visitor_hash, type, page, meta, value,
              device, os, browser, country, region, city, lang, channel,
              utm_source, utm_medium, utm_campaign
       FROM visit_log WHERE ts > ? ORDER BY ts ASC LIMIT 20000`
    )
      .bind(now - RETENTION_MS)
      .all<Record<string, unknown>>();
    const headers = [
      "ts", "session_id", "visitor_hash", "type", "page", "meta", "value",
      "device", "os", "browser", "country", "region", "city", "lang", "channel",
      "utm_source", "utm_medium", "utm_campaign",
    ];
    const csv = toCsv(
      headers,
      (rows.results ?? []).map((r) => headers.map((h) => r[h]))
    );
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="visit-log-30d-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json({ success: false, msg: "Database error" }, { status: 500 });
  }
};
