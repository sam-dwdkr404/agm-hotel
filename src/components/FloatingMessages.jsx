import React, { useEffect, useState } from 'react'
import { PAYMENT_REMINDERS } from '../data/menu'

export default function FloatingMessages() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % PAYMENT_REMINDERS.length)
    }, 2500)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="fixed inset-x-0 top-16 z-50 flex justify-center px-4">
      <div className="w-full max-w-2xl rounded-xl border border-amber-200/50 bg-amber-100 px-4 py-3 text-center text-sm font-semibold text-amber-950 shadow-lg">
        {PAYMENT_REMINDERS[index]}
      </div>
    </div>
  )
}
