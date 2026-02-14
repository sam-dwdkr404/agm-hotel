import React from 'react'
import { Link } from 'react-router-dom'
import { BRAND } from './data/menu'
import { getMenuImageSrc } from './data/menuImages'

export default function App({ children }) {
  return (
    <div className="min-h-screen bg-app text-slate-900">
      <header className="border-b border-[#1B5E20] bg-[#2E7D32] shadow-[0_4px_0_rgba(27,94,32,0.3)]">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-full border border-amber-300/60 bg-white">
              {getMenuImageSrc('app-logo.png') ? (
                <img alt="AGM Canteen" className="h-full w-full object-cover" src={getMenuImageSrc('app-logo.png')} />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase text-[#2E7D32]">
                  Logo
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">{BRAND.name}</h1>
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/80">{BRAND.tagline}</p>
            </div>
          </div>
          <nav className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
            <Link className="rounded-md border border-white/70 bg-white px-3 py-1.5 text-[#2E7D32]" to="/order?table=1">
              Customer
            </Link>
            <Link className="rounded-md border border-white/70 bg-white px-3 py-1.5 text-[#2E7D32]" to="/kitchen">
              Kitchen
            </Link>
            <Link className="rounded-md border border-white/70 bg-white px-3 py-1.5 text-[#2E7D32]" to="/admin-agm-2024-secure">
              Admin
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-6">{children}</main>
      <footer className="mx-auto w-full max-w-3xl px-4 pb-8 text-center text-sm text-slate-700">
        <p>© 2026 AGM Hotel</p>
        <p>Built with purpose by Samanvita Dharwadkar</p>
        <p>
          Connect →
          <a className="ml-2 font-semibold text-[#1B5E20] underline" href="mailto:samanvitard@gmail.com">
            samanvitard@gmail.com
          </a>
        </p>
      </footer>
    </div>
  )
}
