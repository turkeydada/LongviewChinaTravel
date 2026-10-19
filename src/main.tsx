import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { I18nProvider } from './lib/i18n.tsx'
import { startTelemetry } from './lib/telemetry.ts'

// HashRouter：部署到任何静态托管（甚至 file://）都能正常跳转，无需服务器路由配置
startTelemetry()
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <I18nProvider>
        <App />
      </I18nProvider>
    </HashRouter>
  </StrictMode>,
)
