/**
 * 云端访客行为采集（Cloudflare D1）
 * ---------------------------------------------------------------
 * 在 track()（本地统计）基础上，把匿名行为事件批量上报到 /api/events：
 * - 页面访问 / 停留时长 / 滚动深度（页面切换或关闭时结算上一页）
 * - 按钮与链接点击（带文字，最多 40 字符）
 * - 问卷放弃（检测到未提交的草稿）
 * - track() 手动事件（journey_choose / interest_click / lead_submit）自动镜像
 *
 * 隐私边界：只采集匿名行为数据（不采集表单输入内容、不跨站追踪、
 * 不用广告 cookie）；visitor 标识只存本机 localStorage。
 * 采集失败静默跳过，绝不影响页面功能。
 */

type CloudEvent = {
  type: string;
  page: string;
  meta?: string;
  value?: number;
};

const SESSION_KEY = "longview-session";
const VISITOR_KEY = "longview-visitor";
const FLUSH_INTERVAL = 8000;
const MAX_BATCH = 40;

let queue: CloudEvent[] = [];
let currentPage = "";
let pageEnterAt = Date.now();
let maxScroll = 0;
let settled = false;
let flushing = false;

/* ---------- 标识 ---------- */

function sessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/** 访客标识：本机持久，首次访问自动生成 → 用于区分新客/回访 */
function visitorId(): string {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = "v" + Math.random().toString(36).slice(2, 12);
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

function deviceType(): string {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
}

/** 流量渠道：直接访问 / 搜索引擎 / 社交媒体 / 其他外链 */
function channel(): string {
  const ref = document.referrer;
  if (!ref) return "direct";
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "");
    if (/^(google|bing|baidu|duckduckgo|yahoo|yandex)\./.test(host)) return "search";
    if (/^(facebook|instagram|tiktok|twitter|x|linkedin|youtube|reddit)\./.test(host)) return "social";
    return "referral";
  } catch {
    return "referral";
  }
}

/* ---------- 队列与上报 ---------- */

export function enqueueCloud(e: CloudEvent) {
  queue.push(e);
  if (queue.length >= MAX_BATCH) void flushCloud();
}

async function flushCloud() {
  if (flushing || queue.length === 0) return;
  flushing = true;
  const batch = queue.slice(0, MAX_BATCH);
  queue = queue.slice(MAX_BATCH);
  try {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sid: sessionId(),
        visitor: visitorId(),
        device: deviceType(),
        channel: channel(),
        lang: navigator.language.slice(0, 8),
        events: batch,
      }),
      keepalive: true,
      signal: AbortSignal.timeout(5000),
    }).catch(() => {});
  } catch {
    /* 接口未部署/断网：丢弃，不堆积 */
  } finally {
    flushing = false;
    if (queue.length) void flushCloud();
  }
}

/* ---------- 页面结算：停留时长 + 滚动深度 ---------- */

function settlePage() {
  if (settled) return;
  settled = true;
  const dwell = Date.now() - pageEnterAt;
  if (currentPage) {
    if (dwell > 1500) enqueueCloud({ type: "dwell", page: currentPage, value: dwell });
    const bucket = maxScroll >= 100 ? 100 : maxScroll >= 75 ? 75 : maxScroll >= 50 ? 50 : maxScroll >= 25 ? 25 : 0;
    if (bucket) enqueueCloud({ type: "scroll", page: currentPage, value: bucket });
  }
  // 问卷放弃：页面关闭时还有未提交的草稿
  try {
    if (sessionStorage.getItem("longview-biz-draft"))
      enqueueCloud({ type: "abandon", page: "#/business", meta: "business" });
    if (sessionStorage.getItem("longview-leisure-draft"))
      enqueueCloud({ type: "abandon", page: "#/leisure", meta: "leisure" });
  } catch {
    /* ignore */
  }
}

function enterPage(page: string) {
  currentPage = page;
  pageEnterAt = Date.now();
  maxScroll = 0;
  settled = false;
  enqueueCloud({ type: "page_view", page });
}

function trackScroll() {
  const doc = document.documentElement;
  const total = doc.scrollHeight - window.innerHeight;
  if (total <= 0) return;
  const pct = Math.min(100, Math.round((window.scrollY / total) * 100));
  if (pct > maxScroll) maxScroll = pct;
}

/* ---------- 自动采集启动 ---------- */

let started = false;

export function startTelemetry() {
  if (started) return;
  started = true;

  enterPage(location.hash || "#/");

  window.addEventListener("hashchange", () => {
    settlePage();
    enterPage(location.hash || "#/");
  });

  let scrollTick = false;
  window.addEventListener("scroll", () => {
    if (scrollTick) return;
    scrollTick = true;
    requestAnimationFrame(() => {
      trackScroll();
      scrollTick = false;
    });
  }, { passive: true });

  // 点击追踪：只记录 a/button 的文字，不采集输入内容
  document.addEventListener("click", (e) => {
    const el = (e.target as HTMLElement).closest("a,button");
    if (!el) return;
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
    if (!text) return;
    enqueueCloud({
      type: "click",
      page: location.hash || "#/",
      meta: `${el.tagName.toLowerCase()}:${text}`,
    });
  }, { capture: true });

  // 离页结算 + 批量上报
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      settlePage();
      void flushCloud();
    }
  });
  window.addEventListener("pagehide", () => {
    settlePage();
    void flushCloud();
  });

  setInterval(() => void flushCloud(), FLUSH_INTERVAL);
}
