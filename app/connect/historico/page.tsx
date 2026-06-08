"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, SlidersHorizontal, RefreshCw, X, Clock, Tag, Plug, Inbox } from "lucide-react"
import { useConnect } from "@/components/connect/connect-store"

type Activity = {
  id: string
  title: string
  description: string
  time: string
  sourceId: string
}

export default function ConnectHistoricoPage() {
  const { sources, hasSources, openModal } = useConnect()
  const connected = sources.filter((s) => s.status === "connected")

  const [activeFilter, setActiveFilter] = useState("todos")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Activity | null>(null)

  // Atividades derivadas das seções de cada fonte conectada (honesto e dinâmico).
  const activities: Activity[] = connected.flatMap((s) =>
    s.sections.map((section, i) => ({
      id: `${s.id}-${i}`,
      title: `Sincronizou ${section}`,
      description: `${s.name} • ${s.type}`,
      time: "Agora",
      sourceId: s.id,
    })),
  )

  const filters = [
    { id: "todos", label: "Tudo" },
    ...connected.map((s) => ({ id: s.id, label: s.name })),
  ]

  const filtered = activities.filter((a) => {
    const matchFilter = activeFilter === "todos" || a.sourceId === activeFilter
    const matchQuery =
      !query.trim() ||
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      a.description.toLowerCase().includes(query.toLowerCase())
    return matchFilter && matchQuery
  })

  const sourceName = (id: string) => connected.find((s) => s.id === id)?.name ?? id

  // Estado totalmente vazio: nenhuma fonte conectada.
  if (!hasSources) {
    return (
      <div className="min-h-full bg-white px-4 pt-6 pb-28">
        <h1 className="text-2xl font-semibold text-[#0a0a0a] mb-1">Histórico</h1>
        <p className="text-gray-500 mb-8">Acompanhe tudo o que o COS processou das suas fontes.</p>

        <div className="flex flex-col items-center justify-center text-center mt-20">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-5">
            <Inbox className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-[#0a0a0a] mb-2">Nada por aqui ainda</h2>
          <p className="text-gray-500 max-w-xs mb-6 leading-relaxed">
            Quando você conectar uma fonte, todo o histórico de leitura e organização do COS aparece aqui.
          </p>
          <button
            onClick={() => openModal("system")}
            className="inline-flex items-center gap-2 px-5 py-3 bg-[#0a0a0a] text-white rounded-xl text-sm font-medium hover:bg-[#1a1a1a] transition-colors"
          >
            <Plug className="w-4 h-4" />
            Conectar primeira fonte
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-white px-4 pt-6 pb-28">
      <h1 className="text-2xl font-semibold text-[#0a0a0a] mb-1">Histórico</h1>
      <p className="text-gray-500 mb-5">Tudo o que o COS leu e organizou das suas fontes.</p>

      {/* Busca */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar no histórico..."
          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-300"
        />
      </div>

      {/* Filtros dinâmicos */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-sm text-gray-400 flex-shrink-0">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filtros
        </span>
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-sm flex-shrink-0 transition-colors ${
              activeFilter === f.id
                ? "bg-[#0a0a0a] text-white"
                : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center text-center mt-16">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <Search className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500 max-w-xs">
            {query.trim() ? "Nenhum resultado para sua busca." : "Nenhuma atividade nesta fonte ainda."}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((a, index) => (
            <motion.button
              key={a.id}
              initial={{ x: -16, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.04 }}
              onClick={() => setSelected(a)}
              className="flex items-center gap-3 w-full py-3 px-2 hover:bg-gray-50 transition-colors rounded-xl text-left"
            >
              <span className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Plug className="w-4 h-4 text-blue-600" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#0a0a0a] truncate">{a.title}</p>
                <p className="text-xs text-gray-500 truncate">{a.description}</p>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">{a.time}</span>
            </motion.button>
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <button className="flex items-center justify-center gap-2 w-full mt-6 py-3 text-sm text-gray-500 hover:text-[#0a0a0a] transition-colors">
          <RefreshCw className="w-4 h-4" />
          Carregar mais
        </button>
      )}

      {/* Modal de detalhe */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center">
                    <Plug className="w-5 h-5 text-blue-600" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-[#0a0a0a]">{selected.title}</h3>
                    <p className="text-sm text-gray-500">{selected.description}</p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-full hover:bg-gray-100" aria-label="Fechar">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="space-y-2.5 border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">Horário:</span>
                  <span className="text-[#0a0a0a] font-medium">{selected.time}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">Fonte:</span>
                  <span className="text-[#0a0a0a] font-medium">{sourceName(selected.sourceId)}</span>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="w-full mt-5 py-3 bg-[#0a0a0a] text-white rounded-xl text-sm font-medium hover:bg-[#1a1a1a] transition-colors"
              >
                Fechar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
