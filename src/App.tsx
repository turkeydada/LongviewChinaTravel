import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "@/pages/HomePage";
import LeisurePage from "@/pages/LeisurePage";
import BusinessPage from "@/pages/BusinessPage";

// 后台单独打包：主站访客不会下载后台代码
const AdminPage = lazy(() => import("@/pages/AdminPage"));

/**
 * 路由页面表（Router 在 main.tsx 统一提供）：
 * 新增页面：在 pages/ 写组件 → 在下面加一行 Route。
 * "*" 兜底：未知路径（如旧链接、手误 hash）回到首页，避免空白页。
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/leisure" element={<LeisurePage />} />
      <Route path="/business" element={<BusinessPage />} />
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
  );
}
