/**
 * 通过 FormSubmit (formsubmit.co) 把询盘发送到站长邮箱。
 *
 * 安全说明：不使用裸邮箱地址，使用 FormSubmit 激活邮件下发的随机 ID ——
 * 邮箱地址不会暴露在网站代码和网络请求中。
 * 已激活端点：longviewchinatravel@gmail.com → d78027ce01d2f0ed82d17c61ee626b4d
 *
 * 本文件是询盘发送的唯一出口，集中了客户端防滥用防护（纯静态站无后端，
 * 能做到的极限就是这些；更强的限流/人机验证需在托管平台后台配置）：
 * 1. 字段清洗与长度上限（防邮件头注入、防超大 payload）；
 * 2. 邮箱格式严格校验，不合法直接不发（数据仍本地留存）；
 * 3. 频率限制：同一浏览器 10 分钟内最多提交 5 次，超出静默拒绝；
 * 4. 总 payload 大小上限 20KB。
 *
 * 邮件格式：table 模板，每个问题单独一行（问题 = 行标题，答案 = 行内容），
 * 客户不再需要对着无标注的答案猜问题。
 *
 * 失败（断网/服务异常/被防护拦截）不影响本地保存，后台 /#/admin 始终留有备份。
 *
 * 云端备份：提交时同时写入 Cloudflare D1 数据库（POST /api/form，
 * 由 Cloudflare Pages Function 接收）。数据库在云端 24 小时运行，
 * 站长电脑关机也能收到；后台 /#/admin 点「从云端同步」即可拉取。
 * 接口未部署或失败时静默跳过，不影响邮件发送。
 */

const FORMSUBMIT_ID = "d78027ce01d2f0ed82d17c61ee626b4d";

/* ---------- 防滥用参数 ---------- */
const MAX_SENDS = 5; // 10 分钟内最多提交次数
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PAYLOAD_BYTES = 20 * 1024;
const LIMIT_KEY = "longview-send-log";

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/* ---------- 字段清洗 ---------- */

/** 去掉控制字符（含换行/回车），防止邮件头注入；超长截断 */
function clean(s: string, max: number): string {
  return s
    .replace(/[\r\n\t\0-\x1F\x7F]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, max);
}

/* ---------- 频率限制 ---------- */

function withinRateLimit(): boolean {
  try {
    const now = Date.now();
    const log: number[] = JSON.parse(localStorage.getItem(LIMIT_KEY) ?? "[]");
    const recent = log.filter((t) => now - t < WINDOW_MS);
    if (recent.length >= MAX_SENDS) return false;
    recent.push(now);
    localStorage.setItem(LIMIT_KEY, JSON.stringify(recent));
    return true;
  } catch {
    return true; // 存储不可用时放行，不阻断真实客户
  }
}

/* ---------- 发送 ---------- */

/** 写入 Cloudflare D1 云端数据库（幂等由后端 created_at + 后台 since 增量保证） */
function saveLeadToCloud(lead: {
  name: string;
  email: string;
  type: string;
  details: { label: string; value: string }[];
  city?: string;
  dates?: string;
  contact?: string;
  message?: string;
  interests?: string[];
  submittedAt?: string;
}): void {
  try {
    void fetch("/api/form", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: lead.name,
        email: lead.email,
        type: lead.type.toLowerCase(),
        details: lead.details,
        city: lead.city ?? "",
        dates: lead.dates ?? "",
        contact: lead.contact ?? "",
        message: lead.message ?? "",
        interests: lead.interests ?? [],
        submittedAt: lead.submittedAt ?? new Date().toISOString(),
        hp: "", // 蜜罐：机器人会填充这个隐藏字段，后端检测非空直接丢弃
      }),
      signal: AbortSignal.timeout(6000),
    }).catch(() => {});
  } catch {
    /* 云端接口不存在/失败静默跳过 */
  }
}

export async function sendLeadEmail(lead: {
  name: string;
  email: string;
  type: string;
  details: { label: string; value: string }[];
  /* 以下字段随云端备份一起入库（邮件暂不需要） */
  city?: string;
  dates?: string;
  contact?: string;
  message?: string;
  interests?: string[];
  submittedAt?: string;
}): Promise<boolean> {
  // 1) 基础校验：邮箱格式不合法不发
  const email = clean(lead.email, 254);
  if (!EMAIL_RE.test(email)) return false;

  // 2) 频率限制（静默拒绝，数据仍已本地保存）
  if (!withinRateLimit()) return false;

  // 3) 清洗所有字段
  const name = clean(lead.name, 100);
  const type = clean(lead.type, 40);
  const details = lead.details.map((d) => ({
    label: clean(d.label, 120),
    value: clean(d.value, 2000),
  }));

  // 4) 每个问题作为独立字段 → 邮件表格里逐题标注
  const detailFields: Record<string, string> = {};
  for (const d of details) {
    if (d.label) detailFields[d.label] = d.value;
  }

  const body = JSON.stringify({
    _subject: `[Longview China] New ${type} request from ${name}`.slice(0, 150),
    _template: "table",
    _captcha: "false",
    "Customer name": name,
    "Customer email": email,
    ...detailFields,
    "Submitted at": new Date().toLocaleString(),
  });
  // 5) 总大小上限，防异常 payload
  if (body.length > MAX_PAYLOAD_BYTES) return false;

  // 6) 云端数据库备份（与邮件并行，互不影响）
  saveLeadToCloud({
    name, email, type, details,
    city: lead.city, dates: lead.dates, contact: lead.contact,
    message: lead.message, interests: lead.interests, submittedAt: lead.submittedAt,
  });

  try {
    const res = await fetch(`https://formsubmit.co/ajax/${FORMSUBMIT_ID}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body,
      signal: AbortSignal.timeout(6000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
