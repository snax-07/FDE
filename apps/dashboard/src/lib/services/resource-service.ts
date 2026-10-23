import {ApiError} from "@/src/lib/api/errors"
import {apiRequest} from "@/src/lib/api/client"
import type {ApiSuccess} from "@/src/types/api"
import type {DashboardRecord, ResourceKey} from "@/src/lib/dashboard-data"

const resourceRoutes: Record<ResourceKey, string> = {
  tenants: "tenants",
  users: "users",
  sessions: "sessions",
  passwordResetTokens: "password-reset-tokens",
  apiKeys: "api-keys",
  secrets: "secrets",
  integrations: "integrations",
  connectors: "connectors",
  connectorHeartbeats: "connector-heartbeats",
  tools: "tools",
  toolPermissions: "tool-permissions",
  documents: "documents",
  documentChunks: "document-chunks",
  conversations: "conversations",
  messages: "messages",
  agentRuns: "agent-runs",
  toolCalls: "tool-calls",
  jobs: "jobs",
  jobAttempts: "job-attempts",
  auditLogs: "audit-logs",
  traceSpans: "trace-spans",
}

type ResourceResponse<T> = ApiSuccess<{data: T}>

function resourcePath(key: ResourceKey, tenantId?: string): string {
  const query = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : ""
  return `/${resourceRoutes[key]}${query}`
}

function responseData<T>(response: ResourceResponse<T>, action: string): T {
  if (!response || response.success !== true || response.data === undefined) {
    throw new ApiError(`The API returned an invalid ${action} response.`, 502)
  }
  return response.data
}

export async function listResource(key: ResourceKey, tenantId?: string): Promise<DashboardRecord[]> {
  const response = await apiRequest<ResourceResponse<DashboardRecord[]>>(resourcePath(key, tenantId), {authenticated: true})
  const records = responseData(response, `${key} list`)
  if (!Array.isArray(records)) throw new ApiError(`The API returned an invalid ${key} list.`, 502)
  return records
}

export async function createResource(key: ResourceKey, values: DashboardRecord): Promise<DashboardRecord> {
  const response = await apiRequest<ResourceResponse<DashboardRecord>>(resourcePath(key), {
    method: "POST",
    body: values,
    authenticated: true,
  })
  return responseData(response, `${key} create`)
}

export async function updateResource(key: ResourceKey, id: string, values: DashboardRecord): Promise<DashboardRecord> {
  const response = await apiRequest<ResourceResponse<DashboardRecord>>(`${resourcePath(key)}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: values,
    authenticated: true,
  })
  return responseData(response, `${key} update`)
}

export async function deleteResource(key: ResourceKey, id: string): Promise<void> {
  await apiRequest<ApiSuccess<{message: string}>>(`${resourcePath(key)}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    authenticated: true,
  })
}
