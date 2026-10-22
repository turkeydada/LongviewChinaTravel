import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { I18nProvider } from './lib/i18n.tsx'
import { startTelemetry } from './lib/telemetry.ts'

// BrowserRouter：干净路径（/business /leisure），Google 可分别收录每个页面。
// 旧版 #/ 链接由 index.html 内的兼容脚本自动跳转到新路径；
// Cloudflare Pages 由 public/_redirects 提供 SPA 兜底（/* → /index.html 200）。
startTelemetry()
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <App />
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
)
