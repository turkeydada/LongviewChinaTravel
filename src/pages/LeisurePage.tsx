import { motion } from "framer-motion";
import { ArrowDown, ArrowLeft, Camera, ChefHat, Mountain } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { Navbar } from "@/sections/Navbar";
import { Footer } from "@/sections/Footer";
import { Gallery } from "@/sections/Gallery";
import { LeisureWizard } from "@/components/LeisureWizard";
import { useI18n } from "@/lib/i18n";
import { track } from "@/lib/analytics";

/** Leisure 画廊：白天海岸/城市照片 */
const leisureGallery = [
  "media/gl0.jpg",
  "media/gl1.jpg",
  "media/gl2.jpg",
  "media/gl3.jpg",
  "media/gl4.jpg",
  "media/gl5.jpg",
];

const highlights = [
  {
    icon: Mountain,
    title: "Nature & Landscapes",
    text: "Great Wall sunrise, Li River karsts, Zhangjiaje pillars — China's iconic scenery, timed to dodge the crowds.",
  },
  {
    icon: ChefHat,
    title: "Food & Culture",
    text: "Peking duck in hutongs, hotpot in Chengdu, tea ceremonies in Hangzhou. Eat where locals eat.",
  },
  {
    icon: Camera,
    title: "Photography Trips",
    text: "Golden-hour viewpoints and drone-friendly locations, planned around light and weather.",
  },
];

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** 入境休闲旅游子页面：亮点 → 分步引导向导 → 汇总成表发送 */
export default function LeisurePage() {
  const { t } = useI18n();
  useEffect(() => track("page_view", "leisure"), []);

  return (
    <main className="bg-black font-sans text-white antialiased">
      <Navbar />

      {/* 子页面 Hero：视频背景 + 图片兜底 */}
      <section className="relative flex h-[70vh] items-end overflow-hidden">
        <motion.video
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.6, ease }}
          src="media/leisure-hero.mp4"
          poster="media/img4.jpg"
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/40" />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-20">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-xs font-medium uppercase tracking-[0.5em] text-white/70"
          >
            {t("Leisure Travel · 入境休闲旅游")}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.45, ease }}
            className="mt-4 max-w-3xl text-5xl font-semibold leading-tight tracking-tight sm:text-7xl"
          >
            {t("Your holiday, designed around you.")}
          </motion.h1>
          <motion.a
            href="#plan"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/85"
          >
            {t("Start planning")}
            <ArrowDown size={16} />
          </motion.a>
        </div>
      </section>

      {/* 亮点 */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-px overflow-hidden rounded-3xl bg-white/10 md:grid-cols-3">
          {highlights.map((h, i) => (
            <motion.div
              key={h.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.7, delay: 0.08 * i }}
              className="bg-neutral-950 p-10"
            >
              <h.icon size={26} strokeWidth={1.5} className="text-neutral-400" />
              <h3 className="mt-6 text-xl font-semibold">{t(h.title)}</h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-500">{t(h.text)}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 横向画廊 */}
      <Gallery images={leisureGallery} />

      {/* 分步向导 */}
      <section id="plan" className="border-t border-white/10 bg-neutral-950">
        <LeisureWizard />
      </section>

      <div className="mx-auto max-w-6xl px-6 pb-20">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-white">
          <ArrowLeft size={16} />
          {t("Back to home")}
        </Link>
      </div>

      <Footer />
    </main>
  );
}
