"use client"

import {useState, type FormEvent} from "react"
import {ApiError} from "@/src/lib/api/errors"
import type {LoginInput, RegisterInput} from "@/src/lib/services/auth-service"

type AuthScreenProps = {
  onSignIn: (input: LoginInput) => Promise<void>
  onSignUp: (input: RegisterInput) => Promise<void>
}

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48)
}

export default function AuthScreen({onSignIn, onSignUp}: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [tenantName, setTenantName] = useState("")
  const [tenantSlug, setTenantSlug] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)
    try {
      if (mode === "register") {
        await onSignUp({tenantName: tenantName.trim(), tenantSlug: tenantSlug.trim().toLowerCase(), email: email.trim().toLowerCase(), password})
      } else {
        await onSignIn({tenantSlug: tenantSlug.trim().toLowerCase(), email: email.trim().toLowerCase(), password})
      }
    } catch (cause) {
      setError(cause instanceof ApiError || cause instanceof Error ? cause.message : "Authentication failed. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  function changeMode(nextMode: "login" | "register") {
    setMode(nextMode)
    setError("")
  }

  return (
    <main className="login-screen">
      <section className="login-card">
        <div className="login-brand"><span className="brand-mark">F</span><span className="brand-copy"><strong>ForgeOps</strong><small>CONTROL PLANE</small></span></div>
        <span className="eyebrow">{mode === "login" ? "WELCOME BACK" : "CREATE WORKSPACE"}</span>
        <h1>{mode === "login" ? "Sign in to your workspace" : "Create your workspace"}</h1>
        <p className="login-intro">
          {mode === "login"
            ? "Sign in with your tenant, email, and password."
            : "Your account will be created as the workspace owner."}
        </p>
        <form onSubmit={submit}>
          {mode === "register" && (
            <label className="form-field">
              <span>Workspace name</span>
              <input
                autoComplete="off"
                maxLength={100}
                minLength={2}
                value={tenantName}
                onChange={(event) => {
                  const value = event.target.value
                  setTenantName(value)
                  setTenantSlug(slugify(value))
                }}
                required
              />
            </label>
          )}
          <label className="form-field">
            <span>Workspace slug</span>
            <input
              autoCapitalize="none"
              autoComplete="organization"
              maxLength={48}
              minLength={2}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              placeholder="workspace-slug"
              value={tenantSlug}
              onChange={(event) => setTenantSlug(event.target.value.toLowerCase())}
              required
            />
            {mode === "register" && <small>Lowercase letters, numbers, and single hyphens.</small>}
          </label>
          <label className="form-field">
            <span>Email</span>
            <input type="email" autoComplete="username" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} required/>
          </label>
          <label className="form-field">
            <span>Password</span>
            <input
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={mode === "register" ? 12 : 1}
              maxLength={72}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            {mode === "register" && <small>Use 12 or more characters (up to 72 UTF-8 bytes).</small>}
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button primary login-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"} <span>→</span>
          </button>
        </form>
        <p className="auth-mode-switch">
          {mode === "login" ? "New to ForgeOps?" : "Already have an account?"}{" "}
          <button type="button" onClick={() => changeMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>
        <div className="login-note"><span>i</span><p>Credentials are sent to the configured Cloud API. No API key is required in the browser.</p></div>
        <div className="login-footer"><span>ForgeOps workspace</span><span>v0.1.0</span></div>
      </section>
    </main>
  )
}
