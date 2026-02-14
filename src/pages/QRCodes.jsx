import React from 'react'
import { getOrderUrl, getQRUrl, openPrintQRCodes } from '../utils/qrHelper'

export default function QRCodesPage() {
  const tables = Array.from({ length: 12 }, (_, index) => index + 1)

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-amber-300/30 bg-slate-900/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-amber-200">12 Table QR Codes</h2>
            <p className="text-sm text-slate-300">Unique URL for each table using /order?table=1 to /order?table=12.</p>
          </div>
          <button className="rounded-md bg-amber-300 px-4 py-2 text-sm font-black text-slate-900" onClick={openPrintQRCodes} type="button">
            Print A5 Cards
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tables.map((tableNumber) => (
          <article className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-center" key={tableNumber}>
            <h3 className="text-xl font-black text-amber-100">Table {tableNumber}</h3>
            <img alt={`Table ${tableNumber} QR`} className="mx-auto mt-2 w-52 rounded-md border border-slate-600 bg-white p-2" src={getQRUrl(tableNumber)} />
            <p className="mt-2 text-xs text-slate-400">{getOrderUrl(tableNumber)}</p>
          </article>
        ))}
      </section>
    </div>
  )
}
