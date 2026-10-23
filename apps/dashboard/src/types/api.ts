export type UserRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"

export type Tenant = {
  id: string
  name: string
  slug: string
}

export type AuthUser = {
  id: string
  email: string
  role: UserRole
}

export type AuthSession = {
  accessToken: string
  tokenType: "Bearer"
  expiresAt: string
  sessionId: string
  user: AuthUser
  tenant: Tenant
}

export type AuthRegistration = {
  tenant: Tenant
  user: AuthUser
}

export type ApiSuccess<T> = {
  success: true
} & T

export type ApiFailure = {
  success: false
  message: string
}