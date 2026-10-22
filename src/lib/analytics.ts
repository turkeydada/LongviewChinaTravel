/**
 * 轻量访问统计：事件写入 localStorage（本机版后台用），
 * 同时镜像到云端采集队列（telemetry.ts → D1，跨设备可查）。
 */

import { enqueueCloud } from "@/lib/telemetry";

export type TrackedEvent = {
  type: string; // page_view | journey_choose | interest_click | lead_submit
  page: string;
  meta?: string;
  session: string;
  ts: number;
};

const EVENTS_KEY = "longview-events";
const SESSION_KEY = "longview-session";
const MAX_EVENTS = 5000;

export function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function track(type: string, meta?: string) {
  const page = location.pathname || "/";
  try {
    const events = getEvents();
    events.push({
      type,
      page,
      meta,
      session: getSessionId(),
      ts: Date.now(),
    });
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    /* 存储满或禁用时静默失败，不影响页面 */
  }
  // 云端镜像（journey_choose / interest_click / lead_submit）
  const cloudType =
    type === "interest_click" ? "interest" : type === "lead_submit" ? "form_submit" : type === "journey_choose" ? "journey" : type;
  enqueueCloud({ type: cloudType, page, meta });
}

export function getEvents(): TrackedEvent[] {
  try {
    return JSON.parse(localStorage.getItem(EVENTS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function clearEvents() {
  localStorage.removeItem(EVENTS_KEY);
}
