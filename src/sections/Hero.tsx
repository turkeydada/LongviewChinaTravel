import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useRef } from "react";
import { hero } from "@/config/site";
import { useI18n } from "@/lib/i18n";
import { useMousePosition } from "@/hooks/useMousePosition";

export function Hero() {
  const { t } = useI18n();
  const ref = useRef<HTMLElement>(null);
  const mouse = useMousePosition();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // 鼠标视差：背景层与文字层反向移动
  const bgX = useTransform(() => mouse.x * -18);
  const bgY = useTransform(() => mouse.y * -12);
  const textX = useTransform(() => mouse.x * 10);
  const textY = useTransform(() => mouse.y * 6);

  // 滚动驱动：背景放大、内容淡出
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const opacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);

  return (
    <section ref={ref} id="top" className="relative h-screen overflow-hidden">
      {/* 背景视频 + 鼠标视差 */}
      <motion.div style={{ x: bgX, y: bgY, scale }} className="absolute -inset-8">
        <video
          className="h-full w-full object-cover"
          src={hero.video}
          poster={hero.poster}
          autoPlay
          muted
          loop
          playsInline
        />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/80" />

      {/* 前景内容 */}
      <motion.div
        style={{ x: textX, y: textY, opacity }}
        className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center"
      >
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="mb-6 text-xs font-medium uppercase tracking-[0.5em] text-white/70"
        >
          {t("Inbound Travel · Leisure & Business")}
        </motion.p>        <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-7xl lg:text-8xl">
          {hero.titleLines.map((line, i) => (
            <span
              key={line}
              className={`block overflow-hidden pb-[0.12em] -mb-[0.12em] ${i > 0 ? "ml-[8%]" : ""}`}
            >
              <motion.span
                initial={{ y: "110%" }}
                animate={{ y: 0 }}
                transition={{ duration: 1, delay: 0.15 * i + 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="block"
              >
                {line}
              </motion.span>
            </span>
          ))}
        </h1>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.0 }}
          className="mt-6 flex items-center gap-4"
        >
          <span className="h-px w-10 bg-white/40 sm:w-16" />
          <p className="text-sm font-medium tracking-[0.7em] text-white/70 sm:text-base">
            {hero.chineseTagline}
          </p>
          <span className="h-px w-10 bg-white/40 sm:w-16" />
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.1 }}
          className="mt-8 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg"
        >
          {t(hero.subtitle)}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.3 }}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
        >
          <button
            type="button"
            onClick={() => {
              const el = document.querySelector(hero.ctaPrimary.target);
              el?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="rounded-full bg-white px-10 py-4 text-base font-semibold text-black transition hover:bg-white/85"
          >
            {t(hero.ctaPrimary.label)}
          </button>
        </motion.div>
      </motion.div>

      {/* 底部滚动提示（随滚动淡出上移） */}
      <motion.div
        style={{ opacity, y }}
        className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="flex flex-col items-center gap-2 text-white/60"
        >
          <span className="text-[10px] uppercase tracking-[0.4em]">{t("Scroll")}</span>
          <ChevronDown size={18} />
        </motion.div>
      </motion.div>
    </section>
  );
}
