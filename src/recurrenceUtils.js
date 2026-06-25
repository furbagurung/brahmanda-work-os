export function nextRecurrenceDate(date, type, interval = 1) {
  const amount = Math.max(1, Number(interval || 1))
  const current = new Date(`${date}T00:00:00Z`)
  if (type === 'daily') current.setUTCDate(current.getUTCDate() + amount)
  if (type === 'weekly') current.setUTCDate(current.getUTCDate() + (amount * 7))
  if (type === 'monthly') {
    const day = current.getUTCDate()
    const target = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + amount, 1))
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
    target.setUTCDate(Math.min(day, lastDay))
    return target.toISOString().slice(0, 10)
  }
  return current.toISOString().slice(0, 10)
}

export function recurrenceLabel(task) {
  const interval = Math.max(1, Number(task.recurrenceInterval || 1))
  const unit = task.recurrenceType === 'daily' ? 'day' : task.recurrenceType === 'weekly' ? 'week' : 'month'
  return interval === 1 ? `Every ${unit}` : `Every ${interval} ${unit}s`
}
