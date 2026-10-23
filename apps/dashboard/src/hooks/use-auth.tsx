"use client"

import {createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode} from "react"
import {ApiError} from "@/src/lib/api/errors"
import {clearStoredSession, getStoredSession, storeSession} from "@/src/lib/auth/session"
import {clearLegacyDashboardData} from "@/src/lib/dashboard-data"
import {previewSession, resetPreviewData} from "@/src/lib/preview-data"
import {currentUser, login as loginRequest, logout as logoutRequest, register as registerRequest, type LoginInput, type RegisterInput} from "@/src/lib/services/auth-service"
import type {AuthSession} from "@/src/types/api"

type AuthContextValue = {
  session: AuthSession | null
  isPreview: boolean
  isLoading: boolean
  enterPreview: () => void
  signIn: (input: LoginInput) => Promise<void>
  signUp: (input: RegisterInput) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({children}: {children: ReactNode}) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isPreview, setIsPreview] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    Promise.resolve()
      .then(() => {
        clearLegacyDashboardData()
        return getStoredSession()
      })
      .then((stored) => stored ? currentUser().then((result) => ({stored, result})) : null)
      .then((restored) => {
        if (!mounted || !restored) return
        if (restored.stored.tenant.id === restored.result.tenantId
          && restored.stored.user.id === restored.result.user.id) {
          setSession({...restored.stored, user: restored.result.user})
        } else {
          clearStoredSession()
        }
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.statusCode === 401) {
          clearStoredSession()
          return
        }
        console.error("Could not restore the dashboard session.", error)
        clearStoredSession()
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })

    return () => { mounted = false }
  }, [])

  const signIn = useCallback(async (input: LoginInput): Promise<void> => {
    const nextSession = await loginRequest(input)
    storeSession(nextSession)
    setIsPreview(false)
    setSession(nextSession)
  }, [])

  const signUp = useCallback(async (input: RegisterInput): Promise<void> => {
    await registerRequest(input)
    await signIn({tenantSlug: input.tenantSlug, email: input.email, password: input.password})
  }, [signIn])

  const enterPreview = useCallback(() => {
    clearStoredSession()
    resetPreviewData()
    setIsPreview(true)
    setSession(previewSession)
  }, [])

  const signOut = useCallback(async (): Promise<void> => {
    if (isPreview) resetPreviewData()
    else await logoutRequest()
    clearStoredSession()
    setIsPreview(false)
    setSession(null)
  }, [isPreview])

  const value = useMemo(() => ({session, isPreview, isLoading, enterPreview, signIn, signUp, signOut}), [session, isPreview, isLoading, enterPreview, signIn, signUp, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used inside AuthProvider")
  return context
}
