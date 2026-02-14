import React, { useEffect, useMemo, useState } from 'react'
import {
  computeAnalytics,
  getAdminLockState,
  listenAnalytics,
  listenLoginLogs,
  listenMergedMenu,
  listenOrders,
  listenRatings,
  listenTableConfig,
  logoutAdmin,
  refreshAdminSession,
  setTableEnabled,
  updateMenuOverride,
  updateOrderStatus,
  validateAdminSession,
  verifyAdminCredentials
} from '../firebase'

function groupMenu(menuItems) {
  const grouped = menuItems.reduce((acc, item) => {
    const key = item.categoryId || 'general'
    if (!acc[key]) {
      acc[key] = {
        id: key,
        category: item.category || 'General',
        items: []
      }
    }
    acc[key].items.push(item)
    return acc
  }, {})
  return Object.values(grouped)
    .map((group) => ({ ...group, items: [...group.items].sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => a.category.localeCompare(b.category))
}

function formatCurrency(value) {
  return `Rs ${Number(value || 0)}`
}

function formatDateTime(value) {
  if (!value) return '--'
  return new Date(value).toLocaleString()
}

function ProgressBars({ points }) {
  const max = Math.max(1, ...points.map((point) => point.orders))
  return (
    <div className="grid gap-2">
      {points.map((point) => (
        <div className="grid grid-cols-[70px_1fr_40px] items-center gap-2" key={point.hour}>
          <span className="text-xs font-semibold text-slate-800">{point.hour}</span>
          <div className="h-3 rounded-full bg-slate-700">
            <div className="h-3 rounded-full bg-amber-500" style={{ width: `${(point.orders / max) * 100}%` }} />
          </div>
          <span className="text-right text-xs font-bold text-slate-900">{point.orders}</span>
        </div>
      ))}
    </div>
  )
}

function AdminLogin({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '', pin: '' })
  const [error, setError] = useState('')
  const [lockState, setLockState] = useState(getAdminLockState())

  useEffect(() => {
    const timer = setInterval(() => setLockState(getAdminLockState()), 1000)
    return () => clearInterval(timer)
  }, [])

  const isLocked = lockState.lockUntil > Date.now()

  function submit(event) {
    event.preventDefault()
    if (isLocked) return

    const result = verifyAdminCredentials({
      email: form.email,
      password: form.password,
      pin: form.pin,
      ipAddress: 'college-wifi-local'
    })

    if (!result.ok) {
      const lockUntil = result.lockUntil ? new Date(result.lockUntil).toLocaleTimeString() : null
      setError(result.reason === 'locked' ? `Locked until ${lockUntil}` : 'Invalid credentials')
      setLockState(getAdminLockState())
      return
    }

    onLogin(result.token)
  }

  return (
    <section className="mx-auto mt-10 max-w-md rounded-xl border border-amber-300/30 bg-slate-900/80 p-6">
      <h2 className="text-2xl font-black text-amber-200">Admin Panel Access</h2>
      <p className="mt-1 text-sm text-slate-300">Email + Password + 6-digit PIN required.</p>
      <form className="mt-4 space-y-3" onSubmit={submit}>
        <input
          className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100"
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          placeholder="Email"
          required
          type="email"
          value={form.email}
        />
        <input
          className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100"
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          placeholder="Password"
          required
          type="password"
          value={form.password}
        />
        <input
          className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100"
          maxLength={6}
          onChange={(event) => setForm((prev) => ({ ...prev, pin: event.target.value.replace(/[^\d]/g, '') }))}
          placeholder="6-digit PIN"
          required
          type="password"
          value={form.pin}
        />
        {error && <p className="text-sm font-semibold text-red-300">{error}</p>}
        {isLocked && (
          <p className="text-sm text-red-200">Login locked until {new Date(lockState.lockUntil).toLocaleTimeString()} after 3 failed attempts.</p>
        )}
        <button className="w-full rounded-md bg-amber-300 px-4 py-2 font-black text-slate-900 disabled:opacity-50" disabled={isLocked} type="submit">
          Secure Login
        </button>
      </form>
    </section>
  )
}

export default function Admin() {
  const [sessionToken, setSessionToken] = useState(() => localStorage.getItem('agm_admin_session') || '')
  const [menuState, setMenuState] = useState([])
  const [tableConfig, setTableConfig] = useState([])
  const [orders, setOrders] = useState([])
  const [ratings, setRatings] = useState([])
  const [logs, setLogs] = useState([])
  const [analytics, setAnalytics] = useState(() => computeAnalytics())
  const [priceDrafts, setPriceDrafts] = useState({})

  useEffect(() => {
    if (!sessionToken) return
    localStorage.setItem('agm_admin_session', sessionToken)
  }, [sessionToken])

  useEffect(() => {
    if (!sessionToken) return
    if (!validateAdminSession(sessionToken)) {
      setSessionToken('')
      localStorage.removeItem('agm_admin_session')
      return
    }
    const timer = setInterval(() => {
      const ok = refreshAdminSession(sessionToken)
      if (!ok) {
        setSessionToken('')
        localStorage.removeItem('agm_admin_session')
      }
    }, 60000)
    return () => clearInterval(timer)
  }, [sessionToken])

  useEffect(() => {
    if (!sessionToken) return
    const unsubs = [
      listenMergedMenu(setMenuState),
      listenTableConfig(setTableConfig),
      listenOrders(setOrders),
      listenRatings(setRatings),
      listenLoginLogs(setLogs),
      listenAnalytics(setAnalytics)
    ]
    return () => unsubs.forEach((unsub) => unsub())
  }, [sessionToken])

  const activeOrders = useMemo(() => orders.filter((order) => ['placed', 'preparing', 'ready'].includes(order.status)), [orders])
  const historyOrders = useMemo(() => orders.filter((order) => ['served', 'rejected', 'cancelled'].includes(order.status)), [orders])
  const groupedMenu = useMemo(() => groupMenu(menuState), [menuState])

  function handleLogout() {
    logoutAdmin(sessionToken, 'college-wifi-local')
    setSessionToken('')
    localStorage.removeItem('agm_admin_session')
  }

  function savePrice(itemId) {
    const value = Number(priceDrafts[itemId])
    if (!Number.isFinite(value) || value <= 0) return
    updateMenuOverride(itemId, { price: Math.round(value) })
  }

  if (!sessionToken || !validateAdminSession(sessionToken)) {
    return (
      <AdminLogin
        onLogin={(token) => {
          setSessionToken(token)
          localStorage.setItem('agm_admin_session', token)
        }}
      />
    )
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border-4 border-amber-400 bg-amber-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-black text-amber-900">Owner Dashboard</h2>
            <p className="text-sm font-semibold text-amber-800">Hidden route, dual auth, timed session.</p>
          </div>
          <button className="rounded-md border-2 border-amber-500 bg-white px-4 py-2 text-sm font-bold text-amber-800" onClick={handleLogout} type="button">
            Logout
          </button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border-4 border-amber-400 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Today Orders</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{analytics.todayOrders}</p>
        </article>
        <article className="rounded-xl border-4 border-amber-400 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Today Revenue</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{formatCurrency(analytics.todayRevenue)}</p>
        </article>
        <article className="rounded-xl border-4 border-amber-400 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Active Orders</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{analytics.activeOrders}</p>
        </article>
        <article className="rounded-xl border-4 border-amber-400 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Average Rating</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{analytics.averageRating.toFixed(1)}</p>
          <p className="text-xs font-semibold text-slate-600">{analytics.ratingsCount} reviews</p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-xl border-4 border-slate-800 bg-white p-4">
          <h3 className="text-lg font-black text-slate-900">Hourly Orders (8AM-8PM)</h3>
          <div className="mt-3">
            <ProgressBars points={analytics.hourlySales || []} />
          </div>
        </article>
        <article className="rounded-xl border-4 border-slate-800 bg-white p-4">
          <h3 className="text-lg font-black text-slate-900">Table Leaderboard</h3>
          <div className="mt-2 space-y-2">
            {(analytics.tableLeaderboard || []).slice(0, 8).map((row) => (
              <div className="flex items-center justify-between text-sm" key={row.tableNumber}>
                <span className="text-slate-700">Table {row.tableNumber}</span>
                <span className="font-semibold text-slate-900">{row.orders} orders</span>
              </div>
            ))}
            {(!analytics.tableLeaderboard || analytics.tableLeaderboard.length === 0) && <p className="text-sm text-slate-600">No table data yet.</p>}
          </div>
        </article>
        <article className="rounded-xl border-4 border-slate-800 bg-white p-4">
          <h3 className="text-lg font-black text-slate-900">Bestsellers</h3>
          <div className="mt-2 space-y-2">
            {(analytics.bestsellers || []).slice(0, 8).map((row) => (
              <div className="flex items-center justify-between text-sm" key={row.name}>
                <span className="text-slate-700">{row.name}</span>
                <span className="font-semibold text-slate-900">{row.sold}</span>
              </div>
            ))}
            {(!analytics.bestsellers || analytics.bestsellers.length === 0) && <p className="text-sm text-slate-600">No sales yet.</p>}
          </div>
        </article>
      </section>

      <section className="rounded-xl border-4 border-slate-800 bg-white p-4">
        <h3 className="text-lg font-black text-slate-900">Table Management</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {tableConfig.map((table) => (
            <label className="flex items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" key={table.tableNumber}>
              <span className="text-slate-800">Table {table.tableNumber}</span>
              <input checked={table.enabled} onChange={(event) => setTableEnabled(table.tableNumber, event.target.checked)} type="checkbox" />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-xl border-4 border-slate-800 bg-white p-4">
        <h3 className="text-lg font-black text-slate-900">Menu Management</h3>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          {groupedMenu.map((group) => (
            <article className="rounded-lg border border-slate-300 bg-white p-3" key={group.id}>
              <h4 className="mb-2 text-sm font-black uppercase tracking-wider text-slate-900">{group.category}</h4>
              <div className="space-y-2">
                {group.items.map((current) => {
                  return (
                    <div className="rounded-md border border-slate-200 px-2 py-2" key={current.id}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800">{current.name}</p>
                        <label className="text-xs font-semibold text-slate-600">
                          Available
                          <input
                            checked={current.available ?? true}
                            className="ml-2"
                            onChange={(event) => updateMenuOverride(current.id, { available: event.target.checked })}
                            type="checkbox"
                          />
                        </label>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <input
                          className="w-28 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
                          onChange={(event) => setPriceDrafts((prev) => ({ ...prev, [current.id]: event.target.value }))}
                          placeholder={String(current.price)}
                          type="number"
                          value={priceDrafts[current.id] || ''}
                        />
                        <button className="rounded-md bg-amber-400 px-3 py-1 text-xs font-black text-slate-900" onClick={() => savePrice(current.id)} type="button">
                          Save Price
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border-4 border-slate-800 bg-white p-4">
          <h3 className="text-lg font-black text-slate-900">Active Orders</h3>
          <div className="mt-3 space-y-2">
            {activeOrders.map((order) => (
              <div className="rounded-md border border-slate-300 bg-white p-3" key={order.id}>
                <div className="flex items-center justify-between text-sm">
                  <p className="font-semibold text-slate-800">
                    {order.orderNumber} - Table {order.tableNumber}
                  </p>
                  <p className="font-semibold text-slate-900">{order.status}</p>
                </div>
                <div className="mt-2 flex gap-2">
                  {order.status !== 'cancelled' && (
                    <button className="rounded-md bg-red-400 px-2 py-1 text-xs font-bold text-slate-900" onClick={() => updateOrderStatus(order.id, 'cancelled')} type="button">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
            {activeOrders.length === 0 && <p className="text-sm text-slate-600">No active orders.</p>}
          </div>
        </article>
        <article className="rounded-xl border-4 border-slate-800 bg-white p-4">
          <h3 className="text-lg font-black text-slate-900">Ratings</h3>
          <div className="mt-3 space-y-2">
            {ratings.slice(0, 12).map((rating) => (
              <div className="rounded-md border border-slate-300 bg-white p-3" key={rating.id}>
                <div className="flex items-center justify-between text-sm">
                  <p className="font-semibold text-slate-800">
                    {rating.orderNumber} - Table {rating.tableNumber}
                  </p>
                  <p className="font-semibold text-slate-900">{rating.stars}/5</p>
                </div>
                {rating.tags?.length > 0 && <p className="mt-1 text-xs font-semibold text-emerald-700">{rating.tags.join(', ')}</p>}
                {rating.comment && <p className="mt-1 text-xs text-slate-700">{rating.comment}</p>}
              </div>
            ))}
            {ratings.length === 0 && <p className="text-sm text-slate-600">No ratings yet.</p>}
          </div>
        </article>
      </section>

      <section className="rounded-xl border-4 border-slate-800 bg-white p-4">
        <h3 className="text-lg font-black text-slate-900">Order History</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                <th className="px-2 py-2">Order</th>
                <th className="px-2 py-2">Table</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Amount</th>
                <th className="px-2 py-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {historyOrders.slice(0, 30).map((order) => (
                <tr className="border-t border-slate-200 text-slate-800" key={order.id}>
                  <td className="px-2 py-2">{order.orderNumber}</td>
                  <td className="px-2 py-2">{order.tableNumber}</td>
                  <td className="px-2 py-2">{order.status}</td>
                  <td className="px-2 py-2">{formatCurrency(order.totalAmount)}</td>
                  <td className="px-2 py-2">{formatDateTime(order.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {historyOrders.length === 0 && <p className="mt-2 text-sm text-slate-600">No historical orders yet.</p>}
        </div>
      </section>

      <section className="rounded-xl border-4 border-slate-800 bg-white p-4">
        <h3 className="text-lg font-black text-slate-900">Login Logs</h3>
        <div className="mt-3 space-y-2">
          {logs.slice(0, 20).map((log) => (
            <div className="flex flex-wrap items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-xs" key={log.id}>
              <p className="font-semibold text-slate-800">
                {log.action} - {log.email}
              </p>
              <p className="text-slate-600">
                {formatDateTime(log.createdAt)} - {log.ipAddress}
              </p>
            </div>
          ))}
          {logs.length === 0 && <p className="text-sm text-slate-600">No logs yet.</p>}
        </div>
      </section>
    </div>
  )
}
