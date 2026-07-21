"use client"

import Link from "next/link"
import { useState } from "react"
import { Plus, X } from "lucide-react"
import { PortalHeader, PortalPageHeader } from "@/components/portal/portal-header"
import { studioSections } from "@/lib/studio-config"

export function StudioHome() {
  const [openSelector, setOpenSelector] = useState(false)

  return (
    <div className="flex-1 flex flex-col h-full">
      <PortalHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8 flex items-start justify-between gap-4">
            <PortalPageHeader
              title="Studio"
              description="Crie campanhas, imagens, videos e conteudos por conversa."
            />
            <button
              onClick={() => setOpenSelector(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0a0a0a] px-4 py-2.5 text-sm text-white transition-colors hover:bg-gray-800"
            >
              <Plus className="h-4 w-4" />
              Nova criacao
            </button>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6">
            <div className="mb-6">
              <p className="text-sm font-medium text-[#0a0a0a]">Studio criativo</p>
              <p className="mt-1 text-sm text-gray-500">
                Escolha a frente que deseja preparar e gere materiais reais com IA sem sair do Portal.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {studioSections.map((card) => (
                <Link
                  key={card.key}
                  href={card.href}
                  className="rounded-2xl border border-gray-100 bg-gray-50/60 p-5 transition-colors hover:bg-gray-100/70"
                >
                  <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <card.icon className="h-5 w-5 text-[#0a0a0a]" />
                  </span>
                  <p className="text-base font-semibold text-[#0a0a0a]">{card.title}</p>
                  <p className="mt-2 text-sm text-gray-500">{card.description}</p>
                  <span className="mt-5 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-gray-100">
                    Abrir
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {openSelector ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4" onClick={() => setOpenSelector(false)}>
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-xl rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-[#0a0a0a]">Nova criacao</p>
                <p className="mt-1 text-sm text-gray-500">Escolha a sessao que deseja abrir no Studio.</p>
              </div>
              <button onClick={() => setOpenSelector(false)} className="rounded-full p-2 text-gray-500 hover:bg-gray-100" aria-label="Fechar seletor">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {studioSections.map((section) => (
                <Link
                  key={section.key}
                  href={section.href}
                  onClick={() => setOpenSelector(false)}
                  className="rounded-2xl border border-gray-100 bg-gray-50 p-4 transition-colors hover:bg-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm">
                      <section.icon className="h-4 w-4 text-[#0a0a0a]" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#0a0a0a]">{section.title}</p>
                      <p className="mt-1 text-xs text-gray-500">{section.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
