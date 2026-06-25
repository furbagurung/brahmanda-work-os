import { API_BASE_URL } from './api'
import { clearAuthSession, getAuthSession, saveAuthSession, updateStoredUser } from './authStorage'

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
  const token = payload.data?.token
  if (!user || !token) {
    throw new Error('Authentication response did not include a valid session.')
  }

  saveAuthSession({
    user,
    token,
    tokenExpiresAt: payload.data.token_expires_at,
  })
  return user
}

export async function logout() {
  const session = getAuthSession()

  try {
    if (session?.token) {
      await fetch(`${API_BASE_URL}/auth.php?action=logout`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
      })
    }
  } finally {
    clearAuthSession()
  }
}

export function getCurrentUser() {
  return getAuthSession()?.user || null
}

export function updateCurrentUser(user) {
  updateStoredUser(user)
}
