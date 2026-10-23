export type JsonValue = string | number | boolean | null | JsonValue[] | {[key: string]: JsonValue | undefined}
export type RecordValue = JsonValue | undefined
export type DashboardRecord = Record<string, RecordValue>
export type ResourceKey =
  | "tenants" | "users" | "sessions" | "passwordResetTokens" | "apiKeys" | "secrets"
  | "integrations" | "connectors" | "connectorHeartbeats" | "tools" | "toolPermissions"
  | "documents" | "documentChunks" | "conversations" | "messages" | "agentRuns"
  | "toolCalls" | "jobs" | "jobAttempts" | "auditLogs" | "traceSpans"
export type FieldKind = "text" | "textarea" | "number" | "boolean" | "select" | "date" | "json" | "secret"

export type FieldDefinition = {
  key: string
  label: string
  kind?: FieldKind
  required?: boolean
  options?: string[]
  placeholder?: string
}

export type EntityDefinition = {
  key: ResourceKey
  label: string
  singular: string
  group: string
  description: string
  fields: FieldDefinition[]
  columns: string[]
  tenantScoped?: boolean
}

const text = (key: string, label: string, required = true): FieldDefinition => ({key, label, required})
const optional = (key: string, label: string): FieldDefinition => ({key, label, required: false})
const select = (key: string, label: string, options: string[]): FieldDefinition => ({key, label, kind: "select", options})
const number = (key: string, label: string): FieldDefinition => ({key, label, kind: "number", required: false})
const date = (key: string, label: string): FieldDefinition => ({key, label, kind: "date", required: false})
const json = (key: string, label: string): FieldDefinition => ({key, label, kind: "json", required: false})
const boolean = (key: string, label: string): FieldDefinition => ({key, label, kind: "boolean"})

export const entities: EntityDefinition[] = [
  {key: "tenants", label: "Tenants", singular: "Tenant", group: "Workspace", description: "Customer organizations and workspace settings.", columns: ["name", "slug", "industry", "isActive", "createdAt"], fields: [text("name", "Name"), text("slug", "Slug"), optional("industry", "Industry"), boolean("isActive", "Active"), date("createdAt", "Created at"), date("updatedAt", "Updated at")]},
  {key: "users", label: "Users", singular: "User", group: "Workspace", description: "Tenant members, roles, and account status.", columns: ["email", "role", "isActive", "lastLoginAt", "createdAt"], tenantScoped: true, fields: [text("tenantId", "Tenant ID"), text("email", "Email"), select("role", "Role", ["OWNER", "ADMIN", "MEMBER", "VIEWER"]), boolean("isActive", "Active"), optional("lastLoginAt", "Last login"), date("createdAt", "Created at")]},
  {key: "sessions", label: "Sessions", singular: "Session", group: "Workspace", description: "Hashed login sessions and expiry/revocation status.", columns: ["userId", "userAgent", "ip", "expiresAt", "revokedAt"], tenantScoped: true, fields: [text("userId", "User ID"), text("refreshTokenHash", "Token hash"), optional("userAgent", "User agent"), optional("ip", "IP address"), date("expiresAt", "Expires at"), optional("revokedAt", "Revoked at"), date("createdAt", "Created at")]},
  {key: "passwordResetTokens", label: "Password resets", singular: "Password reset token", group: "Workspace", description: "Single-use password reset token hashes and expiry.", columns: ["userId", "expiresAt", "usedAt", "createdAt"], tenantScoped: true, fields: [text("userId", "User ID"), text("tokenHash", "Token hash"), date("expiresAt", "Expires at"), optional("usedAt", "Used at"), date("createdAt", "Created at")]},
  {key: "apiKeys", label: "API keys", singular: "API key", group: "Workspace", description: "Tenant API key metadata; raw keys are never stored.", columns: ["name", "prefix", "scopes", "expiresAt", "revokedAt"], tenantScoped: true, fields: [text("tenantId", "Tenant ID"), text("name", "Name"), text("prefix", "Key prefix"), text("keyHash", "Key hash"), {key:"scopes",label:"Scopes",kind:"textarea",required:false}, optional("lastUsedAt", "Last used at"), optional("expiresAt", "Expires at"), optional("revokedAt", "Revoked at"), date("createdAt", "Created at")]},
  {key: "secrets", label: "Secrets", singular: "Secret", group: "Workspace", description: "Encrypted integration credentials. Never enter plaintext here.", columns: ["name", "keyVersion", "rotatedAt", "createdAt"], tenantScoped: true, fields: [text("tenantId", "Tenant ID"), text("name", "Name"), {key:"ciphertext",label:"Ciphertext",kind:"secret"}, number("keyVersion", "Key version"), optional("rotatedAt", "Rotated at"), date("createdAt", "Created at")]},
  {key: "integrations", label: "Integrations", singular: "Integration", group: "Connect", description: "External data sources and their non-secret configuration.", columns: ["name", "type", "baseUrl", "secretId", "isEnabled"], tenantScoped: true, fields: [text("tenantId", "Tenant ID"), text("name", "Name"), select("type", "Type", ["POSTGRES", "REST_API", "DOCUMENT_STORE"]), optional("baseUrl", "Base URL"), json("config", "Config JSON"), optional("secretId", "Secret ID"), optional("connectorId", "Connector ID"), boolean("isEnabled", "Enabled"), date("createdAt", "Created at"), date("updatedAt", "Updated at")]},
  {key: "connectors", label: "Connectors", singular: "Edge connector", group: "Connect", description: "Edge agents enrolled to reach tenant systems.", columns: ["name", "status", "hostname", "version", "lastSeenAt"], tenantScoped: true, fields: [text("tenantId", "Tenant ID"), text("name", "Name"), select("status", "Status", ["PENDING", "ONLINE", "OFFLINE", "REVOKED"]), text("tokenHash", "Token hash"), optional("version", "Version"), optional("hostname", "Hostname"), optional("lastSeenAt", "Last seen at"), optional("lastIp", "Last IP"), date("createdAt", "Created at"), optional("revokedAt", "Revoked at")]},
  {key: "connectorHeartbeats", label: "Connector heartbeats", singular: "Heartbeat", group: "Connect", description: "Connector health, latency, and resource measurements.", columns: ["connectorId", "latencyMs", "cpuPercent", "memoryMb", "createdAt"], tenantScoped: true, fields: [text("connectorId", "Connector ID"), number("latencyMs", "Latency (ms)"), number("cpuPercent", "CPU percent"), number("memoryMb", "Memory (MB)"), date("createdAt", "Created at")]},
  {key: "tools", label: "Tools", singular: "Tool", group: "Connect", description: "Agent-callable operations, risk, and execution limits.", columns: ["name", "integrationId", "risk", "requiresApproval", "isEnabled"], tenantScoped: true, fields: [text("tenantId", "Tenant ID"), text("integrationId", "Integration ID"), text("name", "Name"), text("description", "Description"), json("inputSchema", "Input schema JSON"), select("risk", "Risk", ["READ", "WRITE", "DESTRUCTIVE"]), boolean("requiresApproval", "Requires approval"), number("timeoutMs", "Timeout (ms)"), number("rateLimitPerMin", "Rate limit per minute"), boolean("isEnabled", "Enabled"), date("createdAt", "Created at"), date("updatedAt", "Updated at")]},
  {key: "toolPermissions", label: "Tool permissions", singular: "Tool permission", group: "Connect", description: "Role-based access rules for tools.", columns: ["toolId", "role", "allowed", "createdAt"], tenantScoped: true, fields: [text("tenantId", "Tenant ID"), text("toolId", "Tool ID"), select("role", "Role", ["OWNER", "ADMIN", "MEMBER", "VIEWER"]), boolean("allowed", "Allowed"), date("createdAt", "Created at")]},
  {key: "documents", label: "Documents", singular: "Document", group: "Knowledge", description: "Tenant knowledge sources and ingestion state.", columns: ["title", "source", "mimeType", "status", "updatedAt"], tenantScoped: true, fields: [text("tenantId", "Tenant ID"), text("title", "Title"), optional("source", "Source"), optional("mimeType", "MIME type"), optional("checksum", "Checksum"), select("status", "Status", ["UPLOADED", "PROCESSING", "READY", "FAILED"]), optional("error", "Error"), date("createdAt", "Created at"), date("updatedAt", "Updated at")]},
  {key: "documentChunks", label: "Document chunks", singular: "Document chunk", group: "Knowledge", description: "Extracted document sections and embedding metadata.", columns: ["documentId", "chunkIndex", "tokenCount", "content"], tenantScoped: true, fields: [text("tenantId", "Tenant ID"), text("documentId", "Document ID"), number("chunkIndex", "Chunk index"), {key:"content",label:"Content",kind:"textarea"}, number("tokenCount", "Token count")]},
  {key: "conversations", label: "Conversations", singular: "Conversation", group: "Agent", description: "Tenant conversation threads and owners.", columns: ["title", "userId", "createdAt", "updatedAt"], tenantScoped: true, fields: [text("tenantId", "Tenant ID"), text("userId", "User ID"), optional("title", "Title"), date("createdAt", "Created at"), date("updatedAt", "Updated at")]},
  {key: "messages", label: "Messages", singular: "Message", group: "Agent", description: "User, assistant, system, and tool conversation messages.", columns: ["conversationId", "role", "content", "createdAt"], tenantScoped: true, fields: [text("tenantId", "Tenant ID"), text("conversationId", "Conversation ID"), select("role", "Role", ["USER", "ASSISTANT", "TOOL", "SYSTEM"]), {key:"content",label:"Content",kind:"textarea"}, optional("toolCallId", "Tool call ID"), date("createdAt", "Created at")]},
  {key: "agentRuns", label: "Agent runs", singular: "Agent run", group: "Agent", description: "Run outcomes, token usage, cost, and latency.", columns: ["conversationId", "status", "model", "totalLatencyMs", "startedAt"], tenantScoped: true, fields: [text("tenantId", "Tenant ID"), text("conversationId", "Conversation ID"), select("status", "Status", ["RUNNING", "SUCCEEDED", "FAILED", "TIMED_OUT"]), text("model", "Model"), number("promptTokens", "Prompt tokens"), number("completionTokens", "Completion tokens"), number("costUsd", "Cost (USD)"), number("llmLatencyMs", "LLM latency (ms)"), number("retrievalLatencyMs", "Retrieval latency (ms)"), number("totalLatencyMs", "Total latency (ms)"), optional("error", "Error"), date("startedAt", "Started at"), optional("finishedAt", "Finished at")]},
  {key: "toolCalls", label: "Tool calls", singular: "Tool call", group: "Agent", description: "Tool execution input, output, approval, and result status.", columns: ["toolId", "status", "risk", "latencyMs", "createdAt"], tenantScoped: true, fields: [text("tenantId", "Tenant ID"), text("agentRunId", "Agent run ID"), text("toolId", "Tool ID"), select("status", "Status", ["PENDING", "DENIED", "RUNNING", "SUCCEEDED", "FAILED", "TIMED_OUT"]), json("input", "Input JSON"), json("output", "Output JSON"), optional("error", "Error"), optional("denyReason", "Deny reason"), optional("idempotencyKey", "Idempotency key"), number("latencyMs", "Latency (ms)"), optional("approvedById", "Approved by user ID"), date("createdAt", "Created at"), optional("finishedAt", "Finished at")]},
  {key: "jobs", label: "Jobs", singular: "Job", group: "Operations", description: "Queued background work, retries, and final results.", columns: ["type", "status", "attempts", "nextRunAt", "createdAt"], tenantScoped: true, fields: [text("tenantId", "Tenant ID"), text("type", "Type"), json("payload", "Payload JSON"), select("status", "Status", ["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "RETRYING", "DEAD"]), number("attempts", "Attempts"), number("maxAttempts", "Maximum attempts"), optional("nextRunAt", "Next run at"), optional("lastError", "Last error"), json("result", "Result JSON"), optional("idempotencyKey", "Idempotency key"), date("createdAt", "Created at"), optional("startedAt", "Started at"), optional("finishedAt", "Finished at")]},
  {key: "jobAttempts", label: "Job attempts", singular: "Job attempt", group: "Operations", description: "Individual background-job retry attempts and errors.", columns: ["jobId", "attemptNo", "durationMs", "error", "startedAt"], tenantScoped: true, fields: [text("jobId", "Job ID"), number("attemptNo", "Attempt number"), optional("error", "Error"), number("durationMs", "Duration (ms)"), date("startedAt", "Started at"), optional("finishedAt", "Finished at")]},
  {key: "auditLogs", label: "Audit log", singular: "Audit log entry", group: "Operations", description: "Append-only record of important tenant actions.", columns: ["action", "entityType", "entityId", "actorId", "createdAt"], tenantScoped: true, fields: [text("tenantId", "Tenant ID"), optional("actorId", "Actor user ID"), text("action", "Action"), optional("entityType", "Entity type"), optional("entityId", "Entity ID"), json("metadata", "Metadata JSON"), optional("ip", "IP address"), date("createdAt", "Created at")]},
  {key: "traceSpans", label: "Trace spans", singular: "Trace span", group: "Operations", description: "Per-step timing and status for agent runs.", columns: ["name", "agentRunId", "durationMs", "status", "startedAt"], tenantScoped: true, fields: [text("tenantId", "Tenant ID"), text("agentRunId", "Agent run ID"), optional("parentSpanId", "Parent span ID"), text("name", "Name"), date("startedAt", "Started at"), number("durationMs", "Duration (ms)"), select("status", "Status", ["ok", "error"]), json("attributes", "Attributes JSON")]},
]

export type DashboardDatabase = Record<ResourceKey, DashboardRecord[]>

export function createEmptyDashboardData(): DashboardDatabase {
  return {
    tenants: [],
    users: [],
    sessions: [],
    passwordResetTokens: [],
    apiKeys: [],
    secrets: [],
    integrations: [],
    tools: [],
    toolPermissions: [],
    connectors: [],
    connectorHeartbeats: [],
    documents: [],
    documentChunks: [],
    conversations: [],
    messages: [],
    agentRuns: [],
    toolCalls: [],
    jobs: [],
    jobAttempts: [],
    auditLogs: [],
    traceSpans: [],
  }
}

export function rowTenantId(entity: string, row: DashboardRecord, data: DashboardDatabase): string | undefined {
  if (typeof row.tenantId === "string") return row.tenantId
  const parentKey = entity === "sessions" || entity === "passwordResetTokens"
    ? "users"
    : entity === "connectorHeartbeats"
      ? "connectors"
      : entity === "jobAttempts"
        ? "jobs"
        : undefined
  const parentIdKey = entity === "sessions" || entity === "passwordResetTokens"
    ? "userId"
    : entity === "connectorHeartbeats"
      ? "connectorId"
      : entity === "jobAttempts"
        ? "jobId"
        : undefined
  if (!parentKey || !parentIdKey) return undefined
  const parent = data[parentKey]?.find((item) => item.id === row[parentIdKey])
  return parent ? rowTenantId(parentKey, parent, data) : undefined
}

export const groupNames = ["Workspace", "Connect", "Knowledge", "Agent", "Operations"]

const serverSnapshot = createEmptyDashboardData()
let browserSnapshot = serverSnapshot
const listeners = new Set<() => void>()

export function clearLegacyDashboardData(): void {
  window.localStorage.removeItem("fde-console-demo-v1")
  window.localStorage.removeItem("fde-dashboard-session-v1")
  window.localStorage.removeItem("fde-dashboard-mock-credentials-v1")
}

export function getDashboardSnapshot(): DashboardDatabase {
  return browserSnapshot
}

export function getDashboardServerSnapshot(): DashboardDatabase {
  return serverSnapshot
}

export function subscribeToDashboardData(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function updateDashboardData(
  updater: (current: DashboardDatabase) => DashboardDatabase,
): void {
  browserSnapshot = updater(browserSnapshot)
  listeners.forEach((listener) => listener())
}
