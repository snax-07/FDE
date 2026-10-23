import {apiRequest} from "@/src/lib/api/client"
import type {ApiSuccess, AuthRegistration, AuthSession, Tenant, AuthUser} from "@/src/types/api"

export type RegisterInput = {
  tenantName: string
  tenantSlug: string
  email: string
  password: string
}

export type LoginInput = {
  tenantSlug: string
  email: string
  password: string
}

export type CurrentUser = {
  user: AuthUser
  tenantId: string
}

export async function register(input: RegisterInput): Promise<AuthRegistration> {
  const result = await apiRequest<ApiSuccess<AuthRegistration>>("/auth/register", {
    method: "POST",
    body: input,
  })
  return {tenant: result.tenant, user: result.user}
}

export async function login(input: LoginInput): Promise<AuthSession> {
  return apiRequest<ApiSuccess<AuthSession>>("/auth/login", {
    method: "POST",
    body: input,
  })
}

export async function currentUser(): Promise<CurrentUser> {
  const result = await apiRequest<ApiSuccess<CurrentUser>>("/auth/me", {authenticated: true})
  return {user: result.user, tenantId: result.tenantId}
}

export async function logout(): Promise<void> {
  await apiRequest<ApiSuccess<{message: string}>>("/auth/logout", {
    method: "POST",
    authenticated: true,
  })
}

export type {Tenant}
