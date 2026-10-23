import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  // 必须使用绝对根路径：BrowserRouter 下 /admin、/business 等深层链接
  // 刷新或直接访问时，相对路径会把资源解析到错误目录导致白屏
  base: '/',
  plugins: [inspectAttr(), react()],
  server: {
    // 本机 IPv6 回环不可用（可能已被代理工具关闭），明确绑定 IPv4，否则浏览器无法访问
    host: "127.0.0.1",
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
