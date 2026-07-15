"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { operationsSectorTemplates } from "@/lib/area-configs"

const STORAGE_KEY = "cos:operations-template-preview"

type OperationsTemplatePreviewContextValue = {
  effectiveSegment: string | null | undefined
  previewSegment: string | null
  setPreviewSegment: (value: string | null) => void
  templateOptions: Array<{ key: string; label: string }>
  realTemplateLabel: string
}

const OperationsTemplatePreviewContext = createContext<OperationsTemplatePreviewContextValue>({
  effectiveSegment: undefined,
  previewSegment: null,
  setPreviewSegment: () => {},
  templateOptions: [],
  realTemplateLabel: operationsSectorTemplates.default.label,
})

export function useOperationsTemplatePreview() {
  return useContext(OperationsTemplatePreviewContext)
}

export function OperationsTemplatePreviewProvider({
  realSegment,
  children,
}: {
  realSegment?: string | null
  children: ReactNode
}) {
  const [previewSegment, setPreviewSegment] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const navigationEntries = window.performance.getEntriesByType("navigation") as PerformanceNavigationTiming[]
    const navigationType = navigationEntries[0]?.type

    if (navigationType === "reload") {
      window.sessionStorage.removeItem(STORAGE_KEY)
      setPreviewSegment(null)
      return
    }

    const storedPreview = window.sessionStorage.getItem(STORAGE_KEY)
    setPreviewSegment(storedPreview || null)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    if (previewSegment) {
      window.sessionStorage.setItem(STORAGE_KEY, previewSegment)
      return
    }

    window.sessionStorage.removeItem(STORAGE_KEY)
  }, [previewSegment])

  const value = useMemo<OperationsTemplatePreviewContextValue>(
    () => ({
      effectiveSegment: previewSegment || realSegment,
      previewSegment,
      setPreviewSegment,
      templateOptions: Object.entries(operationsSectorTemplates).map(([key, template]) => ({
        key,
        label: template.label,
      })),
      realTemplateLabel: (operationsSectorTemplates[realSegment || ""] ?? operationsSectorTemplates.default).label,
    }),
    [previewSegment, realSegment],
  )

  return <OperationsTemplatePreviewContext.Provider value={value}>{children}</OperationsTemplatePreviewContext.Provider>
}
