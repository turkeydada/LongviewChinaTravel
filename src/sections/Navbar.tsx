import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { site } from "@/config/site";
import { useI18n } from "@/lib/i18n";
import { LANGS } from "@/lib/locales";

/** 语言切换：四个小字按钮，激活态纯白，不破坏导航排版 */
function LangSwitcher({ onChange }: { onChange?: () => void }) {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex items-center gap-1 rounded-full border border-white/10 px-1.5 py-1">
      {LANGS.map((l) => (
        <button
          key={l.id}
          type="button"
          title={l.label}
          onClick={() => {
            setLang(l.id);
            onChange?.();
          }}
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider transition ${
            lang === l.id ? "bg-white text-black" : "text-white/50 hover:text-white"
          }`}
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}

/**
 * 顶部导航：
 * 左：品牌；中：Leisure travel / Business travel（直达子界面）；
 * 右：Overview（公司介绍）/ Contact（页脚）/ Plan a trip（出行类型选择）/ 语言切换。
 * 移动端折叠为汉堡菜单。
 */
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { t } = useI18n();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: t("Overview"), hash: "#intro" },
    { label: t("Contact"), hash: "#contact" },
  ];

  const journeyLinks = [
    { label: t("Leisure travel"), to: "/leisure" },
    { label: t("Business travel"), to: "/business" },
  ];

  const scrollTo = (hash: string, delay = 0) => {
    setOpen(false);
    const el = document.querySelector(hash);
    if (!el) return;
    // 抽屉菜单收起时的布局动画会打断浏览器平滑滚动 → 菜单打开时延迟到收合后再滚
    window.setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), delay);
  };

  const handleAnchor = (hash: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname !== "/") {
      // 子页面：先回主页，再滚动（等页面渲染）
      setOpen(false);
      window.location.hash = `/`;
      setTimeout(() => scrollTo(hash, 0), 350);
    } else {
      scrollTo(hash, open ? 320 : 0);
    }
  };

  const journeyLinkCls = ({ isActive }: { isActive: boolean }) =>
    `text-xs font-medium uppercase tracking-[0.2em] transition ${
      isActive ? "text-white" : "text-white/60 hover:text-white"
    }`;

  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
        scrolled || open ? "border-b border-white/10 bg-black/60 backdrop-blur-xl" : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link to="/" className="flex shrink-0 items-center gap-2.5 text-sm font-semibold tracking-wide text-white" onClick={() => setOpen(false)}>
          <img src="media/logo-mark.png" alt="Longview China Travel logo" className="h-7 w-auto" />
          <span>{site.name}</span>
        </Link>

        {/* 中：两个子界面直达入口（流式布局，避免绝对定位重叠） */}
        <div className="hidden flex-1 items-center justify-center gap-6 whitespace-nowrap md:flex">
          {journeyLinks.map((l) => (
            <NavLink key={l.to} to={l.to} className={journeyLinkCls}>
              {l.label}
            </NavLink>
          ))}
        </div>

        {/* 右：锚点 + Plan a trip + 语言切换 */}
        <div className="hidden shrink-0 items-center gap-4 whitespace-nowrap sm:flex">
          <div className="hidden items-center gap-5 lg:flex">
            {links.map((l) => (
              <a
                key={l.hash}
                href={`/${l.hash}`}
                onClick={handleAnchor(l.hash)}
                className="text-xs font-medium uppercase tracking-[0.2em] text-white/60 transition hover:text-white"
              >
                {l.label}
              </a>
            ))}
          </div>
          <a
            href="/#purpose"
            onClick={handleAnchor("#purpose")}
            className="rounded-full bg-white px-5 py-2 text-xs font-semibold text-black transition hover:bg-white/85"
          >
            {t("Plan a trip")}
          </a>
          <LangSwitcher />
        </div>

        {/* 移动端：语言切换 + 汉堡按钮 */}
        <div className="flex items-center gap-3 sm:hidden">
          <LangSwitcher />
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setOpen((o) => !o)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* 移动端抽屉菜单 */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-b border-white/10 bg-black/80 backdrop-blur-xl sm:hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-4">
              {journeyLinks.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `rounded-xl px-4 py-3 text-sm font-medium uppercase tracking-[0.2em] transition hover:bg-white/5 ${
                      isActive ? "text-white" : "text-white/70 hover:text-white"
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
              {links.map((l) => (
                <a
                  key={l.hash}
                  href={`/${l.hash}`}
                  onClick={handleAnchor(l.hash)}
                  className="rounded-xl px-4 py-3 text-sm font-medium uppercase tracking-[0.2em] text-white/70 transition hover:bg-white/5 hover:text-white"
                >
                  {l.label}
                </a>
              ))}
              <a
                href="/#purpose"
                onClick={handleAnchor("#purpose")}
                className="mt-2 rounded-full bg-white px-4 py-3 text-center text-sm font-semibold text-black"
              >
                {t("Plan a trip")}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
