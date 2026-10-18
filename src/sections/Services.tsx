import { motion } from "framer-motion";
import {
  Plane,
  Hotel,
  Car,
  Users,
  Languages,
  MapPin,
  Ticket,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { services } from "@/config/site";
import { useI18n } from "@/lib/i18n";

const iconMap: Record<string, LucideIcon> = {
  Plane,
  Hotel,
  Car,
  Users,
  Languages,
  MapPin,
  Ticket,
  Sparkles,
};

/** 服务矩阵：模块化卡片，配置驱动 */
export function Services() {
  const { t } = useI18n();
  return (
    <section id="services" className="relative bg-black py-32 text-white sm:py-40">
      <div className="mx-auto max-w-6xl px-6">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl"
        >
          {t(services.heading)}
        </motion.h2>

        <div className="mt-16 grid gap-px overflow-hidden rounded-3xl bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {services.items.map((item, i) => {
            const Icon = iconMap[item.icon] ?? Sparkles;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ duration: 0.7, delay: 0.05 * i }}
                className="group bg-neutral-950 p-8 transition-colors duration-500 hover:bg-neutral-900"
              >
                <Icon
                  size={26}
                  strokeWidth={1.5}
                  className="text-neutral-500 transition-colors duration-500 group-hover:text-white"
                />
                <h3 className="mt-6 text-lg font-semibold">{t(item.title)}</h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-500">{t(item.text)}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
