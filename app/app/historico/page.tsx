"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  SlidersHorizontal,
  Grid3X3,
  RefreshCw,
  Users,
  Briefcase,
  TrendingUp,
  DollarSign,
  UsersRound,
  FolderOpen,
  Video,
  Settings,
  X,
  Clock,
  Tag,
} from "lucide-react"
import { useAppInteractions } from "@/components/app/app-interactions"

type Activity = {
  time: string
  icon: typeof Users
  title: string
  description: string
  color: string
  bgColor: string
  category: string
  hasIndicator: boolean
}

export default function HistoricoPage() {
  const [activeFilter, setActiveFilter] = useState("todos")
  const [selected, setSelected] = useState<Activity | null>(null)
  const [query, setQuery] = useState("")
  const { openFilters } = useAppInteractions()

  const filters = [
    { id: "todos", icon: Grid3X3, label: "Todos" },
    { id: "cadastros", icon: Users, label: "Cadastros" },
    { id: "operacoes", icon: Briefcase, label: "Operações" },
    { id: "vendas", icon: TrendingUp, label: "Vendas" },
    { id: "financeiro", icon: DollarSign, label: "Financeiro" },
    { id: "equipe", icon: UsersRound, label: "Equipe" },
    { id: "documentos", icon: FolderOpen, label: "Documentos" },
    { id: "reunioes", icon: Video, label: "Reuniões" },
    { id: "sistema", icon: Settings, label: "Sistema" },
  ]

  const todayActivities: Activity[] = []
  const yesterdayActivities: Activity[] = []

  const filterByCategory = (items: Activity[]) => {
    let result = activeFilter === "todos" ? items : items.filter((a) => a.category === activeFilter)
    if (query.trim()) {
      const q = query.toLowerCase()
      result = result.filter((a) => a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q))
    }
    return result
  }

  const todayFiltered = filterByCategory(todayActivities)
  const yesterdayFiltered = filterByCategory(yesterdayActivities)

  return (
    <div className="px-4 py-4">
      <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-4">
        <h1 className="text-2xl font-bold text-[#0a0a0a] mb-0.5">Histórico</h1>
        <p className="text-sm text-gray-500">Acompanhe tudo o que aconteceu na sua operação.</p>
      </motion.div>

      <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }} className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar no histórico..."
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-300"
          />
        </div>
        <button onClick={openFilters} className="flex items-center gap-1.5 px-3 py-2.5 bg-white rounded-xl border border-gray-200">
          <SlidersHorizontal className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Filtros</span>
        </button>
      </motion.div>

      <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-4">
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full whitespace-nowrap text-sm transition-colors ${
              activeFilter === filter.id ? "bg-[#0a0a0a] text-white" : "bg-white text-gray-700 border border-gray-200"
            }`}
          >
            <filter.icon className="w-4 h-4" />
            <span className="font-medium">{filter.label}</span>
          </button>
        ))}
      </motion.div>

      {todayFiltered.length === 0 && yesterdayFiltered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">Nenhum registro ainda.</p>
        </div>
      )}

      <div className="flex items-center justify-center gap-2 w-full py-3 text-gray-400">
        <RefreshCw className="w-4 h-4" />
        <span>Nenhum histórico para carregar</span>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)} className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
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
                  <span className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: selected.bgColor }}>
                    <selected.icon className="w-5 h-5" style={{ color: selected.color }} />
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
                  <span className="text-gray-500">Categoria:</span>
                  <span className="text-[#0a0a0a] font-medium capitalize">{selected.category}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full ${selected.hasIndicator ? "bg-green-500" : "bg-gray-300"}`} />
                  <span className="text-gray-500">Status:</span>
                  <span className="text-[#0a0a0a] font-medium">{selected.hasIndicator ? "Novo" : "Registrado"}</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="w-full mt-5 py-3 bg-[#0a0a0a] text-white rounded-xl text-sm font-medium hover:bg-[#1a1a1a] transition-colors">
                Fechar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
