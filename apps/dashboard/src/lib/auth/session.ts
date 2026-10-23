import type {AuthSession} from "@/src/types/api"

const SESSION_KEY = "fde-dashboard-session-v2"

export function getStoredSession(): AuthSession | null {
  const stored = window.localStorage.getItem(SESSION_KEY)
  if (!stored) return null

  try {
    const session: unknown = JSON.parse(stored)
    if (typeof session !== "object" || session === null
      || !("accessToken" in session) || typeof session.accessToken !== "string"
      || !("tokenType" in session) || session.tokenType !== "Bearer"
      || !("sessionId" in session) || typeof session.sessionId !== "string"
      || !("expiresAt" in session) || typeof session.expiresAt !== "string"
      || !("tenant" in session) || typeof session.tenant !== "object" || session.tenant === null
      || !("id" in session.tenant) || typeof session.tenant.id !== "string"
      || !("name" in session.tenant) || typeof session.tenant.name !== "string"
      || !("slug" in session.tenant) || typeof session.tenant.slug !== "string"
      || !("user" in session) || typeof session.user !== "object" || session.user === null
      || !("id" in session.user) || typeof session.user.id !== "string"
      || !("email" in session.user) || typeof session.user.email !== "string"
      || !("role" in session.user) || typeof session.user.role !== "string") {
      clearStoredSession()
      return null
    }
    const authSession = session as AuthSession
    const expiresAt = Date.parse(authSession.expiresAt)
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      clearStoredSession()
      return null
    }
    return authSession
  } catch (error) {
    console.error("Could not read the saved dashboard session.", error)
    clearStoredSession()
    return null
  }
}

export function storeSession(session: AuthSession): void {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearStoredSession(): void {
  window.localStorage.removeItem(SESSION_KEY)
}