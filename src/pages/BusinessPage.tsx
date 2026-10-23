import { motion } from "framer-motion";
import { ArrowDown, ArrowLeft, Briefcase, Factory, Languages } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { Navbar } from "@/sections/Navbar";
import { Footer } from "@/sections/Footer";
import { BusinessWizard } from "@/components/BusinessWizard";
import { useI18n } from "@/lib/i18n";
import { track } from "@/lib/analytics";

const highlights = [
  {
    icon: Briefcase,
    title: "Exhibitions & Trade Fairs",
    text: "Canton Fair, CIIE, industry expos — registration, badges, hotels near the venue and tight schedules handled.",
  },
  {
    icon: Factory,
    title: "Factory & Site Visits",
    text: "Supplier audits and manufacturing tours across the Pearl River Delta, Yangtze Delta and beyond.",
  },
  {
    icon: Languages,
    title: "Business Interpretation",
    text: "Professional interpreters for negotiations, meetings and banquets — business etiquette included.",
  },
];

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** 商业差旅子页面：视频首屏 → 简短介绍 → 分步引导向导 → 汇总成表发送 */
export default function BusinessPage() {
  const { t } = useI18n();
  useEffect(() => track("page_view", "business"), []);

  const scrollToPlan = () =>
    document.getElementById("plan")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <main className="bg-black font-sans text-white antialiased">
      <Navbar />

      {/* 子页面 Hero：视频背景 + 图片兜底 */}
      <section className="relative flex h-[70vh] items-end overflow-hidden">
        <motion.video
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.6, ease }}
          src="/media/business-hero.mp4"
          poster="/media/img7.jpg"
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
            {t("Business Travel · 商业差旅")}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.45, ease }}
            className="mt-4 max-w-3xl text-5xl font-semibold leading-tight tracking-tight sm:text-7xl"
          >
            {t("Business in China, without the friction.")}
          </motion.h1>
          <motion.button
            type="button"
            onClick={scrollToPlan}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/85"
          >
            {t("Start planning")}
            <ArrowDown size={16} />
          </motion.button>
        </div>
      </section>

      {/* 商务能力 */}
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

      {/* 分步引导向导（互动部分） */}
      <section id="plan" className="scroll-mt-20 border-t border-white/10 bg-neutral-950">
        <BusinessWizard />
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
