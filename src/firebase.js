import { getApp, getApps, initializeApp } from 'firebase/app'
import { collection, doc, onSnapshot, setDoc, updateDoc, getFirestore } from 'firebase/firestore'
import { FALLBACK_MENU_ITEMS } from './data/menu'
import { addDoc, query, where, orderBy } from 'firebase/firestore'
import { getDoc } from 'firebase/firestore'



const LOCAL_KEYS = {
  scans: 'agm_scans_v2',
  ratings: 'agm_ratings_v2',
  menuOverrides: 'agm_menu_overrides_v2',
  tableConfig: 'agm_table_config_v2',
  kitchenPins: 'agm_kitchen_pins_v2',
  authState: 'agm_auth_state_v2',
  loginLogs: 'agm_login_logs_v2',
  sequence: 'agm_order_sequence_v2'
}

const ADMIN_CONFIG = {
  email: (import.meta.env.VITE_ADMIN_EMAIL || 'owner@agmhotel.app').toLowerCase(),
  password: import.meta.env.VITE_ADMIN_PASSWORD || 'AGM@2026',
  pin: import.meta.env.VITE_ADMIN_PIN || '202601'
}

const SESSION_MS = 15 * 60 * 1000
const LOCKOUT_MS = 30 * 60 * 1000
const MAX_ADMIN_ATTEMPTS = 3
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID
}
const firestoreEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId)
const firebaseApp = firestoreEnabled ? (getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)) : null
const firestoreDb = firebaseApp ? getFirestore(firebaseApp) : null

const listeners = {
  menuOverrides: new Set(),
  tableConfig: new Set(),
  ratings: new Set(),
  loginLogs: new Set()
}
let menuCache = FALLBACK_MENU_ITEMS
let orderCache = []
let ratingsCache = []

function safeRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function safeWrite(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function getNow() {
  return Date.now()
}

function sortNewestFirst(a, b) {
  return (b.createdAt || 0) - (a.createdAt || 0)
}

function emit(channel) {
  const callbacks = listeners[channel]
  callbacks?.forEach((cb) => {
    try {
      cb()
    } catch (error) {
      console.error(`listener(${channel})`, error)
    }
  })
}

function getDefaultTables() {
  return Array.from({ length: 12 }, (_, index) => ({
    tableNumber: index + 1,
    enabled: true
  }))
}

function getTablesMap() {
  const fromStore = safeRead(LOCAL_KEYS.tableConfig, null)
  if (!fromStore || !Array.isArray(fromStore) || fromStore.length !== 12) {
    const defaults = getDefaultTables()
    safeWrite(LOCAL_KEYS.tableConfig, defaults)
    return defaults
  }
  return fromStore
}

function nextOrderNumber() {
  const today = new Date()
  const dateCode = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
  const sequence = safeRead(LOCAL_KEYS.sequence, { dateCode, value: 0 })
  const value = sequence.dateCode === dateCode ? sequence.value + 1 : 1
  safeWrite(LOCAL_KEYS.sequence, { dateCode, value })
  return `AGM-${String(value).padStart(3, '0')}`
}

function getRatings() {
  return safeRead(LOCAL_KEYS.ratings, []).sort(sortNewestFirst)
}

function writeRatings(nextRatings) {
  safeWrite(LOCAL_KEYS.ratings, nextRatings)
  emit('ratings')
}

function getMenuOverridesMap() {
  return safeRead(LOCAL_KEYS.menuOverrides, {})
}

function writeMenuOverridesMap(mapValue) {
  safeWrite(LOCAL_KEYS.menuOverrides, mapValue)
  emit('menuOverrides')
}

function toCategoryId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeMenuItem(rawItem, fallbackId = '') {
  const id = String(rawItem?.id || fallbackId || '').trim()
  const category = String(rawItem?.category || 'General').trim()
  const categoryId = String(rawItem?.categoryId || toCategoryId(category) || 'general').trim()
  return {
    id,
    name: String(rawItem?.name || id).trim(),
    price: Number(rawItem?.price || 0),
    category,
    categoryId,
    tagline: String(rawItem?.tagline || '').trim(),
    imageName: String(rawItem?.imageName || '').trim(),
    flags: Array.isArray(rawItem?.flags) ? rawItem.flags : [],
    veg: rawItem?.veg !== false,
    available: rawItem?.available !== false,
    sortOrder: Number(rawItem?.sortOrder || 0)
  }
}

function sortMenuItems(a, b) {
  if (a.categoryId !== b.categoryId) return a.categoryId.localeCompare(b.categoryId)
  if ((a.sortOrder || 0) !== (b.sortOrder || 0)) return (a.sortOrder || 0) - (b.sortOrder || 0)
  return a.name.localeCompare(b.name)
}

function mergeMenuWithOverrides(baseMenu = FALLBACK_MENU_ITEMS) {
  const overrides = getMenuOverridesMap()
  return baseMenu.map((baseItem) => {
    const override = overrides[baseItem.id] || {}
    const isAvailable = override.available ?? true
    const price = Number.isFinite(override.price) ? override.price : baseItem.price
    return normalizeMenuItem({
      ...baseItem,
      ...override,
      price,
      available: isAvailable
    })
  }).sort(sortMenuItems)
}

function sanitizeMenuPatch(patch) {
  const next = {}
  if ('name' in patch) next.name = String(patch.name || '').trim()
  if ('price' in patch) next.price = Math.max(0, Number(patch.price || 0))
  if ('category' in patch) next.category = String(patch.category || '').trim()
  if ('categoryId' in patch) next.categoryId = String(patch.categoryId || '').trim() || toCategoryId(next.category)
  if ('tagline' in patch) next.tagline = String(patch.tagline || '').trim()
  if ('imageName' in patch) next.imageName = String(patch.imageName || '').trim()
  if ('veg' in patch) next.veg = Boolean(patch.veg)
  if ('available' in patch) next.available = Boolean(patch.available)
  if ('flags' in patch) next.flags = Array.isArray(patch.flags) ? patch.flags : []
  if ('sortOrder' in patch) next.sortOrder = Number(patch.sortOrder || 0)
  return next
}

function getFallbackMenu() {
  return FALLBACK_MENU_ITEMS.map((item) => normalizeMenuItem(item, item.id)).sort(sortMenuItems)
}

function getMenuDocRef(itemId) {
  return doc(firestoreDb, 'menu', String(itemId))
}

function readMenuSnapshot(snapshot) {
  if (snapshot.empty) return getFallbackMenu()
  return snapshot.docs
    .map((entry) => normalizeMenuItem({ ...entry.data(), id: entry.id }, entry.id))
    .filter((item) => Boolean(item.id))
    .sort(sortMenuItems)
}

export async function seedMenuCollection() {
  if (!firestoreEnabled) {
    throw new Error('Firebase is not configured. Set VITE_FIREBASE_* in .env first.')
  }
  const writes = getFallbackMenu().map((item, index) =>
    setDoc(getMenuDocRef(item.id), { ...item, sortOrder: item.sortOrder || index + 1 }, { merge: true })
  )
  await Promise.all(writes)
}

function getKitchenPins() {
  const savedPins = safeRead(LOCAL_KEYS.kitchenPins, null)
  if (!Array.isArray(savedPins) || savedPins.length === 0) {
    safeWrite(LOCAL_KEYS.kitchenPins, ['9028'])
    return ['9028']
  }
  if (!savedPins.includes('9028')) {
    const nextPins = [...savedPins, '9028']
    safeWrite(LOCAL_KEYS.kitchenPins, nextPins)
    return nextPins
  }
  return savedPins
}

function appendLoginLog(entry) {
  const logs = safeRead(LOCAL_KEYS.loginLogs, [])
  logs.push({
    id: `log_${Math.random().toString(36).slice(2, 10)}`,
    ...entry,
    createdAt: getNow()
  })
  safeWrite(LOCAL_KEYS.loginLogs, logs)
  emit('loginLogs')
}

export function incrementScan(tableNumber) {
  const payload = safeRead(LOCAL_KEYS.scans, { totalScans: 0, scansPerTable: {} })
  const tableKey = String(tableNumber)
  payload.totalScans += 1
  payload.scansPerTable[tableKey] = (payload.scansPerTable[tableKey] || 0) + 1
  safeWrite(LOCAL_KEYS.scans, payload)
}

export function getScanStats() {
  return safeRead(LOCAL_KEYS.scans, { totalScans: 0, scansPerTable: {} })
}

export function getTableConfig() {
  return getTablesMap().sort((a, b) => a.tableNumber - b.tableNumber)
}

export function listenTableConfig(callback) {
  const wrapped = () => callback(getTableConfig())
  listeners.tableConfig.add(wrapped)
  wrapped()
  return () => listeners.tableConfig.delete(wrapped)
}

export function setTableEnabled(tableNumber, enabled) {
  const tableNo = Number(tableNumber)
  const nextTables = getTablesMap().map((row) =>
    row.tableNumber === tableNo ? { ...row, enabled: Boolean(enabled) } : row
  )
  safeWrite(LOCAL_KEYS.tableConfig, nextTables)
  emit('tableConfig')
}

export function getMergedMenu() {
  if (firestoreEnabled) return menuCache
  return mergeMenuWithOverrides(getFallbackMenu())
}

export function listenMergedMenu(callback) {
  if (firestoreEnabled) {
    return onSnapshot(
      collection(firestoreDb, 'menu'),
      (snapshot) => {
        if (snapshot.empty) {
          menuCache = getFallbackMenu()
          callback(menuCache)
          seedMenuCollection().catch((error) => {
            console.error('seedMenuCollection()', error)
          })
          return
        }
        menuCache = readMenuSnapshot(snapshot)
        callback(menuCache)
      },
      (error) => {
        console.error('listenMergedMenu()', error)
        menuCache = mergeMenuWithOverrides(getFallbackMenu())
        callback(menuCache)
      }
    )
  }

  const wrapped = () => callback(getMergedMenu())
  listeners.menuOverrides.add(wrapped)
  wrapped()
  return () => listeners.menuOverrides.delete(wrapped)
}

export function updateMenuOverride(itemId, patch) {
  if (firestoreEnabled) {
    const cleanPatch = sanitizeMenuPatch(patch)
    const ref = getMenuDocRef(itemId)
    return updateDoc(ref, cleanPatch).catch(async () => {
      const current = menuCache.find((entry) => entry.id === itemId) || getFallbackMenu().find((entry) => entry.id === itemId) || { id: itemId }
      await setDoc(ref, { ...current, ...cleanPatch }, { merge: true })
    })
  }

  const currentMap = getMenuOverridesMap()
  currentMap[itemId] = { ...(currentMap[itemId] || {}), ...patch }
  writeMenuOverridesMap(currentMap)
}

export function resetMenuOverride(itemId) {
  if (firestoreEnabled) {
    const fallbackItem = getFallbackMenu().find((entry) => entry.id === itemId) || { id: itemId, available: true }
    return setDoc(getMenuDocRef(itemId), fallbackItem, { merge: false })
  }

  const currentMap = getMenuOverridesMap()
  delete currentMap[itemId]
  writeMenuOverridesMap(currentMap)
}

export async function placeOrder(tableNumber, items, totalAmount) {
  if (!firestoreEnabled) throw new Error('Firestore not configured')

  const order = {
    tableNumber: Number(tableNumber),
    orderNumber: nextOrderNumber(),
    status: 'placed',
    items: items.map((entry) => ({
      id: entry.id,
      name: entry.name,
      price: Number(entry.price),
      quantity: Number(entry.quantity)
    })),
    totalAmount: Number(totalAmount),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    servedAt: null,
    estimatedMinutes: 15,
    ratingId: null
  }

  const docRef = await addDoc(collection(firestoreDb, 'orders'), order)

  return { ...order, id: docRef.id }
}


export function listenOrders(callback) {
  return onSnapshot(
    query(collection(firestoreDb, 'orders'), orderBy('createdAt', 'desc')),
    (snapshot) => {
      const orders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }))
      callback(orders)
    }
  )
}



export async function updateOrderStatus(orderId, nextStatus) {
  if (!firestoreEnabled) return

  const ref = doc(firestoreDb, 'orders', orderId)

  await updateDoc(ref, {
    status: nextStatus,
    updatedAt: Date.now(),
    servedAt: nextStatus === 'served' ? Date.now() : null
  })
}


export function listenTableCurrentOrder(tableNumber, callback) {
  const tableNo = Number(tableNumber)
  return listenOrders(
    (allOrders) => {
      const currentOrder = allOrders.find(
        (order) =>
          order.tableNumber === tableNo &&
          ['placed', 'preparing', 'ready'].includes(order.status)
      )
      callback(currentOrder || null)
    },
    { statuses: ['placed', 'preparing', 'ready'] }
  )
}

export async function getOrderById(orderId) {
  const fromCache = orderCache.find((entry) => entry.id === orderId)
  if (fromCache) return fromCache
  const ref = doc(firestoreDb, 'orders', orderId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}


export async function submitOrderRating(orderId, payload) {
  const order = await getOrderById(orderId)
  if (!order) throw new Error('Order not found')
  if (order.status !== 'served') throw new Error('Order not served yet')

  const rating = {
    id: `rating_${Math.random().toString(36).slice(2, 10)}`,
    orderId,
    orderNumber: order.orderNumber,
    tableNumber: order.tableNumber,
    stars: payload.stars,
    tags: payload.tags || [],
    comment: payload.comment || '',
    createdAt: getNow()
  }

  if (firestoreEnabled) {
    await addDoc(collection(firestoreDb, 'ratings'), rating)
    await updateDoc(doc(firestoreDb, 'orders', orderId), { ratingId: rating.id, updatedAt: getNow() })
  } else {
    const ratings = getRatings()
    ratings.push(rating)
    writeRatings(ratings)
  }

  return rating
}

export function listenRatings(callback) {
  if (firestoreEnabled) {
    const q = query(collection(firestoreDb, 'ratings'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, (snapshot) => {
      const ratings = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }))
      ratingsCache = ratings
      callback(ratings)
    })
  }

  const wrapped = () => {
    const ratings = getRatings()
    ratingsCache = ratings
    callback(ratings)
  }
  listeners.ratings.add(wrapped)
  wrapped()
  return () => listeners.ratings.delete(wrapped)
}

export function verifyKitchenPin(pin) {
  return getKitchenPins().includes(String(pin))
}

export function addKitchenPin(pin) {
  const value = String(pin).trim()
  if (!/^\d{4}$/.test(value)) throw new Error('Kitchen PIN must be 4 digits')
  const current = getKitchenPins()
  if (current.includes(value)) return
  safeWrite(LOCAL_KEYS.kitchenPins, [...current, value])
}

export function removeKitchenPin(pin) {
  const value = String(pin).trim()
  const current = getKitchenPins()
  const nextPins = current.filter((entry) => entry !== value)
  safeWrite(LOCAL_KEYS.kitchenPins, nextPins.length > 0 ? nextPins : ['9028'])
}

export function verifyAdminCredentials({ email, password, pin, ipAddress = 'local-device' }) {
  const now = getNow()
  const state = safeRead(LOCAL_KEYS.authState, { attempts: 0, lockUntil: 0 })
  if (state.lockUntil && now < state.lockUntil) {
    appendLoginLog({
      action: 'admin_login_locked',
      ipAddress,
      ok: false,
      email: String(email || '')
    })
    return { ok: false, reason: 'locked', lockUntil: state.lockUntil }
  }

  const ok =
    String(email || '').toLowerCase() === ADMIN_CONFIG.email &&
    String(password || '') === ADMIN_CONFIG.password &&
    String(pin || '') === ADMIN_CONFIG.pin

  if (!ok) {
    const attempts = (state.attempts || 0) + 1
    const lockUntil = attempts >= MAX_ADMIN_ATTEMPTS ? now + LOCKOUT_MS : 0
    safeWrite(LOCAL_KEYS.authState, { attempts: lockUntil ? 0 : attempts, lockUntil })
    appendLoginLog({
      action: 'admin_login_failed',
      ipAddress,
      ok: false,
      email: String(email || '')
    })
    return {
      ok: false,
      reason: lockUntil ? 'locked' : 'invalid',
      lockUntil
    }
  }

  const token = `session_${Math.random().toString(36).slice(2, 12)}`
  safeWrite(LOCAL_KEYS.authState, {
    attempts: 0,
    lockUntil: 0,
    session: { token, expiresAt: now + SESSION_MS }
  })
  appendLoginLog({
    action: 'admin_login_success',
    ipAddress,
    ok: true,
    email: String(email || '')
  })

  return { ok: true, token, expiresAt: now + SESSION_MS }
}

export function validateAdminSession(token) {
  const state = safeRead(LOCAL_KEYS.authState, {})
  const session = state.session
  if (!session || !token || session.token !== token) return false
  if (session.expiresAt < getNow()) return false
  return true
}

export function refreshAdminSession(token) {
  const state = safeRead(LOCAL_KEYS.authState, {})
  if (!state.session || state.session.token !== token) return false
  state.session.expiresAt = getNow() + SESSION_MS
  safeWrite(LOCAL_KEYS.authState, state)
  return true
}

export function logoutAdmin(token, ipAddress = 'local-device') {
  const state = safeRead(LOCAL_KEYS.authState, {})
  if (state.session && token && state.session.token === token) {
    state.session = null
    safeWrite(LOCAL_KEYS.authState, state)
    appendLoginLog({ action: 'admin_logout', ipAddress, ok: true, email: ADMIN_CONFIG.email })
  }
}

export function getAdminLockState() {
  const state = safeRead(LOCAL_KEYS.authState, { lockUntil: 0 })
  return {
    lockUntil: state.lockUntil || 0,
    attemptsLeft:
      state.lockUntil && state.lockUntil > getNow()
        ? 0
        : Math.max(0, MAX_ADMIN_ATTEMPTS - (state.attempts || 0))
  }
}

export function listenLoginLogs(callback) {
  const wrapped = () => {
    const logs = safeRead(LOCAL_KEYS.loginLogs, []).sort(sortNewestFirst)
    callback(logs)
  }
  listeners.loginLogs.add(wrapped)
  wrapped()
  return () => listeners.loginLogs.delete(wrapped)
}

function getTodayRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const end = start + 24 * 60 * 60 * 1000
  return { start, end }
}

export function computeAnalytics() {
  const allOrders = [...orderCache]
  const ratings = [...ratingsCache]
  const scans = getScanStats()
  const { start, end } = getTodayRange()

  const todayOrders = allOrders.filter((order) => order.createdAt >= start && order.createdAt < end)
  const todayCompleted = todayOrders.filter((order) => ['served', 'ready', 'preparing', 'placed'].includes(order.status))
  const todayRevenue = todayCompleted.reduce((sum, row) => sum + (row.totalAmount || 0), 0)
  const activeOrders = allOrders.filter((order) => ['placed', 'preparing', 'ready'].includes(order.status))

  const tableCounts = {}
  const itemSales = {}
  todayCompleted.forEach((order) => {
    tableCounts[order.tableNumber] = (tableCounts[order.tableNumber] || 0) + 1
    order.items.forEach((menuItem) => {
      itemSales[menuItem.name] = (itemSales[menuItem.name] || 0) + menuItem.quantity
    })
  })

  const tableLeaderboard = Object.entries(tableCounts)
    .map(([table, count]) => ({ tableNumber: Number(table), orders: count }))
    .sort((a, b) => b.orders - a.orders)

  const bestsellers = Object.entries(itemSales)
    .map(([name, sold]) => ({ name, sold }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 10)

  const servedRatings = ratings.filter((entry) => entry.stars > 0)
  const averageRating =
    servedRatings.length > 0
      ? servedRatings.reduce((sum, entry) => sum + entry.stars, 0) / servedRatings.length
      : 0

  const byHour = Array.from({ length: 12 }, (_, index) => {
    const hour = 8 + index
    const sold = todayCompleted.filter((order) => new Date(order.createdAt).getHours() === hour).length
    return { hour: `${hour}:00`, orders: sold }
  })

  return {
    todayOrders: todayOrders.length,
    todayRevenue,
    activeOrders: activeOrders.length,
    averageRating,
    tableLeaderboard,
    bestsellers,
    hourlySales: byHour,
    ratingsCount: servedRatings.length,
    totalScans: scans.totalScans || 0
  }
}

export function listenAnalytics(callback) {
  const send = () => callback(computeAnalytics())
  const unsubOrders = listenOrders(send)
  const unsubRatings = listenRatings(send)
  send()
  return () => {
    unsubOrders()
    unsubRatings()
  }
}
