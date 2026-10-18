/**
 * 轻量访问统计：事件写入 localStorage。
 * 后续接入真实后端时，把 track() 内部改为 POST 到 API 即可，调用处不用改。
 */

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
  try {
    const events = getEvents();
    events.push({
      type,
      page: location.hash || "#/",
      meta,
      session: getSessionId(),
      ts: Date.now(),
    });
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    /* 存储满或禁用时静默失败，不影响页面 */
  }
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
