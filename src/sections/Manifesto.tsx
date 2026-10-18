import { motion } from "framer-motion";
import { manifesto } from "@/config/site";
import { useI18n } from "@/lib/i18n";

/**
 * 公司介绍（Overview）：导航 #intro 锚点，简短单一板块，
 * 让访问者快速滑到出行类型选择区。
 */
export function Manifesto() {
  const { t } = useI18n();
  return (
    <section id="intro" className="relative bg-neutral-950 py-24 text-white sm:py-28">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl"
        >
          {t(manifesto.heading)}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-neutral-400"
        >
          {t(manifesto.paragraphs[0])}
        </motion.p>

        {/* 数字速览：一行扫过即可 */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-x-10 gap-y-4"
        >
          {manifesto.stats.map((s) => (
            <div key={s.label} className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tracking-tight">
                {s.value}
                <span className="text-neutral-500">{s.suffix}</span>
              </span>
              <span className="max-w-[120px] text-left text-[11px] leading-tight text-neutral-500">
                {t(s.label)}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
