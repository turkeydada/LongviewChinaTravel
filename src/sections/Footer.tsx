import { motion } from "framer-motion";
import { Facebook, Instagram, Music2, Mail, Phone } from "lucide-react";
import { footer, site } from "@/config/site";
import { useI18n } from "@/lib/i18n";

const socialIcons: Record<string, typeof Facebook> = {
  facebook: Facebook,
  instagram: Instagram,
  tiktok: Music2, // TikTok 无官方图标，用音符近似；正式上线可换成品牌 SVG
  whatsapp: Phone,
};

const contactIcons: Record<string, typeof Mail> = { Mail, Phone };

/** 页脚：大字标语 + 联系方式 + 社交媒体图标，与整页暗色风格融合（导航 #contact 锚点） */
export function Footer() {
  const { t } = useI18n();
  return (
    <footer id="contact" className="relative overflow-hidden bg-black pt-32 text-white">
      <div className="mx-auto max-w-6xl px-6">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl"
        >
          {t(footer.heading)}
        </motion.h2>

        <div className="mt-14 grid gap-8 sm:grid-cols-2">
          {footer.contact.map((c) => {
            const Icon = contactIcons[c.icon] ?? Mail;
            return (
              <a
                key={c.label}
                href={c.href}
                target={c.href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-white/30 hover:bg-white/10"
              >
                <Icon size={20} strokeWidth={1.5} className="text-neutral-500 transition group-hover:text-white" />
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">{t(c.label)}</p>
                  <p className="mt-1 text-sm font-medium">{c.value}</p>
                </div>
              </a>
            );
          })}
        </div>

        {/* 社交媒体 */}
        <div className="mt-20 flex items-center justify-between border-t border-white/10 py-10">
          <p className="text-sm text-neutral-600">{site.name}</p>
          <div className="flex items-center gap-3">
            {site.socials.map((s) => {
              const Icon = socialIcons[s.id] ?? Facebook;
              return (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  title={s.label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-neutral-500 transition hover:border-white hover:text-white"
                >
                  <Icon size={16} strokeWidth={1.5} />
                </a>
              );
            })}
          </div>
        </div>

        <p className="pb-10 text-center text-xs text-neutral-700">{t(footer.note)}</p>
      </div>
    </footer>
  );
}
