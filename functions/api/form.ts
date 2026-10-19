/// <reference types="@cloudflare/workers-types" />

/**
 * POST /api/form — 客户询盘写入 D1 数据库
 * ---------------------------------------------------------------
 * 安全要点（与前端 mail.ts 的防护一一对应，后端再查一遍）：
 * - 只接受 JSON POST；字段全部清洗 + 长度上限；
 * - 邮箱严格正则校验；
 * - 蜜罐字段 hp 非空 → 伪装成功，实际丢弃（机器人自动填充隐藏字段）；
 * - IP 限流：1 分钟最多 3 次（D1 计数），超出返回 429；
 * - 出错只返回通用提示，不暴露任何内部细节。
 *
 * 部署后需在 Cloudflare 后台把 D1 数据库绑定到 Pages 项目
 * （变量名 DB），建表 SQL 见项目根目录 数据库后端连接指南.md。
 */

interface Env {
  DB: D1Database;
}

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

function clean(s: unknown, max: number): string {
  if (typeof s !== "string") return "";
  return s
    .replace(/[\r\n\t\0-\x1F\x7F]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, max);
}

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // 只放行本站；纯表单接口不允许任何跨域调用
      "Access-Control-Allow-Origin": "https://longviewchinatravel.com",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "no-store",
    },
  });
}

const RATE_LIMIT = 3; // 每分钟每 IP 最多提交次数
const RATE_WINDOW_SEC = 60;

async function rateLimited(DB: D1Database, ip: string): Promise<boolean> {
  const cutoff = Math.floor(Date.now() / 1000) - RATE_WINDOW_SEC;
  // 清理该 IP 的过期记录（顺带减少表膨胀）
  await DB.prepare("DELETE FROM rate_limits WHERE ip = ? AND ts < ?")
    .bind(ip, cutoff)
    .run();
  const { count } = await DB.prepare(
    "SELECT COUNT(*) AS count FROM rate_limits WHERE ip = ? AND ts >= ?"
  )
    .bind(ip, cutoff)
    .first<{ count: number }>();
  if ((count ?? 0) >= RATE_LIMIT) return true;
  await DB.prepare("INSERT INTO rate_limits (ip, ts) VALUES (?, ?)")
    .bind(ip, Math.floor(Date.now() / 1000))
    .run();
  return false;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // 1) 只接受 JSON
  let data: Record<string, unknown>;
  try {
    data = await request.json();
  } catch {
    return json({ success: false, msg: "Invalid request" }, 400);
  }

  // 2) 蜜罐：机器人填了隐藏字段 → 假装成功，丢弃
  if (clean(data.hp, 100) !== "") {
    return json({ success: true });
  }

  // 3) 字段校验
  const name = clean(data.name, 100);
  const email = clean(data.email, 254);
  const type = clean(data.type, 40) === "business" ? "business" : "leisure";
  if (!name || !EMAIL_RE.test(email)) {
    return json({ success: false, msg: "Missing or invalid fields" }, 400);
  }

  const rawDetails = Array.isArray(data.details) ? data.details : [];
  const details = rawDetails
    .slice(0, 60)
    .map((d) => ({
      label: clean((d as Record<string, unknown>)?.label, 120),
      value: clean((d as Record<string, unknown>)?.value, 2000),
    }))
    .filter((d) => d.label);
  const payload = JSON.stringify({
    name,
    email,
    type,
    details,
    city: clean(data.city, 200),
    dates: clean(data.dates, 100),
    contact: clean(data.contact, 100),
    message: clean(data.message, 2000),
    interests: Array.isArray(data.interests)
      ? data.interests.slice(0, 40).map((i) => clean(i, 60))
      : [],
    submittedAt: clean(data.submittedAt, 40) || new Date().toISOString(),
  });
  if (payload.length > 20 * 1024) {
    return json({ success: false, msg: "Payload too large" }, 400);
  }

  // 4) IP 限流
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  try {
    if (await rateLimited(env.DB, ip)) {
      return json({ success: false, msg: "Too many requests" }, 429);
    }
  } catch {
    /* 限流表异常不阻断提交 */
  }

  // 5) 入库（参数化查询，杜绝 SQL 注入）
  try {
    await env.DB.prepare(
      "INSERT INTO leads (type, name, email, payload, created_at) VALUES (?, ?, ?, ?, ?)"
    )
      .bind(type, name, email, payload, Date.now())
      .run();
  } catch {
    return json({ success: false, msg: "Submission failed, please try again later" }, 500);
  }

  return json({ success: true });
};

export const onRequestOptions: PagesFunction<Env> = () =>
  json({ ok: true });
