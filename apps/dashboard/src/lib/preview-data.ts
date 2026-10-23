import type {AuthSession} from "@/src/types/api"
import {createEmptyDashboardData, type DashboardDatabase} from "@/src/lib/dashboard-data"

const tenantId = "preview_tenant_01"
const ownerId = "preview_user_owner"
const memberId = "preview_user_member"
const connectorId = "preview_connector_eu"
const integrationId = "preview_integration_orders"
const conversationId = "preview_conversation_01"
const secondConversationId = "preview_conversation_02"
const runId = "preview_run_01"
const now = Date.now()
const date = (offsetHours = 0) => new Date(now - offsetHours * 3_600_000).toISOString()

export const previewSession: AuthSession = {
  accessToken: "preview-session-not-a-real-token",
  tokenType: "Bearer",
  expiresAt: new Date(now + 24 * 3_600_000).toISOString(),
  sessionId: "preview-session",
  user: {id: ownerId, email: "alex@northstar-demo.example", role: "OWNER"},
  tenant: {id: tenantId, name: "Northstar Logistics (Preview)", slug: "northstar-preview"},
}

export function createPreviewData(): DashboardDatabase {
  return {
    tenants: [{
      id: tenantId,
      name: "Northstar Logistics (Preview)",
      slug: "northstar-preview",
      industry: "logistics",
      isActive: true,
      createdAt: date(24 * 30),
      updatedAt: date(1),
    }],
    users: [
      {id: ownerId, tenantId, email: "alex@northstar-demo.example", role: "OWNER", isActive: true, lastLoginAt: date(1), createdAt: date(24 * 30), updatedAt: date(1)},
      {id: memberId, tenantId, email: "jordan@northstar-demo.example", role: "MEMBER", isActive: true, lastLoginAt: date(3), createdAt: date(24 * 10), updatedAt: date(3)},
    ],
    sessions: [
      {id: "preview_session_current", userId: ownerId, refreshTokenHash: "sha256:preview-current-session-hash", userAgent: "Chrome · macOS", ip: "192.0.2.24", expiresAt: date(-24 * 6), revokedAt: null, createdAt: date(1)},
      {id: "preview_session_old", userId: memberId, refreshTokenHash: "sha256:preview-revoked-session-hash", userAgent: "Safari · iOS", ip: "192.0.2.41", expiresAt: date(24), revokedAt: date(30), createdAt: date(54)},
    ],
    passwordResetTokens: [
      {id: "preview_reset_01", userId: memberId, tokenHash: "sha256:preview-reset-hash", expiresAt: date(-2), usedAt: null, createdAt: date(1)},
      {id: "preview_reset_02", userId: ownerId, tokenHash: "sha256:preview-used-reset-hash", expiresAt: date(26), usedAt: date(50), createdAt: date(74)},
    ],
    apiKeys: [
      {id: "preview_key_agent", tenantId, name: "Agent runtime", prefix: "fde_demo", keyHash: "sha256:preview-key-hash-01", scopes: ["agent:run", "documents:read"], lastUsedAt: date(0.5), expiresAt: date(-24 * 60), revokedAt: null, createdAt: date(24 * 14)},
      {id: "preview_key_staging", tenantId, name: "Staging integration", prefix: "fde_sample", keyHash: "sha256:preview-key-hash-02", scopes: ["connectors:read"], lastUsedAt: null, expiresAt: null, revokedAt: date(24), createdAt: date(24 * 5)},
    ],
    secrets: [
      {id: "preview_secret_orders", tenantId, name: "orders-db-credentials", ciphertext: "[encrypted preview ciphertext]", keyVersion: 3, createdAt: date(24 * 20), rotatedAt: date(24 * 2)},
      {id: "preview_secret_tracking", tenantId, name: "carrier-api-token", ciphertext: "[encrypted preview ciphertext]", keyVersion: 1, createdAt: date(24 * 6), rotatedAt: null},
    ],
    integrations: [
      {id: integrationId, tenantId, name: "Orders PostgreSQL", type: "POSTGRES", baseUrl: null, config: {host: "orders-db.internal", port: 5432, database: "orders", schema: "public", ssl: true}, secretId: "preview_secret_orders", connectorId, isEnabled: true, createdAt: date(24 * 20), updatedAt: date(2)},
      {id: "preview_integration_carrier", tenantId, name: "Carrier Tracking API", type: "REST_API", baseUrl: "https://api.carrier.example/v2", config: {authStyle: "bearer", timeoutMs: 7000, region: "eu-west"}, secretId: "preview_secret_tracking", connectorId, isEnabled: true, createdAt: date(24 * 13), updatedAt: date(24)},
      {id: "preview_integration_docs", tenantId, name: "Operations knowledge", type: "DOCUMENT_STORE", baseUrl: null, config: {embeddingDimensions: 1536, distance: "cosine"}, secretId: null, connectorId: null, isEnabled: true, createdAt: date(24 * 9), updatedAt: date(24 * 3)},
    ],
    connectors: [
      {id: connectorId, tenantId, name: "eu-west-prod-edge", status: "ONLINE", tokenHash: "sha256:preview-enrollment-hash", version: "1.8.2", hostname: "edge-eu-03.northstar.internal", lastSeenAt: date(0.03), lastIp: "10.24.8.16", createdAt: date(24 * 20), revokedAt: null},
      {id: "preview_connector_dr", tenantId, name: "disaster-recovery-edge", status: "OFFLINE", tokenHash: "sha256:preview-enrollment-hash-2", version: "1.8.0", hostname: "edge-dr-01.northstar.internal", lastSeenAt: date(18), lastIp: "10.24.9.10", createdAt: date(24 * 8), revokedAt: null},
    ],
    connectorHeartbeats: [
      {id: "preview_heartbeat_01", connectorId, latencyMs: 38, cpuPercent: 24.6, memoryMb: 512, createdAt: date(0.03)},
      {id: "preview_heartbeat_02", connectorId, latencyMs: 42, cpuPercent: 31.2, memoryMb: 536, createdAt: date(1)},
      {id: "preview_heartbeat_03", connectorId: "preview_connector_dr", latencyMs: 214, cpuPercent: 82.1, memoryMb: 910, createdAt: date(18)},
    ],
    tools: [
      {id: "preview_tool_order_lookup", tenantId, integrationId, name: "lookup_order", description: "Retrieve an order and its fulfillment status by order reference.", inputSchema: {type: "object", properties: {orderId: {type: "string", description: "Customer-facing order reference"}}, required: ["orderId"], additionalProperties: false}, risk: "READ", requiresApproval: false, timeoutMs: 5000, rateLimitPerMin: 120, isEnabled: true, createdAt: date(24 * 18), updatedAt: date(2)},
      {id: "preview_tool_track", tenantId, integrationId: "preview_integration_carrier", name: "track_shipment", description: "Look up the latest carrier scan and delivery estimate.", inputSchema: {type: "object", properties: {trackingNumber: {type: "string"}}, required: ["trackingNumber"]}, risk: "READ", requiresApproval: false, timeoutMs: 7000, rateLimitPerMin: 90, isEnabled: true, createdAt: date(24 * 16), updatedAt: date(24)},
      {id: "preview_tool_refund", tenantId, integrationId, name: "issue_refund", description: "Issue an approved refund to the original payment method.", inputSchema: {type: "object", properties: {orderId: {type: "string"}, amount: {type: "number"}}, required: ["orderId", "amount"]}, risk: "WRITE", requiresApproval: true, timeoutMs: 10000, rateLimitPerMin: 10, isEnabled: true, createdAt: date(24 * 12), updatedAt: date(24 * 2)},
      {id: "preview_tool_cancel", tenantId, integrationId, name: "cancel_fulfillment", description: "Cancel an in-flight fulfillment request.", inputSchema: {type: "object", properties: {orderId: {type: "string"}, reason: {type: "string"}}, required: ["orderId", "reason"]}, risk: "DESTRUCTIVE", requiresApproval: true, timeoutMs: 12000, rateLimitPerMin: 4, isEnabled: false, createdAt: date(24 * 5), updatedAt: date(24)},
    ],
    toolPermissions: [
      {id: "preview_permission_01", tenantId, toolId: "preview_tool_order_lookup", role: "MEMBER", allowed: true, createdAt: date(24 * 17)},
      {id: "preview_permission_02", tenantId, toolId: "preview_tool_refund", role: "MEMBER", allowed: false, createdAt: date(24 * 12)},
      {id: "preview_permission_03", tenantId, toolId: "preview_tool_refund", role: "ADMIN", allowed: true, createdAt: date(24 * 12)},
      {id: "preview_permission_04", tenantId, toolId: "preview_tool_cancel", role: "VIEWER", allowed: false, createdAt: date(24 * 5)},
    ],
    documents: [
      {id: "preview_document_returns", tenantId, title: "Returns & refund policy", source: "returns-policy-v4.pdf", mimeType: "application/pdf", checksum: "sha256:preview-returns-checksum", status: "READY", error: null, createdAt: date(24 * 7), updatedAt: date(24 * 6)},
      {id: "preview_document_carriers", tenantId, title: "Carrier service levels", source: "https://kb.northstar.example/carrier-sla", mimeType: "text/html", checksum: "sha256:preview-carrier-checksum", status: "PROCESSING", error: null, createdAt: date(2), updatedAt: date(0.5)},
      {id: "preview_document_handbook", tenantId, title: "Warehouse operations handbook", source: "warehouse-handbook.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", checksum: "sha256:preview-handbook-checksum", status: "UPLOADED", error: null, createdAt: date(0.2), updatedAt: date(0.2)},
      {id: "preview_document_archive", tenantId, title: "Legacy carrier manifest", source: "carrier-manifest-2023.csv", mimeType: "text/csv", checksum: "sha256:preview-archive-checksum", status: "FAILED", error: "Unsupported encoding; upload UTF-8 CSV.", createdAt: date(24 * 3), updatedAt: date(24 * 3)},
    ],
    documentChunks: [
      {id: "preview_chunk_01", tenantId, documentId: "preview_document_returns", chunkIndex: 0, content: "Orders can be returned within 30 days of confirmed delivery. Items must be unused and include the original packaging.", tokenCount: 22},
      {id: "preview_chunk_02", tenantId, documentId: "preview_document_returns", chunkIndex: 1, content: "Refunds over €250 require approval from an operations administrator before the refund tool can execute.", tokenCount: 17},
      {id: "preview_chunk_03", tenantId, documentId: "preview_document_returns", chunkIndex: 2, content: "Damaged shipments should be documented with photos and escalated to the carrier within 48 hours.", tokenCount: 16},
    ],
    conversations: [
      {id: conversationId, tenantId, userId: ownerId, title: "Delayed shipment NS-48291", createdAt: date(1), updatedAt: date(0.2)},
      {id: secondConversationId, tenantId, userId: memberId, title: "Refund policy for damaged orders", createdAt: date(8), updatedAt: date(5)},
    ],
    messages: [
      {id: "preview_message_01", tenantId, conversationId, role: "USER", content: "Can you check the delivery estimate for order NS-48291?", toolCallId: null, createdAt: date(0.2)},
      {id: "preview_message_02", tenantId, conversationId, role: "ASSISTANT", content: "The carrier scan from Rotterdam was recorded at 09:42 UTC. The current delivery estimate is tomorrow by 18:00.", toolCallId: null, createdAt: date(0.19)},
      {id: "preview_message_03", tenantId, conversationId, role: "TOOL", content: "{\"status\":\"IN_TRANSIT\",\"lastScan\":\"Rotterdam hub\",\"eta\":\"Tomorrow 18:00 UTC\"}", toolCallId: "preview_tool_call_01", createdAt: date(0.195)},
      {id: "preview_message_04", tenantId, conversationId, role: "SYSTEM", content: "Tool execution completed with a read-only policy.", toolCallId: null, createdAt: date(0.194)},
      {id: "preview_message_05", tenantId, secondConversationId, role: "USER", content: "A parcel arrived damaged. What is the refund process?", toolCallId: null, createdAt: date(5)},
      {id: "preview_message_06", tenantId, secondConversationId, role: "ASSISTANT", content: "Please attach photos and report the damage within 48 hours. Refunds over €250 require an operations administrator's approval.", toolCallId: null, createdAt: date(4.9)},
    ],
    agentRuns: [
      {id: runId, tenantId, conversationId, status: "SUCCEEDED", model: "gpt-4.1-mini", promptTokens: 612, completionTokens: 146, costUsd: 0.000284, llmLatencyMs: 734, retrievalLatencyMs: 48, totalLatencyMs: 1102, error: null, startedAt: date(0.2), finishedAt: date(0.18)},
      {id: "preview_run_02", tenantId, conversationId: secondConversationId, status: "FAILED", model: "gpt-4.1-mini", promptTokens: 390, completionTokens: 0, costUsd: 0.000118, llmLatencyMs: 411, retrievalLatencyMs: 0, totalLatencyMs: 563, error: "Connector unavailable while retrieving carrier policy.", startedAt: date(5), finishedAt: date(4.98)},
      {id: "preview_run_03", tenantId, conversationId, status: "RUNNING", model: "gpt-4.1-mini", promptTokens: 218, completionTokens: 0, costUsd: null, llmLatencyMs: null, retrievalLatencyMs: 62, totalLatencyMs: null, error: null, startedAt: date(0.01), finishedAt: null},
      {id: "preview_run_04", tenantId, conversationId: secondConversationId, status: "TIMED_OUT", model: "gpt-4.1-mini", promptTokens: 741, completionTokens: 0, costUsd: 0.000201, llmLatencyMs: 10000, retrievalLatencyMs: 94, totalLatencyMs: 10112, error: "Model response exceeded the configured timeout.", startedAt: date(24), finishedAt: date(23.8)},
    ],
    toolCalls: [
      {id: "preview_tool_call_01", tenantId, agentRunId: runId, toolId: "preview_tool_track", status: "SUCCEEDED", input: {trackingNumber: "NS-48291"}, output: {status: "IN_TRANSIT", lastScan: "Rotterdam hub", eta: "Tomorrow 18:00 UTC"}, error: null, denyReason: null, idempotencyKey: "preview-track-ns48291", latencyMs: 312, approvedById: null, createdAt: date(0.195), finishedAt: date(0.194)},
      {id: "preview_tool_call_02", tenantId, agentRunId: runId, toolId: "preview_tool_refund", status: "PENDING", input: {orderId: "NS-48291", amount: 284.5}, output: null, error: null, denyReason: null, idempotencyKey: "preview-refund-ns48291", latencyMs: null, approvedById: null, createdAt: date(0.05), finishedAt: null},
      {id: "preview_tool_call_03", tenantId, agentRunId: "preview_run_02", toolId: "preview_tool_cancel", status: "DENIED", input: {orderId: "NS-47012", reason: "Customer changed address"}, output: null, error: null, denyReason: "The cancel_fulfillment tool is disabled by workspace policy.", idempotencyKey: null, latencyMs: 4, approvedById: null, createdAt: date(5), finishedAt: date(5)},
      {id: "preview_tool_call_04", tenantId, agentRunId: "preview_run_01", toolId: "preview_tool_order_lookup", status: "RUNNING", input: {orderId: "NS-48305"}, output: null, error: null, denyReason: null, idempotencyKey: null, latencyMs: null, approvedById: null, createdAt: date(0.01), finishedAt: null},
    ],
    jobs: [
      {id: "preview_job_ingest", tenantId, type: "ingest_document", payload: {documentId: "preview_document_carriers"}, status: "RUNNING", attempts: 1, maxAttempts: 5, nextRunAt: null, lastError: null, result: null, idempotencyKey: "preview-ingest-carriers", createdAt: date(0.5), startedAt: date(0.49), finishedAt: null},
      {id: "preview_job_sync", tenantId, type: "connector_sync", payload: {connectorId, integrationIds: [integrationId, "preview_integration_carrier"]}, status: "QUEUED", attempts: 0, maxAttempts: 3, nextRunAt: date(-0.2), lastError: null, result: null, idempotencyKey: "preview-sync-eu-west", createdAt: date(0.1), startedAt: null, finishedAt: null},
      {id: "preview_job_failed", tenantId, type: "bulk_process", payload: {documentIds: ["preview_document_archive"]}, status: "RETRYING", attempts: 2, maxAttempts: 5, nextRunAt: date(-0.1), lastError: "Input file could not be decoded as UTF-8.", result: null, idempotencyKey: "preview-bulk-archive", createdAt: date(24), startedAt: date(23.8), finishedAt: null},
      {id: "preview_job_done", tenantId, type: "tool_execution", payload: {toolId: "preview_tool_order_lookup"}, status: "SUCCEEDED", attempts: 1, maxAttempts: 5, nextRunAt: null, lastError: null, result: {orderId: "NS-48291", status: "IN_TRANSIT"}, idempotencyKey: "preview-order-lookup", createdAt: date(4), startedAt: date(3.99), finishedAt: date(3.98)},
    ],
    jobAttempts: [
      {id: "preview_attempt_01", jobId: "preview_job_ingest", attemptNo: 1, error: null, durationMs: 28340, startedAt: date(0.49), finishedAt: null},
      {id: "preview_attempt_02", jobId: "preview_job_failed", attemptNo: 1, error: "Input file encoding was not supported.", durationMs: 921, startedAt: date(24), finishedAt: date(23.99)},
      {id: "preview_attempt_03", jobId: "preview_job_failed", attemptNo: 2, error: "Input file could not be decoded as UTF-8.", durationMs: 1102, startedAt: date(23.8), finishedAt: date(23.78)},
      {id: "preview_attempt_04", jobId: "preview_job_done", attemptNo: 1, error: null, durationMs: 428, startedAt: date(3.99), finishedAt: date(3.98)},
    ],
    auditLogs: [
      {id: "preview_audit_01", tenantId, actorId: ownerId, action: "tool.approval_requested", entityType: "ToolCall", entityId: "preview_tool_call_02", metadata: {tool: "issue_refund", amount: 284.5, currency: "EUR"}, ip: "192.0.2.24", createdAt: date(0.05)},
      {id: "preview_audit_02", tenantId, actorId: memberId, action: "document.ingestion_failed", entityType: "Document", entityId: "preview_document_archive", metadata: {reason: "unsupported_encoding"}, ip: "192.0.2.41", createdAt: date(24)},
      {id: "preview_audit_03", tenantId, actorId: ownerId, action: "connector.heartbeat_received", entityType: "EdgeConnector", entityId: connectorId, metadata: {latencyMs: 38, version: "1.8.2"}, ip: "10.24.8.16", createdAt: date(0.03)},
      {id: "preview_audit_04", tenantId, actorId: null, action: "job.retry_scheduled", entityType: "Job", entityId: "preview_job_failed", metadata: {attempt: 2, maxAttempts: 5}, ip: null, createdAt: date(23.8)},
    ],
    traceSpans: [
      {id: "preview_span_01", tenantId, agentRunId: runId, parentSpanId: null, name: "agent.request", startedAt: date(0.2), durationMs: 1102, status: "ok", attributes: {model: "gpt-4.1-mini", route: "agent.run"}},
      {id: "preview_span_02", tenantId, agentRunId: runId, parentSpanId: "preview_span_01", name: "rag.retrieve", startedAt: date(0.199), durationMs: 48, status: "ok", attributes: {documents: 3, topK: 5}},
      {id: "preview_span_03", tenantId, agentRunId: runId, parentSpanId: "preview_span_01", name: "edge.forward", startedAt: date(0.197), durationMs: 312, status: "ok", attributes: {connector: "eu-west-prod-edge", integration: "Carrier Tracking API"}},
      {id: "preview_span_04", tenantId, agentRunId: "preview_run_02", parentSpanId: null, name: "customer_api", startedAt: date(5), durationMs: 563, status: "error", attributes: {errorCode: "CONNECTOR_UNAVAILABLE", integration: "Carrier Tracking API"}},
    ],
  }
}

let previewData = createPreviewData()
const listeners = new Set<() => void>()

export function getPreviewData(): DashboardDatabase {
  return previewData
}

export function subscribeToPreviewData(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function updatePreviewData(updater: (current: DashboardDatabase) => DashboardDatabase): void {
  previewData = updater(previewData)
  listeners.forEach((listener) => listener())
}

export function resetPreviewData(): void {
  previewData = createPreviewData()
  listeners.forEach((listener) => listener())
}

const emptyPreviewSnapshot = createEmptyDashboardData()

export function getEmptyPreviewSnapshot(): DashboardDatabase {
  return emptyPreviewSnapshot
}
