import { API_BASE_URL } from './api'

const AUTH_STORAGE_KEY = 'brahmanda-work-os-auth'

export async function login(email, password) {
  const response = await fetch(`${API_BASE_URL}/auth.php`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  let payload
  try {
    payload = await response.json()
  } catch {
    throw new Error(`Authentication API returned an invalid response (${response.status}).`)
  }

  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || 'Unable to log in.')
  }

  const user = payload.data?.user
  if (!user) {
    throw new Error('Authentication response did not include a user.')
  }

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
  return user
}

export function logout() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

export function getCurrentUser() {
  try {
    const storedUser = localStorage.getItem(AUTH_STORAGE_KEY)
    return storedUser ? JSON.parse(storedUser) : null
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}
