import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import App from './App'
import './index.css'
import Admin from './pages/Admin'
import Kitchen from './pages/Kitchen'
import QRCodesPage from './pages/QRCodes'
import TablePage from './pages/TablePage'

function LegacyTableRedirect() {
  const { tableNumber } = useParams()
  const tableNo = Number(tableNumber || 1)
  const safe = Number.isFinite(tableNo) ? Math.min(12, Math.max(1, Math.round(tableNo))) : 1
  return <Navigate replace to={`/order?table=${safe}`} />
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App>
        <Routes>
          <Route element={<Navigate replace to="/order?table=1" />} path="/" />
          <Route element={<TablePage />} path="/order" />
          <Route element={<LegacyTableRedirect />} path="/table/:tableNumber" />
          <Route element={<Kitchen />} path="/kitchen" />
          <Route element={<Admin />} path="/admin-agm-2024-secure" />
          <Route element={<QRCodesPage />} path="/qr-codes" />
          <Route element={<Navigate replace to="/order?table=1" />} path="*" />
        </Routes>
      </App>
    </BrowserRouter>
  </React.StrictMode>
)
