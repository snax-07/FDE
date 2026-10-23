import {ApiError} from "@/src/lib/api/errors"
import {apiBaseUrl} from "@/src/lib/config/env"
import {getStoredSession} from "@/src/lib/auth/session"

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  authenticated?: boolean
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const session = typeof window === "undefined" ? null : getStoredSession()
  const response = await fetch(`${apiBaseUrl}/api/v1${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.authenticated && session ? {Authorization: `Bearer ${session.accessToken}`} : {}),
    },
    ...(options.body === undefined ? {} : {body: JSON.stringify(options.body)}),
  })
  const responseText = await response.text()
  let result: unknown = null
  if (responseText) {
    try {
      result = JSON.parse(responseText) as unknown
    } catch {
      if (response.ok) throw new ApiError("The API returned an invalid JSON response.", 502)
      result = {message: responseText}
    }
  }

  if (!response.ok) {
    const message = typeof result === "object" && result !== null && "message" in result && typeof result.message === "string"
      ? result.message
      : `Request failed with status ${response.status}`
    throw new ApiError(message, response.status)
  }

  return result as T
}