/**
 * 云端访客行为采集（Cloudflare D1 · visit_log）
 * ---------------------------------------------------------------
 * 在 track()（本地统计）基础上，把匿名行为事件批量上报到 /api/events：
 * - 页面访问 / 有效停留时长（只统计页面可见时间，切 Tab 自动暂停）
 * - 滚动深度 / 按钮点击 / 语言手动切换
 * - 表单漏斗：form_view（打开问卷）→ form_field（聚焦输入框）→
 *   form_submit（提交成功）/ form_abandon（未提交离开）
 * - track() 手动事件（journey_choose / interest_click / lead_submit）自动镜像
 * - UTM 归因：落地时抓取 utm_* 参数并在整个会话中携带
 * - 会话规则：同一 sessionId 30 分钟无操作自动过期，生成新会话
 *
 * 隐私边界：只采集匿名行为数据（不采集表单输入内容、不存明文 IP、
 * 不跨站追踪、不用广告 cookie）；visitor 标识只存本机 localStorage，
 * IP 由服务端加盐哈希后存储。
 * 采集失败静默跳过，绝不影响页面功能。
 */

type CloudEvent = {
  type: string;
  page: string;
  meta?: string;
  value?: number;
};

const SESSION_KEY = "longview-session";
const SESSION_TS_KEY = "longview-session-ts";
const VISITOR_KEY = "longview-visitor";
const UTM_KEY = "longview-utm";
const FLUSH_INTERVAL = 8000;
const MAX_BATCH = 40;
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 分钟无操作 → 新会话

let queue: CloudEvent[] = [];
let currentPage = "";
let visibleMs = 0; // 当前页面累计“可见”时长
let segStart = Date.now(); // 当前可见段起始
let maxScroll = 0;
let settled = false;
let flushing = false;

/* ---------- 标识 ---------- */

function newSessionId(): string {
  const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  sessionStorage.setItem(SESSION_KEY, id);
  sessionStorage.setItem(SESSION_TS_KEY, String(Date.now()));
  return id;
}

/** 会话：30 分钟无操作自动过期 */
function sessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  const ts = Number(sessionStorage.getItem(SESSION_TS_KEY) ?? 0);
  if (!id || Date.now() - ts > SESSION_TIMEOUT) id = newSessionId();
  else sessionStorage.setItem(SESSION_TS_KEY, String(Date.now()));
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

/** 操作系统 */
function osName(): string {
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "Windows";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Mac/i.test(ua)) return "macOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Linux/i.test(ua)) return "Linux";
  return "Other";
}

/** 浏览器 */
function browserName(): string {
  const ua = navigator.userAgent;
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\//i.test(ua)) return "Opera";
  if (/Chrome\//i.test(ua)) return "Chrome";
  if (/Safari\//i.test(ua)) return "Safari";
  if (/Firefox\//i.test(ua)) return "Firefox";
  return "Other";
}

/** 流量渠道：直接访问 / 搜索引擎 / 社交媒体 / 其他外链 */
function channel(): string {
  const ref = document.referrer;
  if (!ref) return "direct";
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "");
    if (/^(google|bing|baidu|duckduckgo|yahoo|yandex)\./.test(host)) return "search";
    if (/^(facebook|instagram|tiktok|twitter|x|linkedin|youtube|reddit)\./.test(host)) return "social";
    if (/^(wa|api)\.whatsapp\.com$/.test(host) || host === "web.whatsapp.com") return "whatsapp";
    return "referral";
  } catch {
    return "referral";
  }
}

/** UTM 归因：落地页抓取一次，整个会话携带（站内 hash 跳转不丢 query） */
function utmParams(): Record<string, string> {
  try {
    const saved = JSON.parse(sessionStorage.getItem(UTM_KEY) ?? "{}");
    if (saved && typeof saved === "object") return saved;
  } catch {
    /* ignore */
  }
  return {};
}

function captureUtm() {
  try {
    const sp = new URLSearchParams(location.search);
    const picked: Record<string, string> = {};
    for (const k of ["utm_source", "utm_medium", "utm_campaign"]) {
      const v = sp.get(k);
      if (v) picked[k] = v.slice(0, 120);
    }
    if (Object.keys(picked).length) sessionStorage.setItem(UTM_KEY, JSON.stringify(picked));
  } catch {
    /* ignore */
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
    const utm = utmParams();
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sid: sessionId(),
        visitor: visitorId(),
        device: deviceType(),
        os: osName(),
        browser: browserName(),
        channel: channel(),
        lang: navigator.language.slice(0, 8),
        utm,
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

/* ---------- 页面结算：有效停留时长 + 滚动深度 ---------- */

/** 结算当前可见段（切 Tab / 最小化时不累计） */
function settleSegment() {
  if (document.visibilityState !== "visible") return;
  visibleMs += Date.now() - segStart;
}

/**
 * final=true：离开页面（翻页/关闭）——发滚动深度并标记已结算；
 * final=false：仅切后台——先结算已积累的可见时长，可见后从 0 继续计。
 */
function settlePage(final: boolean) {
  if (settled) return;
  settleSegment();
  if (currentPage) {
    if (visibleMs > 1500) {
      enqueueCloud({ type: "dwell", page: currentPage, value: visibleMs });
      visibleMs = 0; // 已上报，下一段重新累计
    }
    if (final) {
      const bucket = maxScroll >= 100 ? 100 : maxScroll >= 75 ? 75 : maxScroll >= 50 ? 50 : maxScroll >= 25 ? 25 : 0;
      if (bucket) enqueueCloud({ type: "scroll", page: currentPage, value: bucket });
    }
  }
  if (final) {
    settled = true;
    // 问卷放弃：页面关闭时还有未提交的草稿
    try {
      if (sessionStorage.getItem("longview-biz-draft"))
        enqueueCloud({ type: "form_abandon", page: "/business", meta: "business" });
      if (sessionStorage.getItem("longview-leisure-draft"))
        enqueueCloud({ type: "form_abandon", page: "/leisure", meta: "leisure" });
    } catch {
      /* ignore */
    }
  }
}

/** 当前页面标识：干净路径（BrowserRouter），首页为 "/" */
function pageId(): string {
  return location.pathname || "/";
}

function enterPage(page: string) {
  currentPage = page;
  visibleMs = 0;
  segStart = Date.now();
  maxScroll = 0;
  settled = false;
  enqueueCloud({ type: "page_view", page });
  // 表单漏斗第一步：打开问卷（每个会话每个问卷只记一次）
  if (page === "/business" || page === "/leisure") {
    try {
      const flag = `longview-fv-${page}`;
      if (!sessionStorage.getItem(flag)) {
        sessionStorage.setItem(flag, "1");
        enqueueCloud({ type: "form_view", page });
      }
    } catch {
      /* ignore */
    }
  }
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

  captureUtm();
  enterPage(pageId());

  // BrowserRouter 的 pushState/replaceState 不触发原生事件，这里打补丁统一广播路由变化
  const emitNav = () => window.dispatchEvent(new Event("longview-nav"));
  for (const method of ["pushState", "replaceState"] as const) {
    const orig = history[method].bind(history);
    history[method] = (...args: Parameters<History["pushState"]>) => {
      const r = orig(...args);
      emitNav();
      return r;
    };
  }
  window.addEventListener("popstate", emitNav);
  window.addEventListener("longview-nav", () => {
    settlePage(true);
    enterPage(pageId());
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
      page: pageId(),
      meta: `${el.tagName.toLowerCase()}:${text}`,
    });
  }, { capture: true });

  // 表单漏斗第二步：聚焦表单输入框（只记字段名/类型，绝不记输入内容）
  document.addEventListener("focusin", (e) => {
    const el = e.target as HTMLElement;
    if (!/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
    if ((el as HTMLInputElement).type === "password") return;
    const id =
      el.getAttribute("name") || el.getAttribute("placeholder") || el.getAttribute("aria-label") || el.tagName.toLowerCase();
    enqueueCloud({
      type: "form_field",
      page: pageId(),
      meta: String(id).replace(/\s+/g, " ").trim().slice(0, 40),
    });
  }, { capture: true });

  // 切后台：结算当前可见段并暂停；回前台：开始新可见段
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      settlePage(false);
      void flushCloud();
    } else {
      segStart = Date.now();
    }
  });
  window.addEventListener("pagehide", () => {
    settlePage(true);
    void flushCloud();
  });

  setInterval(() => {
    sessionId(); // 续期会话时间戳
    void flushCloud();
  }, FLUSH_INTERVAL);
}
