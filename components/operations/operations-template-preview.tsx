"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { operationsSectorTemplates } from "@/lib/area-configs"

const STORAGE_KEY = "cos:operations-template-preview"

type OperationsTemplatePreviewContextValue = {
  effectiveSegment: string | null | undefined
  isDevelopment: boolean
}

const OperationsTemplatePreviewContext = createContext<OperationsTemplatePreviewContextValue>({
  effectiveSegment: undefined,
  isDevelopment: false,
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
  const isDevelopment = process.env.NODE_ENV === "development"
  const [previewSegment, setPreviewSegment] = useState<string | null>(null)

  useEffect(() => {
    if (!isDevelopment || typeof window === "undefined") {
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
  }, [isDevelopment])

  useEffect(() => {
    if (!isDevelopment || typeof window === "undefined") {
      return
    }

    if (previewSegment) {
      window.sessionStorage.setItem(STORAGE_KEY, previewSegment)
      return
    }

    window.sessionStorage.removeItem(STORAGE_KEY)
  }, [isDevelopment, previewSegment])

  const value = useMemo<OperationsTemplatePreviewContextValue>(
    () => ({
      effectiveSegment: previewSegment || realSegment,
      isDevelopment,
    }),
    [isDevelopment, previewSegment, realSegment],
  )

  return (
    <OperationsTemplatePreviewContext.Provider value={value}>
      {children}
      {isDevelopment ? (
        <OperationsTemplatePreviewSelector
          realSegment={realSegment}
          previewSegment={previewSegment}
          onChange={setPreviewSegment}
        />
      ) : null}
    </OperationsTemplatePreviewContext.Provider>
  )
}

function OperationsTemplatePreviewSelector({
  realSegment,
  previewSegment,
  onChange,
}: {
  realSegment?: string | null
  previewSegment: string | null
  onChange: (value: string | null) => void
}) {
  const options = useMemo(() => Object.entries(operationsSectorTemplates), [])
  const realTemplate = operationsSectorTemplates[realSegment || ""] ?? operationsSectorTemplates.default

  return (
    <div className="fixed bottom-20 right-4 z-[90] w-[min(260px,calc(100vw-2rem))] rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Preview de template</p>
      <p className="mt-1 text-xs text-gray-500">Somente em desenvolvimento. Recarregar volta para o workspace real.</p>
      <select
        value={previewSegment ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        className="mt-3 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#0a0a0a] focus:border-gray-300 focus:outline-none"
      >
        <option value="">Workspace real ({realTemplate.label})</option>
        {options.map(([key, template]) => (
          <option key={key} value={key}>
            {template.label}
          </option>
        ))}
      </select>
    </div>
  )
}
