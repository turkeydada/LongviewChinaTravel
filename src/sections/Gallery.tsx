import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

/**
 * 横向画廊：图片缓慢自动循环滚动（无缝衔接）。
 * - 悬停（桌面）或触摸（手机/平板）时暂停，离开后自动恢复
 * - 内容复制一份，滚完一半立即回卷到起点，视觉无跳变
 * - 保留滚轮横向滚动 / 手动拖拽，不增加页面纵向长度
 */
export function Gallery({ images }: { images: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const paused = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let half = 0; // 单份内容的宽度（scrollWidth 减去容器左右内边距后的一半）
    const measure = () => {
      const cs = getComputedStyle(el);
      const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      half = Math.max(1, (el.scrollWidth - pad) / 2);
    };
    measure();
    window.addEventListener("resize", measure);

    const SPEED = 0.55; // 像素/帧 ≈ 33px/s，缓慢移动
    const tick = () => {
      if (!paused.current && half > 0) {
        el.scrollLeft += SPEED;
        if (el.scrollLeft >= half) el.scrollLeft -= half;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, []);

  // 复制一份实现无缝循环
  const items = [...images, ...images];

  return (
    <section className="bg-black py-20">
      <div
        ref={ref}
        onMouseEnter={() => (paused.current = true)}
        onMouseLeave={() => (paused.current = false)}
        onTouchStart={() => (paused.current = true)}
        onTouchEnd={() => {
          // 手指松开后稍等再继续，避免和惯性滚动打架
          window.setTimeout(() => (paused.current = false), 2500);
        }}
        className="flex gap-4 overflow-x-auto px-6 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((src, i) => (
          <motion.img
            key={`${src}-${i}`}
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.05 * (i % images.length) }}
            src={src}
            alt="China travel"
            loading="lazy"
            draggable={false}
            className="h-[300px] w-[420px] flex-none rounded-2xl object-cover sm:h-[360px] sm:w-[540px]"
          />
        ))}
      </div>
    </section>
  );
}
