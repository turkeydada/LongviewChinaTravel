import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { translations, type Lang } from "./locales";
import { enqueueCloud } from "./telemetry";

const STORAGE_KEY = "longview-lang";

type I18nValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** 翻译：默认语言(英)直接返回原文；缺失翻译回退英文原文 */
  t: (s: string) => string;
};

const I18nContext = createContext<I18nValue>({
  lang: "en",
  setLang: () => {},
  t: (s) => s,
});

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "zh" || saved === "it" || saved === "es") return saved;
  } catch {
    /* ignore */
  }
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
    // 埋点：记录访客手动切换语言（初始语言不记）
    enqueueCloud({ type: "lang_switch", page: location.hash || "#/", meta: l });
  };

  const t = (s: string): string => {
    if (lang === "en" || !s) return s;
    const hit = translations[s];
    if (!hit) return s;
    return (hit as Record<string, string>)[lang] ?? s;
  };

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
