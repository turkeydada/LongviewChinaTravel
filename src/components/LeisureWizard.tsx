import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Mail,
  MapPin,
  Minus,
  Pencil,
  Plus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { leisureContent, site } from "@/config/site";
import { useI18n } from "@/lib/i18n";
import { track } from "@/lib/analytics";
import { sendLeadEmail } from "@/lib/mail";
import { AddableList, DateWheels, iso } from "@/components/wizard-bits";

/**
 * Leisure 分步引导向导
 * ---------------------------------------------------------------
 * 流程：城市大卡片区（多选）→（条件：该城有景点配置）景点卡片（多选）
 *      → 人数 → 抵达/离开日期 → 我们可以怎么帮您（多选）
 *      →（条件）酒店预算+位置 →（条件）人员要求 → 饮食/宗教（可跳过）
 *      → 入出境口岸（可跳过）→ 兴趣偏好（多选）→ 其他要求（可跳过）
 *      → 联系方式（含随行人）→ 总览确认 → 成功页
 * - 步骤条可点击回跳，所有答案在流程内保留（sessionStorage 草稿）
 * - 提交后写入 localStorage（后台 /#/admin 可查看、导出、打印 PDF）
 */

type Answers = Record<string, any>;

type StepDef = {
  id: string;
  kind:
    | "city"
    | "attractions"
    | "stepper"
    | "dates"
    | "multi"
    | "hotel"
    | "personnel"
    | "food"
    | "ports"
    | "list"
    | "contact";
  title: string;
  zh: string;
  optional?: boolean;
  /** kind=attractions 时对应的城市英文名 */
  cityKey?: string;
};

const DRAFT_KEY = "longview-leisure-draft";
const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** 主流货币列表（酒店预算货币选择），默认 USD */
const CURRENCIES = [
  "USD", "EUR", "GBP", "CNY", "JPY", "HKD", "AUD", "CAD", "CHF", "SGD",
  "KRW", "AED", "SAR", "INR", "RUB", "THB", "MYR", "VND", "IDR", "PHP",
  "TWD", "BRL", "MXN", "ZAR",
];

function buildSteps(a: Answers): StepDef[] {
  const cities: string[] = a.cities ?? [];
  const services: string[] = a.services ?? [];
  const hasHotel = services.includes("Hotel booking");
  const hasPersonnel = services.some((s) => leisureContent.personnelServices.includes(s));

  const steps: StepDef[] = [
    { id: "cities", kind: "city", title: "Which cities are you dreaming of?", zh: "选择想去的城市（可多选）" },
  ];
  // 每个有景点配置且被客人勾选的城市，单独一步景点选择
  for (const city of cities) {
    if (leisureContent.attractionsByCity[city]) {
      const zhName =
        leisureContent.cities.find((c) => c.name === city)?.zh ?? city;
      steps.push({
        id: `attractions-${city}`,
        kind: "attractions",
        title: `What interests you in ${city}?`,
        zh: `${zhName}·感兴趣的景点（可多选）`,
        cityKey: city,
      });
    }
  }
  steps.push(
    { id: "people", kind: "stepper", title: "How many people are coming?", zh: "出行人数" },
    { id: "dates", kind: "dates", title: "When are you arriving?", zh: "选择抵达与离开日期" },
    { id: "services", kind: "multi", title: "How can we help?", zh: "我们可以怎么帮您（可多选）" }
  );
  if (hasHotel)
    steps.push({ id: "hotel", kind: "hotel", title: "Hotel budget per night", zh: "每晚酒店预算与位置要求（可跳过）", optional: true });
  if (hasPersonnel)
    steps.push({ id: "personnel", kind: "personnel", title: "Any requirements for your assistants?", zh: "对服务人员的要求（可多选）" });
  steps.push(
    { id: "food", kind: "food", title: "Any dietary or religious needs?", zh: "饮食特殊要求与宗教（可跳过）", optional: true },
    { id: "interests", kind: "multi", title: "What are you into?", zh: "兴趣偏好（可多选）" },
    { id: "ports", kind: "ports", title: "Entry & exit ports in China", zh: "入境 / 出境口岸（可跳过）", optional: true },
    { id: "requests", kind: "list", title: "Any other special requests?", zh: "其他特殊要求（可跳过）", optional: true },
    { id: "contact", kind: "contact", title: "How can we reach you?", zh: "联系方式（含随行人）" }
  );
  return steps;
}

const fmt = (v: any): string =>
  v == null || v === "" ? "" : Array.isArray(v) ? v.join(", ") : String(v);

/** 汇总展示用：把某一步的答案转成一行文字；tr 用于界面本地化（邮件汇总传默认恒等函数） */
function stepValue(s: StepDef, a: Answers, tr: (x: string) => string = (x) => x): string {
  switch (s.kind) {
    case "city": {
      const others = (a.citiesOther ?? []).map((o: string) => `${tr("Other")}: ${o}`);
      const chips = (a.cities ?? []).filter((c: string) => c !== "Other");
      if (others.length === 0 && a.cities?.includes("Other")) chips.push(tr("Other"));
      return [...chips, ...others].join(", ");
    }
    case "attractions": {
      const key = `attractions_${s.cityKey}`;
      const others = (a[`${key}Other`] ?? []).map((o: string) => `${tr("Other")}: ${o}`);
      const chips = (a[key] ?? []).filter((c: string) => c !== "Other");
      if (others.length === 0 && a[key]?.includes("Other")) chips.push(tr("Other"));
      return [...chips, ...others].join(", ");
    }
    case "dates":
      return fmt(a.dates);
    case "stepper":
      return a.people ? `${a.people} ${Number(a.people) === 1 ? tr("person · 人") : tr("people · 人")}` : "";
    case "multi": {
      const others = (a[`${s.id}Other`] ?? []).map((o: string) => `${tr("Other")}: ${o}`);
      const chips = (a[s.id] ?? []).filter((c: string) => c !== "Other");
      if (others.length === 0 && a[s.id]?.includes("Other")) chips.push(tr("Other"));
      return [...chips, ...others].join(", ");
    }
    case "hotel": {
      const parts = [
        a.hotelBudget ? `${a.hotelCurrency ?? "USD"} ${a.hotelBudget}` : "",
        a.hotelLocation ? `${tr("Location preference")}: ${a.hotelLocation}` : "",
      ].filter(Boolean);
      return parts.join(" · ");
    }
    case "personnel": {
      const notes = a.personnelNotes ?? {};
      const others = (a.personnelOther ?? []).map((o: string) => `${tr("Other")}: ${o}`);
      const chips = (a.personnel ?? [])
        .filter((c: string) => c !== "Other")
        .map((c: string) =>
          c === "Language requirement" && notes.language
            ? `${tr("Language")}: ${notes.language}`
            : c === "Special skills" && notes.skills
              ? `${tr("Special skills")}: ${notes.skills}`
              : tr(c)
        );
      if (others.length === 0 && a.personnel?.includes("Other")) chips.push(tr("Other"));
      return [...chips, ...others].join(", ");
    }
    case "food": {
      const parts = [
        (a.foodReqs ?? []).length ? `Food: ${(a.foodReqs ?? []).join("; ")}` : "",
        (a.religions ?? []).length ? `Religion: ${(a.religions ?? []).join("; ")}` : "",
      ].filter(Boolean);
      return parts.join(" · ");
    }
    case "list":
      return (a[s.id] ?? []).join("; ");
    case "ports":
      return [a.portIn && `Entry: ${a.portIn}`, a.portOut && `Exit: ${a.portOut}`]
        .filter(Boolean)
        .join(" · ");
    case "contact": {
      const companions: any[] = a.companions ?? [];
      const main = [
        a.contactName,
        a.contactGender,
        a.contactNationality,
        a.contactAge && `Age ${a.contactAge}`,
        a.contactEmail,
        a.contactWhatsapp,
      ]
        .filter(Boolean)
        .join(" · ");
      const comp = companions
        .map((c, i) => `Companion ${i + 1}: ${[c.name, c.email, c.whatsapp].filter(Boolean).join(" · ")}`)
        .join("; ");
      return [main, comp].filter(Boolean).join(" · ");
    }
  }
}

function isValid(s: StepDef, a: Answers): boolean {
  switch (s.kind) {
    case "city":
      return (a.cities?.length ?? 0) + (a.citiesOther?.length ?? 0) > 0;
    case "attractions":
      return true; // 景点可跳过
    case "dates":
      return true; // 滚轮默认有值
    case "stepper":
      return true;
    case "multi":
      return (a[s.id]?.length ?? 0) + (a[`${s.id}Other`]?.length ?? 0) > 0;
    case "hotel":
    case "food":
    case "ports":
    case "list":
      return true; // optional
    case "personnel": {
      const sel: string[] = a.personnel ?? [];
      const notes = a.personnelNotes ?? {};
      const count =
        sel.filter((c: string) => c !== "Other").length + (a.personnelOther?.length ?? 0);
      if (count === 0) return false;
      // 选了语言要求 / 特殊技能 → 对应备注必填
      if (sel.includes("Language requirement") && !String(notes.language ?? "").trim())
        return false;
      if (sel.includes("Special skills") && !String(notes.skills ?? "").trim())
        return false;
      return true;
    }
    case "contact": {
      const emailOk = /^\S+@\S+\.\S+$/.test(a.contactEmail ?? "");
      if (!a.contactName?.trim() || !emailOk) return false;
      const companions: any[] = a.companions ?? [];
      return companions.every(
        (c) => c.name?.trim() && /^\S+@\S+\.\S+$/.test(c.email ?? "")
      );
    }
  }
}

/* ---------------- 主组件 ---------------- */

export function LeisureWizard() {
  const { t, lang } = useI18n();
  const [init] = useState(() => {
    const now = new Date();
    const to = new Date(now.getTime() + 7 * 864e5);
    try {
      const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null");
      if (draft?.answers) return draft;
    } catch {
      /* ignore */
    }
    return {
      answers: {},
      dateFrom: { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() },
      dateTo: { y: to.getFullYear(), m: to.getMonth() + 1, d: to.getDate() },
    };
  });

  const [answers, setAnswers] = useState<Answers>(init.answers);
  const [dateFrom, setDateFrom] = useState(init.dateFrom);
  const [dateTo, setDateTo] = useState(init.dateTo);
  const [index, setIndex] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);
  const [dir, setDir] = useState(1);
  const [sent, setSent] = useState(false);

  const steps = useMemo(() => buildSteps(answers), [answers]);
  const isSummary = index >= steps.length;
  const step = steps[Math.min(index, steps.length - 1)];
  const canContinue = step ? isValid(step, answers) : true;

  // 条件步骤变化后，索引越界时收回到总览
  useEffect(() => {
    if (index > steps.length) setIndex(steps.length);
  }, [steps.length, index]);

  // 每步内容高度不同：换步时丝滑滚回向导顶部，避免新步骤跑出可视区
  const topRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [index, sent]);

  // 日期合成 + 草稿保存
  useEffect(() => {
    setAnswers((a) =>
      a.dates === `${iso(dateFrom)} – ${iso(dateTo)}`
        ? a
        : { ...a, dates: `${iso(dateFrom)} – ${iso(dateTo)}` }
    );
  }, [dateFrom, dateTo]);
  useEffect(() => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ answers, dateFrom, dateTo }));
  }, [answers, dateFrom, dateTo]);

  const set = (patch: Answers) => setAnswers((a) => ({ ...a, ...patch }));

  const goTo = (i: number) => {
    setDir(i > index ? 1 : -1);
    setIndex(i);
    setMaxVisited((m) => Math.max(m, Math.min(i, steps.length)));
  };
  const next = () => {
    if (!canContinue || isSummary) return;
    setDir(1);
    setIndex((i) => i + 1);
    setMaxVisited((m) => Math.max(m, index + 1));
    if (step.id === "services") {
      track("interest_click", [...(answers.services ?? []), ...(answers.servicesOther ?? [])].join(","));
    }
  };
  const back = () => {
    if (index === 0) return;
    setDir(-1);
    setIndex((i) => i - 1);
  };

  /* ---------- 提交 ---------- */
  const handleSend = () => {
    const details = steps
      .map((s) => ({
        label: lang === "zh" ? s.zh : `${t(s.title)} ${s.zh}`,
        value: stepValue(s, answers),
      }))
      .filter((r) => r.value);
    const lead = {
      type: "leisure",
      interests: [
        ...(answers.services ?? []),
        ...(answers.interests ?? []),
        ...Object.keys(answers)
          .filter((k) => k.startsWith("attractions_") && Array.isArray(answers[k]))
          .flatMap((k) => answers[k]),
      ].filter(Boolean),
      city: stepValue(steps[0], answers),
      dates: answers.dates ?? "",
      name: answers.contactName ?? "",
      email: answers.contactEmail ?? "",
      contact: answers.contactWhatsapp ?? "",
      message: (answers.requests ?? []).join("; "),
      details,
      submittedAt: new Date().toISOString(),
    };
    const leads = JSON.parse(localStorage.getItem("longview-leads") ?? "[]");
    leads.push(lead);
    localStorage.setItem("longview-leads", JSON.stringify(leads));
    track("lead_submit", "leisure");
    sessionStorage.removeItem(DRAFT_KEY);
    setSent(true);
    // 邮件发送（FormSubmit → 站长邮箱），失败不影响已保存的本地数据
    void sendLeadEmail({
      name: lead.name,
      email: lead.email,
      type: "Leisure",
      details,
    });
  };

  const reset = () => {
    sessionStorage.removeItem(DRAFT_KEY);
    setAnswers({});
    setIndex(0);
    setMaxVisited(0);
    setSent(false);
    const now = new Date();
    const to = new Date(now.getTime() + 7 * 864e5);
    setDateFrom({ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() });
    setDateTo({ y: to.getFullYear(), m: to.getMonth() + 1, d: to.getDate() });
  };

  /* ---------- 成功页 ---------- */
  if (sent) {
    return (
      <div className="mx-auto max-w-xl px-6 py-28 text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.55, ease }}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300"
        >
          <Check size={34} />
        </motion.div>
        <motion.h3
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease }}
          className="mt-8 text-4xl font-semibold tracking-tight"
        >
          {t("Request received!")}
        </motion.h3>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease }}
        >
          <p className="mt-5 text-sm leading-relaxed text-neutral-400">
            {t("Thank you, {name}. Your request has been received — our team will review it and contact you within 24 hours.").replace("{name}", answers.contactName ?? "")}
          </p>
          <a
            href={`mailto:${site.email}`}
            className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-medium text-white transition hover:bg-white/10"
          >
            <Mail size={16} className="text-neutral-400" />
            {site.email}
          </a>
          <div className="mt-10 flex items-center justify-center gap-6 text-sm">
            <button type="button" onClick={reset} className="text-neutral-500 transition hover:text-white">
              {t("Submit another request")}
            </button>
            <a href="#/" className="text-neutral-500 transition hover:text-white">
              {t("Back to home")}
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ---------- 步骤主体 ---------- */
  const renderStep = () => {
    switch (step.kind) {
      case "city": {
        const sel: string[] = answers.cities ?? [];
        const toggleCity = (name: string) =>
          set({
            cities: sel.includes(name) ? sel.filter((x) => x !== name) : [...sel, name],
          });
        return (
          <div>
            {/* 大卡片区：比 Business 更大（每行 2 张，文字更大） */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {leisureContent.cities.map((c) => {
                const on = sel.includes(c.name);
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => toggleCity(c.name)}
                    className={`group relative overflow-hidden rounded-3xl border text-left transition-all duration-300 ${
                      on
                        ? "border-white"
                        : "border-white/10 hover:-translate-y-1 hover:border-white/40"
                    }`}
                  >
                    <div className="relative aspect-[4/3] bg-gradient-to-br from-neutral-800 via-neutral-900 to-black">
                      {c.image ? (
                        <img src={c.image} alt={c.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-6xl font-semibold tracking-tight text-white/10 transition group-hover:text-white/20">
                          {c.zh}
                        </span>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <span
                        className={`absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300 ${
                          on ? "bg-white text-black opacity-100" : "bg-white/10 text-white/0"
                        }`}
                      >
                        <Check size={14} />
                      </span>
                      <div className="absolute bottom-4 left-5 right-5">
                        <p className="text-lg font-semibold text-white">{c.name}</p>
                        <p className="text-sm text-white/50">{c.zh}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
              {/* 其他：多选 + 可添加多个城市 */}
              <button
                type="button"
                onClick={() => toggleCity("Other")}
                className={`relative overflow-hidden rounded-3xl border text-left transition-all duration-300 ${
                  sel.includes("Other")
                    ? "border-white"
                    : "border-dashed border-white/20 hover:-translate-y-1 hover:border-white/50"
                }`}
              >
                <div className="relative flex aspect-[4/3] flex-col items-center justify-center gap-2 overflow-hidden bg-white/5">
                  <img
                    src="media/cities/other.jpg"
                    alt="Other"
                    className="absolute inset-0 h-full w-full object-cover opacity-60"
                  />
                  <div className="absolute inset-0 bg-black/40" />
                  <MapPin size={32} strokeWidth={1.5} className="relative text-white/80" />
                  <p className="relative text-base font-semibold text-white">{t("Other")}</p>
                  {lang !== "zh" && <p className="relative text-sm text-white/60">其他</p>}
                </div>
              </button>
            </div>
            {sel.includes("Other") && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease }}
                className="mt-4"
              >
                <AddableList
                  items={answers.citiesOther ?? []}
                  onChange={(items) => set({ citiesOther: items })}
                  placeholder={t("Enter another city & press Enter — add as many as you like")}
                />
              </motion.div>
            )}
          </div>
        );
      }

      case "attractions": {
        const cityKey = step.cityKey!;
        const akey = `attractions_${cityKey}`;
        const list = leisureContent.attractionsByCity[cityKey] ?? [];
        const sel: string[] = answers[akey] ?? [];
        const toggle = (name: string) =>
          set({
            [akey]: sel.includes(name) ? sel.filter((x) => x !== name) : [...sel, name],
          });
        return (
          <div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {list.map((a) => {
                const on = sel.includes(a.name);
                return (
                  <button
                    key={a.name}
                    type="button"
                    onClick={() => toggle(a.name)}
                    className={`group relative overflow-hidden rounded-3xl border text-left transition-all duration-300 ${
                      on
                        ? "border-white"
                        : "border-white/10 hover:-translate-y-1 hover:border-white/40"
                    }`}
                  >
                    <div className="relative aspect-[4/3] bg-gradient-to-br from-neutral-800 via-neutral-900 to-black">
                      {a.image ? (
                        <img src={a.image} alt={a.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-5xl font-semibold tracking-tight text-white/10 transition group-hover:text-white/20">
                          {a.zh.slice(0, 2)}
                        </span>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                      <span
                        className={`absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300 ${
                          on ? "bg-white text-black opacity-100" : "bg-white/10 text-white/0"
                        }`}
                      >
                        <Check size={14} />
                      </span>
                      <div className="absolute bottom-4 left-5 right-5">
                        <p className="text-base font-semibold leading-snug text-white">{a.name}</p>
                        <p className="mt-0.5 text-xs leading-snug text-white/60">{a.desc}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
              {/* 其他景点 */}
              <button
                type="button"
                onClick={() => toggle("Other")}
                className={`relative overflow-hidden rounded-3xl border text-left transition-all duration-300 ${
                  sel.includes("Other")
                    ? "border-white"
                    : "border-dashed border-white/20 hover:-translate-y-1 hover:border-white/50"
                }`}
              >
                <div className="relative flex aspect-[4/3] flex-col items-center justify-center gap-2 bg-white/5">
                  <MapPin size={28} strokeWidth={1.5} className="text-neutral-500" />
                  <p className="text-base font-semibold text-neutral-300">{t("Other")}</p>
                  {lang !== "zh" && <p className="text-sm text-neutral-600">其他</p>}
                </div>
              </button>
            </div>
            {sel.includes("Other") && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease }}
                className="mt-4"
              >
                <AddableList
                  items={answers[`${akey}Other`] ?? []}
                  onChange={(items) => set({ [`${akey}Other`]: items })}
                  placeholder={t("Enter another attraction & press Enter — add as many as you like")}
                />
              </motion.div>
            )}
          </div>
        );
      }

      case "dates":
        return (
          <div className="grid gap-8 sm:grid-cols-2 sm:gap-6">
            <DateWheels label={t("Arrival · 抵达")} value={dateFrom} onChange={setDateFrom} />
            <DateWheels label={t("Departure · 离开")} value={dateTo} onChange={setDateTo} />
          </div>
        );

      case "stepper": {
        const n = Number(answers.people ?? 1);
        return (
          <div className="flex items-center justify-center gap-8 py-6">
            <button
              type="button"
              onClick={() => set({ people: String(Math.max(1, n - 1)) })}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 text-white transition hover:bg-white/10 disabled:opacity-20"
              disabled={n <= 1}
            >
              <Minus size={20} />
            </button>
            <div className="text-center">
              <motion.p
                key={n}
                initial={{ opacity: 0.3, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-7xl font-semibold tabular-nums"
              >
                {n}
              </motion.p>
              <p className="mt-2 text-xs uppercase tracking-[0.3em] text-neutral-500">
                {n === 1 ? t("person · 人") : t("people · 人")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => set({ people: String(Math.min(99, n + 1)) })}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 text-white transition hover:bg-white/10"
            >
              <Plus size={20} />
            </button>
          </div>
        );
      }

      case "multi":
      case "personnel": {
        const isPersonnel = step.kind === "personnel";
        const key = step.id; // services | interests | personnel
        const opts = isPersonnel
          ? leisureContent.personnelOptions.map((o) => ({ en: o.en, zh: o.zh }))
          : key === "interests"
            ? leisureContent.interests
            : leisureContent.services;
        const sel: string[] = answers[key] ?? [];
        const otherSel = sel.includes("Other");
        const others: string[] = answers[`${key}Other`] ?? [];
        const setSel = (arr: string[]) => set({ [key]: arr });
        const setOthers = (arr: string[]) => set({ [`${key}Other`]: arr });
        const notes = answers.personnelNotes ?? {};
        const toggle = (en: string) =>
          setSel(sel.includes(en) ? sel.filter((x) => x !== en) : [...sel, en]);

        return (
          <div>
            <div className="flex flex-wrap gap-2.5">
              {opts.map((o) => {
                const on = sel.includes(o.en);
                return (
                  <button
                    key={o.en}
                    type="button"
                    onClick={() => toggle(o.en)}
                    className={`rounded-xl border px-4 py-2.5 text-left transition-all duration-200 ${
                      on
                        ? "border-white bg-white text-black"
                        : "border-white/15 bg-white/5 hover:border-white/40"
                    }`}
                  >
                    <p className={`text-xs font-semibold sm:text-sm ${on ? "text-black" : "text-white"}`}>{t(o.en)}</p>
                    {lang !== "zh" && (
                      <p className={`text-[10px] sm:text-xs ${on ? "text-black/60" : "text-neutral-500"}`}>{o.zh}</p>
                    )}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => toggle("Other")}
                className={`rounded-xl border px-4 py-2.5 text-left transition-all duration-200 ${
                  otherSel
                    ? "border-white bg-white text-black"
                    : "border-dashed border-white/20 hover:border-white/50"
                }`}
              >
                <p className={`text-xs font-semibold sm:text-sm ${otherSel ? "text-black" : "text-neutral-300"}`}>{t("Other")}</p>
                {lang !== "zh" && (
                  <p className={`text-[10px] sm:text-xs ${otherSel ? "text-black/60" : "text-neutral-600"}`}>其他</p>
                )}
              </button>
            </div>

            {/* 语言 / 特殊技能备注（选中后必填） */}
            {isPersonnel && sel.includes("Language requirement") && (
              <div className="mt-4">
                <motion.input
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  value={notes.language ?? ""}
                  onChange={(e) => set({ personnelNotes: { ...notes, language: e.target.value } })}
                  placeholder={t("Language note · e.g. English + Mandarin")}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-5 py-3.5 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-white/50"
                />
                {!String(notes.language ?? "").trim() && (
                  <p className="mt-1.5 text-xs text-amber-300/80">{t("Required to continue")}</p>
                )}
              </div>
            )}
            {isPersonnel && sel.includes("Special skills") && (
              <div className="mt-3">
                <motion.input
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  value={notes.skills ?? ""}
                  onChange={(e) => set({ personnelNotes: { ...notes, skills: e.target.value } })}
                  placeholder={t("Skills note · e.g. drone pilot, first-aid certified")}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-5 py-3.5 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-white/50"
                />
                {!String(notes.skills ?? "").trim() && (
                  <p className="mt-1.5 text-xs text-amber-300/80">{t("Required to continue")}</p>
                )}
              </div>
            )}

            {otherSel && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease }}
                className="mt-4"
              >
                <AddableList
                  items={others}
                  onChange={setOthers}
                  placeholder={
                    key === "interests"
                      ? t("Enter another interest & press Enter — add as many as you like")
                      : t("Enter a custom service & press Enter — add as many as you like")
                  }
                />
              </motion.div>
            )}
          </div>
        );
      }

      case "hotel":
        return (
          <div className="flex flex-col gap-4">
            <div className="flex gap-3">
              <div className="relative shrink-0">
                <select
                  value={answers.hotelCurrency ?? "USD"}
                  onChange={(e) => set({ hotelCurrency: e.target.value })}
                  className="h-full appearance-none rounded-xl border border-white/15 bg-white/5 pl-5 pr-10 text-sm font-semibold text-white outline-none focus:border-white/50"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c} className="bg-neutral-900">
                      {c}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">▾</span>
              </div>
              <input
                value={answers.hotelBudget ?? ""}
                onChange={(e) => set({ hotelBudget: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && next()}
                placeholder={t("Budget per night · e.g. 120")}
                autoFocus
                className="w-full rounded-xl border border-white/15 bg-white/5 px-5 py-4 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-white/50"
              />
            </div>
            <input
              value={answers.hotelLocation ?? ""}
              onChange={(e) => set({ hotelLocation: e.target.value })}
              placeholder={t("Location preference · e.g. near the beach, city center…")}
              className="w-full rounded-xl border border-white/15 bg-white/5 px-5 py-4 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-white/50"
            />
          </div>
        );

      case "food":
        return (
          <div className="flex flex-col gap-8">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
                {t("Dietary requirements · 饮食要求")}
              </p>
              <AddableList
                items={answers.foodReqs ?? []}
                onChange={(items) => set({ foodReqs: items })}
                placeholder={t("e.g. vegetarian, peanut allergy… — press Enter to add")}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
                {t("Religion · 宗教")}
              </p>
              <AddableList
                items={answers.religions ?? []}
                onChange={(items) => set({ religions: items })}
                placeholder={t("e.g. halal food, prayer times… — press Enter to add")}
              />
            </div>
          </div>
        );

      case "ports":
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.3em] text-neutral-500">{t("Entry · 入境口岸")}</p>
              <input
                value={answers.portIn ?? ""}
                onChange={(e) => set({ portIn: e.target.value })}
                placeholder={t("e.g. Guangzhou Baiyun (CAN)")}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-5 py-4 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-white/50"
              />
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.3em] text-neutral-500">{t("Exit · 出境口岸")}</p>
              <input
                value={answers.portOut ?? ""}
                onChange={(e) => set({ portOut: e.target.value })}
                placeholder={t("e.g. Shanghai Pudong (PVG)")}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-5 py-4 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-white/50"
              />
            </div>
          </div>
        );

      case "list":
        return (
          <AddableList
            items={answers[step.id] ?? []}
            onChange={(items) => set({ [step.id]: items })}
            placeholder={t("Type a request & press Enter — add as many as you like")}
            textarea
          />
        );

      case "contact": {
        const field =
          "w-full rounded-xl border border-white/15 bg-white/5 px-5 py-4 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-white/50";
        const companions: any[] = answers.companions ?? [];
        const setCompanion = (i: number, patch: any) =>
          set({ companions: companions.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
        const compField =
          "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white placeholder:text-neutral-600 outline-none focus:border-white/40";

        return (
          <div className="flex flex-col gap-8">
            {/* 主要联系人 */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.3em] text-neutral-500">
                  {t("Name · 姓名")} <span className="text-white">*</span>
                </p>
                <input value={answers.contactName ?? ""} onChange={(e) => set({ contactName: e.target.value })} placeholder={t("Your name")} className={field} />
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.3em] text-neutral-500">
                  {t("Email · 邮箱")} <span className="text-white">*</span>
                </p>
                <input type="email" value={answers.contactEmail ?? ""} onChange={(e) => set({ contactEmail: e.target.value })} placeholder={t("you@example.com")} className={field} />
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.3em] text-neutral-500">WhatsApp</p>
                <input value={answers.contactWhatsapp ?? ""} onChange={(e) => set({ contactWhatsapp: e.target.value })} placeholder={t("+1 555 000 0000")} className={field} />
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.3em] text-neutral-500">{t("Gender · 性别")}</p>
                <select value={answers.contactGender ?? ""} onChange={(e) => set({ contactGender: e.target.value })} className={`${field} appearance-none`}>
                  <option value="" className="bg-neutral-900">{t("Prefer not to say")}</option>
                  <option value="Male" className="bg-neutral-900">{t("Male")}</option>
                  <option value="Female" className="bg-neutral-900">{t("Female")}</option>
                </select>
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.3em] text-neutral-500">{t("Nationality · 国籍")}</p>
                <input value={answers.contactNationality ?? ""} onChange={(e) => set({ contactNationality: e.target.value })} placeholder={t("e.g. United States")} className={field} />
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.3em] text-neutral-500">{t("Age · 年龄")}</p>
                <input value={answers.contactAge ?? ""} onChange={(e) => set({ contactAge: e.target.value })} placeholder={t("e.g. 35")} className={field} />
              </div>
            </div>

            {/* 随行人 */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
                  {t("Companions · 随行人（选填）")}
                </p>
                <button
                  type="button"
                  onClick={() => set({ companions: [...companions, {}] })}
                  className="flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-xs text-white transition hover:bg-white/10"
                >
                  <Users size={13} /> {t("Add a companion")}
                </button>
              </div>
              {companions.length === 0 && (
                <p className="text-xs text-neutral-600">{t("Traveling solo? Skip this section.")}</p>
              )}
              <div className="space-y-3">
                {companions.map((c, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <button
                      type="button"
                      onClick={() => set({ companions: companions.filter((_, j) => j !== i) })}
                      className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-neutral-500 transition hover:bg-white/10 hover:text-white"
                      title={t("Remove companion")}
                    >
                      <X size={13} />
                    </button>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                      {t("Companion")} {i + 1}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <input value={c.name ?? ""} onChange={(e) => setCompanion(i, { name: e.target.value })} placeholder={`${t("Name · 姓名")} *`} className={compField} />
                      <input value={c.email ?? ""} onChange={(e) => setCompanion(i, { email: e.target.value })} placeholder={`Email *`} className={compField} />
                      <input value={c.whatsapp ?? ""} onChange={(e) => setCompanion(i, { whatsapp: e.target.value })} placeholder="WhatsApp" className={compField} />
                      <input value={c.age ?? ""} onChange={(e) => setCompanion(i, { age: e.target.value })} placeholder={t("Age · 年龄")} className={compField} />
                      <select value={c.gender ?? ""} onChange={(e) => setCompanion(i, { gender: e.target.value })} className={`${compField} appearance-none`}>
                        <option value="">{t("Gender · 性别")}</option>
                        <option value="Male">{t("Male")}</option>
                        <option value="Female">{t("Female")}</option>
                      </select>
                      <input value={c.nationality ?? ""} onChange={(e) => setCompanion(i, { nationality: e.target.value })} placeholder={t("Nationality · 国籍")} className={compField} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div ref={topRef} className="mx-auto max-w-4xl px-6 py-20">
      {/* 可点击进度条 */}
      <div className="mb-12">
        <div className="flex gap-1.5">
          {steps.map((s, i) => (
            <button
              key={s.id}
              type="button"
              title={`${s.title} ${s.zh}`}
              onClick={() => i <= maxVisited && goTo(i)}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                i < index ? "bg-white" : i === index ? "bg-white" : "bg-white/15"
              } ${i <= maxVisited ? "cursor-pointer hover:bg-white/60" : "cursor-default"}`}
            />
          ))}
          <button
            type="button"
            title="Summary · 总览"
            onClick={() => steps.length <= maxVisited && goTo(steps.length)}
            className={`h-1 flex-1 rounded-full transition-all duration-500 ${
              isSummary ? "bg-white" : "bg-white/15"
            } ${steps.length <= maxVisited ? "cursor-pointer hover:bg-white/60" : "cursor-default"}`}
          />
        </div>
        <p className="mt-4 text-center text-[11px] font-medium uppercase tracking-[0.35em] text-neutral-500">
          {isSummary
            ? t("Summary · 总览")
            : `${t(step.title)}${lang !== "zh" && step.zh ? ` ${step.zh}` : ""}`}{" "}
          —{" "}
          {isSummary
            ? t("最后确认")
            : t("Step {x} of {y}").replace("{x}", String(index + 1)).replace("{y}", String(steps.length))}
        </p>
      </div>

      <div className="min-h-[380px]">
        <AnimatePresence mode="wait" custom={dir}>
          {!isSummary ? (
            <motion.div
              key={step.id}
              custom={dir}
              initial={{ opacity: 0, x: dir * 48 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -48 }}
              transition={{ duration: 0.45, ease }}
            >
              <h3 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t(step.title)}</h3>
              <p className="mt-2 text-sm text-neutral-500">
                {[lang !== "zh" ? step.zh : "", step.optional ? t("Optional") : ""]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <div className="mt-10">{renderStep()}</div>
            </motion.div>
          ) : (
            <motion.div
              key="summary"
              custom={dir}
              initial={{ opacity: 0, x: dir * 48 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -48 }}
              transition={{ duration: 0.45, ease }}
            >
              <h3 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {t("Here's your trip, at a glance")}
              </h3>
              <p className="mt-2 text-sm text-neutral-500">
                {t("Review everything below — click any row to go back and edit. 点击任意一行可返回修改。")}
              </p>
              <div className="mt-10 overflow-hidden rounded-2xl border border-white/10">
                {steps
                  .map((s, i) => ({ s, i, value: stepValue(s, answers, t) }))
                  .filter((r) => r.value)
                  .map((r, j, arr) => (
                    <button
                      key={r.s.id}
                      type="button"
                      onClick={() => goTo(r.i)}
                      className={`group flex w-full flex-col gap-1 px-6 py-4 text-left transition hover:bg-white/5 sm:flex-row sm:items-center sm:justify-between ${
                        j < arr.length - 1 ? "border-b border-white/10" : ""
                      }`}
                    >
                      <span className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-neutral-500">
                        {t(r.s.title)}
                        <Pencil size={11} className="opacity-0 transition group-hover:opacity-60" />
                      </span>
                      <span className="text-sm font-medium text-white">{r.value}</span>
                    </button>
                  ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 操作按钮 */}
      <div className="mt-12 flex items-center justify-between">
        <button
          type="button"
          onClick={back}
          disabled={index === 0}
          className="flex items-center gap-2 text-sm text-neutral-500 transition enabled:hover:text-white disabled:opacity-0"
        >
          <ArrowLeft size={16} /> {t("Back")}
        </button>

        {!isSummary ? (
          <div className="flex items-center gap-3">
            {step.optional && (
              <button
                type="button"
                onClick={next}
                className="text-sm text-neutral-500 transition hover:text-white"
              >
                {t("Skip · 跳过")}
              </button>
            )}
            <button
              type="button"
              onClick={next}
              disabled={!canContinue}
              className="group flex items-center gap-2 rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition enabled:hover:bg-white/85 disabled:opacity-30"
            >
              {index === steps.length - 1 ? t("Review") : t("Continue")}
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            className="flex items-center gap-2 rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition hover:bg-white/85"
          >
            {t("Send request")}
            <Check size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
