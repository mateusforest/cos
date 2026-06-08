"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  X,
  UserPlus,
  FileText,
  Briefcase,
  Video,
  CheckSquare,
  BarChart3,
  Smartphone,
  Monitor,
  Upload,
  Trash2,
  SlidersHorizontal,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { createClientAction } from "@/actions/clients"

type QuickActionType = "cliente" | "documento" | "operacao" | "reuniao" | "tarefa" | "relatorio"
type PortalModal = "quickActions" | "quickActionForm" | "install" | "meeting" | "delete" | "filters" | null
type FilterKey = "periodo" | "tipo" | "status" | "responsavel" | "area"

type QuickActionConfig = {
  title: string
  description: string
  fields: Array<{ name: string; label: string; placeholder: string }>
  submit: string
}

type PortalInteractionsContextValue = {
  openQuickActions: () => void
  openQuickActionForm: (type: QuickActionType) => void
  openInstall: () => void
  openMeeting: () => void
  openDeleteConfirm: () => void
  openFilters: () => void
  closeModal: () => void
}

const PortalInteractionsContext = createContext<PortalInteractionsContextValue | null>(null)

const quickActionItems: Array<{
  type: QuickActionType
  label: string
  icon: typeof UserPlus
  color: string
  bg: string
}> = [
  { type: "cliente", label: "Cliente", icon: UserPlus, color: "#3b82f6", bg: "#dbeafe" },
  { type: "documento", label: "Documento", icon: FileText, color: "#6366f1", bg: "#e0e7ff" },
  { type: "operacao", label: "Operação", icon: Briefcase, color: "#8b5cf6", bg: "#ede9fe" },
  { type: "reuniao", label: "Reunião", icon: Video, color: "#ef4444", bg: "#fee2e2" },
  { type: "tarefa", label: "Tarefa", icon: CheckSquare, color: "#22c55e", bg: "#dcfce7" },
  { type: "relatorio", label: "Relatório", icon: BarChart3, color: "#f97316", bg: "#ffedd5" },
]

const quickActionConfigs: Record<QuickActionType, QuickActionConfig> = {
  cliente: {
    title: "Novo cliente",
    description: "Prepare o cadastro do próximo cliente do portal.",
    submit: "Salvar cliente",
    fields: [
      { name: "nome", label: "Nome", placeholder: "Nome do cliente" },
      { name: "email", label: "E-mail", placeholder: "E-mail de contato" },
      { name: "telefone", label: "Telefone", placeholder: "Telefone" },
    ],
  },
  documento: {
    title: "Novo documento",
    description: "Organize um novo documento para a operação.",
    submit: "Salvar documento",
    fields: [
      { name: "titulo", label: "Título", placeholder: "Título do documento" },
      { name: "tipo", label: "Tipo", placeholder: "Proposta, contrato ou termo" },
      { name: "descricao", label: "Descrição", placeholder: "Resumo do documento" },
    ],
  },
  operacao: {
    title: "Nova operação",
    description: "Estruture uma nova operação sem depender do backend ainda.",
    submit: "Salvar operação",
    fields: [
      { name: "titulo", label: "Título", placeholder: "Nome da operação" },
      { name: "responsavel", label: "Responsável", placeholder: "Responsável" },
      { name: "status", label: "Status", placeholder: "Aberto, em andamento ou concluído" },
    ],
  },
  reuniao: {
    title: "Nova reunião",
    description: "Prepare uma nova reunião no portal.",
    submit: "Salvar reunião",
    fields: [
      { name: "titulo", label: "Título", placeholder: "Título da reunião" },
      { name: "participantes", label: "Participantes", placeholder: "Participantes" },
      { name: "observacoes", label: "Observações", placeholder: "Observações" },
    ],
  },
  tarefa: {
    title: "Nova tarefa",
    description: "Crie uma tarefa operacional no portal.",
    submit: "Salvar tarefa",
    fields: [
      { name: "titulo", label: "Título", placeholder: "Título da tarefa" },
      { name: "prazo", label: "Prazo", placeholder: "Prazo" },
      { name: "responsavel", label: "Responsável", placeholder: "Responsável" },
    ],
  },
  relatorio: {
    title: "Novo relatório",
    description: "Prepare a estrutura de um relatório futuro.",
    submit: "Salvar relatório",
    fields: [
      { name: "titulo", label: "Título", placeholder: "Título do relatório" },
      { name: "periodo", label: "Período", placeholder: "Período" },
      { name: "objetivo", label: "Objetivo", placeholder: "Objetivo do relatório" },
    ],
  },
}

const defaultFilters: Record<FilterKey, string> = {
  periodo: "Este mês",
  tipo: "Operações",
  status: "Todos",
  responsavel: "",
  area: "",
}

const filterOptions: Record<Exclude<FilterKey, "responsavel" | "area">, string[]> = {
  periodo: ["Hoje", "Esta semana", "Este mês", "Personalizado"],
  tipo: ["Clientes", "Operações", "Financeiro", "Equipe", "Documentos", "Reuniões", "Suporte"],
  status: ["Todos", "Aberto", "Em andamento", "Concluído", "Em preparação"],
}

export function usePortalInteractions() {
  const ctx = useContext(PortalInteractionsContext)
  if (!ctx) {
    throw new Error("usePortalInteractions deve ser usado dentro de PortalInteractionsProvider")
  }
  return ctx
}

export function PortalInteractionsProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<PortalModal>(null)
  const [selectedAction, setSelectedAction] = useState<QuickActionType>("cliente")
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [meetingValues, setMeetingValues] = useState({
    titulo: "",
    participantes: "",
    observacoes: "",
  })
  const [filters, setFilters] = useState<Record<FilterKey, string>>(defaultFilters)

  const closeModal = () => setModal(null)

  const value = useMemo<PortalInteractionsContextValue>(
    () => ({
      openQuickActions: () => setModal("quickActions"),
      openQuickActionForm: (type) => {
        setSelectedAction(type)
        setFormValues({})
        setModal("quickActionForm")
      },
      openInstall: () => setModal("install"),
      openMeeting: () => setModal("meeting"),
      openDeleteConfirm: () => setModal("delete"),
      openFilters: () => setModal("filters"),
      closeModal,
    }),
    [],
  )

  const submitQuickAction = async () => {
    if (selectedAction === "cliente") {
      const result = await createClientAction({
        name: formValues.nome ?? "",
        email: formValues.email ?? "",
        phone: formValues.telefone ?? "",
        company: "",
        notes: "",
        status: "active",
      })

      if (result.error) {
        toast({
          title: "Não foi possível salvar",
          description: result.error,
        })
        return
      }

      toast({
        title: "Cliente criado",
        description: "O cliente foi salvo com sucesso.",
      })
      setFormValues({})
      closeModal()
      return
    }

    toast({
      title: `${quickActionConfigs[selectedAction].title} preparado`,
      description: "O cadastro será concluído quando o backend estiver conectado.",
    })
    setFormValues({})
    closeModal()
  }

  const submitMeetingAction = (mode: "record" | "upload") => {
    toast({
      title: mode === "record" ? "Gravação preparada" : "Upload preparado",
      description: "COS Meet será conectado ao backend futuramente.",
    })
    setMeetingValues({ titulo: "", participantes: "", observacoes: "" })
    closeModal()
  }

  const confirmDelete = () => {
    toast({
      title: "Remoção pendente",
      description: "A exclusão será concluída quando o backend estiver conectado.",
    })
    closeModal()
  }

  const clearFilters = () => {
    setFilters(defaultFilters)
  }

  const applyFilters = () => {
    toast({
      title: "Filtros atualizados",
      description: "Filtros aplicados localmente. A busca real será conectada ao backend.",
    })
    closeModal()
  }

  return (
    <PortalInteractionsContext.Provider value={value}>
      {children}

      <AnimatePresence>
        {modal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70]"
              onClick={closeModal}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              className="fixed bottom-0 left-0 right-0 z-[80] bg-white rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto lg:inset-0 lg:m-auto lg:h-fit lg:max-h-[80vh] lg:max-w-md lg:rounded-3xl"
            >
              {modal === "quickActions" && (
                <ModalShell title="Ações rápidas" onClose={closeModal}>
                  <div className="grid grid-cols-2 gap-3">
                    {quickActionItems.map((item) => (
                      <button
                        key={item.type}
                        onClick={() => value.openQuickActionForm(item.type)}
                        className="rounded-2xl border border-gray-100 p-4 text-left hover:bg-gray-50 transition-colors"
                      >
                        <span className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3" style={{ backgroundColor: item.bg }}>
                          <item.icon className="w-5 h-5" style={{ color: item.color }} />
                        </span>
                        <span className="block text-sm font-medium text-[#0a0a0a]">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </ModalShell>
              )}

              {modal === "quickActionForm" && (
                <ModalShell title={quickActionConfigs[selectedAction].title} onClose={closeModal}>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">{quickActionConfigs[selectedAction].description}</p>
                    {quickActionConfigs[selectedAction].fields.map((field) => (
                      <Field key={field.name} label={field.label}>
                        <input
                          type="text"
                          value={formValues[field.name] ?? ""}
                          onChange={(e) => setFormValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                          placeholder={field.placeholder}
                          className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:border-gray-300"
                        />
                      </Field>
                    ))}
                    <button
                      type="button"
                      onClick={submitQuickAction}
                      className="w-full rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white hover:bg-[#1a1a1a] transition-colors"
                    >
                      {quickActionConfigs[selectedAction].submit}
                    </button>
                  </div>
                </ModalShell>
              )}

              {modal === "filters" && (
                <ModalShell title="Filtros" onClose={closeModal}>
                  <div className="space-y-4">
                    <Field label="Período">
                      <select
                        value={filters.periodo}
                        onChange={(e) => setFilters((prev) => ({ ...prev, periodo: e.target.value }))}
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:border-gray-300"
                      >
                        {filterOptions.periodo.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Tipo">
                      <select
                        value={filters.tipo}
                        onChange={(e) => setFilters((prev) => ({ ...prev, tipo: e.target.value }))}
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:border-gray-300"
                      >
                        {filterOptions.tipo.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Status">
                      <select
                        value={filters.status}
                        onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:border-gray-300"
                      >
                        {filterOptions.status.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Responsável">
                      <input
                        type="text"
                        value={filters.responsavel}
                        onChange={(e) => setFilters((prev) => ({ ...prev, responsavel: e.target.value }))}
                        placeholder="Responsável"
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:border-gray-300"
                      />
                    </Field>
                    <Field label="Área">
                      <input
                        type="text"
                        value={filters.area}
                        onChange={(e) => setFilters((prev) => ({ ...prev, area: e.target.value }))}
                        placeholder="Área"
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:border-gray-300"
                      />
                    </Field>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                      >
                        Limpar filtros
                      </button>
                      <button
                        type="button"
                        onClick={applyFilters}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white hover:bg-[#1a1a1a] transition-colors"
                      >
                        <SlidersHorizontal className="w-4 h-4" />
                        Aplicar filtros
                      </button>
                    </div>
                  </div>
                </ModalShell>
              )}

              {modal === "install" && (
                <ModalShell title="Instalar COS" onClose={closeModal}>
                  <div className="space-y-4">
                    <InstallCard
                      icon={Smartphone}
                      title="iPhone"
                      steps={[
                        "Abra o COS no Safari.",
                        "Toque em compartilhar.",
                        "Escolha Adicionar à Tela de Início.",
                      ]}
                    />
                    <InstallCard
                      icon={Smartphone}
                      title="Android"
                      steps={[
                        "Abra o COS no Chrome.",
                        "Toque no menu do navegador.",
                        "Escolha Instalar app ou Adicionar à tela inicial.",
                      ]}
                    />
                    <InstallCard
                      icon={Monitor}
                      title="Desktop"
                      steps={[
                        "Abra o COS no navegador compatível.",
                        "Use o ícone de instalação na barra de endereço.",
                        "Confirme para fixar o COS como app.",
                      ]}
                    />
                  </div>
                </ModalShell>
              )}

              {modal === "meeting" && (
                <ModalShell title="Gravar reunião" onClose={closeModal}>
                  <div className="space-y-4">
                    <Field label="Título">
                      <input
                        type="text"
                        value={meetingValues.titulo}
                        onChange={(e) => setMeetingValues((prev) => ({ ...prev, titulo: e.target.value }))}
                        placeholder="Título"
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:border-gray-300"
                      />
                    </Field>
                    <Field label="Participantes">
                      <input
                        type="text"
                        value={meetingValues.participantes}
                        onChange={(e) => setMeetingValues((prev) => ({ ...prev, participantes: e.target.value }))}
                        placeholder="Participantes"
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:border-gray-300"
                      />
                    </Field>
                    <Field label="Observações">
                      <textarea
                        value={meetingValues.observacoes}
                        onChange={(e) => setMeetingValues((prev) => ({ ...prev, observacoes: e.target.value }))}
                        placeholder="Observações"
                        rows={3}
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:border-gray-300 resize-none"
                      />
                    </Field>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <p className="text-sm text-gray-500">COS Meet será conectado ao backend futuramente.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <button type="button" onClick={() => submitMeetingAction("record")} className="rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white hover:bg-[#1a1a1a] transition-colors">
                        Iniciar gravação
                      </button>
                      <button type="button" onClick={() => submitMeetingAction("upload")} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors">
                        <Upload className="w-4 h-4" />
                        Upload de áudio
                      </button>
                      <button type="button" onClick={closeModal} className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                        Cancelar
                      </button>
                    </div>
                  </div>
                </ModalShell>
              )}

              {modal === "delete" && (
                <ModalShell title="Remover item" onClose={closeModal}>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">Tem certeza que deseja remover este item?</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={closeModal} className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors">
                        Cancelar
                      </button>
                      <button type="button" onClick={confirmDelete} className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white hover:bg-[#1a1a1a] transition-colors">
                        <Trash2 className="w-4 h-4" />
                        Remover
                      </button>
                    </div>
                  </div>
                </ModalShell>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </PortalInteractionsContext.Provider>
  )
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#0a0a0a]">{title}</h2>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors" aria-label="Fechar">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>
      {children}
    </>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-[#0a0a0a]">{label}</span>
      {children}
    </label>
  )
}

function InstallCard({
  icon: Icon,
  title,
  steps,
}: {
  icon: typeof Smartphone
  title: string
  steps: string[]
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-semibold text-[#0a0a0a]">{title}</span>
      </div>
      <div className="space-y-2">
        {steps.map((step) => (
          <p key={step} className="text-sm text-gray-500">
            {step}
          </p>
        ))}
      </div>
    </div>
  )
}
