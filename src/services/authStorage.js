const AUTH_STORAGE_KEY = 'brahmanda-work-os-auth'
const REMEMBER_EMAIL_KEY = 'brahmanda-work-os-remember-email'

export function saveAuthSession(session) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
}

export function saveRememberedEmail(email) {
  localStorage.setItem(REMEMBER_EMAIL_KEY, email)
}

export function getRememberedEmail() {
  return localStorage.getItem(REMEMBER_EMAIL_KEY) || ''
}

export function clearRememberedEmail() {
  localStorage.removeItem(REMEMBER_EMAIL_KEY)
}

export function getAuthSession() {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!stored) return null

    const session = JSON.parse(stored)
    if (!session?.user || !session?.token) {
      clearAuthSession()
      return null
    }

    if (session.tokenExpiresAt && new Date(session.tokenExpiresAt).getTime() <= Date.now()) {
      clearAuthSession()
      return null
    }

    return session
  } catch {
    clearAuthSession()
    return null
  }
}

export function getAuthToken() {
  return getAuthSession()?.token || null
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

export function updateStoredUser(user) {
  const session = getAuthSession()
  if (!session) return
  saveAuthSession({ ...session, user })
}
