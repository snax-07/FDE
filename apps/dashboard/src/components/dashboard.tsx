"use client"

import {useEffect, useMemo, useState, type FormEvent} from "react"
import AuthScreen from "@/src/components/auth-screen"
import {useAuth} from "@/src/hooks/use-auth"
import {useDashboardData} from "@/src/hooks/use-dashboard-data"
import {
  entities,
  groupNames,
  rowTenantId,
  type EntityDefinition,
  type FieldDefinition,
  type JsonValue,
  updateDashboardData,
  type DashboardRecord,
} from "@/src/lib/dashboard-data"
import {updatePreviewData} from "@/src/lib/preview-data"
import {createResource, deleteResource, updateResource} from "@/src/lib/services/resource-service"

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—"
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

function dateInputValue(value: unknown): string {
  if (typeof value !== "string" || !value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function prettyDate(value: unknown): string {
  if (typeof value !== "string") return display(value)
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en", {month: "short", day: "numeric", hour: "numeric", minute: "2-digit"}).format(date)
}

function valueForField(field: FieldDefinition, value: unknown): string | boolean {
  if (field.kind === "boolean") return Boolean(value)
  if (field.kind === "json") return value == null ? "" : JSON.stringify(value, null, 2)
  if (field.key === "scopes" && Array.isArray(value)) return value.join(", ")
  if (field.kind === "date") return dateInputValue(value)
  return value == null ? "" : String(value)
}

function fieldValue(field: FieldDefinition, value: string | boolean): DashboardRecord[string] {
  if (field.kind === "boolean") return value
  if (field.kind === "number") return value === "" ? null : Number(value)
  if (field.kind === "json") {
    if (value === "") return null
    return JSON.parse(String(value)) as JsonValue
  }
  if (field.kind === "date") return value === "" ? null : new Date(String(value)).toISOString()
  if (field.key === "scopes") return String(value).split(",").map((item) => item.trim()).filter(Boolean)
  if (value === "") return null
  return value
}

function tone(value: unknown): string {
  const text = String(value ?? "").toLowerCase()
  if (["online", "ready", "succeeded", "active", "ok", "true"].includes(text)) return "good"
  if (["failed", "error", "dead", "revoked", "false", "denied"].includes(text)) return "bad"
  if (["pending", "running", "processing", "retrying", "uploaded", "offline"].includes(text)) return "warn"
  return ""
}

function Badge({value}: {value: unknown}) {
  const text = display(value)
  if (text === "—") return <span className="muted">{text}</span>
  return <span className={`badge ${tone(value)}`}>{text.replaceAll("_", " ")}</span>
}

function Icon({name}: {name: string}) {
  const glyphs: Record<string, string> = {
    Workspace: "⌂", Connect: "⌁", Knowledge: "▤", Agent: "✳", Operations: "◷",
    Overview: "◫", Search: "⌕", Plus: "+", Dots: "···", Export: "↓",
  }
  return <span className="icon" aria-hidden="true">{glyphs[name] ?? "·"}</span>
}

function Modal({
  entity,
  record,
  selectedTenant,
  onClose,
  onSave,
}: {
  entity: EntityDefinition
  record: DashboardRecord | null
  selectedTenant: string
  onClose: () => void
  onSave: (values: DashboardRecord) => void
}) {
  const [values, setValues] = useState<Record<string, string | boolean>>(() => {
    const initial: Record<string, string | boolean> = {}
    for (const field of entity.fields) {
      const existing = record?.[field.key]
      if (existing !== undefined) {
        initial[field.key] = valueForField(field, existing)
      } else if (field.key === "tenantId" && selectedTenant !== "all") {
        initial[field.key] = selectedTenant
      } else if (field.kind === "boolean") {
        initial[field.key] = ["isActive", "isEnabled", "allowed"].includes(field.key)
      } else if (field.kind === "select" && field.options?.[0]) {
        initial[field.key] = field.options[0]
      } else if (field.kind === "json") {
        initial[field.key] = ""
      } else if (field.key === "createdAt" || field.key === "updatedAt" || field.key === "startedAt") {
        initial[field.key] = dateInputValue(new Date().toISOString())
      } else {
        initial[field.key] = ""
      }
    }
    return initial
  })
  const [formError, setFormError] = useState("")

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      const next: DashboardRecord = {...record, ...values}
      for (const field of entity.fields) next[field.key] = fieldValue(field, values[field.key] ?? "")
      onSave(next)
    } catch {
      setFormError("Check that every JSON field contains valid JSON.")
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-head">
          <div>
            <span className="eyebrow">{record ? "EDIT RECORD" : "NEW RECORD"}</span>
            <h2 id="modal-title">{record ? `Edit ${entity.singular}` : `Create ${entity.singular}`}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">×</button>
        </div>
        <p className="modal-description">{entity.description}</p>
        <form onSubmit={submit}>
          <div className="form-grid">
            {entity.fields.map((field) => (
              <label key={field.key} className={`form-field ${field.kind === "textarea" || field.kind === "json" ? "wide" : ""}`}>
                <span>{field.label}{field.required && <b className="required"> *</b>}</span>
                {field.kind === "boolean" ? (
                  <span className="switch-row">
                    <input type="checkbox" checked={Boolean(values[field.key])} onChange={(event) => setValues({...values, [field.key]: event.target.checked})}/>
                    <span>{values[field.key] ? "Enabled" : "Disabled"}</span>
                  </span>
                ) : field.kind === "select" ? (
                  <select value={String(values[field.key] ?? "")} onChange={(event) => setValues({...values, [field.key]: event.target.value})}>
                    {field.options?.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}
                  </select>
                ) : field.kind === "textarea" || field.kind === "json" ? (
                  <textarea
                    rows={field.kind === "json" ? 5 : 3}
                    value={String(values[field.key] ?? "")}
                    placeholder={field.kind === "json" ? '{"key": "value"}' : field.placeholder}
                    spellCheck={false}
                    onChange={(event) => setValues({...values, [field.key]: event.target.value})}
                  />
                ) : (
                  <input
                    type={field.kind === "number" ? "number" : field.kind === "date" ? "datetime-local" : "text"}
                    step={field.key === "cpuPercent" || field.key === "costUsd" ? "any" : undefined}
                    value={String(values[field.key] ?? "")}
                    required={field.required}
                    placeholder={field.placeholder}
                    onChange={(event) => setValues({...values, [field.key]: event.target.value})}
                  />
                )}
                {field.kind === "secret" && <small>Demo only: the backend should encrypt secret values and return ciphertext, never plaintext.</small>}
              </label>
            ))}
          </div>
          {formError && <p className="form-error" role="alert">{formError}</p>}
          <div className="modal-actions">
            <button className="button secondary" type="button" onClick={onClose}>Cancel</button>
            <button className="button primary" type="submit">{record ? "Save changes" : "Create record"}</button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default function Dashboard() {
  const {session, isPreview, isLoading, enterPreview, signIn, signUp, signOut} = useAuth()
  const {data, resourceErrors, isLoading: isDataLoading} = useDashboardData(session?.tenant.id, session?.user.id, isPreview, session?.sessionId)
  const [activeEntity, setActiveEntity] = useState("overview")
  const selectedTenant = session?.tenant.id ?? ""
  const [activeConversationId, setActiveConversationId] = useState("")
  const [search, setSearch] = useState("")
  const [modal, setModal] = useState<{entity: EntityDefinition; record: DashboardRecord | null} | null>(null)
  const [toast, setToast] = useState("")
  const [previewChatInput, setPreviewChatInput] = useState("")

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(""), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const tenantRows = data.tenants ?? []
  const tenant = tenantRows.find((row) => row.id === selectedTenant)
  const active = entities.find((entity) => entity.key === activeEntity)
  const pageTitle = active?.label ?? ({
    overview: "Overview",
    playground: "Agent chat",
    "agent-config": "Agent builder",
  } as Record<string, string>)[activeEntity] ?? "Workspace"
  const visibleRows = useMemo(() => {
    if (!active) return []
    return (data[active.key] ?? []).filter((row) => {
      if (selectedTenant !== "all" && active.tenantScoped && rowTenantId(active.key, row, data) !== selectedTenant) return false
      const query = search.trim().toLowerCase()
      return !query || Object.values(row).some((value) => display(value).toLowerCase().includes(query))
    })
  }, [active, data, search, selectedTenant])

  function notify(message: string) {
    setToast(message)
  }

  async function saveRecord(values: DashboardRecord) {
    if (!modal) return
    const entity = modal.entity
    const existing = modal.record
    try {
      if (isPreview) {
        const record = {
          ...values,
          id: existing?.id ?? `preview_${entity.key}_${Date.now()}`,
        }
        updatePreviewData((current) => ({
          ...current,
          [entity.key]: existing
            ? (current[entity.key] ?? []).map((row) => row.id === existing.id ? record : row)
            : [record, ...(current[entity.key] ?? [])],
        }))
        setModal(null)
        notify(`${entity.singular} ${existing ? "updated" : "created"} in preview`)
        return
      }
      const record = existing
        ? await updateResource(entity.key, String(existing.id), values)
        : await createResource(entity.key, values)
      updateDashboardData((current) => ({
        ...current,
        [entity.key]: existing
          ? (current[entity.key] ?? []).map((row) => row.id === existing.id ? record : row)
          : [record, ...(current[entity.key] ?? [])],
      }))
      setModal(null)
      notify(`${entity.singular} ${existing ? "updated" : "created"}`)
    } catch (error) {
      notify(error instanceof Error ? error.message : `Could not save ${entity.singular.toLowerCase()}`)
    }
  }

  async function deleteRecord(entity: EntityDefinition, record: DashboardRecord) {
    if (!window.confirm(`Delete this ${entity.singular.toLowerCase()}?`)) return
    if (isPreview) {
      updatePreviewData((current) => ({
        ...current,
        [entity.key]: (current[entity.key] ?? []).filter((row) => row.id !== record.id),
      }))
    } else {
      try {
        await deleteResource(entity.key, String(record.id))
      } catch (error) {
        notify(error instanceof Error ? error.message : `Could not delete ${entity.singular.toLowerCase()}`)
        return
      }
      updateDashboardData((current) => ({
        ...current,
        [entity.key]: (current[entity.key] ?? []).filter((row) => row.id !== record.id),
      }))
    }
    notify(`${entity.singular} deleted${isPreview ? " from preview" : ""}`)
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"})
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = isPreview ? "forgeops-preview-data.json" : "fde-dashboard-data.json"
    anchor.click()
    URL.revokeObjectURL(url)
    notify("Data exported")
  }

  const auditEvents = [...(data.auditLogs ?? [])].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 5)
  const tenantRuns = data.agentRuns ?? []
  const tenantDocs = data.documents ?? []
  const tenantUsers = data.users ?? []
  const activeUserCount = tenantUsers.filter((row) => row.isActive).length
  const pendingCalls = (data.toolCalls ?? []).filter((row) => row.status === "PENDING")
  const groups = groupNames.map((group) => ({group, items: entities.filter((entity) => entity.group === group)}))
  const chatConversations = data.conversations ?? []
  const selectedConversation = chatConversations.find((conversation) => conversation.id === activeConversationId) ?? chatConversations[0]
  const chatMessages = selectedConversation
    ? (data.messages ?? []).filter((message) => message.conversationId === selectedConversation.id).sort((a,b) => String(a.createdAt).localeCompare(String(b.createdAt)))
    : []

  function submitPreviewChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = previewChatInput.trim()
    if (!isPreview || !content || !selectedConversation) return
    const normalized = content.toLowerCase()
    const response = normalized.includes("refund") || normalized.includes("return")
      ? "Preview response: the returns policy allows requests within 30 days of delivery. Refunds over €250 need an operations administrator's approval. No live systems were contacted."
      : normalized.includes("order") || normalized.includes("ship") || normalized.includes("track")
        ? "Preview response: the shipment is in transit from the Rotterdam hub, with delivery estimated tomorrow by 18:00 UTC. This is a synthetic sample response; no carrier API was called."
        : "Preview response: I can help look up orders, track shipments, and answer questions from the operations knowledge base. This reply is synthetic and no live systems were contacted."
    const createdAt = new Date().toISOString()
    const messageId = `preview_message_${Date.now()}`
    updatePreviewData((current) => ({
      ...current,
      messages: [
        ...(current.messages ?? []),
        {id: `${messageId}_user`, tenantId: session?.tenant.id ?? "preview_tenant_01", conversationId: String(selectedConversation.id), role: "USER", content, toolCallId: null, createdAt},
        {id: `${messageId}_assistant`, tenantId: session?.tenant.id ?? "preview_tenant_01", conversationId: String(selectedConversation.id), role: "ASSISTANT", content: response, toolCallId: null, createdAt: new Date(Date.now() + 1).toISOString()},
      ],
      conversations: (current.conversations ?? []).map((conversation) => conversation.id === selectedConversation.id ? {...conversation, updatedAt: createdAt} : conversation),
    }))
    setPreviewChatInput("")
  }

  function setPreviewApproval(record: DashboardRecord, status: "SUCCEEDED" | "DENIED") {
    if (!isPreview) return
    updatePreviewData((current) => ({
      ...current,
      toolCalls: (current.toolCalls ?? []).map((call) => call.id === record.id
        ? {
          ...call,
          status,
          approvedById: status === "SUCCEEDED" ? session?.user.id ?? null : null,
          denyReason: status === "DENIED" ? "Denied in the interactive preview." : null,
          output: status === "SUCCEEDED" ? {preview: true, result: "Approval simulated; no external action was executed."} : null,
          latencyMs: 0,
          finishedAt: new Date().toISOString(),
        }
        : call),
    }))
    notify(`Sample tool call ${status === "SUCCEEDED" ? "approved" : "denied"}`)
  }

  if (isLoading) {
    return <main className="login-screen"><section className="login-card"><div className="login-brand"><span className="brand-mark">F</span><span className="brand-copy"><strong>ForgeOps</strong><small>CONTROL PLANE</small></span></div><p className="login-intro">Restoring your session…</p></section></main>
  }

  if (!session) {
    return <AuthScreen onPreview={enterPreview} onSignIn={signIn} onSignUp={signUp}/>
  }

  function handleSignOut() {
    void signOut().then(() => notify("Signed out")).catch((error: unknown) => {
      notify(error instanceof Error ? error.message : "Could not sign out")
    })
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">F</span>
          <span className="brand-copy"><strong>ForgeOps</strong><small>CONTROL PLANE</small></span>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <button className={`nav-item ${activeEntity === "overview" ? "selected" : ""}`} onClick={() => setActiveEntity("overview")}>
          <Icon name="Overview"/> <span>Overview</span>
        </button>
        <button className={`nav-item ${activeEntity === "playground" ? "selected" : ""}`} onClick={() => setActiveEntity("playground")}>
          <span className="nav-dot"/> <span>Agent chat</span>
        </button>
        <button className={`nav-item ${activeEntity === "agent-config" ? "selected" : ""}`} onClick={() => setActiveEntity("agent-config")}>
          <span className="nav-dot"/> <span>Agent builder</span>
        </button>
        {groups.map(({group, items}) => (
          <div className="nav-group" key={group}>
            <div className="nav-group-label"><Icon name={group}/>{group}</div>
            {items.map((entity) => (
              <button key={entity.key} className={`nav-item ${activeEntity === entity.key ? "selected" : ""}`} onClick={() => {setActiveEntity(entity.key); setSearch("")}}>
                <span className="nav-dot"/> <span>{entity.label}</span><span className="nav-count">{(data[entity.key] ?? []).filter((row) => !entity.tenantScoped || rowTenantId(entity.key, row, data) === session.tenant.id).length}</span>
              </button>
            ))}
          </div>
        ))}
        <div className="sidebar-footer">
          <button className="avatar profile-button" onClick={handleSignOut} aria-label="Sign out">{session.user.email.slice(0, 2).toUpperCase()}</button>
          <span className="profile-copy"><strong>{session.user.email}</strong><small>{session.user.role} · {session.tenant.name}</small></span>
          <button className="profile-menu" onClick={handleSignOut} aria-label="Sign out">↗</button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><b>/</b><strong>{pageTitle}</strong></div>
          <div className="top-actions">
            <label className="tenant-select">
              <span className="tenant-dot"/>
              <select aria-label="Workspace" value={session.tenant.id} disabled>
                <option value={session.tenant.id}>{session.tenant.name}</option>
              </select>
              <span className="chevron">⌄</span>
            </label>
            <span className={`api-pill ${isPreview ? "preview-pill" : ""}`}><i/> {isPreview ? "SYNTHETIC PREVIEW" : "LIVE API"}</span>
            <button className="icon-button notification" aria-label="Notifications">♧</button>
            <span className="avatar top-avatar">{session.user.email.slice(0, 2).toUpperCase()}</span>
          </div>
        </header>

        <div className="page-wrap">
          {activeEntity === "overview" ? (
            <section className="overview-page">
              <div className="page-heading">
                <div>
                  <div className="eyebrow">CONTROL PLANE / OVERVIEW</div>
                  <h1>Welcome, {session.user.email.split("@")[0]} <span className="wave">✳</span></h1>
                  <p>{isPreview ? "Synthetic sample workspace for" : "Live data for"} {display(tenant?.name ?? session.tenant.name)}.</p>
                </div>
                <button className="button primary" onClick={() => setModal({entity: entities[0], record: null})}><Icon name="Plus"/> Create tenant</button>
              </div>

              <div className={`api-banner ${isPreview ? "preview-banner" : ""}`}>
                <span className="banner-icon">{isPreview ? "◈" : "↗"}</span>
                <div><strong>{isPreview ? "Interactive preview · synthetic data" : "Cloud API connection"}</strong><p>{isPreview ? "Sample records are held in memory only. No API requests or persistent writes are made." : isDataLoading ? "Loading workspace resources…" : Object.keys(resourceErrors).length ? `${Object.keys(resourceErrors).length} resource endpoints are unavailable.` : "Workspace data loaded from the Cloud API."}</p></div>
                <button onClick={exportData}>Export data <Icon name="Export"/></button>
              </div>

              <div className="metric-grid">
                <Metric label="Total users" value={tenantUsers.length} detail={`${activeUserCount} active members`} icon="♙" color="violet"/>
                <Metric label="Agent runs" value={tenantRuns.length} detail={`${tenantRuns.filter((row) => row.status === "SUCCEEDED").length} completed successfully`} icon="✳" color="blue"/>
                <Metric label="Knowledge sources" value={tenantDocs.length} detail={`${tenantDocs.filter((row) => row.status === "READY").length} ready to search`} icon="▤" color="amber"/>
                <Metric label="Pending approvals" value={pendingCalls.length} detail="Tool calls waiting for review" icon="◷" color="rose"/>
              </div>

              <div className="overview-grid">
                <section className="panel activity-panel">
                  <div className="panel-heading"><div><h2>Recent activity</h2><p>Latest events across your workspace</p></div><button className="text-button" onClick={() => setActiveEntity("auditLogs")}>View audit log <span>→</span></button></div>
                  <div className="activity-list">
                    {auditEvents.length ? auditEvents.map((event) => (
                      <div className="activity-row" key={String(event.id)}>
                        <span className={`activity-icon ${String(event.action).includes("failed") ? "rose" : String(event.action).includes("approval") ? "amber" : "blue"}`}>{String(event.action).includes("failed") ? "!" : String(event.action).includes("approval") ? "◷" : "↗"}</span>
                        <div className="activity-copy"><strong>{String(event.action).replaceAll(".", " ")}</strong><span>{String(event.entityType ?? "Workspace")} · {display(event.entityId)}</span></div>
                        <time>{prettyDate(event.createdAt)}</time>
                      </div>
                    )) : <EmptyState title="No activity yet" copy="Events will appear here as your workspace is used."/>}
                  </div>
                </section>
                <section className="panel system-panel">
                  <div className="panel-heading"><div><h2>System status</h2><p>Latest health by service</p></div><span className="status-live"><i/> Unverified</span></div>
                  <div className="status-list">
                    <StatusRow label="API gateway" status={isPreview ? "Sample" : "Unknown"} detail={isPreview ? "Synthetic health status · not connected" : "Health API is not connected"}/>
                    <StatusRow label="Agent runtime" status={isPreview ? "Operational" : "Unknown"} detail={`${tenantRuns.filter((row) => row.status === "RUNNING").length} active runs in sample data`}/>
                    <StatusRow label="Document pipeline" status={isPreview ? "Operational" : "Unknown"} detail={`${tenantDocs.filter((row) => row.status === "PROCESSING").length} processing`}/>
                    <StatusRow label="Edge connectors" status={isPreview ? "Operational" : "Unknown"} detail={`${(data.connectors ?? []).length} registered in sample data`}/>
                  </div>
                  <div className="system-footer"><span>Last checked just now</span><button className="text-button" onClick={() => setActiveEntity("connectors")}>View connectors →</button></div>
                </section>
              </div>

              {isPreview && pendingCalls.length > 0 && (
                <section className="panel approval-panel">
                  <div className="panel-heading"><div><h2>Tool approval queue</h2><p>Review the sample requests; actions only update this in-memory preview.</p></div><Badge value={`${pendingCalls.length} PENDING`}/></div>
                  <div className="approval-list">
                    {pendingCalls.map((call) => {
                      const tool = (data.tools ?? []).find((item) => item.id === call.toolId)
                      return (
                        <div className="approval-row" key={String(call.id)}>
                          <span className="metric-icon amber">◷</span>
                          <div className="approval-copy"><strong>{display(tool?.name ?? call.toolId)}</strong><small>{display(call.input)} · requested {prettyDate(call.createdAt)}</small></div>
                          <button className="button secondary compact" onClick={() => setPreviewApproval(call, "DENIED")}>Deny sample</button>
                          <button className="button primary compact" onClick={() => setPreviewApproval(call, "SUCCEEDED")}>Approve sample</button>
                        </div>
                      )
                    })}
                  </div>
                  <p className="preview-action-note">Approving marks this sample call complete with a simulated result. No integration or external tool is called.</p>
                </section>
              )}

              <div className="lower-grid">
                <section className="panel usage-panel">
                  <div className="panel-heading"><div><h2>Agent activity</h2><p>Runs and outcomes in this workspace</p></div><button className="text-button" onClick={() => setActiveEntity("agentRuns")}>All runs →</button></div>
                  <div className="chart-legend"><span>Successful</span><span>Failed</span><strong>{tenantRuns.length} total runs</strong></div>
                  <div className="activity-list">
                    <StatusRow label="Successful" status={isPreview ? "Sample" : "Live data"} detail={String(tenantRuns.filter((row) => row.status === "SUCCEEDED").length)}/>
                    <StatusRow label="Failed" status={isPreview ? "Sample" : "Live data"} detail={String(tenantRuns.filter((row) => row.status === "FAILED").length)}/>
                    <StatusRow label="Running" status={isPreview ? "Sample" : "Live data"} detail={String(tenantRuns.filter((row) => row.status === "RUNNING").length)}/>
                  </div>
                </section>
                <section className="panel quick-panel">
                  <div className="panel-heading"><div><h2>Quick actions</h2><p>Jump into common tasks</p></div></div>
                  <div className="quick-actions">
                    <QuickAction label="Invite a team member" detail="Manage workspace access" icon="♙" onClick={() => setActiveEntity("users")}/>
                    <QuickAction label="Connect a data source" detail="Configure integrations" icon="⌁" onClick={() => setActiveEntity("integrations")}/>
                    <QuickAction label="Review tool approvals" detail={`${pendingCalls.length} waiting for review`} icon="◷" onClick={() => setActiveEntity("toolCalls")}/>
                    <QuickAction label="Upload knowledge" detail="Manage documents" icon="▤" onClick={() => setActiveEntity("documents")}/>
                  </div>
                </section>
              </div>

              <div className="bottom-note"><span className="note-spark">✳</span><span><strong>Built for teams that ship.</strong> Your AI operations, all in one place.</span><button onClick={() => setActiveEntity("tenants")}>Manage tenants →</button></div>
            </section>
          ) : activeEntity === "playground" ? (
            <section className="records-page">
              <div className="page-heading">
                <div><div className="eyebrow">AGENT / PLAYGROUND</div><h1>Agent chat</h1><p>{isPreview ? "Explore seeded conversation flows and synthetic agent responses." : "Conversation data is loaded from the Cloud API."}</p></div>
                <span className={`api-pill ${isPreview ? "preview-pill" : ""}`}><i/> {isPreview ? "SYNTHETIC PREVIEW" : "LIVE API"}</span>
              </div>
              <div className="chat-layout">
                <aside className="panel conversation-panel">
                  <div className="conversation-heading"><div><h2>Conversations</h2><p>{chatConversations.length} conversations</p></div></div>
                  {chatConversations.map((conversation) => (
                    <button key={String(conversation.id)} className={`conversation-item ${selectedConversation?.id === conversation.id ? "active" : ""}`} onClick={() => setActiveConversationId(String(conversation.id))}>
                      <span className="conversation-avatar">✳</span><span className="conversation-copy"><strong>{display(conversation.title)}</strong><small>{prettyDate(conversation.updatedAt)}</small></span>
                    </button>
                  ))}
                  {!chatConversations.length && <EmptyState title="No conversations" copy={resourceErrors.conversations ?? "No conversation records were returned by the API."}/>}
                </aside>
                <section className="panel chat-panel">
                  <div className="chat-head"><span className="agent-avatar">✳</span><span><strong>Agent</strong><small><i/> {display(tenant?.name ?? session.tenant.name)}</small></span><button className="text-button" onClick={() => setActiveEntity("agent-config")}>Configure agent →</button></div>
                  {chatMessages.length ? (
                    <div className="chat-messages">
                      {chatMessages.map((message) => (
                        <div key={String(message.id)} className={`chat-message ${message.role === "USER" ? "user-message" : "assistant-message"}`}>
                          <span className="message-avatar">{message.role === "USER" ? session.user.email.slice(0, 2).toUpperCase() : "✳"}</span>
                          <div><small>{message.role === "USER" ? "You" : "Agent"} · {prettyDate(message.createdAt)}</small><p>{display(message.content)}</p></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="chat-empty"><span className="chat-empty-mark">✳</span><h2>No messages</h2><p>Agent chat is unavailable until the Cloud API exposes an agent-run endpoint.</p></div>
                  )}
                  {isPreview ? (
                    <form className="chat-composer" onSubmit={submitPreviewChat}>
                      <textarea aria-label="Preview message" placeholder="Try “Track order NS-48291” or ask about refunds…" rows={2} value={previewChatInput} onChange={(event) => setPreviewChatInput(event.target.value)}/>
                      <div><span>Sample response only · no API calls</span><button className="button primary" type="submit" disabled={!previewChatInput.trim()}>Send <span>↑</span></button></div>
                    </form>
                  ) : (
                    <div className="chat-composer"><textarea placeholder="Chat API endpoint not available" rows={2} disabled/><div><span>Cloud agent endpoint required</span><button className="button primary" type="button" disabled>Send <span>↑</span></button></div></div>
                  )}
                </section>
              </div>
              <div className="model-info"><span className="info-mark">i</span><span>{isPreview ? "Preview chat responses are deterministic samples; no model or integrations are called." : "The Cloud API currently does not expose an agent-run endpoint."}</span></div>
            </section>
          ) : activeEntity === "agent-config" ? (
            <section className="records-page">
              <div className="page-heading">
                <div><div className="eyebrow">AGENT / CONFIGURATION</div><h1>Agent builder</h1><p>The Prisma schema does not currently define an agent configuration model.</p></div>
                <span className={`api-pill ${isPreview ? "preview-pill" : ""}`}><i/> {isPreview ? "SAMPLE PROFILE" : "API REQUIRED"}</span>
              </div>
              <div className="agent-builder-grid">
                <section className="panel builder-panel">
                  <div className="panel-heading"><div><h2>{isPreview ? "Sample agent profile" : "Agent settings"}</h2><p>{isPreview ? "Illustrative UI only; agent configuration is not a Prisma model and is not saved." : "Values are kept in this tab only; the Prisma schema has no Agent model yet."}</p></div></div>
                  {isPreview ? (
                    <div className="sample-profile">
                      <div><span>DISPLAY NAME</span><strong>Northstar Operations Assistant</strong></div>
                      <div><span>MODEL PROFILE</span><strong>Fast responses · tool-aware</strong></div>
                      <div><span>KNOWLEDGE</span><strong>{tenantDocs.filter((document) => document.status === "READY").length} ready sources · retrieval enabled</strong></div>
                      <div><span>AVAILABLE TOOLS</span><strong>{(data.tools ?? []).filter((tool) => tool.isEnabled).length} enabled · approval-gated writes</strong></div>
                      <p>This sample profile demonstrates the control surface. The Cloud API and current Prisma schema do not expose these settings.</p>
                    </div>
                  ) : <EmptyState title="No agent configuration endpoint" copy="The Prisma schema and Cloud API do not currently expose agent configuration. No local draft is stored."/>}
                </section>
                <aside className="panel builder-side">
                  <div className="panel-heading"><div><h2>Not configured</h2><p>Waiting for an API resource.</p></div></div>
                  <p className="builder-empty">No agent configuration has been returned by the Cloud API.</p>
                </aside>
              </div>
            </section>
          ) : active ? (
            <section className="records-page">
              <div className="page-heading">
                <div><div className="eyebrow">{active.group.toUpperCase()} / DATA MANAGEMENT</div><h1>{active.label}</h1><p>{active.description}</p></div>
                <button className="button primary" onClick={() => setModal({entity: active, record: null})}><Icon name="Plus"/> Add {active.singular.toLowerCase()}</button>
              </div>
              <div className="records-toolbar">
                <label className="search-box"><Icon name="Search"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${active.label.toLowerCase()}…`}/><kbd>⌘ K</kbd></label>
                <div className="toolbar-right"><span className="result-count">{visibleRows.length} records</span><button className="button secondary compact" onClick={exportData}><Icon name="Export"/> Export</button></div>
              </div>
              <section className="panel table-panel">
                <div className="table-scroll">
                  <table>
                    <thead><tr>{active.columns.map((key) => <th key={key}>{active.fields.find((field) => field.key === key)?.label ?? key}</th>)}<th className="action-heading"><span className="sr-only">Actions</span></th></tr></thead>
                    <tbody>
                      {visibleRows.map((row) => (
                        <tr key={String(row.id)}>
                          {active.columns.map((key) => {
                            const value = row[key]
                            const isState = ["status","role","risk","isActive","isEnabled","allowed","revokedAt"].includes(key)
                            return <td key={key}>{isState ? <Badge value={key === "revokedAt" ? value ? "REVOKED" : "ACTIVE" : value}/> : <span className={key === active.columns[0] ? "cell-primary" : ""} title={display(value)}>{key.toLowerCase().includes("at") ? prettyDate(value) : display(value)}</span>}</td>
                          })}
                          <td className="row-actions">{active.key !== "auditLogs" && <><button className="icon-button row-edit" aria-label={`Edit ${active.singular}`} onClick={() => setModal({entity: active, record: row})}>↗</button><button className="icon-button row-delete" aria-label={`Delete ${active.singular}`} onClick={() => deleteRecord(active, row)}>×</button></>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!visibleRows.length && <EmptyState title={resourceErrors[active.key] ? "Could not load records" : search ? "No matching records" : `No ${active.label.toLowerCase()} yet`} copy={resourceErrors[active.key] ?? (search ? "Try changing your search." : "No records were returned by the Cloud API.")}/>}
                </div>
                <div className="table-footer"><span>Showing <strong>{visibleRows.length}</strong> of <strong>{(data[active.key] ?? []).filter((row) => selectedTenant === "all" || !active.tenantScoped || rowTenantId(active.key, row, data) === selectedTenant).length}</strong> records</span><div><button disabled>← Previous</button><span className="page-number">1</span><button disabled>Next →</button></div></div>
              </section>
              <div className="model-info"><span className="info-mark">i</span><span>{isPreview ? "Synthetic sample records are editable in memory only and reset when you leave the preview." : active.key === "auditLogs" ? "Audit records are append-only; existing entries cannot be edited or deleted." : `Data is read from the Cloud API resource for ${active.singular}.`}</span><button onClick={() => setActiveEntity("overview")}>Back to overview</button></div>
            </section>
          ) : null}
          <footer className="page-footer"><span>ForgeOps Control Plane</span><div><span><i className={`footer-dot ${isPreview ? "preview-footer-dot" : ""}`}/> {isPreview ? "Synthetic preview · memory only" : "Connected to Cloud API"}</span><span>v0.1.0</span></div></footer>
        </div>
      </main>
      {modal && <Modal entity={modal.entity} record={modal.record} selectedTenant={selectedTenant} onClose={() => setModal(null)} onSave={saveRecord}/>}
      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </div>
  )
}

function Metric({label, value, detail, icon, color}: {label:string;value:number;detail:string;icon:string;color:string}) {
  return <article className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon ${color}`}>{icon}</span></div><div className="metric-value">{value.toLocaleString()}</div><div className="metric-bottom"><span>{detail}</span></div></article>
}

function StatusRow({label,status,detail}: {label:string;status:string;detail:string}) {
  return <div className="status-row"><span className={`status-indicator ${status === "Operational" ? "good" : "warn"}`}/><span className="status-copy"><strong>{label}</strong><small>{detail}</small></span><Badge value={status}/></div>
}

function QuickAction({label,detail,icon,onClick}: {label:string;detail:string;icon:string;onClick:()=>void}) {
  return <button className="quick-action" onClick={onClick}><span className="quick-icon">{icon}</span><span><strong>{label}</strong><small>{detail}</small></span><span className="quick-arrow">↗</span></button>
}

function EmptyState({title,copy}: {title:string;copy:string}) {
  return <div className="empty-state"><span>⌕</span><strong>{title}</strong><p>{copy}</p></div>
}
