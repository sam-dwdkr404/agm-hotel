import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import FloatingMessages from '../components/FloatingMessages'
import { BRAND, PAYMENT_REMINDERS, QUICK_RATING_TAGS } from '../data/menu'
import { getMenuImageSrc } from '../data/menuImages'
import {
  getMergedMenu,
  getOrderById,
  getTableConfig,
  incrementScan,
  listenOrders,
  listenMergedMenu,
  listenRatings,
  listenTableCurrentOrder,
  placeOrder,
  submitOrderRating
} from '../firebase'

const STATUS_ORDER = ['placed', 'preparing', 'ready', 'served']

function parseTable(searchParams) {
  const tableRaw = searchParams.get('table') || '1'
  const tableNo = Number(tableRaw)
  if (!Number.isFinite(tableNo)) return 1
  return Math.min(12, Math.max(1, Math.round(tableNo)))
}

function currency(value) {
  return `Rs ${Number(value || 0)}`
}

function billHtml(order) {
  const createdAt = new Date(order.createdAt || Date.now()).toLocaleString()
  return `
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>AGM HOTEL Bill - ${order.orderNumber}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
      .title { text-align: center; margin-bottom: 8px; }
      .title h1 { margin: 0; font-size: 24px; }
      .title p { margin: 4px 0; color: #6b7280; }
      .meta { margin: 12px 0; font-size: 14px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 14px; }
      .right { text-align: right; }
      .total { font-weight: 700; font-size: 18px; margin-top: 12px; text-align: right; }
    </style>
  </head>
  <body>
    <div class="title">
      <h1>${BRAND.name}</h1>
      <p>${BRAND.tagline}</p>
    </div>
    <div class="meta">
      <div>Order: ${order.orderNumber}</div>
      <div>Table: ${order.tableNumber}</div>
      <div>Time: ${createdAt}</div>
      <div>Payment: Pay at counter</div>
    </div>
    <table>
      <thead>
        <tr><th>Item</th><th>Qty</th><th class="right">Amount</th></tr>
      </thead>
      <tbody>
        ${order.items.map((it) => `<tr><td>${it.name}</td><td>${it.quantity}</td><td class="right">Rs ${it.quantity * it.price}</td></tr>`).join('')}
      </tbody>
    </table>
    <div class="total">Total: Rs ${order.totalAmount}</div>
    <script>window.print()</script>
  </body>
</html>
`
}

function groupMenuWithOverrides(mergedMenu) {
  const categoryOrder = {
    beverages: ['tea', 'boost', 'milk', 'bournvita', 'coffee'],
    breakfast: ['puri', 'uttappa', 'masala-dosa', 'palau', 'plain-dosa', 'set-dosa', 'uppit', 'idli-wada', 'puri-single', 'avalakki', 'kushka'],
    snacks: ['gobi-dry', 'nuggets', 'french-fries', 'vada-pav', 'corn-stick', 'sabudana-vada', 'maskabun', 'chocolate'],
    extras: ['fruit-salad']
  }

  const grouped = mergedMenu.reduce((acc, item) => {
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
  return Object.values(grouped).map((group) => {
    const order = categoryOrder[group.id]
    if (!order) {
      return {
        ...group,
        items: group.items.sort((a, b) => a.name.localeCompare(b.name))
      }
    }

    const index = new Map(order.map((id, i) => [id, i]))
    return {
      ...group,
      items: [...group.items].sort((a, b) => {
        const ai = index.has(a.id) ? index.get(a.id) : Number.POSITIVE_INFINITY
        const bi = index.has(b.id) ? index.get(b.id) : Number.POSITIVE_INFINITY
        if (ai !== bi) return ai - bi
        return a.name.localeCompare(b.name)
      })
    }
  })
}

function statusLabel(status) {
  if (status === 'placed') return 'Placed'
  if (status === 'preparing') return 'Preparing'
  if (status === 'ready') return 'Ready'
  if (status === 'served') return 'Served'
  if (status === 'rejected') return 'Rejected'
  if (status === 'cancelled') return 'Cancelled'
  return status
}

function StatusRail({ status }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {STATUS_ORDER.map((step) => {
        const active = STATUS_ORDER.indexOf(step) <= STATUS_ORDER.indexOf(status)
        return (
          <div
            className={`rounded-md border px-2 py-2 text-center text-xs font-semibold uppercase ${
              active ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : 'border-slate-300 bg-white text-slate-500'
            }`}
            key={step}
          >
            {statusLabel(step)}
          </div>
        )
      })}
    </div>
  )
}

function RatingForm({ order, onDone }) {
  const [stars, setStars] = useState(5)
  const [selectedTags, setSelectedTags] = useState([])
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  function toggleTag(tag) {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]))
  }

  async function submitRating() {
    setSaving(true)
    try {
      await submitOrderRating(order.id, { stars, tags: selectedTags, comment })
      onDone()
    } catch (error) {
      alert(error.message || 'Rating failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-xl border border-amber-300/50 bg-white p-4">
      <h3 className="text-lg font-bold text-amber-800">Rate Order {order.orderNumber}</h3>
      <p className="mt-1 text-sm text-slate-700">Tell us how we did for table {order.tableNumber}.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            className={`rounded-md border px-3 py-1 text-sm font-semibold ${
              stars === value ? 'border-amber-500 bg-amber-100 text-amber-900' : 'border-slate-300 text-slate-700'
            }`}
            key={value}
            onClick={() => setStars(value)}
            type="button"
          >
            {value} star
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK_RATING_TAGS.map((tag) => (
          <button
            className={`rounded-full border px-3 py-1 text-xs ${
              selectedTags.includes(tag) ? 'border-emerald-400 bg-emerald-100 text-emerald-900' : 'border-slate-300 text-slate-700'
            }`}
            key={tag}
            onClick={() => toggleTag(tag)}
            type="button"
          >
            {tag}
          </button>
        ))}
      </div>
      <textarea
        className="mt-3 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        onChange={(event) => setComment(event.target.value)}
        placeholder="Optional comment"
        rows={3}
        value={comment}
      />
      <button
        className="mt-3 rounded-md bg-amber-300 px-4 py-2 text-sm font-bold text-slate-900 disabled:opacity-50"
        disabled={saving}
        onClick={submitRating}
        type="button"
      >
        {saving ? 'Submitting...' : 'Submit rating'}
      </button>
      <button
        className="mt-2 rounded-md border border-amber-300 px-4 py-2 text-sm font-bold text-amber-800"
        onClick={onDone}
        type="button"
      >
        Skip
      </button>
    </section>
  )
}

function BillModal({ order, onClose }) {
  if (!order) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-amber-300 bg-white p-4 text-slate-900 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-black text-amber-700">Customer Bill</h3>
            <p className="text-sm text-slate-600">
              {order.orderNumber} - Table {order.tableNumber}
            </p>
          </div>
          <button className="rounded-md border border-slate-300 px-2 py-1 text-sm" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <div className="mt-3 rounded-lg border border-slate-200">
          {order.items.map((item) => (
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-sm last:border-0" key={`${order.id}_${item.id}`}>
              <p>
                {item.name} x{item.quantity}
              </p>
              <p className="font-semibold">Rs {item.quantity * item.price}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between rounded-md bg-amber-50 px-3 py-2">
          <p className="font-semibold">Total</p>
          <p className="text-lg font-black text-amber-800">Rs {order.totalAmount}</p>
        </div>
        <div className="mt-3 flex gap-2">
          <button className="rounded-md border border-amber-500 px-4 py-2 text-sm font-bold text-amber-700" onClick={onClose} type="button">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TablePage() {
  const [searchParams] = useSearchParams()
  const tableNumber = parseTable(searchParams)

  const [menuItems, setMenuItems] = useState(() => getMergedMenu())
  const [cart, setCart] = useState({})
  const [activeOrder, setActiveOrder] = useState(null)
  const [servedOrder, setServedOrder] = useState(null)
  const [ratings, setRatings] = useState([])
  const [allOrders, setAllOrders] = useState([])
  const [placing, setPlacing] = useState(false)
  const [messageIndex, setMessageIndex] = useState(0)
  const [tableEnabled, setTableEnabled] = useState(true)
  const [showBanner, setShowBanner] = useState(false)
  const [showBill, setShowBill] = useState(false)
  const [latestOrder, setLatestOrder] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCart, setShowCart] = useState(false)

  useEffect(() => {
    incrementScan(tableNumber)
  }, [tableNumber])

  useEffect(() => {
    const table = getTableConfig().find((row) => row.tableNumber === tableNumber)
    setTableEnabled(table?.enabled ?? true)
  }, [tableNumber])

  useEffect(() => {
    const lastOrderId = localStorage.getItem(`agm_table_${tableNumber}_last_order`)
    if (lastOrderId) {
      const order = getOrderById(lastOrderId)
      setLatestOrder(order || null)
      if (order?.status === 'served' && !order.ratingId) {
        setServedOrder(order)
      }
    }
  }, [tableNumber])

  useEffect(() => {
    if (!servedOrder) return undefined
    const timeout = setTimeout(() => {
      setServedOrder(null)
    }, 5 * 60 * 1000)
    return () => clearTimeout(timeout)
  }, [servedOrder])

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % PAYMENT_REMINDERS.length)
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => listenMergedMenu(setMenuItems), [])
  useEffect(() => listenRatings(setRatings), [])
  useEffect(() => listenOrders(setAllOrders), [])

  useEffect(() => {
    return listenTableCurrentOrder(tableNumber, (order) => {
      setActiveOrder(order)
      if (order) {
        setLatestOrder(order)
        localStorage.setItem(`agm_table_${tableNumber}_last_order`, order.id)
      } else {
        const lastOrderId = localStorage.getItem(`agm_table_${tableNumber}_last_order`)
        if (lastOrderId) {
          const latest = getOrderById(lastOrderId)
          if (latest) {
            setLatestOrder(latest)
            if (latest.status === 'served' && !latest.ratingId) {
              setServedOrder(latest)
            }
          }
        }
      }
    })
  }, [tableNumber])

  const groupedMenu = useMemo(() => groupMenuWithOverrides(menuItems), [menuItems])
  const categoryGroups = useMemo(() => [...groupedMenu].sort((a, b) => a.category.localeCompare(b.category)), [groupedMenu])

  const filteredGroups = useMemo(() => {
    if (selectedCategory === 'all') return categoryGroups
    return categoryGroups.filter((group) => group.id === selectedCategory)
  }, [categoryGroups, selectedCategory])

  const visibleGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return filteredGroups
    return filteredGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const name = String(item.name || '').toLowerCase()
          const tagline = String(item.tagline || '').toLowerCase()
          const category = String(item.category || '').toLowerCase()
          return name.includes(query) || tagline.includes(query) || category.includes(query)
        })
      }))
      .filter((group) => group.items.length > 0)
  }, [filteredGroups, searchQuery])
  const categoryTabs = useMemo(() => {
    const preferredOrder = ['all', 'snacks', 'breakfast', 'milkshakes', 'beverages', 'rice', 'lunch', 'juices', 'extras']
    const byId = new Map(categoryGroups.map((group) => [group.id, group]))
    const imageOverrides = {
      snacks: 'nuggets.jpg',
      breakfast: 'uttappa.jpg',
      milkshakes: 'oreo-shake.jpg',
      beverages: 'coffee.jpg',
      rice: 'veg-fried-rice.jpg'
    }

    const orderedTabs = preferredOrder
      .filter((id) => id === 'all' || byId.has(id))
      .map((id) => {
        if (id === 'all') {
          const firstMenuItem = categoryGroups[0]?.items?.[0]
          return {
            id: 'all',
            label: 'All',
            imageSrc: getMenuImageSrc(firstMenuItem?.imageName)
          }
        }

        const group = byId.get(id)
        const overrideImage = imageOverrides[group.id]
        return {
          id: group.id,
          label: group.category,
          imageSrc: getMenuImageSrc(overrideImage || group.items[0]?.imageName)
        }
      })

    const remainingTabs = categoryGroups
      .filter((group) => !preferredOrder.includes(group.id))
      .map((group) => ({
        id: group.id,
        label: group.category,
        imageSrc: getMenuImageSrc(group.items[0]?.imageName)
      }))

    return [...orderedTabs, ...remainingTabs]
  }, [categoryGroups])

  const cartItems = useMemo(() => Object.values(cart), [cart])
  const cartCount = useMemo(() => cartItems.reduce((sum, row) => sum + row.quantity, 0), [cartItems])
  const totalAmount = useMemo(() => cartItems.reduce((sum, row) => sum + row.quantity * row.price, 0), [cartItems])
  const itemRatings = useMemo(() => {
    if (ratings.length === 0 || allOrders.length === 0) return new Map()
    const orderById = new Map(allOrders.map((order) => [order.id, order]))
    const totals = new Map()

    ratings.forEach((rating) => {
      const order = orderById.get(rating.orderId)
      if (!order || !order.items) return
      order.items.forEach((orderItem) => {
        const key = orderItem.id
        const current = totals.get(key) || { sum: 0, count: 0 }
        totals.set(key, { sum: current.sum + Number(rating.stars || 0), count: current.count + 1 })
      })
    })

    const averages = new Map()
    totals.forEach((value, key) => {
      if (value.count > 0) averages.set(key, { average: value.sum / value.count, count: value.count })
    })
    return averages
  }, [ratings, allOrders])
  const suggestionItems = useMemo(() => {
    if (cartItems.length === 0) return []
    const cartIds = new Set(cartItems.map((item) => item.id))
    return menuItems
      .filter((item) => item.available !== false && !cartIds.has(item.id))
      .slice(0, 4)
  }, [cartItems, menuItems])

  function addToCart(menuItem) {
    if (!menuItem.available) return
    setCart((prev) => {
      const existing = prev[menuItem.id] || {
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: 0
      }
      return { ...prev, [menuItem.id]: { ...existing, quantity: existing.quantity + 1 } }
    })
  }

  function removeFromCart(menuItem) {
    setCart((prev) => {
      const existing = prev[menuItem.id]
      if (!existing) return prev
      if (existing.quantity <= 1) {
        const next = { ...prev }
        delete next[menuItem.id]
        return next
      }
      return { ...prev, [menuItem.id]: { ...existing, quantity: existing.quantity - 1 } }
    })
  }

  async function placeCurrentOrder() {
    if (!tableEnabled) {
      alert(`Table ${tableNumber} is currently disabled`)
      return
    }
    if (cartCount === 0) return

    setPlacing(true)
    try {
      const created = await placeOrder(tableNumber, cartItems, totalAmount)
      setLatestOrder(created)
      localStorage.setItem(`agm_table_${tableNumber}_last_order`, created.id)
      setCart({})
      setShowBanner(true)
      setShowBill(true)
      setTimeout(() => setShowBanner(false), 4500)
    } catch (error) {
      alert(error.message || 'Could not place order')
    } finally {
      setPlacing(false)
    }
  }

  const billOrder = activeOrder || servedOrder || latestOrder

  return (
    <div className="pb-36">
      {showBanner && <FloatingMessages />}
      {showBill && <BillModal onClose={() => setShowBill(false)} order={billOrder} />}
      {showCart && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-[#F5F5DC] p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-[#2E7D32]">Your Cart</h3>
              <button className="rounded-md border border-[#1B5E20] px-3 py-1 text-xs font-bold text-[#1B5E20]" onClick={() => setShowCart(false)} type="button">
                Close
              </button>
            </div>
            <div className="mt-4 max-h-[70vh] space-y-4 overflow-y-auto pr-1">
              <div className="card-cream p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#757575]">{cartCount} items</span>
                </div>
                <div className="mt-3 space-y-3">
                  {cartItems.map((item) => {
                    const menuItem = menuItems.find((entry) => entry.id === item.id)
                    const imageSrc = menuItem ? getMenuImageSrc(menuItem.imageName) : null
                    return (
                      <div className="flex items-center gap-3 rounded-xl border border-[#E0E0E0] bg-white p-2 shadow-[0_2px_4px_rgba(0,0,0,0.06)]" key={item.id}>
                        <div className="h-16 w-16 overflow-hidden rounded-lg border border-slate-200 bg-white">
                          {imageSrc ? (
                            <img alt={item.name} className="h-full w-full object-cover" src={imageSrc} />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase text-slate-400">
                              No image
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-[#212121]">{item.name}</p>
                          <p className="text-xs text-[#757575]">{currency(item.price)} each</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="h-8 w-8 btn-3d text-sm font-bold" onClick={() => removeFromCart(item)} type="button">
                            -
                          </button>
                          <span className="w-6 text-center text-sm font-bold text-[#2E7D32]">{item.quantity}</span>
                          <button className="h-8 w-8 btn-solid text-sm font-bold" onClick={() => addToCart(item)} type="button">
                            +
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {suggestionItems.length > 0 && (
                <div className="rounded-2xl border border-[#E0E0E0] bg-[#F5F5DC] p-4">
                  <h4 className="text-sm font-extrabold uppercase tracking-wider text-[#2E7D32]">You Might Also Like</h4>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {suggestionItems.map((item) => {
                      const imageSrc = getMenuImageSrc(item.imageName)
                      return (
                        <button
                          className="overflow-hidden rounded-xl border border-[#E0E0E0] bg-white text-left shadow-[0_2px_4px_rgba(0,0,0,0.08)]"
                          key={item.id}
                          onClick={() => addToCart(item)}
                          type="button"
                        >
                          <div className="h-24 w-full overflow-hidden bg-slate-100">
                            {imageSrc ? (
                              <img alt={item.name} className="h-full w-full object-cover" src={imageSrc} />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase text-slate-400">
                                No image
                              </div>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="text-xs font-semibold text-[#212121]">{item.name}</p>
                            <p className="text-[11px] font-bold text-[#2E7D32]">{currency(item.price)}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="card-cream p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#757575]">Bill Details</p>
                  <p className="text-lg font-black text-[#2E7D32]">{currency(totalAmount)}</p>
                </div>
                <p className="mt-1 text-xs text-[#757575]">Pay at counter before pickup.</p>
                <button
                  className="btn-3d mt-4 w-full px-4 py-2 text-sm font-extrabold uppercase tracking-wider disabled:opacity-40"
                  disabled={cartCount === 0 || placing || Boolean(activeOrder)}
                  onClick={() => {
                    setShowCart(false)
                    placeCurrentOrder()
                  }}
                  type="button"
                >
                  {placing ? 'Placing...' : 'Place Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <section className="card-cream p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#1B5E20]">Welcome</p>
            <h2 className="text-2xl font-black text-[#2E7D32]">
              Table {tableNumber} - {BRAND.name}
            </h2>
          </div>
          <div className="rounded-lg border border-[#1B5E20]/40 bg-[#F5F5DC] px-3 py-1.5 text-right text-sm">
            <p className="text-slate-700">Payment mode</p>
            <p className="font-bold text-[#2E7D32]">Pay at Counter</p>
          </div>
        </div>
        <div className="banner-warning mt-2 rounded-md px-3 py-1.5 text-xs font-semibold">
          {PAYMENT_REMINDERS[messageIndex]}
        </div>
        {billOrder && (
          <div className="mt-2 text-xs font-semibold text-[#2E7D32]">Bill ready at counter.</div>
        )}
      </section>

      {!tableEnabled && (
        <section className="mt-4 rounded-xl border border-red-300/40 bg-red-500/10 p-4 text-red-100">
          Table {tableNumber} is temporarily disabled by admin.
        </section>
      )}

      {activeOrder && (
        <section className="card-cream mt-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#2E7D32]">Live order</p>
              <h3 className="text-xl font-bold text-[#1B5E20]">{activeOrder.orderNumber}</h3>
              <p className="text-sm text-slate-700">Estimated {activeOrder.estimatedMinutes} minutes</p>
            </div>
            <div className="rounded-md border border-[#1B5E20]/40 bg-[#F5F5DC] px-3 py-2 text-right text-sm">
              <p className="text-slate-700">Amount</p>
              <p className="font-bold text-[#2E7D32]">{currency(activeOrder.totalAmount)}</p>
            </div>
          </div>
          <div className="mt-3">
            <StatusRail status={activeOrder.status} />
          </div>
          <div className="banner-warning mt-3 rounded-md px-3 py-2 text-sm font-semibold">
            Pay {currency(activeOrder.totalAmount)} at counter before pickup.
          </div>
          <div className="mt-3 text-xs font-semibold text-[#2E7D32]">Bill ready at counter.</div>
        </section>
      )}

      {servedOrder && !servedOrder.ratingId && !activeOrder && (
        <div className="mt-4">
          <RatingForm
            onDone={() => {
              setServedOrder(null)
            }}
            order={servedOrder}
          />
        </div>
      )}

      <section className="mt-3">
        <div className="mb-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#1B5E20]">Search Menu</label>
          <div className="mt-2 flex items-center gap-2 rounded-full border border-[#1B5E20]/40 bg-white px-4 py-2 shadow-[0_2px_4px_rgba(0,0,0,0.05)]">
            <span className="text-sm">🔎</span>
            <input
              className="w-full bg-transparent text-sm text-[#212121] outline-none"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by item or category"
              type="search"
              value={searchQuery}
            />
            {searchQuery && (
              <button className="text-xs font-semibold text-[#2E7D32]" onClick={() => setSearchQuery('')} type="button">
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="mb-4">
          <div aria-label="Menu categories" className="category-scroll" role="tablist">
            {categoryTabs.map((tab) => {
              const isActive = selectedCategory === tab.id
              return (
                <button
                  aria-selected={isActive}
                  className={`category-chip ${isActive ? 'category-chip-active' : ''}`}
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  role="tab"
                  type="button"
                >
                  <span className="category-chip-image-wrap">
                    {tab.imageSrc ? (
                      <img alt={tab.label} className="category-chip-image" src={tab.imageSrc} />
                    ) : (
                      <span className="category-chip-image-fallback">No image</span>
                    )}
                  </span>
                  <span className="category-chip-label">{tab.label}</span>
                  <span className={`category-chip-underline ${isActive ? 'category-chip-underline-active' : ''}`} />
                </button>
              )
            })}
          </div>
        </div>        {visibleGroups.map((group) => (
          <div className="mb-6" key={group.id}>
            <h3 className="mb-3 text-lg font-extrabold uppercase tracking-wider text-amber-800">{group.category}</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {group.items.map((menuItem) => {
                const quantity = cart[menuItem.id]?.quantity || 0
                const imageSrc = getMenuImageSrc(menuItem.imageName)
                return (
                  <article
                    className={`p-4 ${
                      menuItem.available ? 'card-cream' : 'rounded-xl border border-red-300/50 bg-red-50 opacity-80'
                    }`}
                    key={menuItem.id}
                  >
                    <div className="mb-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                      {imageSrc ? (
                        <img alt={menuItem.name} className="h-36 w-full object-cover" src={imageSrc} />
                      ) : (
                        <div className="flex h-36 w-full items-center justify-center text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Add image: {menuItem.imageName || 'menu-item.jpg'}
                        </div>
                      )}
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-[#212121]">{menuItem.name}</h4>
                        <p className="mt-1 text-sm text-[#757575]">{menuItem.tagline}</p>
                        {itemRatings.has(menuItem.id) && (
                          <p className="mt-1 text-sm font-semibold text-[#1B5E20]">
                            {itemRatings.get(menuItem.id).average.toFixed(1)} stars ({itemRatings.get(menuItem.id).count})
                          </p>
                        )}
                        <p className="mt-2 text-lg font-black text-[#2E7D32]">{currency(menuItem.price)}</p>
                      </div>
                      <span className="rounded-full border border-[#1B5E20]/50 bg-[#E8F5E9] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#1B5E20]">
                        Veg
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(menuItem.flags || []).map((flag) => (
                        <span className="rounded-full border border-[#1B5E20]/40 bg-[#F5F5DC] px-2 py-1 text-[10px] uppercase text-[#1B5E20]" key={flag}>
                          {flag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <button
                        className="h-9 w-9 btn-3d text-lg font-bold disabled:opacity-40"
                        disabled={!menuItem.available || quantity === 0}
                        onClick={() => removeFromCart(menuItem)}
                        type="button"
                      >
                        -
                      </button>
                      <div className="w-10 text-center text-lg font-black text-[#2E7D32]">{quantity}</div>
                      <button
                        className="h-9 w-9 btn-solid text-lg font-bold disabled:opacity-40"
                        disabled={!menuItem.available}
                        onClick={() => addToCart(menuItem)}
                        type="button"
                      >
                        +
                      </button>
                      {!menuItem.available && <p className="ml-2 text-xs font-bold uppercase text-[#FF6B35]">Out of stock</p>}
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        ))}
      </section>

      {cartCount > 0 && !activeOrder && (
        <button
          className="fixed bottom-5 right-5 z-40 btn-3d px-4 py-3 text-sm font-extrabold uppercase tracking-wider"
          onClick={() => setShowCart(true)}
          type="button"
        >
          View Cart ({cartCount})
        </button>
      )}
    </div>
  )
}







