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
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { businessContent, site } from "@/config/site";
import { useI18n } from "@/lib/i18n";
import { track } from "@/lib/analytics";
import { sendLeadEmail } from "@/lib/mail";
import { AddableList, DateWheels, iso } from "@/components/wizard-bits";

/**
 * Business 分步引导向导
 * ---------------------------------------------------------------
 * 流程：城市九宫格 → 滚轮日期 → 人数 → 来访目的 → 服务多选
 *      →（条件）酒店预算 →（条件）人员要求 → 拜访地址 → 入出境口岸
 *      → 特殊要求 → 联系方式 → 总览确认 → 成功页
 * - 步骤条可点击回跳，所有答案在流程内保留（sessionStorage 草稿）
 * - 提交后写入 localStorage（后台 /#/admin 可查看、导出、打印 PDF）
 */

type Answers = Record<string, any>;

type StepDef = {
  id: string;
  kind:
    | "city"
    | "dates"
    | "stepper"
    | "multi"
    | "purposeDetails"
    | "text"
    | "personnel"
    | "list"
    | "ports"
    | "contact";
  title: string;
  zh: string;
  optional?: boolean;
};

const DRAFT_KEY = "longview-biz-draft";
const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** 主流货币列表（酒店预算货币选择），默认 USD */
const CURRENCIES = [
  "USD", "EUR", "GBP", "CNY", "JPY", "HKD", "AUD", "CAD", "CHF", "SGD",
  "KRW", "AED", "SAR", "INR", "RUB", "THB", "MYR", "VND", "IDR", "PHP",
  "TWD", "BRL", "MXN", "ZAR",
];

function buildSteps(a: Answers): StepDef[] {
  const services: string[] = a.services ?? [];
  const hasHotel = services.includes("Hotel booking");
  const hasPersonnel = services.some((s) =>
    businessContent.personnelServices.includes(s)
  );
  const purposes: string[] = a.purpose ?? [];
  const hasPurposeDetails = purposes.some((p) =>
    ["Factory audit", "Exhibition / trade fair", "Client visit"].includes(p)
  );
  const steps: StepDef[] = [
    { id: "city", kind: "city", title: "Which city are you heading to?", zh: "选择目标城市" },
    { id: "dates", kind: "dates", title: "When are you visiting?", zh: "选择来访时间" },
    { id: "people", kind: "stepper", title: "How many people are coming?", zh: "出行人数" },
    { id: "purpose", kind: "multi", title: "What's the purpose of your visit?", zh: "来访目的（可多选）" },
  ];
  if (hasPurposeDetails)
    steps.push({ id: "purposeDetails", kind: "purposeDetails", title: "A few more details about your visit", zh: "补充信息（可跳过）", optional: true });
  steps.push({ id: "services", kind: "multi", title: "How can we help?", zh: "我们可以怎么帮您（可多选）" });
  if (hasHotel)
    steps.push({ id: "hotelBudget", kind: "text", title: "Hotel budget per night", zh: "每晚酒店预算（可跳过）", optional: true });
  if (hasPersonnel)
    steps.push({ id: "personnel", kind: "personnel", title: "Any requirements for your assistants?", zh: "对服务人员的要求（可多选）" });
  steps.push(
    { id: "ports", kind: "ports", title: "Entry & exit ports in China", zh: "入境 / 出境口岸（可跳过）", optional: true },
    { id: "requests", kind: "list", title: "Any other special requests?", zh: "其他特殊要求（可跳过）", optional: true },
    { id: "contact", kind: "contact", title: "How can we reach you?", zh: "联系方式" }
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
    case "dates":
      return fmt(a.dates);
    case "stepper":
      return a.people ? `${a.people} ${Number(a.people) === 1 ? "person" : "people"}` : "";
    case "multi": {
      const others = (a[`${s.id}Other`] ?? []).map((o: string) => `${tr("Other")}: ${o}`);
      const chips = (a[s.id] ?? []).filter((c: string) => c !== "Other");
      if (others.length === 0 && a[s.id]?.includes("Other")) chips.push(tr("Other"));
      return [...chips, ...others].join(", ");
    }
    case "text":
      return a.hotelBudget ? `${a.hotelCurrency ?? "USD"} ${a.hotelBudget}` : "";
    case "purposeDetails": {
      const pd = a.purposeDetails ?? {};
      const parts: string[] = [];
      if (pd.factoryNames?.length) parts.push(`Factory names: ${pd.factoryNames.join(", ")}`);
      if (pd.factoryAddresses?.length) parts.push(`Factory addresses: ${pd.factoryAddresses.join("; ")}`);
      if (pd.expoNames?.length) parts.push(`Exhibitions: ${pd.expoNames.join(", ")}`);
      if (pd.expoAddresses?.length) parts.push(`Venue addresses: ${pd.expoAddresses.join("; ")}`);
      if (pd.expoTimes?.length) parts.push(`Exhibition time: ${pd.expoTimes.join("; ")}`);
      if (pd.clientAddresses?.length) parts.push(`Client addresses: ${pd.clientAddresses.join("; ")}`);
      return parts.join(" · ");
    }
    case "personnel": {
      const notes = a.personnelNotes ?? {};
      const others = (a.personnelOther ?? []).map((o: string) => `${tr("Other")}: ${o}`);
      const chips = (a.personnel ?? [])
        .filter((c: string) => c !== "Other")
        .map((c: string) =>
          c === "Language requirement" && notes.language
            ? `Language: ${notes.language}`
            : c === "Age requirement" && notes.age
              ? `Age: ${notes.age}`
              : tr(c)
        );
      if (others.length === 0 && a.personnel?.includes("Other")) chips.push(tr("Other"));
      return [...chips, ...others].join(", ");
    }
    case "list":
      return (a[s.id] ?? []).join("; ");
    case "ports":
      return [a.portIn && `Entry: ${a.portIn}`, a.portOut && `Exit: ${a.portOut}`]
        .filter(Boolean)
        .join(" · ");
    case "contact":
      return [
        a.contactName,
        a.contactGender,
        a.contactNationality,
        a.contactAge && `Age ${a.contactAge}`,
        a.contactEmail,
        a.contactWhatsapp,
      ]
        .filter(Boolean)
        .join(" · ");
  }
}

function isValid(s: StepDef, a: Answers): boolean {
  switch (s.kind) {
    case "city":
      return (a.cities?.length ?? 0) + (a.citiesOther?.length ?? 0) > 0;
    case "dates":
      return true; // 滚轮默认有值
    case "stepper":
      return true;
    case "multi":
      return (a[s.id]?.length ?? 0) + (a[`${s.id}Other`]?.length ?? 0) > 0;
    case "purposeDetails":
      return true; // optional
    case "text":
      return true; // optional
    case "personnel": {
      const sel: string[] = a.personnel ?? [];
      const notes = a.personnelNotes ?? {};
      const count =
        sel.filter((c: string) => c !== "Other").length + (a.personnelOther?.length ?? 0);
      if (count === 0) return false;
      // 选了语言要求 / 年龄要求 → 对应备注必填
      if (sel.includes("Language requirement") && !String(notes.language ?? "").trim())
        return false;
      if (sel.includes("Age requirement") && !String(notes.age ?? "").trim()) return false;
      return true;
    }
    case "list":
    case "ports":
      return true; // optional
    case "contact": {
      const emailOk = /.+@.+\..+/.test(a.contactEmail ?? "");
      return Boolean(a.contactName?.trim()) && emailOk; // WhatsApp 选填
    }
  }
}

/* ---------------- 主组件 ---------------- */

export function BusinessWizard() {
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
      type: "business",
      interests: [...(answers.purpose ?? []), ...(answers.services ?? [])].filter(Boolean),
      city: stepValue(steps[0], answers),
      dates: answers.dates ?? "",
      name: answers.contactName ?? "",
      email: answers.contactEmail ?? "",
      contact: answers.contactWhatsapp ?? "",
      message: [...(answers.requests ?? []), ...(answers.addresses ?? [])].join("; "),
      details,
      submittedAt: new Date().toISOString(),
    };
    const leads = JSON.parse(localStorage.getItem("longview-leads") ?? "[]");
    leads.push(lead);
    localStorage.setItem("longview-leads", JSON.stringify(leads));
    track("lead_submit", "business");
    sessionStorage.removeItem(DRAFT_KEY);
    setSent(true);
    // 邮件发送（FormSubmit → 站长邮箱），失败不影响已保存的本地数据
    void sendLeadEmail({
      name: lead.name,
      email: lead.email,
      type: "Business",
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {businessContent.cities.map((c) => {
                const on = sel.includes(c.name);
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => toggleCity(c.name)}
                    className={`group relative overflow-hidden rounded-2xl border text-left transition-all duration-300 ${
                      on
                        ? "border-white"
                        : "border-white/10 hover:-translate-y-1 hover:border-white/40"
                    }`}
                  >
                    {/* 图片位：暂无素材时用城市名做视觉占位，有图后填 c.image */}
                    <div className="relative aspect-[4/3] bg-gradient-to-br from-neutral-800 via-neutral-900 to-black">
                      {c.image ? (
                        <img src={c.image} alt={c.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-4xl font-semibold tracking-tight text-white/10 transition group-hover:text-white/20">
                          {c.zh}
                        </span>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      {/* 选中勾 */}
                      <span
                        className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full transition-all duration-300 ${
                          on ? "bg-white text-black opacity-100" : "bg-white/10 text-white/0"
                        }`}
                      >
                        <Check size={13} />
                      </span>
                      <div className="absolute bottom-3 left-4 right-4">
                        <p className="text-sm font-semibold text-white">{c.name}</p>
                        <p className="text-xs text-white/50">{c.zh}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
              {/* 其他：多选 + 可添加多个城市 */}
              <button
                type="button"
                onClick={() => toggleCity("Other")}
                className={`relative overflow-hidden rounded-2xl border text-left transition-all duration-300 ${
                  sel.includes("Other")
                    ? "border-white"
                    : "border-dashed border-white/20 hover:-translate-y-1 hover:border-white/50"
                }`}
              >
                <div className="relative flex aspect-[4/3] flex-col items-center justify-center gap-2 bg-white/5">
                  <MapPin size={26} strokeWidth={1.5} className="text-neutral-500" />
                  <p className="text-sm font-semibold text-neutral-300">{t("Other")}</p>
                  {lang !== "zh" && <p className="text-xs text-neutral-600">其他</p>}
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

      case "dates":
        return (
          <div className="grid gap-8 sm:grid-cols-2 sm:gap-6">
            <DateWheels label={t("From · 从")} value={dateFrom} onChange={setDateFrom} />
            <DateWheels label={t("To · 到")} value={dateTo} onChange={setDateTo} />
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
        const key = step.id; // services | purpose | personnel
        const opts = isPersonnel
          ? businessContent.personnelOptions.map((o) => ({ en: o.en, zh: o.zh }))
          : key === "purpose"
            ? businessContent.purposes
            : businessContent.services;
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

            {/* 语言 / 年龄备注（选中后必填） */}
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
            {isPersonnel && sel.includes("Age requirement") && (
              <div className="mt-3">
                <motion.input
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  value={notes.age ?? ""}
                  onChange={(e) => set({ personnelNotes: { ...notes, age: e.target.value } })}
                  placeholder={t("Age note · e.g. 30–45")}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-5 py-3.5 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-white/50"
                />
                {!String(notes.age ?? "").trim() && (
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
                    key === "purpose"
                      ? t("Enter another purpose & press Enter — add as many as you like")
                      : t("Enter a custom service & press Enter — add as many as you like")
                  }
                />
              </motion.div>
            )}
          </div>
        );
      }

      case "purposeDetails": {
        const purposes: string[] = answers.purpose ?? [];
        const pd = answers.purposeDetails ?? {};
        const setPd = (key: string, items: string[]) =>
          set({ purposeDetails: { ...pd, [key]: items } });
        const group = (label: string, pkey: string, placeholder: string) => (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
              {label}
            </p>
            <AddableList
              items={pd[pkey] ?? []}
              onChange={(items) => setPd(pkey, items)}
              placeholder={placeholder}
            />
          </div>
        );
        return (
          <div className="flex flex-col gap-8">
            {purposes.includes("Factory audit") && (
              <div className="flex flex-col gap-6">
                <p className="text-sm font-semibold text-white">
                  {t("Factory audit · 工厂验厂")}
                </p>
                {group(t("Factory name(s)"), "factoryNames", t("Enter the factory name & press Enter — add as many as you like"))}
                {group(t("Factory address(es)"), "factoryAddresses", t("Enter the factory address & press Enter — add as many as you like"))}
              </div>
            )}
            {purposes.includes("Exhibition / trade fair") && (
              <div className="flex flex-col gap-6">
                <p className="text-sm font-semibold text-white">
                  {t("Exhibition / trade fair · 参加展会")}
                </p>
                {group(t("Exhibition name(s)"), "expoNames", t("Enter the exhibition name & press Enter — add as many as you like"))}
                {group(t("Exhibition dates"), "expoTimes", t("e.g. Oct 15–19, 2026 — press Enter to add another"))}
                {group(t("Venue address(es)"), "expoAddresses", t("Enter the venue address & press Enter — add as many as you like"))}
              </div>
            )}
            {purposes.includes("Client visit") && (
              <div className="flex flex-col gap-6">
                <p className="text-sm font-semibold text-white">
                  {t("Client visit · 客户拜访")}
                </p>
                {group(t("Client address(es)"), "clientAddresses", t("Enter the client address & press Enter — add as many as you like"))}
              </div>
            )}
          </div>
        );
      }

      case "text":
        return (
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
        );

      case "list":
        return (
          <AddableList
            items={answers[step.id] ?? []}
            onChange={(items) => set({ [step.id]: items })}
            placeholder={t("Type a request & press Enter — add as many as you like")}
            textarea={step.id === "requests"}
          />
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

      case "contact": {
        const field =
          "w-full rounded-xl border border-white/15 bg-white/5 px-5 py-4 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-white/50";
        return (
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
              <p className="mb-2 text-xs uppercase tracking-[0.3em] text-neutral-500">
                WhatsApp <span className="normal-case tracking-normal text-neutral-600">({t("Optional")})</span>
              </p>
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
        );
      }
    }
  };

  return (
    <div ref={topRef} className="mx-auto max-w-3xl px-6 py-20">
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
