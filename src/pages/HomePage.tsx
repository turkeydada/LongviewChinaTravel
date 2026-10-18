import { useEffect } from "react";
import { track } from "@/lib/analytics";
import { Navbar } from "@/sections/Navbar";
import { Hero } from "@/sections/Hero";
import { Manifesto } from "@/sections/Manifesto";
import { Purpose } from "@/sections/Purpose";
import { Services } from "@/sections/Services";
import { Footer } from "@/sections/Footer";

/**
 * Main Page 组装层（按 2026-10-17 反馈重构）：
 * 首屏 → 简短公司介绍(#intro) → 出行类型选择(#purpose) → 服务矩阵 → 联系页脚(#contact)
 * 表单已移至子页面分步向导，主页不再有大段滚动内容。
 */
export default function HomePage() {
  useEffect(() => {
    track("page_view", "home");
  }, []);

  return (
    <main className="bg-black font-sans text-white antialiased">
      <Navbar />
      <Hero />
      <Manifesto />
      <Purpose />
      <Services />
      <Footer />
    </main>
  );
}
