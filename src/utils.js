export function formatMoney(value) {
  return `Rs ${Number(value || 0).toLocaleString()}`
}

export function formatDate(value, options = { month: 'short', day: 'numeric' }) {
  if (!value) return 'No date'
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}
