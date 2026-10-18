import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { purpose } from "@/config/site";
import { useI18n } from "@/lib/i18n";
import { track } from "@/lib/analytics";

export type JourneyType = "leisure" | "business";

/**
 * 核心选择区（#purpose）：旅游 / 商务 两个大选项。
 * 大字号 + 编号 + 箭头圆钮，一眼可点；点击进入对应子页面分步向导。
 */
export function Purpose() {
  const [hovered, setHovered] = useState<JourneyType | null>(null);
  const navigate = useNavigate();
  const { t } = useI18n();

  const handleChoose = (t: JourneyType) => {
    track("journey_choose", t);
    navigate(t === "leisure" ? "/leisure" : "/business");
  };

  return (
    <section id="purpose" className="relative bg-black py-28 text-white sm:py-36">
      <div className="mx-auto max-w-6xl px-6">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="text-center text-4xl font-semibold tracking-tight sm:text-6xl"
        >
          {t(purpose.heading)}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className="mt-5 text-center text-lg text-neutral-500"
        >
          {t(purpose.subheading)}
        </motion.p>

        <div
          className="mt-16 flex flex-col gap-5 md:h-[600px] md:flex-row"
          onMouseLeave={() => setHovered(null)}
        >
          {purpose.options.map((opt, idx) => {
            const active = hovered === opt.id;
            return (
              <motion.button
                key={opt.id}
                type="button"
                onClick={() => handleChoose(opt.id as JourneyType)}
                onMouseEnter={() => setHovered(opt.id as JourneyType)}
                animate={{ flexGrow: active ? 1.7 : 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="group relative min-h-[360px] flex-1 cursor-pointer overflow-hidden rounded-3xl text-left md:min-h-0"
                style={{ flexBasis: 0 }}
              >
                <img
                  src={opt.image}
                  alt={t(opt.title)}
                  loading="lazy"
                  className={`absolute inset-0 h-full w-full object-cover transition duration-700 ${
                    active ? "scale-105" : "scale-100"
                  }`}
                />
                <div
                  className={`absolute inset-0 transition duration-700 ${
                    active ? "bg-black/25" : "bg-black/55"
                  }`}
                />

                {/* 编号 */}
                <span className="absolute left-8 top-8 z-10 text-sm font-semibold tracking-[0.3em] text-white/50">
                  0{idx + 1}
                </span>

                {/* 箭头圆钮：悬停/点击意图 */}
                <span
                  className={`absolute right-8 top-8 z-10 flex h-12 w-12 items-center justify-center rounded-full border transition duration-500 ${
                    active
                      ? "border-white bg-white text-black"
                      : "border-white/30 bg-black/30 text-white backdrop-blur"
                  }`}
                >
                  <ArrowUpRight size={20} />
                </span>

                <div className="relative z-10 flex h-full flex-col justify-end p-8 sm:p-10">
                  <p className="text-sm font-medium uppercase tracking-[0.4em] text-white/60">
                    {opt.subtitle}
                  </p>
                  <h3 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                    {t(opt.title)}
                  </h3>
                  <motion.p
                    animate={{ opacity: active ? 1 : 0, height: active ? "auto" : 0 }}
                    transition={{ duration: 0.5 }}
                    className="mt-4 max-w-md overflow-hidden text-base leading-relaxed text-white/85"
                  >
                    {t(opt.description)}
                  </motion.p>
                  <motion.ul
                    animate={{ opacity: active ? 1 : 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="mt-5 hidden space-y-2.5 sm:block"
                  >
                    {opt.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2.5 text-sm text-white/75">
                        <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                        {t(b)}
                      </li>
                    ))}
                  </motion.ul>
                  <span className="mt-8 inline-flex items-center gap-2 text-base font-semibold text-white">
                    {t("Get started")}
                    <span className="h-px w-8 bg-white/60 transition-all duration-500 group-hover:w-14 group-hover:bg-white" />
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
