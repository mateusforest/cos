"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  BarChart3,
  Briefcase,
  CheckSquare,
  FileText,
  Monitor,
  SlidersHorizontal,
  Smartphone,
  Trash2,
  UserPlus,
  Video,
  X,
} from "lucide-react"
import { createClientAction } from "@/actions/clients"
import { createDocumentAction } from "@/actions/documents"
import { createMeetingAction } from "@/actions/meetings"
import { createOperationAction } from "@/actions/operations"
import { useAuth } from "@/components/auth/auth-provider"
import { toast } from "@/hooks/use-toast"

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
  { type: "operacao", label: "Operacao", icon: Briefcase, color: "#8b5cf6", bg: "#ede9fe" },
  { type: "reuniao", label: "Reuniao", icon: Video, color: "#ef4444", bg: "#fee2e2" },
  { type: "tarefa", label: "Tarefa", icon: CheckSquare, color: "#22c55e", bg: "#dcfce7" },
  { type: "relatorio", label: "Relatorio", icon: BarChart3, color: "#f97316", bg: "#ffedd5" },
]

const quickActionConfigs: Record<QuickActionType, QuickActionConfig> = {
  cliente: {
    title: "Novo cliente",
    description: "Prepare o cadastro do proximo cliente do portal.",
    submit: "Salvar cliente",
    fields: [
      { name: "nome", label: "Nome", placeholder: "Nome do cliente" },
      { name: "email", label: "E-mail", placeholder: "E-mail de contato" },
      { name: "telefone", label: "Telefone", placeholder: "Telefone" },
    ],
  },
  documento: {
    title: "Novo documento",
    description: "Organize um novo documento para a operacao.",
    submit: "Salvar documento",
    fields: [
      { name: "titulo", label: "Titulo", placeholder: "Titulo do documento" },
      { name: "tipo", label: "Tipo", placeholder: "Contrato, arquivo, proposta ou relatorio" },
      { name: "descricao", label: "Conteudo", placeholder: "Resumo ou conteudo do documento" },
    ],
  },
  operacao: {
    title: "Nova operacao",
    description: "Estruture uma nova operacao com dados reais do workspace.",
    submit: "Salvar operacao",
    fields: [
      { name: "titulo", label: "Titulo", placeholder: "Nome da operacao" },
      { name: "responsavel", label: "Responsavel", placeholder: "Responsavel" },
      { name: "status", label: "Status", placeholder: "Aberta, em andamento ou concluida" },
    ],
  },
  reuniao: {
    title: "Nova reuniao",
    description: "Prepare uma nova reuniao do COS Meet.",
    submit: "Salvar reuniao",
    fields: [
      { name: "titulo", label: "Titulo", placeholder: "Titulo da reuniao" },
      { name: "participantes", label: "Participantes", placeholder: "Participantes" },
      { name: "observacoes", label: "Observacoes", placeholder: "Observacoes" },
    ],
  },
  tarefa: {
    title: "Nova tarefa",
    description: "Crie uma tarefa operacional no portal.",
    submit: "Salvar tarefa",
    fields: [
      { name: "titulo", label: "Titulo", placeholder: "Titulo da tarefa" },
      { name: "prazo", label: "Prazo", placeholder: "Prazo" },
      { name: "responsavel", label: "Responsavel", placeholder: "Responsavel" },
    ],
  },
  relatorio: {
    title: "Novo relatorio",
    description: "Prepare a estrutura de um relatorio real no portal.",
    submit: "Salvar relatorio",
    fields: [
      { name: "titulo", label: "Titulo", placeholder: "Titulo do relatorio" },
      { name: "periodo", label: "Periodo", placeholder: "Periodo" },
      { name: "objetivo", label: "Objetivo", placeholder: "Objetivo do relatorio" },
    ],
  },
}

const defaultFilters: Record<FilterKey, string> = {
  periodo: "Este mes",
  tipo: "Operacoes",
  status: "Todos",
  responsavel: "",
  area: "",
}

const filterOptions: Record<Exclude<FilterKey, "responsavel" | "area">, string[]> = {
  periodo: ["Hoje", "Esta semana", "Este mes", "Personalizado"],
  tipo: ["Clientes", "Operacoes", "Financeiro", "Equipe", "Documentos", "Reunioes", "Suporte"],
  status: ["Todos", "Aberto", "Em andamento", "Concluido", "Em preparacao"],
}

export function usePortalInteractions() {
  const ctx = useContext(PortalInteractionsContext)
  if (!ctx) {
    throw new Error("usePortalInteractions deve ser usado dentro de PortalInteractionsProvider")
  }
  return ctx
}

export function PortalInteractionsProvider({ children }: { children: ReactNode }) {
  const { workspace } = useAuth()
  const isClinicWorkspace = workspace?.metadata?.segment === "clinicas"
  const isRealEstateWorkspace = workspace?.metadata?.segment === "imobiliarias"
  const isServicesWorkspace = workspace?.metadata?.segment === "servicos"
  const [modal, setModal] = useState<PortalModal>(null)
  const [selectedAction, setSelectedAction] = useState<QuickActionType>("cliente")
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [meetingValues, setMeetingValues] = useState({
    mode: "video" as "video" | "recording",
    titulo: "",
    sala: "",
    link: "",
    participantes: "",
    observacoes: "",
    cosAcompanhar: true,
    cosGravar: false,
    cosExtrair: true,
  })
  const [filters, setFilters] = useState<Record<FilterKey, string>>(defaultFilters)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const resolvedQuickActionItems = useMemo(
    () =>
      quickActionItems.map((item) => {
        if (isClinicWorkspace) {
          if (item.type === "cliente") return { ...item, label: "Paciente" }
          if (item.type === "documento") return { ...item, label: "Documento clinico" }
          if (item.type === "operacao") return { ...item, label: "Atendimento" }
        }

        if (isRealEstateWorkspace) {
          if (item.type === "documento") return { ...item, label: "Documento imobiliario" }
          if (item.type === "operacao") return { ...item, label: "Negociacao" }
        }

        if (isServicesWorkspace) {
          if (item.type === "operacao") return { ...item, label: "Ordem de servico" }
        }

        return item
      }),
    [isClinicWorkspace, isRealEstateWorkspace, isServicesWorkspace],
  )
  const resolvedQuickActionConfigs = useMemo<Record<QuickActionType, QuickActionConfig>>(
    () => ({
      ...quickActionConfigs,
      cliente: isClinicWorkspace
        ? {
            title: "Novo paciente",
            description: "Prepare o cadastro do proximo paciente do portal.",
            submit: "Salvar paciente",
            fields: [
              { name: "nome", label: "Paciente", placeholder: "Nome do paciente" },
              { name: "email", label: "E-mail", placeholder: "E-mail de contato" },
              { name: "telefone", label: "Telefone", placeholder: "Telefone" },
              { name: "convenio", label: "Convenio", placeholder: "Nome do convenio" },
              { name: "procedimento", label: "Procedimento", placeholder: "Procedimento principal" },
              { name: "profissional", label: "Profissional", placeholder: "Profissional responsavel" },
            ],
          }
        : isRealEstateWorkspace
          ? {
              title: "Novo cliente",
              description: "Prepare um novo contato imobiliario usando a estrutura existente do portal.",
              submit: "Salvar cliente",
              fields: [
                { name: "nome", label: "Cliente", placeholder: "Nome do cliente" },
                { name: "email", label: "E-mail", placeholder: "E-mail de contato" },
                { name: "telefone", label: "Telefone", placeholder: "Telefone" },
                { name: "interesse", label: "Interesse", placeholder: "Imovel ou necessidade" },
                { name: "responsavel", label: "Responsavel", placeholder: "Corretor responsavel" },
              ],
            }
        : isServicesWorkspace
          ? {
              title: "Novo cliente",
              description: "Prepare um novo cadastro da operacao de servicos.",
              submit: "Salvar cliente",
              fields: [
                { name: "nome", label: "Cliente", placeholder: "Nome do cliente" },
                { name: "email", label: "E-mail", placeholder: "E-mail de contato" },
                { name: "telefone", label: "Telefone", placeholder: "Telefone" },
                { name: "servico", label: "Servico", placeholder: "Servico principal" },
                { name: "valor", label: "Valor", placeholder: "R$ 0,00" },
                { name: "responsavel", label: "Responsavel", placeholder: "Responsavel principal" },
              ],
            }
        : quickActionConfigs.cliente,
      documento: isClinicWorkspace
        ? {
            title: "Novo documento clinico",
            description: "Organize um novo documento clinico sem criar nova estrutura.",
            submit: "Salvar documento",
            fields: [
              { name: "titulo", label: "Titulo", placeholder: "Titulo do documento clinico" },
              { name: "tipo", label: "Tipo", placeholder: "Guia, exame ou relatorio" },
              { name: "descricao", label: "Conteudo", placeholder: "Resumo ou conteudo do documento clinico" },
            ],
          }
        : isRealEstateWorkspace
          ? {
              title: "Novo documento imobiliario",
              description: "Organize um novo documento imobiliario sem criar nova estrutura.",
              submit: "Salvar documento",
              fields: [
                { name: "titulo", label: "Titulo", placeholder: "Titulo do documento imobiliario" },
                { name: "tipo", label: "Tipo", placeholder: "Contrato, vistoria ou proposta" },
                { name: "descricao", label: "Conteudo", placeholder: "Resumo ou conteudo do documento imobiliario" },
              ],
            }
        : isServicesWorkspace
          ? quickActionConfigs.documento
        : quickActionConfigs.documento,
      operacao: isClinicWorkspace
        ? {
            title: "Novo atendimento",
            description: "Registre um atendimento usando a estrutura existente de operacoes.",
            submit: "Salvar atendimento",
            fields: [
              { name: "titulo", label: "Atendimento", placeholder: "Nome do atendimento" },
              { name: "paciente", label: "Paciente", placeholder: "Nome do paciente" },
              { name: "procedimento", label: "Procedimento", placeholder: "Procedimento realizado" },
              { name: "profissional", label: "Profissional", placeholder: "Profissional responsavel" },
            ],
          }
        : isRealEstateWorkspace
          ? {
              title: "Nova negociacao",
              description: "Registre uma negociacao usando a estrutura existente de operacoes.",
              submit: "Salvar negociacao",
              fields: [
                { name: "titulo", label: "Negociacao", placeholder: "Nome da negociacao" },
                { name: "imovel", label: "Imovel", placeholder: "Nome ou referencia do imovel" },
                { name: "finalidade", label: "Finalidade", placeholder: "Venda ou locacao" },
                { name: "valor", label: "Valor", placeholder: "R$ 0,00" },
                { name: "responsavel", label: "Responsavel", placeholder: "Corretor responsavel" },
              ],
            }
        : isServicesWorkspace
          ? {
              title: "Nova ordem de servico",
              description: "Registre uma ordem de servico usando a estrutura existente de operacoes.",
              submit: "Salvar ordem de servico",
              fields: [
                { name: "titulo", label: "Ordem de servico", placeholder: "Nome da ordem de servico" },
                { name: "servico", label: "Servico", placeholder: "Servico principal" },
                { name: "valor", label: "Valor", placeholder: "R$ 0,00" },
                { name: "responsavel", label: "Responsavel", placeholder: "Responsavel principal" },
              ],
            }
        : quickActionConfigs.operacao,
    }),
    [isClinicWorkspace, isRealEstateWorkspace, isServicesWorkspace],
  )

  const resetMeetingValues = () =>
    setMeetingValues({
      mode: "video",
      titulo: "",
      sala: "",
      link: "",
      participantes: "",
      observacoes: "",
      cosAcompanhar: true,
      cosGravar: false,
      cosExtrair: true,
    })

  const closeModal = () => {
    setModal(null)
    setIsSubmitting(false)
  }

  const value = useMemo<PortalInteractionsContextValue>(
    () => ({
      openQuickActions: () => setModal("quickActions"),
      openQuickActionForm: (type) => {
        setSelectedAction(type)
        setFormValues({})
        setModal("quickActionForm")
      },
      openInstall: () => setModal("install"),
      openMeeting: () => {
        resetMeetingValues()
        setModal("meeting")
      },
      openDeleteConfirm: () => setModal("delete"),
      openFilters: () => setModal("filters"),
      closeModal,
    }),
    [],
  )

  const buildMeetingSummary = () =>
    [
      meetingValues.participantes ? `Participantes: ${meetingValues.participantes}` : "",
      meetingValues.observacoes ?? "",
    ]
      .filter(Boolean)
      .join("\n")

  const buildMeetingNextSteps = () =>
    [
      `Fluxo COS Meet: ${meetingValues.mode === "video" ? "Reuniao por video" : "Gravacao ou audio"}`,
      meetingValues.mode === "video" && meetingValues.sala ? `Sala COS Meet: ${meetingValues.sala}` : "",
      meetingValues.mode === "video" && meetingValues.link ? `Link da reuniao: ${meetingValues.link}` : "",
      `COS acompanhar: ${meetingValues.cosAcompanhar ? "sim" : "nao"}`,
      `COS gravar: ${meetingValues.cosGravar ? "sim" : "nao"}`,
      `COS extrair pontos importantes: ${meetingValues.cosExtrair ? "sim" : "nao"}`,
    ]
      .filter(Boolean)
      .join("\n")

  const submitQuickAction = async () => {
    setIsSubmitting(true)

    if (selectedAction === "cliente") {
      const result = await createClientAction({
        name: formValues.nome ?? "",
        email: formValues.email ?? "",
        phone: formValues.telefone ?? "",
        company: isClinicWorkspace ? formValues.convenio ?? "" : "",
        notes: isClinicWorkspace
          ? [
              formValues.procedimento ? `Procedimento: ${formValues.procedimento}` : "",
              formValues.profissional ? `Profissional: ${formValues.profissional}` : "",
            ]
              .filter(Boolean)
              .join("\n")
          : isRealEstateWorkspace
            ? [
                "Perfil: Cliente",
                formValues.interesse ? `Interesse: ${formValues.interesse}` : "",
                formValues.responsavel ? `Responsavel: ${formValues.responsavel}` : "",
              ]
                .filter(Boolean)
                .join("\n")
            : isServicesWorkspace
              ? [
                  "Perfil: Cliente",
                  formValues.servico ? `Servico: ${formValues.servico}` : "",
                  formValues.valor ? `Valor: ${formValues.valor}` : "",
                  formValues.responsavel ? `Responsavel: ${formValues.responsavel}` : "",
                ]
                  .filter(Boolean)
                  .join("\n")
            : "",
        status: "active",
      })

      if (result.error) {
        setIsSubmitting(false)
        toast({ title: "Nao foi possivel salvar", description: result.error })
        return
      }

      toast({
        title: isClinicWorkspace ? "Paciente criado" : "Cliente criado",
        description: isClinicWorkspace ? "O paciente foi salvo com sucesso." : "O cliente foi salvo com sucesso.",
      })
      setIsSubmitting(false)
      setFormValues({})
      closeModal()
      return
    }

    if (selectedAction === "operacao") {
      const result = await createOperationAction({
        title: formValues.titulo ?? "",
        description: [
          isClinicWorkspace && formValues.paciente ? `Paciente: ${formValues.paciente}` : "",
          isClinicWorkspace && formValues.procedimento ? `Procedimento: ${formValues.procedimento}` : "",
          isClinicWorkspace && formValues.profissional ? `Profissional: ${formValues.profissional}` : "",
          isRealEstateWorkspace ? "Tipo: Negociacao" : "",
          isRealEstateWorkspace && formValues.imovel ? `Imovel: ${formValues.imovel}` : "",
          isRealEstateWorkspace && formValues.finalidade ? `Finalidade: ${formValues.finalidade}` : "",
          isRealEstateWorkspace && formValues.valor ? `Valor: ${formValues.valor}` : "",
          !isClinicWorkspace && !isRealEstateWorkspace && !isServicesWorkspace && formValues.responsavel ? `Responsavel: ${formValues.responsavel}` : "",
          isServicesWorkspace ? "Tipo: Ordem de servico" : "",
          isServicesWorkspace && formValues.servico ? `Servico: ${formValues.servico}` : "",
          isServicesWorkspace && formValues.valor ? `Valor: ${formValues.valor}` : "",
          isServicesWorkspace && formValues.responsavel ? `Responsavel: ${formValues.responsavel}` : "",
          !isClinicWorkspace && !isRealEstateWorkspace && !isServicesWorkspace && formValues.responsavel ? `Responsavel: ${formValues.responsavel}` : "",
          !isClinicWorkspace && !isRealEstateWorkspace && !isServicesWorkspace && formValues.status ? `Status desejado: ${formValues.status}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        status: "open",
        priority: "medium",
      })

      if (result.error) {
        setIsSubmitting(false)
        toast({ title: "Nao foi possivel salvar", description: result.error })
        return
      }

      toast({
        title: isClinicWorkspace ? "Atendimento criado" : isRealEstateWorkspace ? "Negociacao criada" : isServicesWorkspace ? "Ordem de servico criada" : "Operacao criada",
        description: isClinicWorkspace
          ? "O atendimento foi salvo com sucesso."
          : isRealEstateWorkspace
            ? "A negociacao foi salva com sucesso."
            : isServicesWorkspace
              ? "A ordem de servico foi salva com sucesso."
            : "A operacao foi salva com sucesso.",
      })
      setIsSubmitting(false)
      setFormValues({})
      closeModal()
      return
    }

    if (selectedAction === "documento") {
      const result = await createDocumentAction({
        title: formValues.titulo ?? "",
        type: formValues.tipo ?? "outro",
        content: formValues.descricao ?? "",
        status: "draft",
      })

      if (result.error) {
        setIsSubmitting(false)
        toast({ title: "Nao foi possivel salvar", description: result.error })
        return
      }

      toast({ title: "Documento criado", description: "O documento foi salvo com sucesso." })
      setIsSubmitting(false)
      setFormValues({})
      closeModal()
      return
    }

    if (selectedAction === "reuniao") {
      const result = await createMeetingAction({
        title: formValues.titulo ?? "",
        summary: [
          formValues.participantes ? `Participantes: ${formValues.participantes}` : "",
          formValues.observacoes ?? "",
        ]
          .filter(Boolean)
          .join("\n"),
        status: "draft",
      })

      if (result.error) {
        setIsSubmitting(false)
        toast({ title: "Nao foi possivel salvar", description: result.error })
        return
      }

      toast({ title: "Reuniao criada", description: "A reuniao foi salva com sucesso." })
      setIsSubmitting(false)
      setFormValues({})
      closeModal()
      return
    }

    if (selectedAction === "relatorio") {
      const result = await createDocumentAction({
        title: formValues.titulo ?? "",
        type: "relatorio",
        content: [formValues.periodo ? `Periodo: ${formValues.periodo}` : "", formValues.objetivo ?? ""].filter(Boolean).join("\n"),
        status: "draft",
      })

      if (result.error) {
        setIsSubmitting(false)
        toast({ title: "Nao foi possivel salvar", description: result.error })
        return
      }

      toast({ title: "Relatorio criado", description: "O relatorio foi salvo com sucesso." })
      setIsSubmitting(false)
      setFormValues({})
      closeModal()
      return
    }

    setIsSubmitting(false)
    toast({
      title: "Recurso em preparacao",
      description: "Este fluxo ainda nao possui persistencia real no Portal.",
    })
    setFormValues({})
    closeModal()
  }

  const submitMeetingAction = async () => {
    if (!meetingValues.titulo.trim()) {
      toast({ title: "Titulo obrigatorio", description: "Informe o titulo da reuniao." })
      return
    }

    if (meetingValues.mode === "video" && !meetingValues.sala.trim()) {
      toast({ title: "Sala obrigatoria", description: "Informe a sala da reuniao por video." })
      return
    }

    setIsSubmitting(true)

    const result = await createMeetingAction({
      title: meetingValues.titulo ?? "",
      summary: buildMeetingSummary(),
      nextSteps: buildMeetingNextSteps(),
      status: "draft",
    })

    setIsSubmitting(false)

    if (result.error) {
      toast({ title: "Nao foi possivel salvar", description: result.error })
      return
    }

    toast({
      title: meetingValues.mode === "video" ? "Reuniao por video preparada" : "Fluxo de gravacao preparado",
      description:
        meetingValues.mode === "video"
          ? "A sala, o link e as preferencias do COS foram registrados. O video ao vivo ainda nao esta integrado."
          : "A reuniao e as preferencias do COS foram registradas sem simular gravacao ou transcricao real.",
    })
    resetMeetingValues()
    closeModal()
  }

  const confirmDelete = () => {
    toast({
      title: "Remocao indisponivel",
      description: "Este atalho ainda nao remove itens reais por aqui.",
    })
    closeModal()
  }

  const clearFilters = () => {
    setFilters(defaultFilters)
  }

  const applyFilters = () => {
    toast({
      title: "Filtros atualizados",
      description: "Os filtros desta tela ainda servem apenas como apoio visual e nao executam busca real.",
    })
    closeModal()
  }

  return (
    <PortalInteractionsContext.Provider value={value}>
      {children}

      <AnimatePresence>
        {modal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm" onClick={closeModal} />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              className="fixed bottom-0 left-0 right-0 z-[80] max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 lg:inset-0 lg:m-auto lg:h-fit lg:max-h-[80vh] lg:max-w-md lg:rounded-3xl"
            >
              {modal === "quickActions" && (
                <ModalShell title="Acoes rapidas" onClose={closeModal}>
                  <div className="grid grid-cols-2 gap-3">
                    {resolvedQuickActionItems.map((item) => (
                      <button key={item.type} onClick={() => value.openQuickActionForm(item.type)} className="rounded-2xl border border-gray-100 p-4 text-left transition-colors hover:bg-gray-50">
                        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: item.bg }}>
                          <item.icon className="h-5 w-5" style={{ color: item.color }} />
                        </span>
                        <span className="block text-sm font-medium text-[#0a0a0a]">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </ModalShell>
              )}

              {modal === "quickActionForm" && (
                <ModalShell title={resolvedQuickActionConfigs[selectedAction].title} onClose={closeModal}>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">{resolvedQuickActionConfigs[selectedAction].description}</p>
                    {resolvedQuickActionConfigs[selectedAction].fields.map((field) => (
                      <Field key={field.name} label={field.label}>
                        <input
                          type="text"
                          value={formValues[field.name] ?? ""}
                          onChange={(event) => setFormValues((prev) => ({ ...prev, [field.name]: event.target.value }))}
                          placeholder={field.placeholder}
                          className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                        />
                      </Field>
                    ))}
                    <button type="button" onClick={submitQuickAction} disabled={isSubmitting} className="w-full rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50">
                      {isSubmitting ? "Salvando..." : resolvedQuickActionConfigs[selectedAction].submit}
                    </button>
                  </div>
                </ModalShell>
              )}

              {modal === "filters" && (
                <ModalShell title="Filtros" onClose={closeModal}>
                  <div className="space-y-4">
                    <Field label="Periodo">
                      <select value={filters.periodo} onChange={(event) => setFilters((prev) => ({ ...prev, periodo: event.target.value }))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none">
                        {filterOptions.periodo.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Tipo">
                      <select value={filters.tipo} onChange={(event) => setFilters((prev) => ({ ...prev, tipo: event.target.value }))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none">
                        {filterOptions.tipo.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Status">
                      <select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none">
                        {filterOptions.status.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Responsavel">
                      <input type="text" value={filters.responsavel} onChange={(event) => setFilters((prev) => ({ ...prev, responsavel: event.target.value }))} placeholder="Responsavel" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
                    </Field>
                    <Field label="Area">
                      <input type="text" value={filters.area} onChange={(event) => setFilters((prev) => ({ ...prev, area: event.target.value }))} placeholder="Area" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
                    </Field>
                    <div className="flex gap-2">
                      <button type="button" onClick={clearFilters} className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200">
                        Limpar filtros
                      </button>
                      <button type="button" onClick={applyFilters} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]">
                        <SlidersHorizontal className="h-4 w-4" />
                        Aplicar filtros
                      </button>
                    </div>
                  </div>
                </ModalShell>
              )}

              {modal === "install" && (
                <ModalShell title="Instalar COS" onClose={closeModal}>
                  <div className="space-y-4">
                    <InstallCard icon={Smartphone} title="iPhone" steps={["Abra o COS no Safari.", "Toque em compartilhar.", "Escolha Adicionar a Tela de Inicio."]} />
                    <InstallCard icon={Smartphone} title="Android" steps={["Abra o COS no Chrome.", "Toque no menu do navegador.", "Escolha Instalar app ou Adicionar a tela inicial."]} />
                    <InstallCard icon={Monitor} title="Desktop" steps={["Abra o COS no navegador compativel.", "Use o icone de instalacao na barra de endereco.", "Confirme para fixar o COS como app."]} />
                  </div>
                </ModalShell>
              )}

              {modal === "meeting" && (
                <ModalShell title="COS Meet" onClose={closeModal}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Field label="Tipo de reuniao">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setMeetingValues((prev) => ({ ...prev, mode: "video" }))}
                            className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${meetingValues.mode === "video" ? "border-[#0a0a0a] bg-[#0a0a0a] text-white" : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"}`}
                          >
                            Reuniao por video
                          </button>
                          <button
                            type="button"
                            onClick={() => setMeetingValues((prev) => ({ ...prev, mode: "recording" }))}
                            className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${meetingValues.mode === "recording" ? "border-[#0a0a0a] bg-[#0a0a0a] text-white" : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"}`}
                          >
                            Gravacao ou audio
                          </button>
                        </div>
                      </Field>
                    </div>
                    <Field label="Titulo">
                      <input type="text" value={meetingValues.titulo} onChange={(event) => setMeetingValues((prev) => ({ ...prev, titulo: event.target.value }))} placeholder="Titulo" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
                    </Field>
                    {meetingValues.mode === "video" && (
                      <>
                        <Field label="Sala da reuniao">
                          <input type="text" value={meetingValues.sala} onChange={(event) => setMeetingValues((prev) => ({ ...prev, sala: event.target.value }))} placeholder="Sala semanal comercial" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
                        </Field>
                        <Field label="Link da reuniao">
                          <input type="text" value={meetingValues.link} onChange={(event) => setMeetingValues((prev) => ({ ...prev, link: event.target.value }))} placeholder="Cole aqui o link real, se ja existir" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
                        </Field>
                      </>
                    )}
                    <Field label="Participantes">
                      <input type="text" value={meetingValues.participantes} onChange={(event) => setMeetingValues((prev) => ({ ...prev, participantes: event.target.value }))} placeholder="Participantes" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
                    </Field>
                    <Field label="Observacoes">
                      <textarea value={meetingValues.observacoes} onChange={(event) => setMeetingValues((prev) => ({ ...prev, observacoes: event.target.value }))} placeholder="Observacoes" rows={3} className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
                    </Field>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <p className="text-sm font-medium text-[#0a0a0a]">Antes de iniciar, o COS deve:</p>
                      <div className="mt-3 space-y-2">
                        <label className="flex items-center gap-3 text-sm text-gray-700">
                          <input type="checkbox" checked={meetingValues.cosAcompanhar} onChange={(event) => setMeetingValues((prev) => ({ ...prev, cosAcompanhar: event.target.checked }))} className="h-4 w-4 rounded border-gray-300" />
                          Acompanhar a reuniao
                        </label>
                        <label className="flex items-center gap-3 text-sm text-gray-700">
                          <input type="checkbox" checked={meetingValues.cosGravar} onChange={(event) => setMeetingValues((prev) => ({ ...prev, cosGravar: event.target.checked }))} className="h-4 w-4 rounded border-gray-300" />
                          Gravar quando a integracao existir
                        </label>
                        <label className="flex items-center gap-3 text-sm text-gray-700">
                          <input type="checkbox" checked={meetingValues.cosExtrair} onChange={(event) => setMeetingValues((prev) => ({ ...prev, cosExtrair: event.target.checked }))} className="h-4 w-4 rounded border-gray-300" />
                          Extrair pontos importantes
                        </label>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <p className="text-sm text-gray-500">
                        {meetingValues.mode === "video"
                          ? "Video ao vivo, gravacao e transcricao automatica ainda nao estao conectados. O COS vai registrar sala, link e preferencias de acompanhamento."
                          : "Gravacao, upload e transcricao automatica ainda nao estao ativos neste fluxo. O COS vai registrar a reuniao e as preferencias sem simular execucao."}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <button type="button" onClick={() => submitMeetingAction()} disabled={isSubmitting} className="rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50">
                        {isSubmitting ? "Salvando..." : meetingValues.mode === "video" ? "Preparar reuniao por video" : "Preparar fluxo de gravacao"}
                      </button>
                      <button type="button" onClick={closeModal} disabled={isSubmitting} className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
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
                      <button type="button" onClick={closeModal} className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200">
                        Cancelar
                      </button>
                      <button type="button" onClick={confirmDelete} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]">
                        <Trash2 className="h-4 w-4" />
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

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#0a0a0a]">{title}</h2>
        <button onClick={onClose} className="rounded-full p-1.5 transition-colors hover:bg-gray-100" aria-label="Fechar">
          <X className="h-5 w-5 text-gray-500" />
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

function InstallCard({ icon: Icon, title, steps }: { icon: typeof Smartphone; title: string; steps: string[] }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-gray-500" />
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
