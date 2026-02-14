export function getOrderUrl(tableNumber) {
  const baseUrl = window.location.origin
  return `${baseUrl}/order?table=${tableNumber}`
}

export function getQRUrl(tableNumber) {
  const tableUrl = getOrderUrl(tableNumber)
  return `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(tableUrl)}`
}

export function getQRCardsMarkup(tableCount = 12) {
  const tables = Array.from({ length: tableCount }, (_, index) => index + 1)
  return tables
    .map(
      (tableNumber) => `
      <article class="qr-card">
        <h2>AGM HOTEL</h2>
        <p class="line">Engineering Hunger, Serving Solutions</p>
        <img src="${getQRUrl(tableNumber)}" alt="Table ${tableNumber} QR code">
        <p class="table-label">TABLE ${tableNumber}</p>
        <p class="scan-text">Scan To Order</p>
        <p class="url">${getOrderUrl(tableNumber)}</p>
      </article>
    `
    )
    .join('')
}

export function openPrintQRCodes() {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>AGM HOTEL - 12 Table QR Codes</title>
        <style>
          body { margin: 0; font-family: Arial, sans-serif; background: #fef3c7; }
          .toolbar { position: sticky; top: 0; background: #111827; color: #fff; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
          button { border: 0; background: #f59e0b; color: #111827; font-weight: 700; padding: 8px 14px; border-radius: 8px; cursor: pointer; }
          .wrap { padding: 18px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
          .qr-card { background: #fff; border: 2px solid #f59e0b; border-radius: 12px; padding: 16px; text-align: center; break-inside: avoid; }
          .qr-card h2 { margin: 0 0 6px; font-size: 24px; }
          .line { margin: 0 0 12px; color: #6b7280; font-size: 12px; }
          .qr-card img { width: 260px; max-width: 100%; border: 1px solid #d1d5db; border-radius: 8px; }
          .table-label { margin: 10px 0 2px; font-size: 28px; font-weight: 800; letter-spacing: 1px; }
          .scan-text { margin: 0; color: #b45309; font-weight: 700; }
          .url { margin: 10px 0 0; font-size: 11px; color: #9ca3af; word-break: break-all; }
          @media print {
            .toolbar { display: none; }
            .wrap { padding: 8mm; gap: 8mm; }
            .qr-card { page-break-inside: avoid; min-height: 128mm; }
          }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <div>AGM HOTEL - QR Set (12 Tables)</div>
          <button onclick="window.print()">Print</button>
        </div>
        <section class="wrap">${getQRCardsMarkup(12)}</section>
      </body>
    </html>
  `
  const printWindow = window.open('', '_blank', 'noopener,noreferrer')
  if (!printWindow) return
  printWindow.document.write(html)
  printWindow.document.close()
}
