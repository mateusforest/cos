"use client"

import Link from "next/link"
import { ArrowLeft, Clapperboard, FileImage, Layers3, Megaphone, Sparkles } from "lucide-react"
import { PortalHeader } from "@/components/portal/portal-header"
import { getStudioSectionConfig } from "@/lib/studio-config"
import type { StudioSection } from "@/lib/studio-types"

const sectionHighlights: Record<StudioSection, string[]> = {
  criativos: [
    "Objetivo, produto ou servico, publico, plataforma, formato e tom.",
    "Area pronta para receber headline, CTA, legenda e prompt visual assim que a action oficial estiver disponivel.",
    "Historico desta sessao sera reativado quando a integracao server-side entrar na arvore versionada.",
  ],
  campanhas: [
    "Objetivo, produto ou servico, publico, canal, duracao, orcamento e tom.",
    "Estrutura reservada para conceito, slogan, copies, anuncios e calendario.",
    "A persistencia da sessao volta a funcionar assim que a action real do Studio existir no repositorio.",
  ],
  imagens: [
    "Descricao, estilo, finalidade, proporcao e texto opcional.",
    "A tela continua preparada para exibicao do resultado e download quando a action oficial for adicionada.",
    "Nenhuma chamada a OpenAI e feita enquanto o modulo server-side nao estiver disponivel.",
  ],
  videos: [
    "Descricao da cena, estilo, movimento de camera, proporcao e duracao.",
    "O acompanhamento de processamento sera reativado quando a action real de video estiver versionada.",
    "Nenhuma chamada a Luma e feita enquanto o modulo server-side nao estiver disponivel.",
  ],
}

function resolveSectionIcon(section: StudioSection) {
  if (section === "criativos") return Layers3
  if (section === "campanhas") return Megaphone
  if (section === "imagens") return FileImage
  return Clapperboard
}

export function StudioSessionPage({ section }: { section: StudioSection }) {
  const sectionConfig = getStudioSectionConfig(section)
  const SectionIcon = resolveSectionIcon(section)
  const highlights = sectionHighlights[section]

  return (
    <div className="flex-1 flex flex-col h-full">
      <PortalHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="mb-6">
            <Link
              href="/portal/marketing"
              className="mb-3 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#0a0a0a]"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para Studio
            </Link>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-[#0a0a0a]">{sectionConfig.title}</h1>
                <p className="mt-1 text-sm text-gray-500">{sectionConfig.description}</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <Sparkles className="h-4 w-4" />
                Integracao temporariamente indisponivel
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_22rem]">
            <div className="rounded-3xl border border-gray-100 bg-white p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-50">
                  <SectionIcon className="h-5 w-5 text-[#0a0a0a]" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#0a0a0a]">Sessao preparada</p>
                  <p className="text-sm text-gray-500">
                    Esta pagina continua acessivel, mas a geracao foi desativada ate a action oficial do Studio existir no projeto.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5">
                <p className="text-sm font-medium text-[#0a0a0a]">O que esta preservado nesta etapa</p>
                <ul className="mt-3 space-y-2 text-sm text-gray-600">
                  {highlights.map((item) => (
                    <li key={item} className="rounded-xl bg-white px-3 py-2">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-gray-100 bg-white p-5">
                <p className="text-sm font-semibold text-[#0a0a0a]">Historico da sessao</p>
                <p className="mt-2 text-sm text-gray-500">
                  O historico real desta sessao depende do modulo `actions/studio.ts`, que ainda nao existe na arvore versionada do projeto.
                </p>
              </div>

              <div className="rounded-3xl border border-gray-100 bg-white p-5">
                <p className="text-sm font-semibold text-[#0a0a0a]">Proxima acao</p>
                <p className="mt-2 text-sm text-gray-500">
                  Assim que a action oficial for adicionada corretamente ao repositorio, esta tela pode voltar a usar geracao, historico e resultados sem alterar a rota.
                </p>
                <Link
                  href="/portal/marketing"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-[#0a0a0a] hover:bg-gray-100"
                >
                  Voltar para a home do Studio
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
