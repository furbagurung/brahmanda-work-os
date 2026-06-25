export function formatActivityDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kathmandu',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(String(value).replace(' ', 'T') + 'Z'))
}
