import { Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

/**
 * Business / Leisure 向导共用的交互组件：
 * WheelColumn（滚轮+拖动选择器）、DateWheels（年/月/日双滚轮）、AddableList（可增删输入列表）
 */

export const ITEM_H = 44;

export function WheelColumn({
  items,
  value,
  onChange,
}: {
  items: number[];
  value: number;
  onChange: (v: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const commitTimer = useRef<number | null>(null);

  // 外部值变化时同步滚动位置（首次挂载 / 回填草稿）
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = Math.max(0, items.indexOf(valueRef.current)) * ITEM_H;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // 滚动停止后（防抖 130ms）对齐到最近一项并提交，滚动中不提交 → 不跳项
  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    if (commitTimer.current) window.clearTimeout(commitTimer.current);
    commitTimer.current = window.setTimeout(() => {
      const i = Math.min(items.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM_H)));
      el.scrollTop = i * ITEM_H; // 对齐
      if (items[i] !== valueRef.current) {
        onChange(items[i]);
        playTick();
      }
    }, 130);
  };

  // 滚轮：每次滚动精确走一格（原生滚轮一次会跳 3 行，这里拦截改成 ±1 项）
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      el.scrollTop += Math.sign(e.deltaY) * ITEM_H;
    };
    el.addEventListener("wheel", onWheelNative, { passive: false });
    return () => el.removeEventListener("wheel", onWheelNative);
  }, []);

  // 鼠标左键按住拖动：1:1 跟手 + 松手惯性滑动
  const drag = useRef<{ y: number; top: number } | null>(null);
  const lastMove = useRef<{ y: number; t: number } | null>(null);
  const velocity = useRef(0);
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return; // 触摸设备走原生滚动
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, top: ref.current?.scrollTop ?? 0 };
    lastMove.current = { y: e.clientY, t: performance.now() };
    velocity.current = 0;
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !ref.current) return;
    const now = performance.now();
    if (lastMove.current) {
      const dt = now - lastMove.current.t;
      if (dt > 0) {
        const v = (e.clientY - lastMove.current.y) / dt; // px/ms，向下为正
        velocity.current = velocity.current * 0.6 + v * 0.4;
      }
    }
    lastMove.current = { y: e.clientY, t: now };
    ref.current.scrollTop = drag.current.top - (e.clientY - drag.current.y);
  };
  const onPointerEnd = () => {
    if (!drag.current) return;
    drag.current = null;
    // 惯性：松手后按速度衰减滑动，到位由 handleScroll 的对齐收尾
    const el = ref.current;
    if (!el) return;
    let v = -velocity.current * 16; // 每帧 px（scrollTop 方向与手指相反）
    if (Math.abs(v) < 2) return;
    const decay = () => {
      v *= 0.93;
      if (Math.abs(v) < 0.4) return;
      el.scrollTop += v;
      requestAnimationFrame(decay);
    };
    requestAnimationFrame(decay);
  };

  return (
    <div className="relative h-[220px] overflow-hidden rounded-xl border border-white/10 bg-white/5">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[88px] bg-gradient-to-b from-neutral-950 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[88px] bg-gradient-to-t from-neutral-950 to-transparent" />
      <div className="pointer-events-none absolute inset-x-2 top-[88px] z-10 h-[44px] rounded-md border-y border-white/15" />
      <div
        ref={ref}
        onScroll={handleScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        className="no-scrollbar h-full cursor-grab overflow-y-auto select-none active:cursor-grabbing"
      >
        <div style={{ height: ITEM_H * 2 }} />
        {items.map((it) => (
          <button
            key={it}
            type="button"
            onClick={() =>
              ref.current?.scrollTo({ top: items.indexOf(it) * ITEM_H, behavior: "smooth" })
            }
            className={`block h-11 w-full text-lg transition-colors duration-150 ${
              it === value ? "font-semibold text-white" : "text-neutral-600"
            }`}
          >
            {it}
          </button>
        ))}
        <div style={{ height: ITEM_H * 2 }} />
      </div>
    </div>
  );
}

/** 选择音效：WebAudio 合成的轻 tick 声，无需音频文件 */
let audioCtx: AudioContext | null = null;
export function playTick() {
  try {
    audioCtx ??= new AudioContext();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1700, t);
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  } catch {
    /* 无音频环境时静默 */
  }
}

export const YEARS = (() => {
  const y = new Date().getFullYear();
  return [y, y + 1, y + 2, y + 3];
})();
export const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
export const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export const iso = (d: { y: number; m: number; d: number }) =>
  `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;

export function DateWheels({
  label,
  value,
  onChange,
}: {
  label: string;
  value: { y: number; m: number; d: number };
  onChange: (v: { y: number; m: number; d: number }) => void;
}) {
  return (
    <div>
      <p className="mb-3 text-center text-[11px] font-medium uppercase tracking-[0.4em] text-neutral-500">
        {label}
      </p>
      <div className="grid grid-cols-3 gap-2">
        <WheelColumn items={YEARS} value={value.y} onChange={(y) => onChange({ ...value, y })} />
        <WheelColumn items={MONTHS} value={value.m} onChange={(m) => onChange({ ...value, m })} />
        <WheelColumn items={DAYS} value={value.d} onChange={(d) => onChange({ ...value, d })} />
      </div>
    </div>
  );
}

/** 可增删的输入列表（回车添加、多条、逐条删除） */
export function AddableList({
  items,
  onChange,
  placeholder,
  textarea,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  textarea?: boolean;
}) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const add = () => {
    const t0 = text.trim();
    if (!t0) return;
    onChange([...items, t0]);
    setText("");
  };
  return (
    <div>
      <div className="flex gap-2">
        {textarea ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                add();
              }
            }}
            placeholder={placeholder}
            rows={2}
            className="w-full resize-none rounded-xl border border-white/15 bg-white/5 px-5 py-4 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-white/50"
          />
        ) : (
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder={placeholder}
            className="w-full rounded-xl border border-white/15 bg-white/5 px-5 py-4 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-white/50"
          />
        )}
        <button
          type="button"
          onClick={add}
          disabled={!text.trim()}
          className="flex shrink-0 items-center gap-1 rounded-xl border border-white/20 px-4 text-sm text-white transition enabled:hover:bg-white/10 disabled:opacity-30"
        >
          <Plus size={16} /> {t("Add")}
        </button>
      </div>
      {items.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {items.map((it, i) => (
            <span
              key={`${it}-${i}`}
              className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1.5 pl-4 pr-2 text-xs text-neutral-300"
            >
              {it}
              <button
                type="button"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="flex h-5 w-5 items-center justify-center rounded-full text-neutral-500 transition hover:bg-white/10 hover:text-white"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
