import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useState } from "react";
import type { WizardStep } from "@/config/site";
import { sendLeadEmail } from "@/lib/mail";
import { useI18n } from "@/lib/i18n";
import { track } from "@/lib/analytics";

export type WizardAnswers = Record<string, string | string[]>;

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

function isStepValid(step: WizardStep, answers: WizardAnswers): boolean {
  const v = answers[step.id];
  if (!step.required) return true;
  if (step.kind === "chips") return Array.isArray(v) && v.length > 0;
  return typeof v === "string" && v.trim().length > 0;
}

/** 把向导答案整理成询盘数据结构（与后台控制台字段一致） */
export function answersToLead(type: "leisure" | "business", answers: WizardAnswers) {
  const interests = Array.isArray(answers.interests) ? answers.interests : [];
  if (interests.length) track("interest_click", interests.join(","));
  return {
    type,
    interests,
    city: typeof answers.city === "string" ? answers.city : "",
    dates: typeof answers.dates === "string" ? answers.dates : "",
    name: typeof answers.name === "string" ? answers.name : "",
    email: typeof answers.email === "string" ? answers.email : "",
    contact: typeof answers.whatsapp === "string" ? answers.whatsapp : "",
    message: answers.extra ? `Group / Company: ${answers.extra}` : "",
    submittedAt: new Date().toISOString(),
  };
}

export function submitLead(
  lead: ReturnType<typeof answersToLead>,
  details: { label: string; value: string }[] = []
) {
  const leads = JSON.parse(localStorage.getItem("longview-leads") ?? "[]");
  leads.push(lead);
  localStorage.setItem("longview-leads", JSON.stringify(leads));
  track("lead_submit", lead.type);

  // 静默发送到站长邮箱（FormSubmit），失败不影响本地保存，后台 /#/admin 留有备份
  void sendLeadEmail({
    name: lead.name,
    email: lead.email,
    type: lead.type === "leisure" ? "Leisure" : "Business",
    details,
    city: lead.city,
    dates: lead.dates,
    contact: lead.contact,
    message: lead.message,
    interests: lead.interests,
    submittedAt: lead.submittedAt,
  });
}

/**
 * 分步向导：一步一步引导客户做出选择，最后汇总成表格确认。
 * 步骤定义来自 src/config/site.ts，可随意增删改。
 */
export function Wizard({
  steps,
  journeyType,
  onDone,
}: {
  steps: WizardStep[];
  journeyType: "leisure" | "business";
  onDone: (lead: ReturnType<typeof answersToLead>) => void;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<WizardAnswers>({});
  const [sent, setSent] = useState(false);
  const { t } = useI18n();

  const isSummary = index === steps.length;
  const step = steps[index];
  const value = step ? answers[step.id] : undefined;
  const canContinue = step ? isStepValid(step, answers) : false;

  const setValue = (v: string | string[]) =>
    setAnswers((prev) => ({ ...prev, [step.id]: v }));

  const toggleChip = (opt: string) => {
    const arr = Array.isArray(value) ? value : [];
    setValue(arr.includes(opt) ? arr.filter((o) => o !== opt) : [...arr, opt]);
  };

  const handleSend = () => {
    const lead = answersToLead(journeyType, answers);
    // 逐题标注（问题标题用英文原文，保证站长收到的邮件字段稳定）
    const details = steps
      .map((s) => {
        const v = answers[s.id];
        const value = Array.isArray(v) ? v.join(", ") : v ? String(v) : "";
        return { label: s.title, value };
      })
      .filter((r) => r.value);
    submitLead(lead, details);
    setSent(true);
    onDone(lead);
  };

  if (sent) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300"
        >
          <Check size={28} />
        </motion.div>
        <h3 className="mt-8 text-3xl font-semibold tracking-tight">{t("Request sent!")}</h3>
        <p className="mt-4 text-sm leading-relaxed text-neutral-400">
          {t("Thank you! Your request has been received — our team will review it and contact you within 24 hours.")}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-24">
      {/* 进度条 */}
      <div className="mb-12 flex items-center gap-2">
        {steps.map((s, i) => (
          <div
            key={s.id}
            className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
              i <= index ? "bg-white" : "bg-white/15"
            }`}
          />
        ))}
        <div
          className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
            isSummary ? "bg-white" : "bg-white/15"
          }`}
        />
      </div>

      <AnimatePresence mode="wait">
        {!isSummary ? (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.45, ease }}
          >
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
              {t("Step {x} of {y}").replace("{x}", String(index + 1)).replace("{y}", String(steps.length))}
            </p>
            <h3 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              {t(step.title)}
            </h3>
            {step.subtitle && (
              <p className="mt-3 text-sm text-neutral-500">{t(step.subtitle)}</p>
            )}

            <div className="mt-10">
              {step.kind === "chips" && (
                <div className="flex flex-wrap gap-3">
                  {step.options!.map((opt) => {
                    const on = Array.isArray(value) && value.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleChip(opt)}
                        className={`rounded-full border px-6 py-3 text-sm transition ${
                          on
                            ? "border-white bg-white text-black"
                            : "border-white/15 bg-white/5 text-neutral-300 hover:border-white/40"
                        }`}
                      >
                        {t(opt)}
                      </button>
                    );
                  })}
                </div>
              )}

              {step.kind === "select" && (
                <select
                  value={typeof value === "string" ? value : ""}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-white/15 bg-white/5 px-5 py-4 text-white outline-none focus:border-white/50"
                >
                  <option value="" disabled className="bg-neutral-900">
                    {t("Select a city…")}
                  </option>
                  {step.options!.map((opt) => (
                    <option key={opt} value={opt} className="bg-neutral-900">
                      {t(opt)}
                    </option>
                  ))}
                </select>
              )}

              {step.kind === "text" && (
                <input
                  type={step.inputType ?? "text"}
                  value={typeof value === "string" ? value : ""}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canContinue) setIndex((i) => i + 1);
                  }}
                  placeholder={t(step.placeholder ?? "")}
                  autoFocus
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-5 py-4 text-white placeholder:text-neutral-600 outline-none focus:border-white/50"
                />
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="summary"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.45, ease }}
          >
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
              {t("Summary")}
            </p>
            <h3 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("Here's your trip, at a glance")}
            </h3>
            <p className="mt-3 text-sm text-neutral-500">
              {t("Check everything looks right, then send it our way.")}
            </p>

            <div className="mt-10 overflow-hidden rounded-2xl border border-white/10">
              {steps
                .filter((s) => answers[s.id] !== undefined && answers[s.id] !== "")
                .map((s, i, arr) => {
                  const v = answers[s.id];
                  const text = Array.isArray(v) ? v.map((x) => t(String(x))).join(", ") : String(v);
                  return (
                    <div
                      key={s.id}
                      className={`flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:justify-between ${
                        i < arr.length - 1 ? "border-b border-white/10" : ""
                      }`}
                    >
                      <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                        {t(s.title)
                          .replace("(optional)", "")
                          .replace("（选填）", "")
                          .replace("?", "")
                          .replace("？", "")}
                      </span>
                      <span className="text-sm font-medium text-white">{text}</span>
                    </div>
                  );
                })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 操作按钮 */}
      <div className="mt-12 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="flex items-center gap-2 text-sm text-neutral-500 transition enabled:hover:text-white disabled:opacity-0"
        >
          <ArrowLeft size={16} /> {t("Back")}
        </button>

        {!isSummary ? (
          <button
            type="button"
            onClick={() => setIndex((i) => i + 1)}
            disabled={!canContinue}
            className="group flex items-center gap-2 rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition enabled:hover:bg-white/85 disabled:opacity-30"
          >
            {t("Continue")}
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </button>
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
