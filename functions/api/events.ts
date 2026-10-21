/// <reference types="@cloudflare/workers-types" />

/**
 * POST /api/events — 访客行为事件批量入库（D1 · visit_log）
 * ---------------------------------------------------------------
 * 前端 telemetry.ts 每 8 秒或离页时批量上报；只做匿名行为统计：
 * 页面访问 / 有效停留时长 / 滚动深度 / 点击 / 语言切换 / 表单漏斗 /
 * 问卷放弃 / 手动事件镜像（interest / journey / form_submit）。
 *
 * - 事件类型白名单校验，字段全部清洗 + 长度/数量上限；
 * - 每次请求 ≤40 条、body ≤64KB；
 * - 地理位置（国家/地区/城市）由 Cloudflare cf 对象按 IP 附加，前端不传；
 * - 合规：不存明文 IP，只存 加盐SHA256(ip) 前 32 位（盐 = 环境变量 IP_HASH_SALT，
 *   未设置时使用内置回退盐，建议尽快在 Pages 环境变量中设置）；
 * - 滚动清理：每次上报后自动删除 30 天前的行为日志（询盘 leads 表不受影响）；
 * - 出错静默丢弃，不影响访客。
 *
 * 建表 SQL 见 数据库后端连接指南.md 附录。
 */

interface Env {
  DB: D1Database;
  IP_HASH_SALT?: string;
}

/** 内置回退盐（未配置 IP_HASH_SALT 时使用；建议设置环境变量替换） */
const FALLBACK_SALT = "longview-china-travel-2026";

const ALLOWED = new Set([
  "page_view",
  "dwell",
  "scroll",
  "click",
  "interest",
  "journey",
  "lang_switch",
  "form_view",
  "form_field",
  "form_abandon",
  "form_submit",
]);

const RETENTION_MS = 30 * 86400_000; // 行为日志保留 30 天

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

async function ipHash(ip: string, salt: string): Promise<string> {
  try {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${ip}`));
    return Array.from(new Uint8Array(digest).slice(0, 16))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return "";
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // 64KB body 上限
  const len = Number(request.headers.get("Content-Length") ?? 0);
  if (len > 65536) return json({ ok: false }, 413);

  let data: {
    sid?: unknown;
    visitor?: unknown;
    device?: unknown;
    os?: unknown;
    browser?: unknown;
    channel?: unknown;
    lang?: unknown;
    utm?: unknown;
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
  const os = clean(data.os, 20);
  const browser = clean(data.browser, 20);
  const channel = clean(data.channel, 10);
  const lang = clean(data.lang, 8);
  const utm = (data.utm ?? {}) as Record<string, unknown>;
  const utmSource = clean(utm.utm_source, 120);
  const utmMedium = clean(utm.utm_medium, 120);
  const utmCampaign = clean(utm.utm_campaign, 120);

  // 地理位置：Cloudflare cf 对象（按 IP），前端不可伪造
  const cf = (request as Request & { cf?: Record<string, unknown> }).cf ?? {};
  const country = clean(cf.country ?? request.headers.get("CF-IPCountry"), 4);
  const region = clean(cf.region, 40);
  const city = clean(cf.city, 60);

  // 合规：明文 IP 只用于即时哈希，不落库
  const ip = request.headers.get("CF-Connecting-IP") ?? "";
  const visitorHash = ip ? await ipHash(ip, env.IP_HASH_SALT || FALLBACK_SALT) : "";

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
        `INSERT INTO visit_log
           (ts, session_id, visitor_id, visitor_hash, type, page, meta, value,
            device, os, browser, country, region, city, lang, channel,
            utm_source, utm_medium, utm_campaign)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        now, sid, visitor, visitorHash, r.type, r.page, r.meta, r.value,
        device, os, browser, country, region, city, lang, channel,
        utmSource, utmMedium, utmCampaign
      )
    );
    if (stmts.length) await env.DB.batch(stmts);
    // 滚动清理：30 天前的行为日志（询盘 leads 表为独立表，不受影响）
    await env.DB.prepare("DELETE FROM visit_log WHERE ts < ?").bind(now - RETENTION_MS).run();
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
