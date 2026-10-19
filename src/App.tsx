import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import HomePage from "@/pages/HomePage";
import LeisurePage from "@/pages/LeisurePage";
import BusinessPage from "@/pages/BusinessPage";
import { AboutPage, CookiesPage, FaqPage, PrivacyPage, RefundPage, TermsPage } from "@/pages/legal";

// 后台单独打包：主站访客不会下载后台代码
const AdminPage = lazy(() => import("@/pages/AdminPage"));

/**
 * 路由切换时回到页面顶端。
 * HashRouter 切换页面不刷新文档，滚动位置会保留（从页脚点进政策页会停在页尾），
 * 这里监听路径变化，切页后立即回到顶部，方便阅读。
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

/**
 * 路由页面表（Router 在 main.tsx 统一提供）：
 * 新增页面：在 pages/ 写组件 → 在下面加一行 Route。
 * "*" 兜底：未知路径（如旧链接、手误 hash）回到首页，避免空白页。
 */
export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/leisure" element={<LeisurePage />} />
      <Route path="/business" element={<BusinessPage />} />
      {/* 法律与信息页面：隐私政策 / 服务条款 / Cookie 政策 / 退款政策 / About / FAQ */}
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/cookies" element={<CookiesPage />} />
      <Route path="/refund" element={<RefundPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/faq" element={<FaqPage />} />
      <Route
        path="/admin"
        element={
          <Suspense fallback={null}>
            <AdminPage />
          </Suspense>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
