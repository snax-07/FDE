"use client"

import {useEffect, useState, useSyncExternalStore} from "react"
import {createEmptyDashboardData, entities, getDashboardServerSnapshot, getDashboardSnapshot, subscribeToDashboardData, updateDashboardData, type DashboardDatabase} from "@/src/lib/dashboard-data"
import {listResource} from "@/src/lib/services/resource-service"

export function useDashboardData(tenantId?: string, userId?: string) {
  const data = useSyncExternalStore(subscribeToDashboardData, getDashboardSnapshot, getDashboardServerSnapshot)
  const [resourceErrors, setResourceErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [loadedSessionKey, setLoadedSessionKey] = useState<string | null>(null)
  const sessionKey = tenantId && userId ? `${tenantId}:${userId}` : null

  useEffect(() => {
    if (!tenantId || !sessionKey) return
    let active = true
    void Promise.resolve().then(async () => {
      if (!active) return
      setIsLoading(true)
      const results = await Promise.all(entities.map(async (entity) => {
        try {
          const records = await listResource(entity.key, entity.tenantScoped ? tenantId : undefined)
          return {key: entity.key, records}
        } catch (error) {
          return {
            key: entity.key,
            error: error instanceof Error ? error.message : `Could not load ${entity.label.toLowerCase()}.`,
          }
        }
      }))
      if (!active) return

      const nextData = Object.fromEntries(results.map((result) => [
        result.key,
        "records" in result ? result.records : [],
      ])) as DashboardDatabase
      const nextErrors: Record<string, string> = {}
      for (const result of results) {
        if ("error" in result && result.error) nextErrors[result.key] = result.error
      }
      updateDashboardData(() => nextData)
      setResourceErrors(nextErrors)
      setLoadedSessionKey(sessionKey)
    }).finally(() => {
      if (active) setIsLoading(false)
    })

    return () => { active = false }
  }, [tenantId, sessionKey])

  const isCurrentSessionLoaded = loadedSessionKey === sessionKey
  return {
    data: isCurrentSessionLoaded ? data : createEmptyDashboardData(),
    resourceErrors: isCurrentSessionLoaded ? resourceErrors : {},
    isLoading: Boolean(sessionKey) && (isLoading || !isCurrentSessionLoaded),
  }
}
