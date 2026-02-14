import React, { useEffect, useMemo, useRef, useState } from 'react'
import { listenMergedMenu, listenOrders, updateMenuOverride, updateOrderStatus, verifyKitchenPin } from '../firebase'

function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Just now'
  const delta = Math.floor((Date.now() - timestamp) / 1000)
  if (delta < 60) return `${delta}s ago`
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`
  return `${Math.floor(delta / 3600)}h ago`
}

function beep() {
  try {
    const context = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.frequency.value = 900
    gain.gain.setValueAtTime(0.2, context.currentTime)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.2)
  } catch {
    // ignore if browser blocks autoplay
  }
}

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

function OrderCard({ order, actionLabel, actionColor, onAction }) {
  return (
    <article className={`rounded-xl border p-4 ${actionColor}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Table</p>
          <h4 className="text-4xl font-black text-slate-900">{order.tableNumber}</h4>
          <p className="text-xs font-semibold text-slate-700">{order.orderNumber}</p>
        </div>
        <p className="rounded-md border border-slate-400 bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
          {formatTimeAgo(order.createdAt)}
        </p>
      </div>
      <div className="mt-3 rounded-md border border-slate-200 bg-white p-2">
        {order.items.map((item) => (
          <div className="flex items-center justify-between border-b border-slate-200 py-1 text-sm last:border-b-0" key={`${order.id}_${item.id}`}>
            <p className="text-slate-800">
              x{item.quantity} {item.name}
            </p>
            <p className="font-bold text-slate-900">Rs {item.quantity * item.price}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-right text-sm font-bold text-slate-900">Total: Rs {order.totalAmount}</p>
      <div className="mt-3">
        <button className="kitchen-ok w-full px-3 py-3 text-base font-black uppercase" onClick={onAction} type="button">
          {actionLabel}
        </button>
      </div>
    </article>
  )
}

export default function Kitchen() {
  const [orders, setOrders] = useState([])
  const [pin, setPin] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [invalidPin, setInvalidPin] = useState(false)
  const [menuState, setMenuState] = useState([])
  const previousPlacedCount = useRef(0)

  useEffect(() => {
    return listenOrders(setOrders, { statuses: ['placed', 'preparing', 'ready'] })
  }, [])

  useEffect(() => listenMergedMenu(setMenuState), [])

  const placed = useMemo(() => orders.filter((item) => item.status === 'placed'), [orders])
  const preparing = useMemo(() => orders.filter((item) => item.status === 'preparing'), [orders])
  const ready = useMemo(() => orders.filter((item) => item.status === 'ready'), [orders])
  const groupedMenu = useMemo(() => groupMenu(menuState), [menuState])
  const breakfastItems = useMemo(() => menuState.filter((item) => item.categoryId === 'breakfast'), [menuState])

  useEffect(() => {
    if (placed.length > previousPlacedCount.current) {
      beep()
    }
    previousPlacedCount.current = placed.length
  }, [placed.length])

  function login() {
    if (!verifyKitchenPin(pin)) {
      setInvalidPin(true)
      return
    }
    setLoggedIn(true)
    setInvalidPin(false)
  }

  function setBreakfastAvailability(available) {
    breakfastItems.forEach((item) => {
      updateMenuOverride(item.id, { available })
    })
  }

  if (!loggedIn) {
    return (
      <section className="mx-auto mt-12 max-w-md rounded-xl border border-amber-300/30 bg-slate-900/80 p-6">
        <h2 className="text-2xl font-black text-amber-200">Kitchen Access</h2>
        <p className="mt-1 text-sm text-slate-300">Enter 4-digit kitchen PIN to continue.</p>
        <input
          className="mt-4 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-lg tracking-[0.3em] text-slate-100"
          inputMode="numeric"
          maxLength={4}
          onChange={(event) => setPin(event.target.value.replace(/[^\d]/g, ''))}
          placeholder="0000"
          type="password"
          value={pin}
        />
        {invalidPin && <p className="mt-2 text-sm font-semibold text-red-300">Invalid PIN.</p>}
        <button className="btn-3d mt-4 w-full px-4 py-2 font-black" onClick={login} type="button">
          Login
        </button>
      </section>
    )
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-amber-300/30 bg-slate-900/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-black text-amber-200">Kitchen Dashboard</h2>
            <p className="text-sm text-slate-300">New orders flash in the red lane.</p>
          </div>
          <div className="rounded-md border border-emerald-300/40 bg-emerald-400/10 px-4 py-2 text-right">
            <p className="text-xs uppercase tracking-wider text-emerald-200">Active Orders</p>
            <p className="text-3xl font-black text-emerald-100">{orders.length}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 rounded-xl border-4 border-red-500 bg-red-100 p-3">
          <h3 className="text-lg font-black uppercase text-red-900">New Orders</h3>
          {placed.length === 0 && <p className="text-sm font-bold text-red-800">No new orders.</p>}
          {placed.map((order) => (
            <OrderCard
              actionColor="border-red-500 bg-white"
              actionLabel="OK"
              key={order.id}
              onAction={() => updateOrderStatus(order.id, 'preparing')}
              order={order}
            />
          ))}
        </div>

        <div className="space-y-3 rounded-xl border-4 border-yellow-500 bg-yellow-100 p-3">
          <h3 className="text-lg font-black uppercase text-yellow-900">Preparing</h3>
          {preparing.length === 0 && <p className="text-sm font-bold text-yellow-800">No preparing orders.</p>}
          {preparing.map((order) => (
            <OrderCard
              actionColor="border-yellow-500 bg-white"
              actionLabel="OK"
              key={order.id}
              onAction={() => updateOrderStatus(order.id, 'ready')}
              order={order}
            />
          ))}
        </div>

        <div className="space-y-3 rounded-xl border-4 border-emerald-500 bg-emerald-100 p-3">
          <h3 className="text-lg font-black uppercase text-emerald-900">Ready To Serve</h3>
          {ready.length === 0 && <p className="text-sm font-bold text-emerald-800">No ready orders.</p>}
          {ready.map((order) => (
            <OrderCard
              actionColor="border-emerald-500 bg-white"
              actionLabel="OK"
              key={order.id}
              onAction={() => updateOrderStatus(order.id, 'served')}
              order={order}
            />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-600 bg-slate-900/70 p-4">
        <h3 className="text-lg font-black text-amber-200">Menu Availability</h3>
        <p className="text-sm text-slate-300">Toggle items out-of-stock instantly.</p>
        <div className="mt-3 rounded-md border border-amber-300/40 bg-amber-200/10 p-3">
          <p className="text-sm font-semibold text-amber-100">Breakfast quick control (for Uppit-type daily changes)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button className="rounded-md bg-emerald-400 px-3 py-1 text-xs font-bold uppercase text-slate-900" onClick={() => setBreakfastAvailability(true)} type="button">
              Breakfast Available Today
            </button>
            <button className="rounded-md bg-red-400 px-3 py-1 text-xs font-bold uppercase text-slate-900" onClick={() => setBreakfastAvailability(false)} type="button">
              Breakfast Not Available Today
            </button>
          </div>
          <p className="mt-2 text-xs text-amber-100/80">Or toggle only Uppit below using its checkbox.</p>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {groupedMenu.map((group) => (
            <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-3" key={group.id}>
              <h4 className="mb-2 text-sm font-bold uppercase tracking-wider text-amber-100">{group.category}</h4>
              <div className="space-y-2">
                {group.items.map((current) => {
                  return (
                    <label className="flex cursor-pointer items-center justify-between gap-2 text-sm text-slate-200" key={current.id}>
                      <span>{current.name}</span>
                      <input
                        checked={current.available ?? true}
                        onChange={(event) => updateMenuOverride(current.id, { available: event.target.checked })}
                        type="checkbox"
                      />
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
