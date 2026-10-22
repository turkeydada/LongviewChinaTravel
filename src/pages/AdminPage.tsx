import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bot,
  ChevronDown,
  ChevronUp,
  CloudDownload,
  Download,
  Lock,
  Plus,
  Printer,
  Trash2,
  X,
} from "lucide-react";
import {
  businessContent,
  getOverrides,
  hero,
  leisureContent,
  saveOverrides,
  site,
  type ConfigOverrides,
} from "@/config/site";
import { clearEvents, getEvents } from "@/lib/analytics";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/* ---------- 云端行为分析数据形状（/api/analytics 返回） ---------- */

type AnalyticsData = {
  rangeDays: number;
  totals: {
    views: number;
    visitors: number;
    sessions: number;
    bouncePct: number;
    newPct: number;
    leads: number;
    abandons: number;
    bots: number;
  };
  trend: { d: string; c: number }[];
  devices: { k: string; c: number; u: number }[];
  channels: { k: string; c: number; u: number }[];
  countries: { k: string; c: number; u: number }[];
  cities: { k: string; c: number; u: number }[];
  pages: { page: string; views: number; users: number; avgDwell: number; maxDwell: number; avgScroll: number }[];
  clicks: { k: string; c: number; u: number }[];
  interests: { k: string; c: number; u: number }[];
  funnel: { landed: number; viewed: number; fielded: number; submitted: number };
  utmSources: { k: string; u: number; conv: number }[];
  utmMedia: { k: string; u: number; conv: number }[];
};

/** 会话明细（/api/sessions 单行） */
type SessionRow = {
  sid: string; started_at: number; last_ts: number; dwell_ms: number; pages: number; events: number;
  country: string; region: string; city: string; device: string; os: string; browser: string;
  channel: string; utm_source: string; utm_medium: string; lang: string;
  submitted: number; abandoned: number;
  clicks: number; interactions: number; is_bot: number;
};

/** 单会话旅程事件（/api/session 单行） */
type SessionEvent = {
  ts: number; type: string; page: string; meta: string; value: number;
  country: string; city: string; device: string; os: string; browser: string; lang: string;
};

const EVENT_LABELS: Record<string, string> = {
  page_view: "打开页面",
  dwell: "停留",
  scroll: "滚动深度",
  click: "点击",
  interest: "服务兴趣",
  journey: "出行选择",
  lang_switch: "切换语言",
  form_view: "打开问卷",
  form_field: "填写字段",
  form_abandon: "放弃问卷",
  form_submit: "提交问卷",
};

const DEVICE_LABELS: Record<string, string> = { mobile: "手机", desktop: "电脑", tablet: "平板" };
const CHANNEL_LABELS: Record<string, string> = {
  direct: "直接访问",
  search: "搜索引擎",
  social: "社交媒体",
  referral: "外部链接",
  whatsapp: "WhatsApp",
};

const CHART_TIP = {
  contentStyle: {
    background: "#0a0a0a",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 12,
    fontSize: 12,
  },
  labelStyle: { color: "#a3a3a3" },
  itemStyle: { color: "#fff" },
};

/** 横向占比条（设备 / 渠道 / 地区分布共用） */
function ShareBars({ title, items, labels }: {
  title: string;
  items: { k: string; c: number }[];
  labels?: Record<string, string>;
}) {
  const max = Math.max(1, ...items.map((i) => i.c));
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{title}</p>
      <div className="mt-4 space-y-3">
        {items.map((i) => (
          <div key={i.k || "?"}>
            <div className="flex justify-between text-xs">
              <span className="text-neutral-300">{(labels?.[i.k] ?? i.k) || "未知"}</span>
              <span className="text-neutral-500">{i.c}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-white/80" style={{ width: `${(i.c / max) * 100}%` }} />
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-neutral-600">暂无数据</p>}
      </div>
    </div>
  );
}

/**
 * 后台控制台 v1（浏览器本地版）：
 * - 数据看板：访问量、页面分布、旅游/商业点击、提交数、兴趣点击排行
 * - 询盘列表：表单提交的客户需求，可导出 CSV
 * - 内容管理：修改站点文案/邮箱/社媒链接/首屏素材，保存后全站生效（无需重新构建）
 *
 * 安全说明：当前为前端本地版，密码仅防君子不防小人；接入真实后端后换成服务端鉴权。
 * 默认密码 longview2026，请尽快修改（改下面 ADMIN_PASSWORD 常量）。
 */

const DEFAULT_PASSWORD = "longview2026";
const PW_KEY = "longview-admin-pw";
const AUTH_KEY = "longview-admin-auth";

function getPassword(): string {
  return localStorage.getItem(PW_KEY) ?? DEFAULT_PASSWORD;
}

type Lead = {
  type: string;
  interests: string[];
  city?: string;
  dates?: string;
  name?: string;
  email?: string;
  contact?: string;
  message?: string;
  details?: { label: string; value: string }[];
  submittedAt: string;
};

function getLeads(): Lead[] {
  try {
    return JSON.parse(localStorage.getItem("longview-leads") ?? "[]");
  } catch {
    return [];
  }
}

/* ---------- 云端同步（Cloudflare D1） ---------- */

const TOKEN_KEY = "longview-admin-token"; // 后台读取密码（与 Pages 环境变量 ADMIN_TOKEN 一致）
const SINCE_KEY = "longview-cloud-since"; // 上次同步到的位置，增量拉取

function getCloudToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? "";
}
function getCloudSince(): number {
  return Number(localStorage.getItem(SINCE_KEY) ?? 0) || 0;
}

/** 把云端拉到的询盘合并进本地（字段补默认值 + 按 submittedAt + email 去重） */
function mergeLeads(remote: Lead[]): number {
  if (!remote.length) return 0;
  const local = getLeads();
  const seen = new Set(local.map((l) => `${l.submittedAt}|${l.email}`));
  const fresh = remote
    .filter((l) => l && !seen.has(`${l.submittedAt}|${l.email}`))
    .map((l) => ({
      city: "",
      dates: "",
      contact: "",
      message: "",
      ...l,
      interests: Array.isArray(l.interests) ? l.interests : [],
      details: Array.isArray(l.details) ? l.details : [],
    }));
  if (fresh.length) {
    localStorage.setItem("longview-leads", JSON.stringify([...local, ...fresh]));
  }
  return fresh.length;
}

function StatCard({ label, value, title }: { label: string; value: string | number; title?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6" title={title}>
      <p className="text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-neutral-500">{label}</p>
    </div>
  );
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(sessionStorage.getItem(AUTH_KEY) === "1");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [tick, setTick] = useState(0); // 数据变化后强制刷新
  const [cloudToken, setCloudToken] = useState(getCloudToken());
  const [cloudMsg, setCloudMsg] = useState("");
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsMsg, setAnalyticsMsg] = useState("");
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [sessionsMsg, setSessionsMsg] = useState("");
  const [showBots, setShowBots] = useState(false);
  const [expandedSid, setExpandedSid] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = useState<Record<string, SessionEvent[]>>({});
  const [exporting, setExporting] = useState("");

  // 已保存云端密码 → 登录后自动加载行为分析 + 会话明细
  useEffect(() => {
    if (authed && getCloudToken()) {
      void loadAnalytics(true);
      void loadSessions(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  /** 从 Cloudflare D1 拉取访客行为聚合数据（六大板块） */
  const loadAnalytics = async (silent = false) => {
    const token = getCloudToken();
    if (!token) return;
    if (!silent) setAnalyticsMsg("加载中…");
    try {
      const res = await fetch("/api/analytics?days=30", {
        headers: { "X-Admin-Token": token },
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setAnalytics(data);
        setAnalyticsMsg("");
      } else if (!silent) {
        setAnalyticsMsg("数据面板加载失败（确认已建 visit_log 数据表并重新部署，见部署指南附录）");
      }
    } catch {
      if (!silent) setAnalyticsMsg("网络错误，稍后重试");
    }
  };

  /** 访客会话明细列表（最近 50 条） */
  const loadSessions = async (silent = false) => {
    const token = getCloudToken();
    if (!token) return;
    if (!silent) setSessionsMsg("加载中…");
    try {
      const res = await fetch("/api/sessions?limit=50&days=30", {
        headers: { "X-Admin-Token": token },
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setSessions(Array.isArray(data.sessions) ? data.sessions : []);
        setSessionsMsg("");
      } else if (!silent) {
        setSessionsMsg("会话列表加载失败（确认已建 visit_log 数据表）");
      }
    } catch {
      if (!silent) setSessionsMsg("网络错误，稍后重试");
    }
  };

  /** 展开单会话完整旅程 */
  const toggleSession = async (sid: string) => {
    if (expandedSid === sid) {
      setExpandedSid(null);
      return;
    }
    setExpandedSid(sid);
    if (sessionDetail[sid]) return;
    const token = getCloudToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/session?sid=${encodeURIComponent(sid)}`, {
        headers: { "X-Admin-Token": token },
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setSessionDetail((m) => ({ ...m, [sid]: Array.isArray(data.events) ? data.events : [] }));
      }
    } catch {
      /* 展开失败保持收起状态即可 */
    }
  };

  /** 一键导出 CSV（访问日志 / 询盘） */
  const exportCsvCloud = async (kind: "visits" | "leads") => {
    const token = getCloudToken();
    if (!token || exporting) return;
    setExporting(kind);
    try {
      const res = await fetch(`/api/export?kind=${kind}`, {
        headers: { "X-Admin-Token": token },
      });
      if (!res.ok) {
        setSessionsMsg(res.status === 401 ? "导出失败：云端密码不对" : "导出失败，稍后重试");
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const m = /filename="([^"]+)"/.exec(cd);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = m?.[1] ?? `${kind}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      setSessionsMsg("网络错误，导出失败");
    } finally {
      setExporting("");
    }
  };

  const events = useMemo(() => getEvents(), [tick]);
  const leads = useMemo(() => getLeads(), [tick]);

  const pageViews = events.filter((e) => e.type === "page_view");
  const uniqueSessions = new Set(events.map((e) => e.session)).size;
  const chooses = events.filter((e) => e.type === "journey_choose");
  const interestClicks = events.filter((e) => e.type === "interest_click");

  const viewsByPage = pageViews.reduce<Record<string, number>>((acc, e) => {
    const key = e.meta ?? e.page;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const choosesByType = chooses.reduce<Record<string, number>>((acc, e) => {
    if (e.meta) acc[e.meta] = (acc[e.meta] ?? 0) + 1;
    return acc;
  }, {});
  const topInterests = Object.entries(
    interestClicks.reduce<Record<string, number>>((acc, e) => {
      if (e.meta) acc[e.meta] = (acc[e.meta] ?? 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const tryLogin = () => {
    if (password === getPassword()) {
      sessionStorage.setItem(AUTH_KEY, "1");
      setAuthed(true);
    } else {
      setLoginError(true);
    }
  };

  /** 从 Cloudflare D1 云端数据库拉取询盘（增量：只拉上次同步之后的新数据） */
  const syncFromCloud = async () => {
    const token = cloudToken.trim();
    if (!token) {
      setCloudMsg("请先输入云端读取密码（见部署指南第 4 步设置的环境变量 ADMIN_TOKEN）");
      return;
    }
    setCloudSyncing(true);
    setCloudMsg("同步中…");
    try {
      const res = await fetch(`/api/leads?since=${getCloudSince()}`, {
        headers: { "X-Admin-Token": token },
      });
      const data = await res.json().catch(() => null);
      if (res.status === 401) {
        setCloudMsg("密码不对（要与 Cloudflare 后台设置的 ADMIN_TOKEN 一致）");
      } else if (!res.ok || !data?.success) {
        setCloudMsg("同步失败：云端接口不可用（确认已按部署指南完成 Pages 绑定并重新部署）");
      } else {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(SINCE_KEY, String(data.serverTime ?? Date.now()));
        const added = mergeLeads(data.leads ?? []);
        setCloudMsg(added > 0 ? `同步成功，新增 ${added} 条询盘` : "同步成功，没有新询盘");
        setTick((t) => t + 1);
      }
    } catch {
      setCloudMsg("网络错误，稍后重试");
    } finally {
      setCloudSyncing(false);
    }
  };

  const exportCsv = () => {
    const header = "type,name,email,contact,city,dates,interests,message,details,submittedAt";
    const rows = leads.map((l) =>
      [
        l.type,
        l.name,
        l.email,
        l.contact,
        l.city,
        l.dates,
        (l.interests ?? []).join("; "),
        l.message,
        (l.details ?? []).map((d) => `${d.label}: ${d.value}`).join(" | "),
        l.submittedAt,
      ]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([["﻿" + header, ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "longview-leads.csv";
    a.click();
  };

  /** 打印 / 另存为 PDF：新开窗口渲染完整总表，浏览器打印对话框可选“保存为 PDF” */
  const printLead = (l: Lead) => {
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const rows = (l.details ?? [])
      .map(
        (d) =>
          `<tr><th>${esc(d.label)}</th><td>${esc(d.value).replace(/\n/g, "<br/>")}</td></tr>`
      )
      .join("");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>Lead — ${esc(
      l.name ?? ""
    )}</title><style>
      body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#111;max-width:760px;margin:40px auto;padding:0 24px}
      h1{font-size:20px;margin:0 0 4px}
      p.meta{color:#666;font-size:12px;margin:0 0 24px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th{text-align:left;vertical-align:top;width:38%;padding:10px 12px;border:1px solid #ddd;background:#f7f7f7;font-weight:600}
      td{padding:10px 12px;border:1px solid #ddd}
    </style></head><body>
      <h1>Longview China Travel — ${l.type === "business" ? "Business" : "Leisure"} Request</h1>
      <p class="meta">${esc(l.name ?? "")} · ${esc(l.email ?? "")} · ${esc(
        l.contact ?? ""
      )} · ${new Date(l.submittedAt).toLocaleString()}</p>
      <table>${rows}</table>
      <script>window.onload = function () { window.print(); };</script>
    </body></html>`);
    w.document.close();
  };

  if (!authed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black font-sans text-white">
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-10">
          <Lock size={22} className="text-neutral-500" />
          <h1 className="mt-6 text-2xl font-semibold">Admin Console</h1>
          <p className="mt-2 text-sm text-neutral-500">Enter your password to continue.</p>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setLoginError(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && tryLogin()}
            placeholder="Password"
            className="mt-6 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-white/40"
          />
          {loginError && <p className="mt-3 text-sm text-red-400">Wrong password.</p>}
          <button
            onClick={tryLogin}
            className="mt-6 w-full rounded-full bg-white py-3 text-sm font-semibold text-black hover:bg-white/85"
          >
            Sign in
          </button>
          <Link to="/" className="mt-6 flex items-center gap-2 text-sm text-neutral-500 hover:text-white">
            <ArrowLeft size={14} /> Back to site
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-16 font-sans text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Admin Console</h1>
            <p className="mt-2 text-sm text-neutral-500">
              本地数据版 · 数据保存在当前浏览器，接入后端后全设备共享
            </p>
          </div>
          <Link to="/" className="flex items-center gap-2 text-sm text-neutral-500 hover:text-white">
            <ArrowLeft size={14} /> Back to site
          </Link>
        </div>

        {/* 数据看板 */}
        <h2 className="mt-14 text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
          Analytics
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Page views" value={pageViews.length} />
          <StatCard label="Unique visitors" value={uniqueSessions} />
          <StatCard label="Journey clicks" value={chooses.length} />
          <StatCard label="Requests submitted" value={leads.length} />
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Views by page</p>
            <ul className="mt-4 space-y-2 text-sm">
              {Object.entries(viewsByPage).map(([k, v]) => (
                <li key={k} className="flex justify-between">
                  <span className="text-neutral-400">{k}</span>
                  <span>{v}</span>
                </li>
              ))}
              {pageViews.length === 0 && <li className="text-neutral-600">No data yet</li>}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Leisure vs Business</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex justify-between">
                <span className="text-neutral-400">Leisure</span>
                <span>{choosesByType.leisure ?? 0}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-neutral-400">Business</span>
                <span>{choosesByType.business ?? 0}</span>
              </li>
            </ul>
            <button
              onClick={() => {
                clearEvents();
                setTick((t) => t + 1);
              }}
              className="mt-6 flex items-center gap-2 text-xs text-neutral-500 hover:text-red-400"
            >
              <Trash2 size={12} /> Clear analytics
            </button>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Top interests</p>
            <ul className="mt-4 space-y-2 text-sm">
              {topInterests.map(([k, v]) => (
                <li key={k} className="flex justify-between">
                  <span className="text-neutral-400">{k}</span>
                  <span>{v}</span>
                </li>
              ))}
              {topInterests.length === 0 && <li className="text-neutral-600">No data yet</li>}
            </ul>
          </div>
        </div>

        {/* 云端同步：从 Cloudflare D1 拉取所有访客的提交 */}
        <div className="mt-14 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-wrap items-center gap-4">
            <CloudDownload size={18} className="text-neutral-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">云端询盘同步（Cloudflare D1）</p>
              <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                访客在任何设备上提交的表单都会自动存入云端数据库（电脑关机也照收）。
                点「从云端同步」把新询盘拉到这里，可随时导出 CSV 或打印 PDF。
              </p>
            </div>
            <input
              type="password"
              value={cloudToken}
              onChange={(e) => setCloudToken(e.target.value)}
              placeholder="云端读取密码 ADMIN_TOKEN"
              className="w-56 rounded-xl border border-white/15 bg-black/40 px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-white/50"
            />
            <button
              onClick={syncFromCloud}
              disabled={cloudSyncing}
              className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition enabled:hover:bg-white/85 disabled:opacity-40"
            >
              <CloudDownload size={14} />
              {cloudSyncing ? "同步中…" : "从云端同步"}
            </button>
          </div>
          {cloudMsg && (
            <p className="mt-3 text-xs text-neutral-400">{cloudMsg}</p>
          )}
        </div>

        {/* 数据分析面板（云端 · 近 30 天） */}
        <div className="mt-14 flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
            数据分析（云端 · 近 {analytics?.rangeDays ?? 30} 天）
          </h2>
          <button
            onClick={() => void loadAnalytics()}
            className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white"
          >
            <CloudDownload size={12} /> 刷新数据
          </button>
        </div>
        {analyticsMsg && <p className="mt-3 text-xs text-neutral-500">{analyticsMsg}</p>}
        {!analytics && !analyticsMsg && (
          <p className="mt-3 text-xs text-neutral-600">
            在上方「云端询盘同步」面板输入 ADMIN_TOKEN 密码后自动加载。
          </p>
        )}

        {analytics && (
          <div className="mt-6 space-y-8">
            {/* ① 访客概览 */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-4">
              <StatCard label="总访问量" value={analytics.totals.views} />
              <StatCard label="独立访客" value={analytics.totals.visitors} />
              <StatCard label="会话数" value={analytics.totals.sessions} />
              <StatCard label="跳出率" value={`${analytics.totals.bouncePct}%`} />
              <StatCard label="新访客占比" value={`${analytics.totals.newPct}%`} />
              <StatCard label="表单提交" value={analytics.totals.leads} />
              <StatCard
                label={`表单放弃率（${analytics.totals.abandons} 次）`}
                title={`${analytics.totals.abandons} 位访客打开了问卷但没有提交`}
                value={`${
                  analytics.totals.leads + analytics.totals.abandons > 0
                    ? Math.round((analytics.totals.abandons / (analytics.totals.leads + analytics.totals.abandons)) * 100)
                    : 0
                }%`}
              />
              <StatCard
                label="疑似机器人会话"
                title="停留不足 2 秒且无任何点击/表单交互的会话，多为互联网自动扫描器，不代表真实客户"
                value={analytics.totals.bots ?? 0}
              />
            </div>

            {/* 每日趋势折线 */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">每日访问趋势</p>
              <div className="mt-4 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.trend.map((t) => ({ d: t.d.slice(5), views: t.c }))}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="d" tick={{ fill: "#737373", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#737373", fontSize: 11 }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
                    <Tooltip {...CHART_TIP} />
                    <Line type="monotone" dataKey="views" stroke="#fff" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ② 页面行为 + ③ 交互事件 */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">页面停留分析</p>
                <table className="mt-4 w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wider text-neutral-600">
                      <th className="py-2 pr-2">页面</th>
                      <th className="py-2 pr-2">访问</th>
                      <th className="py-2 pr-2">平均停留</th>
                      <th className="py-2 pr-2">最长</th>
                      <th className="py-2">滚动</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.pages.map((p) => (
                      <tr key={p.page} className="border-t border-white/5 text-neutral-300">
                        <td className="py-2.5 pr-2 font-mono text-xs">{p.page.replace(/^#\//, "/")}</td>
                        <td className="py-2.5 pr-2">{p.views}</td>
                        <td className="py-2.5 pr-2">{p.avgDwell}s</td>
                        <td className="py-2.5 pr-2">{p.maxDwell}s</td>
                        <td className="py-2.5">{p.avgScroll}%</td>
                      </tr>
                    ))}
                    {analytics.pages.length === 0 && (
                      <tr><td colSpan={5} className="py-6 text-center text-xs text-neutral-600">暂无数据</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">按钮 / 链接点击排行</p>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analytics.clicks.slice(0, 8).map((c) => ({
                        name: c.k.replace(/^(a|button):/, "").slice(0, 18),
                        clicks: c.c,
                      }))}
                      layout="vertical"
                      margin={{ left: 8, right: 16 }}
                    >
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: "#737373", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                      <Tooltip {...CHART_TIP} />
                      <Bar dataKey="clicks" fill="#fff" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 服务兴趣 + 流量来源 */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">服务选项兴趣（行程设计 / 包车等）</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {analytics.interests.map((i) => (
                    <li key={i.k} className="flex items-center justify-between">
                      <span className="text-neutral-300">{i.k}</span>
                      <span className="text-neutral-500">{i.c} 次 · {i.u} 人</span>
                    </li>
                  ))}
                  {analytics.interests.length === 0 && <li className="text-xs text-neutral-600">暂无数据</li>}
                </ul>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:col-span-1">
                <ShareBars title="设备类型" items={analytics.devices ?? []} labels={DEVICE_LABELS} />
                <ShareBars title="流量渠道" items={analytics.channels ?? []} labels={CHANNEL_LABELS} />
                <ShareBars title="国家 / 地区 Top10" items={analytics.countries ?? []} />
                <ShareBars title="城市 Top10" items={analytics.cities ?? []} />
              </div>
            </div>

            {/* ④ 表单流失漏斗 */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                表单流失漏斗（近 {analytics.rangeDays} 天 · 按会话）
              </p>
              <div className="mt-5 space-y-4">
                {(() => {
                  const f = analytics.funnel ?? { landed: 0, viewed: 0, fielded: 0, submitted: 0 };
                  const steps: { label: string; v: number; hint: string }[] = [
                    { label: "① 落地网站", v: f.landed, hint: "打开任意页面" },
                    { label: "② 打开问卷", v: f.viewed, hint: "进入 Business / Leisure 向导" },
                    { label: "③ 开始填写", v: f.fielded, hint: "聚焦过输入框" },
                    { label: "④ 提交成功", v: f.submitted, hint: "完成并发送需求" },
                  ];
                  const base = Math.max(1, f.landed);
                  return steps.map((s, i) => {
                    const prev = i === 0 ? s.v : steps[i - 1].v;
                    const stepPct = prev ? Math.round((s.v / prev) * 100) : 0;
                    const totalPct = Math.round((s.v / base) * 100);
                    return (
                      <div key={s.label}>
                        <div className="flex items-baseline justify-between text-sm">
                          <span className="text-neutral-200">
                            {s.label}
                            <span className="ml-2 text-xs text-neutral-600">{s.hint}</span>
                          </span>
                          <span className="text-neutral-400">
                            {s.v} 会话
                            {i > 0 && <span className="ml-2 text-neutral-600">上一步转化 {stepPct}% · 总转化 {totalPct}%</span>}
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-white/80 transition-all" style={{ width: `${Math.max(2, totalPct)}%` }} />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* ⑤ UTM 渠道归因 */}
            <div className="grid gap-6 lg:grid-cols-2">
              {[
                { title: "UTM 来源归因 Top12", rows: analytics.utmSources ?? [] },
                { title: "UTM 媒介归因 Top12", rows: analytics.utmMedia ?? [] },
              ].map((sec) => (
                <div key={sec.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{sec.title}</p>
                  <table className="mt-4 w-full text-left text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-wider text-neutral-600">
                        <th className="py-2 pr-2">来源</th>
                        <th className="py-2 pr-2">会话数</th>
                        <th className="py-2">提交转化</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sec.rows.map((r) => (
                        <tr key={r.k} className="border-t border-white/5 text-neutral-300">
                          <td className="py-2.5 pr-2 font-mono text-xs">{r.k}</td>
                          <td className="py-2.5 pr-2">{r.u}</td>
                          <td className="py-2.5">
                            {r.conv}
                            <span className="ml-2 text-xs text-neutral-600">
                              {r.u ? Math.round((r.conv / r.u) * 100) : 0}%
                            </span>
                          </td>
                        </tr>
                      ))}
                      {sec.rows.length === 0 && (
                        <tr><td colSpan={3} className="py-6 text-center text-xs text-neutral-600">暂无 UTM 数据（在推广链接上加 ?utm_source=linkedin 等参数后自动统计）</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 访客会话明细（云端 · 最近 50 条） */}
        <div className="mt-14 flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
            访客会话明细（云端 · 近 30 天）
          </h2>
          <div className="flex items-center gap-4">
            {sessions && (sessions.filter((s) => s.is_bot).length > 0 || showBots) && (
              <button
                onClick={() => setShowBots((v) => !v)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${
                  showBots
                    ? "border-white/40 text-white"
                    : "border-white/15 text-neutral-400 hover:text-white"
                }`}
              >
                <Bot size={12} />
                {showBots
                  ? "隐藏机器人"
                  : `显示机器人（${sessions.filter((s) => s.is_bot).length}）`}
              </button>
            )}
            <button
              onClick={() => void exportCsvCloud("visits")}
              disabled={!!exporting}
              className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white disabled:opacity-40"
            >
              <Download size={12} /> {exporting === "visits" ? "导出中…" : "导出访问日志 CSV"}
            </button>
            <button
              onClick={() => void exportCsvCloud("leads")}
              disabled={!!exporting}
              className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white disabled:opacity-40"
            >
              <Download size={12} /> {exporting === "leads" ? "导出中…" : "导出全部询盘 CSV"}
            </button>
            <button
              onClick={() => void loadSessions()}
              className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white"
            >
              <CloudDownload size={12} /> 刷新
            </button>
          </div>
        </div>
        {sessionsMsg && <p className="mt-3 text-xs text-neutral-500">{sessionsMsg}</p>}
        {!sessions && !sessionsMsg && (
          <p className="mt-3 text-xs text-neutral-600">在上方「云端询盘同步」面板输入 ADMIN_TOKEN 密码后自动加载。</p>
        )}
        {sessions && (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-neutral-500">
                  <th className="px-4 py-3">访问时间</th>
                  <th className="px-4 py-3">地区</th>
                  <th className="px-4 py-3">设备 / 浏览器</th>
                  <th className="px-4 py-3">页面数</th>
                  <th className="px-4 py-3">停留时长</th>
                  <th className="px-4 py-3">渠道 / UTM</th>
                  <th className="px-4 py-3">表单结果</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {sessions.filter((s) => showBots || !s.is_bot).map((s) => (
                  <Fragment key={s.sid}>
                    <tr className="border-b border-white/5 text-neutral-300">
                      <td className="px-4 py-3 text-neutral-400">
                        {new Date(s.started_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {[s.city, s.region, s.country].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {DEVICE_LABELS[s.device] ?? s.device}
                        <span className="ml-1 text-xs text-neutral-500">{[s.os, s.browser].filter(Boolean).join(" · ")}</span>
                      </td>
                      <td className="px-4 py-3">{s.pages}</td>
                      <td className="px-4 py-3">{Math.round((s.dwell_ms ?? 0) / 1000)}s</td>
                      <td className="px-4 py-3 text-xs text-neutral-500">
                        {CHANNEL_LABELS[s.channel] ?? s.channel}
                        {s.utm_source && <span className="ml-1 rounded bg-white/10 px-1.5 py-0.5 font-mono">{s.utm_source}</span>}
                      </td>
                      <td className="px-4 py-3">
                        {s.is_bot ? (
                          <span className="rounded-full bg-neutral-500/15 px-2.5 py-1 text-xs text-neutral-400">疑似机器人</span>
                        ) : s.submitted > 0 ? (
                          <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs text-emerald-300">已提交</span>
                        ) : s.abandoned > 0 ? (
                          <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-xs text-amber-300">填了没提交</span>
                        ) : (
                          <span className="text-xs text-neutral-600">仅浏览</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => void toggleSession(s.sid)}
                          className="flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-xs text-neutral-300 transition hover:bg-white/10"
                        >
                          {expandedSid === s.sid ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          旅程
                        </button>
                      </td>
                    </tr>
                    {expandedSid === s.sid && (
                      <tr className="border-b border-white/5 bg-black/40">
                        <td colSpan={8} className="px-6 py-4">
                          {!sessionDetail[s.sid] ? (
                            <p className="text-xs text-neutral-500">加载中…</p>
                          ) : (
                            <div className="space-y-1.5">
                              {sessionDetail[s.sid].map((ev, i) => (
                                <div key={i} className="flex flex-wrap items-baseline gap-x-3 text-xs">
                                  <span className="font-mono text-neutral-600">
                                    {new Date(ev.ts).toLocaleTimeString()}
                                  </span>
                                  <span className="w-20 shrink-0 text-neutral-400">{EVENT_LABELS[ev.type] ?? ev.type}</span>
                                  <span className="font-mono text-neutral-500">{ev.page.replace(/^#\//, "/")}</span>
                                  {ev.meta && <span className="text-neutral-300">{ev.meta}</span>}
                                  {ev.type === "dwell" && <span className="text-neutral-500">{Math.round(ev.value / 1000)}s</span>}
                                  {ev.type === "scroll" && <span className="text-neutral-500">{ev.value}%</span>}
                                </div>
                              ))}
                              {sessionDetail[s.sid].length === 0 && (
                                <p className="text-xs text-neutral-600">该会话没有更多事件。</p>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {sessions.filter((s) => showBots || !s.is_bot).length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-neutral-600">
                      {sessions.length > 0
                        ? "没有真实访客会话——列表里的全部是疑似机器人（点右上角「显示机器人」可查看）。"
                        : "近 30 天暂无访客会话（建表并重新部署后开始收集）。"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 询盘列表 */}
        <div className="mt-14 flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
            Leads（{leads.length}）
          </h2>
          <div className="flex gap-4">
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white"
            >
              <Download size={12} /> Export CSV
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("longview-leads");
                setTick((t) => t + 1);
              }}
              className="flex items-center gap-2 text-xs text-neutral-500 hover:text-red-400"
            >
              <Trash2 size={12} /> Clear leads
            </button>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-neutral-500">
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">City / Dates</th>
                <th className="px-4 py-3">Interests</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Sheet</th>
              </tr>
            </thead>
            <tbody>
              {[...leads].reverse().map((l, i) => (
                <tr key={i} className="border-b border-white/5 text-neutral-300">
                  <td className="px-4 py-3 capitalize">{l.type}</td>
                  <td className="px-4 py-3">{l.name}</td>
                  <td className="px-4 py-3">{l.email}</td>
                  <td className="px-4 py-3">
                    {l.city}
                    {l.dates ? ` · ${l.dates}` : ""}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{(l.interests ?? []).join(", ")}</td>
                  <td className="px-4 py-3 text-neutral-500">
                    {new Date(l.submittedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {l.details && l.details.length > 0 ? (
                      <button
                        onClick={() => printLead(l)}
                        className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs text-neutral-300 transition hover:bg-white/10"
                      >
                        <Printer size={12} /> PDF / 打印
                      </button>
                    ) : (
                      <span className="text-xs text-neutral-700">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-neutral-600">
                    No leads yet — submitted requests appear here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 内容管理：傻瓜式选项编辑器 */}
        <h2 className="mt-14 text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
          互动选项管理
        </h2>
        <p className="mt-2 text-sm text-neutral-500">
          不用写代码，直接增删改 Business 向导里的按钮选项。输入文字 → 点「添加」；
          ↑↓ 调整顺序，× 删除。改完点「保存并生效」刷新网站即可看到。
        </p>
        <OptionManager />
        <LeisureOptionManager />
        <PasswordSection />

        <details className="mt-10">
          <summary className="cursor-pointer text-xs font-medium uppercase tracking-[0.3em] text-neutral-500 hover:text-white">
            高级模式（JSON 编辑，不懂勿动）
          </summary>
          <ContentEditor />
        </details>
      </div>
    </main>
  );
}

/* ---------------------------------------------------------------------------
 * 傻瓜式互动选项编辑器
 * 对应 Business 向导的四个可配置列表：来访目的 / 服务项目 / 人员要求 / 目标城市
 * ------------------------------------------------------------------------- */

type OptionRow = { en?: string; zh?: string; name?: string; note?: string; image?: string };

const OPTION_GROUPS: {
  key: "purposes" | "services" | "personnelOptions" | "cities";
  title: string;
  desc: string;
  labelA: string;
  labelB: string;
  withNote?: boolean;
}[] = [
  {
    key: "purposes",
    title: "① 来访目的选项",
    desc: "出现在向导「此次来访的目的是什么？」步骤",
    labelA: "英文（必填）",
    labelB: "中文（选填）",
  },
  {
    key: "services",
    title: "② 服务项目选项",
    desc: "出现在向导「我们可以怎么帮您？」步骤；选中带 * 标记的服务才会出现「人员要求」步骤",
    labelA: "英文（必填）",
    labelB: "中文（选填）",
  },
  {
    key: "personnelOptions",
    title: "③ 人员要求选项",
    desc: "出现在「对服务人员的要求？」步骤",
    labelA: "英文（必填）",
    labelB: "中文（选填）",
    withNote: true,
  },
  {
    key: "cities",
    title: "④ 目标城市",
    desc: "城市九宫格里显示的卡片",
    labelA: "英文名（必填）",
    labelB: "中文名（选填）",
  },
];

const PERSONNEL_SERVICES_NOTE =
  "注意：服务项目的英文名称是系统识别的关键。改名等于新增一个全新服务，「人员要求」步骤的联动需要重新勾选。";

function OptionManager() {
  const [data, setData] = useState<Record<string, OptionRow[]>>(() => ({
    purposes: businessContent.purposes.map((o) => ({ ...o })),
    services: businessContent.services.map((o) => ({ ...o })),
    personnelOptions: businessContent.personnelOptions.map((o) => ({ ...o })),
    cities: businessContent.cities.map((o) => ({ ...o })),
  }));
  const [draft, setDraft] = useState<Record<string, { a: string; b: string; note: string }>>({
    purposes: { a: "", b: "", note: "" },
    services: { a: "", b: "", note: "" },
    personnelOptions: { a: "", b: "", note: "" },
    cities: { a: "", b: "", note: "" },
  });
  const [status, setStatus] = useState<string>("");

  const mainKey = (row: OptionRow) => (row.en ?? row.name ?? "").trim();
  const secondKey = (row: OptionRow) => (row.zh ?? "").trim();

  const update = (key: string, rows: OptionRow[]) =>
    setData((d) => ({ ...d, [key]: rows }));

  const move = (key: string, i: number, dir: -1 | 1) => {
    const rows = [...data[key]];
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    [rows[i], rows[j]] = [rows[j], rows[i]];
    update(key, rows);
  };

  const remove = (key: string, i: number, label: string) => {
    if (!window.confirm(`确定删除「${label}」吗？删除后保存即生效。`)) return;
    update(key, data[key].filter((_, idx) => idx !== i));
  };

  const patch = (key: string, i: number, field: string, value: string) => {
    const rows = [...data[key]];
    rows[i] = { ...rows[i], [field]: value };
    update(key, rows);
  };

  const add = (key: string) => {
    const d = draft[key];
    const a = d.a.trim();
    if (!a) return;
    const row: OptionRow =
      key === "cities"
        ? { name: a, zh: d.b.trim(), image: "" }
        : { en: a, zh: d.b.trim(), ...(d.note ? { note: d.note } : {}) };
    update(key, [...data[key], row]);
    setDraft((s) => ({ ...s, [key]: { a: "", b: "", note: "" } }));
  };

  const handleSave = () => {
    const o = getOverrides();
    saveOverrides({
      ...o,
      businessContent: {
        cities: data.cities.map((c) => ({ name: c.name ?? "", zh: c.zh ?? "", image: c.image ?? "" })),
        purposes: data.purposes.map((p) => ({ en: p.en ?? "", zh: p.zh ?? "" })),
        services: data.services.map((s) => ({ en: s.en ?? "", zh: s.zh ?? "" })),
        personnelOptions: data.personnelOptions.map((p) => {
          const row: { en: string; zh: string; note?: "language" | "age" } = {
            en: p.en ?? "",
            zh: p.zh ?? "",
          };
          if (p.note === "language" || p.note === "age") row.note = p.note;
          return row;
        }),
      },
    });
    setStatus("已保存，正在刷新…");
    setTimeout(() => location.reload(), 600);
  };

  const inputCls =
    "w-full min-w-0 rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm outline-none focus:border-white/30";

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-amber-300/20 bg-amber-300/5 px-5 py-3">
        <p className="text-xs leading-relaxed text-amber-200/80">{PERSONNEL_SERVICES_NOTE}</p>
      </div>

      {OPTION_GROUPS.map((g) => (
        <div key={g.key} className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm font-semibold">{g.title}</p>
          <p className="mt-1 text-xs text-neutral-500">{g.desc}</p>

          <div className="mt-4 space-y-2">
            {data[g.key].map((row, i) => (
              <div key={`${mainKey(row)}-${i}`} className="flex flex-wrap items-center gap-2">
                <div className="flex flex-col">
                  <button
                    type="button"
                    title="上移"
                    onClick={() => move(g.key, i, -1)}
                    className="text-neutral-600 hover:text-white"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    title="下移"
                    onClick={() => move(g.key, i, 1)}
                    className="text-neutral-600 hover:text-white"
                  >
                    <ArrowDown size={13} />
                  </button>
                </div>
                <input
                  value={mainKey(row)}
                  placeholder={g.labelA}
                  onChange={(e) => patch(g.key, i, g.key === "cities" ? "name" : "en", e.target.value)}
                  className={inputCls}
                />
                <input
                  value={secondKey(row)}
                  placeholder={g.labelB}
                  onChange={(e) => patch(g.key, i, "zh", e.target.value)}
                  className={inputCls}
                />
                {g.withNote && (
                  <select
                    value={row.note ?? ""}
                    onChange={(e) => patch(g.key, i, "note", e.target.value)}
                    className={`${inputCls} w-36 shrink-0 appearance-none`}
                  >
                    <option value="">无备注</option>
                    <option value="language">语言备注*</option>
                    <option value="age">年龄备注*</option>
                  </select>
                )}
                <button
                  type="button"
                  title="删除"
                  onClick={() => remove(g.key, i, mainKey(row))}
                  className="shrink-0 text-neutral-600 transition hover:text-red-400"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            {data[g.key].length === 0 && (
              <p className="text-xs text-neutral-600">（已清空——保存后该步骤将没有可选按钮）</p>
            )}
          </div>

          {/* 添加新选项 */}
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
            <input
              value={draft[g.key].a}
              placeholder={`输入${g.labelA}，回车添加`}
              onChange={(e) => setDraft((s) => ({ ...s, [g.key]: { ...s[g.key], a: e.target.value } }))}
              onKeyDown={(e) => e.key === "Enter" && add(g.key)}
              className={inputCls}
            />
            <input
              value={draft[g.key].b}
              placeholder={g.labelB}
              onChange={(e) => setDraft((s) => ({ ...s, [g.key]: { ...s[g.key], b: e.target.value } }))}
              onKeyDown={(e) => e.key === "Enter" && add(g.key)}
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => add(g.key)}
              disabled={!draft[g.key].a.trim()}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black transition enabled:hover:bg-white/85 disabled:opacity-30"
            >
              <Plus size={14} /> 添加
            </button>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-black hover:bg-white/85"
        >
          保存并生效
        </button>
        <button
          onClick={() => {
            if (!window.confirm("确定恢复全部默认选项吗？你添加过的自定义内容会被清除。")) return;
            const o = getOverrides();
            delete o.businessContent;
            saveOverrides(o);
            setStatus("已恢复默认，正在刷新…");
            setTimeout(() => location.reload(), 600);
          }}
          className="flex items-center gap-2 text-xs text-neutral-500 hover:text-red-400"
        >
          <Trash2 size={12} /> 恢复默认选项
        </button>
        {status && <span className="text-xs text-neutral-400">{status}</span>}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Leisure（休闲旅游）傻瓜式选项编辑器
 * 对应 LeisureWizard 的可配置内容：休闲城市 / 服务项目 / 人员要求 / 兴趣偏好 / 各城市景点
 * ------------------------------------------------------------------------- */

type LRow = { name?: string; en?: string; zh?: string; desc?: string; image?: string; note?: string };
type LGroup = { city: string; items: LRow[] };

type LData = {
  cities: LRow[];
  services: LRow[];
  personnelOptions: LRow[];
  interests: LRow[];
  /** 勾选了这些服务（按英文名匹配）才会出现「人员要求」步骤 */
  personnelServices: string[];
  /** 景点按城市分组；只有分组存在且客人选了该城市，向导里才会出现对应景点步骤 */
  attractions: LGroup[];
};

const LEISURE_NOTE =
  "提示：服务的英文名称是系统识别关键字，改名等于新增一个服务；勾选下方「人员服务标记」的服务后，客人选了它才会出现「人员要求」步骤。景点的城市名必须与上面休闲城市列表里的英文名完全一致，前台才会显示对应景点步骤。";

function LeisureOptionManager() {
  const [data, setData] = useState<LData>(() => ({
    cities: leisureContent.cities.map((o) => ({ ...o })),
    services: leisureContent.services.map((o) => ({ ...o })),
    personnelOptions: leisureContent.personnelOptions.map((o) => ({ ...o })),
    interests: leisureContent.interests.map((o) => ({ ...o })),
    personnelServices: [...leisureContent.personnelServices],
    attractions: Object.entries(leisureContent.attractionsByCity).map(([city, items]) => ({
      city,
      items: items.map((it) => ({ ...it })),
    })),
  }));
  const [draft, setDraft] = useState<Record<string, { a: string; b: string }>>({
    cities: { a: "", b: "" },
    services: { a: "", b: "" },
    personnelOptions: { a: "", b: "" },
    interests: { a: "", b: "" },
  });
  const [newCity, setNewCity] = useState("");
  const [attrDraft, setAttrDraft] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string>("");

  const inputCls =
    "w-full min-w-0 rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm outline-none focus:border-white/30";

  /* ---------- 通用列表操作（城市/服务/人员/兴趣） ---------- */
  const update = (patch: Partial<LData>) => setData((d) => ({ ...d, ...patch }));

  const moveRow = (key: "cities" | "services" | "personnelOptions" | "interests", i: number, dir: -1 | 1) => {
    const rows = [...data[key]];
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    [rows[i], rows[j]] = [rows[j], rows[i]];
    update({ [key]: rows } as Partial<LData>);
  };

  const removeRow = (key: "cities" | "services" | "personnelOptions" | "interests", i: number, label: string) => {
    if (!window.confirm(`确定删除「${label}」吗？删除后保存即生效。`)) return;
    update({ [key]: data[key].filter((_, idx) => idx !== i) } as Partial<LData>);
  };

  const patchRow = (key: "cities" | "services" | "personnelOptions" | "interests", i: number, field: string, value: string) => {
    const rows = [...data[key]];
    rows[i] = { ...rows[i], [field]: value };
    update({ [key]: rows } as Partial<LData>);
  };

  const addRow = (key: "cities" | "services" | "personnelOptions" | "interests") => {
    const d = draft[key];
    const a = d.a.trim();
    if (!a) return;
    const row: LRow =
      key === "cities" ? { name: a, zh: d.b.trim(), image: "" } : { en: a, zh: d.b.trim() };
    update({ [key]: [...data[key], row] } as Partial<LData>);
    setDraft((s) => ({ ...s, [key]: { a: "", b: "" } }));
  };

  /* ---------- 景点分组操作 ---------- */
  const patchGroup = (gi: number, patch: Partial<LGroup>) =>
    update({ attractions: data.attractions.map((g, i) => (i === gi ? { ...g, ...patch } : g)) });

  const addGroup = () => {
    const city = newCity.trim();
    if (!city) return;
    if (data.attractions.some((g) => g.city === city)) {
      window.alert(`城市「${city}」的分组已存在，直接在下方添加景点即可。`);
      return;
    }
    update({ attractions: [...data.attractions, { city, items: [] }] });
    setNewCity("");
  };

  const removeGroup = (gi: number, city: string) => {
    if (!window.confirm(`确定删除「${city}」全部分组及景点吗？删除后保存即生效。`)) return;
    update({ attractions: data.attractions.filter((_, i) => i !== gi) });
  };

  const addAttr = (gi: number) => {
    const d = attrDraft[gi] ?? "";
    const name = d.trim();
    if (!name) return;
    const g = data.attractions[gi];
    patchGroup(gi, { items: [...g.items, { name, zh: "", desc: "", image: "" }] });
    setAttrDraft((s) => ({ ...s, [gi]: "" }));
  };

  /* ---------- 保存 ---------- */
  const handleSave = () => {
    const attractionsByCity: Record<string, { name: string; zh: string; desc: string; image: string }[]> = {};
    for (const g of data.attractions) {
      if (!g.city.trim()) continue;
      attractionsByCity[g.city.trim()] = g.items.map((it) => ({
        name: it.name ?? "",
        zh: it.zh ?? "",
        desc: it.desc ?? "",
        image: it.image ?? "",
      }));
    }
    const o = getOverrides();
    saveOverrides({
      ...o,
      leisureContent: {
        cities: data.cities.map((c) => ({ name: c.name ?? "", zh: c.zh ?? "", image: c.image ?? "" })),
        services: data.services.map((s) => ({ en: s.en ?? "", zh: s.zh ?? "" })),
        personnelOptions: data.personnelOptions.map((p) => {
          const row: { en: string; zh: string; note?: "language" | "skills" } = { en: p.en ?? "", zh: p.zh ?? "" };
          if (p.note === "language" || p.note === "skills") row.note = p.note;
          return row;
        }),
        interests: data.interests.map((s) => ({ en: s.en ?? "", zh: s.zh ?? "" })),
        personnelServices: [...data.personnelServices],
        attractionsByCity,
      },
    });
    setStatus("已保存，正在刷新…");
    setTimeout(() => location.reload(), 600);
  };

  /* ---------- 通用组渲染 ---------- */
  const renderGroup = (
    key: "cities" | "services" | "personnelOptions" | "interests",
    title: string,
    desc: string,
    labelA: string,
    labelB: string,
    withNote?: "personnel"
  ) => (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-neutral-500">{desc}</p>
      <div className="mt-4 space-y-2">
        {data[key].map((row, i) => {
          const main = (row.en ?? row.name ?? "").trim();
          return (
            <div key={`${main}-${i}`} className="flex flex-wrap items-center gap-2">
              <div className="flex flex-col">
                <button type="button" title="上移" onClick={() => moveRow(key, i, -1)} className="text-neutral-600 hover:text-white">
                  <ArrowUp size={13} />
                </button>
                <button type="button" title="下移" onClick={() => moveRow(key, i, 1)} className="text-neutral-600 hover:text-white">
                  <ArrowDown size={13} />
                </button>
              </div>
              <input
                value={main}
                placeholder={labelA}
                onChange={(e) => patchRow(key, i, key === "cities" ? "name" : "en", e.target.value)}
                className={inputCls}
              />
              <input
                value={row.zh ?? ""}
                placeholder={labelB}
                onChange={(e) => patchRow(key, i, "zh", e.target.value)}
                className={inputCls}
              />
              {withNote && (
                <select
                  value={row.note ?? ""}
                  onChange={(e) => patchRow(key, i, "note", e.target.value)}
                  className={`${inputCls} w-36 shrink-0 appearance-none`}
                >
                  <option value="">无备注</option>
                  <option value="language">语言备注*</option>
                  <option value="skills">特殊技能备注*</option>
                </select>
              )}
              <button
                type="button"
                title="删除"
                onClick={() => removeRow(key, i, main)}
                className="shrink-0 text-neutral-600 transition hover:text-red-400"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
        {data[key].length === 0 && (
          <p className="text-xs text-neutral-600">（已清空——保存后该步骤将没有可选按钮）</p>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
        <input
          value={draft[key].a}
          placeholder={`输入${labelA}，回车添加`}
          onChange={(e) => setDraft((s) => ({ ...s, [key]: { ...s[key], a: e.target.value } }))}
          onKeyDown={(e) => e.key === "Enter" && addRow(key)}
          className={inputCls}
        />
        <input
          value={draft[key].b}
          placeholder={labelB}
          onChange={(e) => setDraft((s) => ({ ...s, [key]: { ...s[key], b: e.target.value } }))}
          onKeyDown={(e) => e.key === "Enter" && addRow(key)}
          className={inputCls}
        />
        <button
          type="button"
          onClick={() => addRow(key)}
          disabled={!draft[key].a.trim()}
          className="flex shrink-0 items-center gap-1 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black transition enabled:hover:bg-white/85 disabled:opacity-30"
        >
          <Plus size={14} /> 添加
        </button>
      </div>
    </div>
  );

  return (
    <div className="mt-10">
      <h2 className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
        休闲旅游（Leisure）互动选项管理
      </h2>
      <p className="mt-2 text-sm text-neutral-500">
        与上面 Business 一样傻瓜式操作，管理 Leisure 向导里的城市卡片、服务按钮、人员要求和景点。改完点「保存并生效」。
      </p>

      <div className="mt-4 space-y-4">
        <div className="flex items-center justify-between rounded-2xl border border-amber-300/20 bg-amber-300/5 px-5 py-3">
          <p className="text-xs leading-relaxed text-amber-200/80">{LEISURE_NOTE}</p>
        </div>

        {renderGroup("cities", "① 休闲城市卡片", "出现在「选择想去的城市」步骤的大卡片；图片路径可留空（用城市名占位）", "英文名（必填）", "中文名（选填）")}
        {renderGroup("services", "② 休闲服务项目", "出现在「我们可以怎么帮您？」步骤", "英文（必填）", "中文（选填）")}
        {renderGroup("personnelOptions", "③ 人员要求选项", "出现在「对服务人员的要求？」步骤；带 * 的备注选项被勾选后客人必须填写备注才能继续", "英文（必填）", "中文（选填）", "personnel")}
        {renderGroup("interests", "④ 兴趣偏好选项", "出现在「兴趣偏好」步骤", "英文（必填）", "中文（选填）")}

        {/* 人员服务标记 */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm font-semibold">⑤ 人员服务标记</p>
          <p className="mt-1 text-xs text-neutral-500">
            勾选后，客人选了这些服务才会出现「人员要求」步骤（按上面服务列表的英文名匹配）：
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {data.services.map((s) => {
              const en = (s.en ?? "").trim();
              if (!en) return null;
              const on = data.personnelServices.includes(en);
              return (
                <button
                  key={en}
                  type="button"
                  onClick={() =>
                    update({
                      personnelServices: on
                        ? data.personnelServices.filter((x) => x !== en)
                        : [...data.personnelServices, en],
                    })
                  }
                  className={`rounded-full border px-4 py-2 text-xs transition ${
                    on ? "border-white bg-white font-semibold text-black" : "border-white/15 text-neutral-400 hover:border-white/40"
                  }`}
                >
                  {en}
                </button>
              );
            })}
          </div>
          {data.services.length === 0 && (
            <p className="mt-3 text-xs text-neutral-600">（请先在「休闲服务项目」里添加服务）</p>
          )}
        </div>

        {/* 景点分组编辑 */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm font-semibold">⑥ 各城市景点（图片卡片 + 一句话介绍）</p>
          <p className="mt-1 text-xs text-neutral-500">
            客人选了对应城市后，向导里会出现该城市的景点多选卡片。景点英文名是识别关键字；介绍（desc）显示在卡片上，要写得吸引人。
          </p>

          <div className="mt-4 space-y-4">
            {data.attractions.map((g, gi) => (
              <div key={`${g.city}-${gi}`} className="rounded-xl border border-white/10 bg-black/40 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={g.city}
                    placeholder="城市英文名（与休闲城市列表一致）"
                    onChange={(e) => patchGroup(gi, { city: e.target.value })}
                    className={`${inputCls} max-w-xs font-semibold`}
                  />
                  <button
                    type="button"
                    onClick={() => removeGroup(gi, g.city)}
                    className="ml-auto flex shrink-0 items-center gap-1 text-xs text-neutral-500 transition hover:text-red-400"
                  >
                    <Trash2 size={12} /> 删除整组
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {g.items.map((it, i) => (
                    <div key={`${it.name}-${i}`} className="flex flex-wrap items-center gap-2">
                      <input
                        value={it.name ?? ""}
                        placeholder="景点英文名"
                        onChange={(e) =>
                          patchGroup(gi, { items: g.items.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })
                        }
                        className={inputCls}
                      />
                      <input
                        value={it.zh ?? ""}
                        placeholder="中文名"
                        onChange={(e) =>
                          patchGroup(gi, { items: g.items.map((x, j) => (j === i ? { ...x, zh: e.target.value } : x)) })
                        }
                        className={inputCls}
                      />
                      <input
                        value={it.desc ?? ""}
                        placeholder="一句话吸引文案（英文显示在卡片上）"
                        onChange={(e) =>
                          patchGroup(gi, { items: g.items.map((x, j) => (j === i ? { ...x, desc: e.target.value } : x)) })
                        }
                        className={inputCls}
                      />
                      <input
                        value={it.image ?? ""}
                        placeholder="图片路径（可留空）"
                        onChange={(e) =>
                          patchGroup(gi, { items: g.items.map((x, j) => (j === i ? { ...x, image: e.target.value } : x)) })
                        }
                        className={inputCls}
                      />
                      <button
                        type="button"
                        title="删除"
                        onClick={() => {
                          if (!window.confirm(`确定删除景点「${it.name}」吗？`)) return;
                          patchGroup(gi, { items: g.items.filter((_, j) => j !== i) });
                        }}
                        className="shrink-0 text-neutral-600 transition hover:text-red-400"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  {g.items.length === 0 && <p className="text-xs text-neutral-600">（该城市还没有景点，在下方添加）</p>}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    value={attrDraft[gi] ?? ""}
                    placeholder="输入景点英文名，回车添加"
                    onChange={(e) => setAttrDraft((s) => ({ ...s, [gi]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && addAttr(gi)}
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() => addAttr(gi)}
                    disabled={!(attrDraft[gi] ?? "").trim()}
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black transition enabled:hover:bg-white/85 disabled:opacity-30"
                  >
                    <Plus size={14} /> 添加景点
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
            <input
              value={newCity}
              placeholder="新城市英文名（如 Hangzhou），添加分组"
              onChange={(e) => setNewCity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addGroup()}
              className={inputCls}
            />
            <button
              type="button"
              onClick={addGroup}
              disabled={!newCity.trim()}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black transition enabled:hover:bg-white/85 disabled:opacity-30"
            >
              <Plus size={14} /> 添加城市分组
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-black hover:bg-white/85"
          >
            保存并生效
          </button>
          <button
            onClick={() => {
              if (!window.confirm("确定恢复 Leisure 默认内容吗？你添加过的自定义城市/景点/选项会被清除。")) return;
              const o = getOverrides();
              delete o.leisureContent;
              saveOverrides(o);
              setStatus("已恢复默认，正在刷新…");
              setTimeout(() => location.reload(), 600);
            }}
            className="flex items-center gap-2 text-xs text-neutral-500 hover:text-red-400"
          >
            <Trash2 size={12} /> 恢复 Leisure 默认内容
          </button>
          {status && <span className="text-xs text-neutral-400">{status}</span>}
        </div>
      </div>
    </div>
  );
}

function ContentEditor() {
  const [json, setJson] = useState(() =>
    JSON.stringify({ site: { ...site }, hero: { ...hero } }, null, 2)
  );
  const [status, setStatus] = useState<string>("");

  const handleSave = () => {
    try {
      const parsed = JSON.parse(json) as ConfigOverrides;
      const o = getOverrides();
      saveOverrides({
        ...o,
        site: { ...o.site, ...(parsed.site ?? {}) },
        hero: { ...o.hero, ...(parsed.hero ?? {}) },
      });
      setStatus("Saved — reloading…");
      setTimeout(() => location.reload(), 600);
    } catch {
      setStatus("Invalid JSON — please check the format.");
    }
  };

  const handleReset = () => {
    localStorage.removeItem("longview-config");
    setStatus("Overrides cleared — reloading…");
    setTimeout(() => location.reload(), 600);
  };

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-6">
      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        spellCheck={false}
        rows={18}
        className="w-full resize-y rounded-xl border border-white/10 bg-black/60 p-4 font-mono text-xs leading-relaxed text-neutral-300 outline-none focus:border-white/30"
      />
      <div className="mt-4 flex items-center gap-4">
        <button
          onClick={handleSave}
          className="rounded-full bg-white px-6 py-2 text-sm font-semibold text-black hover:bg-white/85"
        >
          Save & apply
        </button>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 text-xs text-neutral-500 hover:text-red-400"
        >
          <Trash2 size={12} /> Reset to defaults
        </button>
        {status && <span className="text-xs text-neutral-400">{status}</span>}
      </div>
    </div>
  );
}

function PasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [status, setStatus] = useState<string>("");

  const handleChange = () => {
    if (current !== getPassword()) {
      setStatus("Current password is wrong.");
      return;
    }
    if (next.trim().length < 6) {
      setStatus("New password needs at least 6 characters.");
      return;
    }
    localStorage.setItem(PW_KEY, next.trim());
    setStatus("Password updated.");
    setCurrent("");
    setNext("");
  };

  return (
    <>
      <h2 className="mt-14 text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
        Password
      </h2>
      <div className="mt-4 grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 sm:grid-cols-3">
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="Current password"
          className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm outline-none focus:border-white/30"
        />
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="New password (min 6 chars)"
          className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm outline-none focus:border-white/30"
        />
        <button
          onClick={handleChange}
          className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-white/85"
        >
          Update password
        </button>
        {status && <p className="text-xs text-neutral-400 sm:col-span-3">{status}</p>}
      </div>
    </>
  );
}
