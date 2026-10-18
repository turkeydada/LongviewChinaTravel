import { motion } from "framer-motion";
import { useRef } from "react";

/**
 * 横向滑动画廊：一行照片，鼠标滚轮横向滚动 + 拖拽，不增加页面纵向长度。
 * 图片列表由页面传入（src/config 或页面内定义）。
 */
export function Gallery({ images }: { images: string[] }) {
  const ref = useRef<HTMLDivElement>(null);

  // 纵向滚轮 → 横向滚动
  const onWheel = (e: React.WheelEvent) => {
    const el = ref.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
    }
  };

  return (
    <section className="bg-black py-20">
      <div
        ref={ref}
        onWheel={onWheel}
        className="flex gap-4 overflow-x-auto px-6 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((src, i) => (
          <motion.img
            key={src}
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.05 * i }}
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
