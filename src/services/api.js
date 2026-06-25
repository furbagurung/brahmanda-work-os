import { clearAuthSession, getAuthToken } from './authStorage'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

async function request(endpoint, options = {}) {
  const token = getAuthToken()
  const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  let payload
  try {
    payload = await response.json()
  } catch {
    throw new Error(`API returned an invalid response (${response.status}).`)
  }

  if (response.status === 401) {
    clearAuthSession()
    window.dispatchEvent(new Event('auth:unauthorized'))
    throw new Error(payload.message || 'Your session has expired. Please log in again.')
  }

  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || `API request failed (${response.status}).`)
  }

  return payload.data
}

const jsonOptions = (method, data) => ({
  method,
  body: JSON.stringify(data),
})

export const getClients = () => request('clients.php')
export const createClient = (data) => request('clients.php', jsonOptions('POST', data))
export const updateClient = (id, data) => request(`clients.php?id=${encodeURIComponent(id)}`, jsonOptions('PUT', data))
export const deleteClient = (id) => request(`clients.php?id=${encodeURIComponent(id)}`, { method: 'DELETE' })

export const getTasks = () => request('tasks.php')
export const createTask = (data) => request('tasks.php', jsonOptions('POST', data))
export const updateTask = (id, data) => request(`tasks.php?id=${encodeURIComponent(id)}`, jsonOptions('PUT', data))
export const deleteTask = (id) => request(`tasks.php?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
export const markTaskCompleted = (id) => request(`tasks.php?id=${encodeURIComponent(id)}&action=complete`, { method: 'PATCH' })

export const getTaskAttachments = (taskId) => request(`attachments.php?task_id=${encodeURIComponent(taskId)}`)
export const createTaskAttachment = (data) => request('attachments.php', jsonOptions('POST', data))
export const deleteTaskAttachment = (id) => request(`attachments.php?id=${encodeURIComponent(id)}`, { method: 'DELETE' })

export const getDailyLogs = () => request('logs.php')
export const getBillings = () => request('billing.php')
export const updateBilling = (taskId, data) => request(`billing.php?id=${encodeURIComponent(taskId)}`, jsonOptions('PATCH', data))

export const getReports = (params = {}) => {
  const query = new URLSearchParams(params)
  return request(`reports.php${query.toString() ? `?${query}` : ''}`)
}

export const generateReport = (clientId, month, year) => getReports({
  client_id: clientId,
  month,
  year,
})

export const saveReport = (data) => request('reports.php', jsonOptions('POST', data))

export const getUsers = async () => {
  const data = await request('users.php')
  return Array.isArray(data) ? data : [data]
}
export const createUser = (data) => request('users.php', jsonOptions('POST', data))
export const updateUser = (id, data) => request(`users.php?id=${encodeURIComponent(id)}`, jsonOptions('PUT', data))
export const deactivateUser = (id) => request(`users.php?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
export const changeUserPassword = (id, password) => request(`users.php?id=${encodeURIComponent(id)}&action=password`, jsonOptions('PATCH', { password }))

export function clientToApi(client) {
  return {
    name: client.name,
    contact_person: client.contact || null,
    phone: client.phone || null,
    email: client.email || null,
    service_package: client.servicePackage || null,
    monthly_fee: Number(client.monthlyFee || 0),
    start_date: client.startDate || null,
    status: String(client.status || 'active').toLowerCase().replace(' ', '_'),
    notes: client.notes || null,
  }
}

export function clientFromApi(client) {
  const initials = client.name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return {
    id: String(client.id),
    name: client.name,
    initials,
    color: '#002FA7',
    contact: client.contact_person || '',
    phone: client.phone || '',
    email: client.email || '',
    servicePackage: client.service_package || '',
    monthlyFee: Number(client.monthly_fee || 0),
    startDate: client.start_date || '',
    status: client.status || 'active',
    notes: client.notes || '',
  }
}

export function taskToApi(task) {
  return {
    client_id: Number(task.clientId),
    title: task.title,
    description: task.description || null,
    category: task.category || null,
    priority: task.priority,
    deadline: task.deadline || null,
    status: task.status,
    proof_link: Array.isArray(task.attachments)
      ? task.attachments[0]?.url || null
      : task.proofLink || null,
    is_billable: Boolean(task.billable),
    billable_amount: task.billable ? Number(task.amount || 0) : 0,
    payment_status: task.paymentStatus || 'Unpaid',
    invoice_status: task.invoiceStatus || 'Not invoiced',
    completed_at: task.completedAt || null,
  }
}

export function taskFromApi(task) {
  return {
    id: String(task.id),
    clientId: String(task.client_id),
    title: task.title,
    description: task.description || '',
    category: task.category || '',
    priority: task.priority,
    deadline: task.deadline || '',
    status: task.status,
    proofLink: task.proof_link || '',
    billable: Number(task.is_billable) === 1,
    amount: Number(task.billable_amount || 0),
    assignee: 'AS',
    completedAt: task.completed_at ? String(task.completed_at).slice(0, 10) : '',
    paymentStatus: task.payment_status || 'Unpaid',
    invoiceStatus: task.invoice_status || 'Not invoiced',
    attachments: task.attachments || [],
  }
}

export function logFromApi(log) {
  return {
    id: String(log.id),
    taskId: String(log.task_id),
    clientId: String(log.client_id),
    clientName: log.client_name || '',
    title: log.task_title || log.work_done,
    description: log.work_done || '',
    category: log.category || '',
    proofLink: log.proof_link || '',
    billable: Number(log.is_billable) === 1,
    amount: Number(log.billable_amount || 0),
    completedAt: log.log_date,
    attachments: log.attachments || [],
  }
}

export function attachmentFromApi(attachment) {
  return {
    id: String(attachment.id),
    taskId: String(attachment.task_id),
    type: attachment.attachment_type || 'link',
    title: attachment.title,
    url: attachment.url,
    createdAt: attachment.created_at,
  }
}

export function billingFromApi(billing) {
  return {
    id: String(billing.task_id),
    clientId: String(billing.client_id),
    clientName: billing.client_name || '',
    title: billing.work_title,
    amount: Number(billing.amount || 0),
    billable: true,
    paymentStatus: billing.payment_status || 'Unpaid',
    invoiceStatus: billing.invoice_status || 'Not invoiced',
    deadline: billing.billing_date || '',
    status: billing.task_status || '',
  }
}
