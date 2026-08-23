import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useStore } from '@/store'
import { Shell } from '@/features/layout/Shell'
import { LandingPage } from '@/features/landing/LandingPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { HomePage } from '@/features/home/HomePage'
import { LedgerPage } from '@/features/ledger/LedgerPage'
import { LogsPage } from '@/features/logs/LogsPage'
import { ContentPage } from '@/features/content/ContentPage'
import { ReportPage } from '@/features/report/ReportPage'
import { ActivityPage } from '@/features/activity/ActivityPage'
import { TeleworkPage } from '@/features/telework/TeleworkPage'
import { WorkbenchPage } from '@/features/workbench/WorkbenchPage'
import { RegisterDialog } from '@/features/wizard/RegisterDialog'

function Guard() {
  const authed = useStore(s => s.authed)
  const loc = useLocation()
  return authed ? <Outlet /> : <Navigate to="/login" replace state={{ from: loc.pathname }} />
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<Guard />}>
          <Route element={<Shell />}>
            <Route path="/map" element={<HomePage />} />
            <Route path="/ledger" element={<LedgerPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/content" element={<ContentPage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/telework" element={<TeleworkPage />} />
            <Route path="/workbench" element={<WorkbenchPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <RegisterDialog />
      <Toaster position="bottom-right" toastOptions={{ style: { fontFamily: 'var(--font-sans)', fontSize: 13.5 } }} />
    </BrowserRouter>
  )
}
