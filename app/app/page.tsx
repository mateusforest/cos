"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowRight,
  Briefcase,
  Check,
  CheckSquare,
  FileText,
  GripVertical,
  LifeBuoy,
  Lightbulb,
  Mic,
  Send,
  Sparkles,
  Users,
  UsersRound,
  Video,
  Wallet,
  X,
} from "lucide-react"
import { createMeetingAction } from "@/actions/meetings"
import { runOperationsEngineAction } from "@/actions/operations-engine"
import { useAppInteractions } from "@/components/app/app-interactions"
import { useOperationsDashboard } from "@/components/app/operations-dashboard-store"
import { useAuth } from "@/components/auth/auth-provider"
import type { ChatMessage } from "@/components/app/area-chat"
import { useSupport } from "@/components/support/support-context"
import { toast } from "@/hooks/use-toast"
import { getOperationsAreaSources } from "@/lib/area-configs"

type ModalType = "sugerir" | "passo" | "meet" | "editar" | null
type MicState = "idle" | "listening" | "processing" | "unsupported" | "error"

type SpeechRecognitionEventLike = {
  results: {
    length: number
    [index: number]: {
      isFinal: boolean
      length: number
      [innerIndex: number]: { transcript: string }
    }
  }
}

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onstart: null | (() => void)
  onresult: null | ((event: SpeechRecognitionEventLike) => void)
  onerror: null | ((event: { error: string }) => void)
  onend: null | (() => void)
  start: () => void
  stop: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

type MeetingFormState = {
  mode: "video" | "recording"
  title: string
  roomName: string
  meetingLink: string
  participants: string
  notes: string
  cosShouldAttend: boolean
  cosShouldRecord: boolean
  cosShouldExtract: boolean
}

type ActiveConversation = {
  area: string
  subArea?: string
  label: string
}

const suggestionTemplates = [
  { id: "cliente", icon: Users, color: "#ec4899", bg: "#fce7f3", title: "Cadastrar primeiro cliente", desc: "Comece organizando sua base de clientes." },
  { id: "financeiro", icon: Wallet, color: "#22c55e", bg: "#dcfce7", title: "Registrar primeiro lançamento", desc: "Seus ganhos e gastos aparecerão aqui depois do primeiro registro." },
  { id: "documento", icon: FileText, color: "#3b82f6", bg: "#dbeafe", title: "Criar primeiro documento", desc: "Use o COS para centralizar propostas, contratos e arquivos." },
  { id: "reuniao", icon: Video, color: "#ef4444", bg: "#fee2e2", title: "Gravar primeira reunião", desc: "Os resumos gerados ficarão disponíveis nesta área." },
]

const nextStepTemplates = [
  { id: "cliente", priority: "Alta", color: "#ef4444", title: "Cadastrar primeiro cliente", desc: "Sua operação começa quando os primeiros dados reais entrarem no COS." },
  { id: "operacao", priority: "Alta", color: "#ef4444", title: "Criar primeira operação", desc: "Estruture pedidos, projetos ou atendimentos no seu workspace." },
  { id: "financeiro", priority: "Média", color: "#f97316", title: "Registrar primeiro lançamento", desc: "Isso libera os indicadores financeiros reais." },
  { id: "equipe", priority: "Baixa", color: "#22c55e", title: "Convidar a equipe", desc: "Adicione membros quando quiser começar a colaboração." },
]

const defaultShortcuts = [
  { id: "clientes", icon: Users, value: "0", label: "Clientes", enabled: true },
  { id: "operacoes", icon: Briefcase, value: "0", label: "Operações", enabled: true },
  { id: "balanco", icon: Wallet, value: "0,00", label: "Balanço", isBalance: true, enabled: true },
  { id: "equipe", icon: UsersRound, value: "0", label: "Equipe", enabled: true },
  { id: "vendas", icon: ArrowRight, value: "0", label: "Vendas", enabled: false },
  { id: "reunioes", icon: Video, value: "0", label: "Reuniões", enabled: false },
]

const defaultMeetingForm: MeetingFormState = {
  mode: "video",
  title: "",
  roomName: "",
  meetingLink: "",
  participants: "",
  notes: "",
  cosShouldAttend: true,
  cosShouldRecord: false,
  cosShouldExtract: true,
}

function buildMeetingSummary(form: MeetingFormState) {
  return [
    form.participants ? `Participantes: ${form.participants}` : "",
    form.notes ? `Observacoes: ${form.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n")
}

function buildMeetingNextSteps(form: MeetingFormState) {
  return [
    `Fluxo COS Meet: ${form.mode === "video" ? "Reuniao por video" : "Gravacao ou audio"}`,
    form.mode === "video" && form.roomName ? `Sala COS Meet: ${form.roomName}` : "",
    form.mode === "video" && form.meetingLink ? `Link da reuniao: ${form.meetingLink}` : "",
    `COS acompanhar: ${form.cosShouldAttend ? "sim" : "nao"}`,
    `COS gravar: ${form.cosShouldRecord ? "sim" : "nao"}`,
    `COS extrair pontos importantes: ${form.cosShouldExtract ? "sim" : "nao"}`,
  ]
    .filter(Boolean)
    .join("\n")
}

const generalConversation: ActiveConversation = {
  area: "general",
  label: "Inicio",
}

function buildConversationMessageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function parseConversationArea(value?: string | null): ActiveConversation {
  if (!value || value === "general") {
    return generalConversation
  }

  const [area = "general", subArea] = value.split("/")
  const label = subArea
    ? `${area.charAt(0).toUpperCase() + area.slice(1)} / ${subArea.charAt(0).toUpperCase() + subArea.slice(1)}`
    : area.charAt(0).toUpperCase() + area.slice(1)

  return {
    area,
    subArea,
    label,
  }
}

export default function AppHomePage() {
  const router = useRouter()
  const { user, profile, workspace } = useAuth()
  const { summary, isLoading: isStatsLoading, refreshSummary } = useOperationsDashboard()
  const { openSupport } = useSupport()
  const { openTeam } = useAppInteractions()
  const [message, setMessage] = useState("")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [activeConversation, setActiveConversation] = useState<ActiveConversation>(generalConversation)
  const [balanceOpen, setBalanceOpen] = useState(false)
  const [modal, setModal] = useState<ModalType>(null)
  const [shortcutPreferences, setShortcutPreferences] = useState<Record<string, boolean> | null>(null)
  const [shortcutDraft, setShortcutDraft] = useState<Record<string, boolean> | null>(null)
  const [isShortcutsReady, setIsShortcutsReady] = useState(false)
  const [meetingForm, setMeetingForm] = useState<MeetingFormState>(defaultMeetingForm)
  const [meetingFeedback, setMeetingFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null)
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false)
  const [micState, setMicState] = useState<MicState>("idle")
  const [micPreview, setMicPreview] = useState("")
  const [isEngineRunning, setIsEngineRunning] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const finalTranscriptRef = useRef("")
  const micActionRef = useRef<"finalize" | "cancel">("finalize")
  const areaSources = useMemo(
    () => getOperationsAreaSources(workspace?.metadata?.segment),
    [workspace?.metadata?.segment],
  )
  const areaLabels = useMemo(() => {
    const findLabel = (key: string, fallback: string) => areaSources.find((area) => area.key === key)?.label || fallback

    return {
      clientes: findLabel("cadastros", "Clientes"),
      operacoes: findLabel("operacoes", "Operacoes"),
      balanco: findLabel("financeiro", "Balanco"),
      equipe: findLabel("equipe", "Equipe"),
      vendas: findLabel("vendas", "Vendas"),
      reunioes: findLabel("reunioes", "Reunioes"),
    }
  }, [areaSources])

  const shortcutsStorageKey = useMemo(
    () => (workspace?.id ? `cos:operations:shortcuts:${workspace.id}` : null),
    [workspace?.id],
  )

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  useEffect(() => {
    setIsShortcutsReady(false)

    const defaultPreferences = Object.fromEntries(defaultShortcuts.map((shortcut) => [shortcut.id, shortcut.enabled]))

    if (!shortcutsStorageKey || typeof window === "undefined") {
      setShortcutPreferences(defaultPreferences)
      setIsShortcutsReady(true)
      return
    }

    try {
      const rawValue = window.localStorage.getItem(shortcutsStorageKey)
      if (!rawValue) {
        setShortcutPreferences(defaultPreferences)
        setIsShortcutsReady(true)
        return
      }

      const parsed = JSON.parse(rawValue) as Record<string, boolean>
      setShortcutPreferences({
        ...defaultPreferences,
        ...parsed,
      })
    } catch {
      setShortcutPreferences(defaultPreferences)
    } finally {
      setIsShortcutsReady(true)
    }
  }, [shortcutsStorageKey])

  useEffect(() => {
    if (!shortcutsStorageKey || !shortcutPreferences || !isShortcutsReady || typeof window === "undefined") {
      return
    }

    window.localStorage.setItem(shortcutsStorageKey, JSON.stringify(shortcutPreferences))
  }, [isShortcutsReady, shortcutPreferences, shortcutsStorageKey])

  const stats = useMemo(
    () => ({
      clientes: summary?.clientsCount ?? 0,
      operacoes: summary?.operationsCount ?? 0,
      balanco: summary?.financial.balance ?? 0,
      anterior: (summary?.financial.balance ?? 0) - (summary?.financial.monthBalance ?? 0),
      ganhos: summary?.financial.totalIncome ?? 0,
      gastos: summary?.financial.totalExpense ?? 0,
      equipe: summary?.teamCount ?? 0,
      reunioes: summary?.meetingsCount ?? 0,
    }),
    [summary],
  )

  const suggestions = useMemo(
    () => [
      {
        ...suggestionTemplates[0],
        title: stats.clientes > 0 ? "Cadastrar novo cliente" : "Cadastrar primeiro cliente",
        desc:
          stats.clientes > 0
            ? "Adicione outro cliente ao workspace com dados reais."
            : "Comece organizando sua base de clientes.",
      },
      {
        ...suggestionTemplates[1],
        title: (summary?.financial.entriesCount ?? 0) > 0 ? "Registrar novo lançamento" : "Registrar primeiro lançamento",
        desc:
          (summary?.financial.entriesCount ?? 0) > 0
            ? "Inclua mais um ganho ou gasto no financeiro real."
            : "Seus ganhos e gastos aparecerão aqui depois do primeiro registro.",
      },
      {
        ...suggestionTemplates[2],
        title: (summary?.documentsCount ?? 0) > 0 ? "Criar novo documento" : "Criar primeiro documento",
        desc:
          (summary?.documentsCount ?? 0) > 0
            ? "Centralize mais um documento, proposta ou contrato no COS."
            : "Use o COS para centralizar propostas, contratos e arquivos.",
      },
      {
        ...suggestionTemplates[3],
        title: (summary?.meetingsCount ?? 0) > 0 ? "Gravar nova reunião" : "Gravar primeira reunião",
        desc:
          (summary?.meetingsCount ?? 0) > 0
            ? "Crie uma nova reunião com gravação e resumo no workspace."
            : "Os resumos gerados ficarão disponíveis nesta área.",
      },
    ],
    [stats.clientes, summary?.documentsCount, summary?.financial.entriesCount, summary?.meetingsCount],
  )

  const nextSteps = useMemo(
    () => [
      {
        ...nextStepTemplates[0],
        priority: stats.clientes > 0 ? "Média" : "Alta",
        color: stats.clientes > 0 ? "#f97316" : nextStepTemplates[0].color,
        title: stats.clientes > 0 ? "Cadastrar novo cliente" : "Cadastrar primeiro cliente",
        desc:
          stats.clientes > 0
            ? "Amplie sua base com mais um cliente real no workspace."
            : "Sua operação começa quando os primeiros dados reais entrarem no COS.",
      },
      {
        ...nextStepTemplates[1],
        priority: stats.operacoes > 0 ? "Média" : "Alta",
        color: stats.operacoes > 0 ? "#f97316" : nextStepTemplates[1].color,
        title: stats.operacoes > 0 ? "Criar nova operação" : "Criar primeira operação",
        desc:
          stats.operacoes > 0
            ? "Registre uma nova operação, pedido ou atendimento real."
            : "Estruture pedidos, projetos ou atendimentos no seu workspace.",
      },
      {
        ...nextStepTemplates[2],
        priority: (summary?.financial.entriesCount ?? 0) > 0 ? "Baixa" : "Média",
        color: (summary?.financial.entriesCount ?? 0) > 0 ? "#22c55e" : nextStepTemplates[2].color,
        title: (summary?.financial.entriesCount ?? 0) > 0 ? "Registrar novo lançamento" : "Registrar primeiro lançamento",
        desc:
          (summary?.financial.entriesCount ?? 0) > 0
            ? "Mantenha o saldo atualizado com novos lançamentos reais."
            : "Isso libera os indicadores financeiros reais.",
      },
      {
        ...nextStepTemplates[3],
        title: stats.equipe > 0 ? "Abrir equipe" : "Convidar a equipe",
        desc:
          stats.equipe > 0
            ? "Acesse a equipe para acompanhar os membros já ativos."
            : "Adicione membros quando quiser começar a colaboração.",
      },
    ],
    [stats.clientes, stats.equipe, stats.operacoes, summary?.financial.entriesCount],
  )

  useEffect(() => {
    setActiveConversation(generalConversation)
    setChatMessages([])
  }, [workspace?.id])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [chatMessages, isEngineRunning])

  const quickActions = [
    { icon: Sparkles, label: "Sugerir ação", onClick: () => setModal("sugerir") },
    { icon: ArrowRight, label: "Próximo passo", onClick: () => setModal("passo") },
    {
      icon: Video,
      label: "COS Meet",
      onClick: () => {
        router.push("/app/reunioes")
      },
    },
    { icon: LifeBuoy, label: "Suporte", onClick: () => openSupport() },
  ]

  const shortcuts = useMemo(
    () =>
      defaultShortcuts.map((shortcut) => ({
        ...shortcut,
        enabled: shortcutPreferences?.[shortcut.id] ?? shortcut.enabled,
        label: areaLabels[shortcut.id as keyof typeof areaLabels] ?? shortcut.label,
        value:
          shortcut.id === "clientes"
            ? String(stats?.clientes ?? 0)
            : shortcut.id === "operacoes"
                ? String(stats?.operacoes ?? 0)
              : shortcut.id === "balanco"
                ? formatCompactBalance(stats?.balanco ?? 0)
                : shortcut.id === "equipe"
                  ? String(stats?.equipe ?? 0)
                  : shortcut.id === "reunioes"
                    ? String(stats?.reunioes ?? 0)
                    : shortcut.value,
      })),
    [areaLabels, shortcutPreferences, stats],
  )
  const saldoFinal = stats?.balanco ?? 0
  const enabledShortcuts = shortcuts.filter((shortcut) => shortcut.enabled)
  const displayName = profile?.full_name || user?.email?.split("@")[0] || "sua equipe"

  const openMeetModal = () => {
    router.push("/app/reunioes")
  }

  const handleShortcutAction = (shortcutId: string) => {
    if (shortcutId === "balanco") {
      setBalanceOpen(true)
      return
    }

    if (shortcutId === "clientes") {
      router.push("/app/conversas/cadastros/clientes")
      return
    }

    if (shortcutId === "operacoes") {
      router.push("/app/conversas/operacoes")
      return
    }

    if (shortcutId === "equipe") {
      router.push("/app/conversas/equipe")
      return
    }

    if (shortcutId === "vendas") {
      router.push("/app/conversas/vendas")
      return
    }

    if (shortcutId === "reunioes") {
      router.push("/app/reunioes")
    }
  }

  const handleSuggestionAction = (suggestionId: string) => {
    closeModal()

    if (suggestionId === "cliente") {
      router.push("/app/novo/cliente")
      return
    }

    if (suggestionId === "financeiro") {
      router.push("/app/novo/financeiro")
      return
    }

    if (suggestionId === "documento") {
      router.push("/app/novo/documento")
      return
    }

    if (suggestionId === "reuniao") {
      openMeetModal()
    }
  }

  const handleNextStepAction = (stepId: string) => {
    closeModal()

    if (stepId === "cliente") {
      router.push("/app/novo/cliente")
      return
    }

    if (stepId === "operacao") {
      router.push("/app/novo/operacao")
      return
    }

    if (stepId === "financeiro") {
      router.push("/app/novo/financeiro")
      return
    }

    if (stepId === "equipe") {
      openTeam()
    }
  }

  function formatCurrency(value: number) {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  }

  function formatCompactBalance(value: number) {
    return formatCurrency(value).replace(/^R\$\s?/, "")
  }

  const toggleShortcutDraft = (id: string) =>
    setShortcutDraft((prev) => {
      if (!prev) {
        return prev
      }

      return {
        ...prev,
        [id]: !prev[id],
      }
    })

  const closeModal = () => {
    setModal(null)
    setMeetingFeedback(null)
    setIsCreatingMeeting(false)
    setShortcutDraft(null)
  }

  const handleSend = async () => {
    if (!message.trim() || isEngineRunning) return

    const nextMessage = message.trim()
    const now = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

    setChatMessages((prev) => [
      ...prev,
      { id: buildConversationMessageId("home-user"), from: "user", text: nextMessage, time: now },
    ])
    setMessage("")
    setMicPreview("")
    setIsEngineRunning(true)
    try {
      const result = await runOperationsEngineAction({
        message: nextMessage,
        area: activeConversation.area !== "general" ? activeConversation.area : undefined,
        subArea: activeConversation.subArea,
      })

      const responseTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      const responseText =
        typeof result.message === "string" && result.message.trim()
          ? result.message
          : "Nao consegui executar sua solicitacao agora. Tente novamente em instantes."
      const ctaLabel = "suggestedLabel" in result && typeof result.suggestedLabel === "string" ? result.suggestedLabel : undefined
      const ctaHref = "suggestedHref" in result && typeof result.suggestedHref === "string" ? result.suggestedHref : undefined
      const conversationArea =
        "conversationArea" in result && typeof result.conversationArea === "string" ? result.conversationArea : "general"

      setChatMessages((prev) => [
        ...prev,
        {
          id: buildConversationMessageId("home-cos"),
          from: "cos",
          text: responseText,
          time: responseTime,
          ctaLabel,
          ctaHref,
        },
      ])

      if (result.ok) {
        await refreshSummary({ silent: true, force: true })
      }

      const nextConversation = parseConversationArea(conversationArea)
      setActiveConversation(nextConversation)
    } catch {
      const responseTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      setChatMessages((prev) => [
        ...prev,
        {
          id: buildConversationMessageId("home-error"),
          from: "cos",
          text: "Nao consegui executar sua solicitacao agora. Tente novamente em instantes.",
          time: responseTime,
        },
      ])
    } finally {
      setIsEngineRunning(false)
    }
  }

  const buildRecognition = () => {
    if (typeof window === "undefined") return null

    const SpeechRecognitionAPI = (
      window as Window & {
        SpeechRecognition?: SpeechRecognitionConstructor
        webkitSpeechRecognition?: SpeechRecognitionConstructor
      }
    ).SpeechRecognition ??
      (
        window as Window & {
          SpeechRecognition?: SpeechRecognitionConstructor
          webkitSpeechRecognition?: SpeechRecognitionConstructor
        }
      ).webkitSpeechRecognition

    if (!SpeechRecognitionAPI) {
      return null
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = "pt-BR"
    recognition.continuous = false
    recognition.interimResults = true
    recognition.onstart = () => {
      setMicState("listening")
      setMicPreview("")
      finalTranscriptRef.current = ""
      toast({
        title: "Microfone ativo",
        description: "Ouvindo...",
      })
    }
    recognition.onresult = (event) => {
      let interim = ""
      let finalText = finalTranscriptRef.current

      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index]
        const transcript = result[0]?.transcript ?? ""
        if (result.isFinal) {
          finalText += `${transcript} `
        } else {
          interim += transcript
        }
      }

      finalTranscriptRef.current = finalText.trim()
      setMicPreview(`${finalText} ${interim}`.trim())
    }
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setMicState("error")
        setMicPreview("")
        toast({
          title: "Microfone bloqueado",
          description: "Permissao de microfone negada.",
        })
        return
      }

      setMicState("error")
      toast({
        title: "Nao foi possivel transcrever",
        description: "Ocorreu um erro ao capturar o audio.",
      })
    }
    recognition.onend = () => {
      const finalText = finalTranscriptRef.current.trim()

      if (micActionRef.current === "cancel") {
        setMicState("idle")
        setMicPreview("")
        finalTranscriptRef.current = ""
        micActionRef.current = "finalize"
        return
      }

      if (finalText) {
        setMicState("processing")
        setMessage((prev) => [prev.trim(), finalText].filter(Boolean).join(" "))
        setMicPreview("")
        finalTranscriptRef.current = ""
        toast({
          title: "Transcricao concluida",
          description: "Transcricao adicionada ao campo.",
        })
      }

      setMicState("idle")
      micActionRef.current = "finalize"
    }

    recognitionRef.current = recognition
    return recognition
  }

  const startListening = () => {
    const recognition = recognitionRef.current ?? buildRecognition()
    if (!recognition) {
      setMicState("unsupported")
      toast({
        title: "Microfone indisponivel",
        description: "Ditado por voz nao disponivel neste navegador.",
      })
      return
    }

    try {
      micActionRef.current = "finalize"
      finalTranscriptRef.current = ""
      setMicPreview("")
      recognition.start()
    } catch {
      setMicState("error")
      toast({
        title: "Microfone indisponivel",
        description: "Nao foi possivel iniciar a captura de voz.",
      })
    }
  }

  const finalizeListening = () => {
    if (micState !== "listening") return
    setMicState("processing")
    recognitionRef.current?.stop()
  }

  const cancelListening = () => {
    micActionRef.current = "cancel"
    recognitionRef.current?.stop()
  }

  const submitMeeting = async () => {
    if (!meetingForm.title.trim()) {
      setMeetingFeedback({ tone: "error", text: "Informe o título da reunião." })
      return
    }

    if (meetingForm.mode === "video" && !meetingForm.roomName.trim()) {
      setMeetingFeedback({ tone: "error", text: "Informe a sala da reunião por vídeo." })
      return
    }

    setIsCreatingMeeting(true)
    setMeetingFeedback(null)

    const result = await createMeetingAction({
      title: meetingForm.title,
      status: "draft",
      summary: buildMeetingSummary(meetingForm),
      nextSteps: buildMeetingNextSteps(meetingForm),
    })

    setIsCreatingMeeting(false)

    if (result.error) {
      setMeetingFeedback({ tone: "error", text: result.error })
      return
    }

    setMeetingFeedback({
      tone: "success",
      text:
        meetingForm.mode === "video"
          ? "Fluxo de reunião por vídeo criado com sucesso."
          : "Fluxo de gravação da reunião criado com sucesso.",
    })
    await refreshSummary({ silent: true, force: true })

    toast({
      title: meetingForm.mode === "video" ? "Reunião por vídeo preparada." : "Fluxo de gravação preparado.",
      description: "A reunião já pode ser vista no módulo oficial do COS Meet.",
    })
  }

  const openShortcutsEditor = () => {
    setShortcutDraft(shortcutPreferences)
    setModal("editar")
  }

  const saveShortcutPreferences = () => {
    if (!shortcutDraft) {
      closeModal()
      return
    }

    setShortcutPreferences(shortcutDraft)
    closeModal()
  }

  return (
    <div className="flex h-[calc(100dvh-7rem)] min-h-0 flex-col overflow-hidden lg:h-full lg:min-h-[600px]">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-5">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          <AnimatePresence initial={false}>
            {activeConversation.area !== "general" && (
              <motion.div initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-gray-400">Conversa atual</p>
                  <p className="text-sm font-medium text-[#0a0a0a]">{activeConversation.label}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveConversation(generalConversation)
                    setChatMessages([])
                  }}
                  className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Voltar ao inicio
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {chatMessages.length === 0 ? (
            <div className="flex min-h-full flex-col justify-center py-6">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }} className="mb-4 self-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
                  <Image src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/COS%20LOGO%20%281%29-mBU7xqdIZoWP3indGVxJrDFLu8urZH.png" alt="COS" width={28} height={28} className="h-7 w-7" />
                </div>
              </motion.div>

              <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05, duration: 0.3 }} className="mb-5 text-center">
                <h1 className="mb-1 text-2xl font-semibold text-[#0a0a0a]">{`Ola, ${displayName}`}</h1>
                <p className="text-sm text-gray-500">O que voce deseja fazer hoje?</p>
              </motion.div>

              <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15, duration: 0.3 }} className="mb-5 flex flex-wrap justify-center gap-2">
                {quickActions.map((action) => (
                  <button key={action.label} onClick={action.onClick} className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50">
                    <action.icon className="h-3.5 w-3.5" />
                    {action.label}
                  </button>
                ))}
              </motion.div>

              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.3 }}>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500">Atalhos inteligentes</span>
                  </div>
                  <button onClick={openShortcutsEditor} className="text-xs text-gray-400 transition-colors hover:text-gray-600">
                    Editar
                  </button>
                </div>

                <div className="rounded-xl border border-gray-100 bg-white p-3">
                  {!isShortcutsReady || isStatsLoading ? (
                    <div className="grid grid-cols-4 gap-2">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="flex flex-col items-center gap-2 py-1">
                          <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
                          <div className="h-4 w-12 animate-pulse rounded bg-gray-200" />
                          <div className="h-3 w-16 animate-pulse rounded bg-gray-100" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`grid gap-2 ${enabledShortcuts.length <= 4 ? "grid-cols-4" : "grid-cols-3"}`}>
                      {enabledShortcuts.map((shortcut) => (
                        <button key={shortcut.id} onClick={() => handleShortcutAction(shortcut.id)} className="flex flex-col items-center text-center">
                          <shortcut.icon className="mb-1 h-4 w-4 text-gray-400" />
                          <span className={`max-w-full truncate font-semibold text-[#0a0a0a] ${shortcut.isBalance ? "text-sm tabular-nums" : "text-base"}`}>{shortcut.value}</span>
                          <span className="text-[10px] leading-tight text-gray-500">{shortcut.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {chatMessages.map((chatMessage, index) => (
                <div key={chatMessage.id ?? `${chatMessage.from}:${chatMessage.time}:${chatMessage.text}:${index}`} className={`flex ${chatMessage.from === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 ${chatMessage.from === "user" ? "bg-[#0a0a0a] text-white" : "border border-gray-100 bg-white text-[#0a0a0a]"}`}>
                    {chatMessage.from === "cos" && (
                      <span className="mb-0.5 flex items-center gap-1 text-[10px] font-medium text-gray-400">
                        <Sparkles className="h-3 w-3" /> COS
                      </span>
                    )}
                    <p className="text-sm leading-snug">{chatMessage.text}</p>
                    {chatMessage.ctaLabel && chatMessage.ctaHref && (
                      <Link href={chatMessage.ctaHref} className="mt-2 inline-flex rounded-full border border-gray-200 px-3 py-1 text-[11px] font-medium text-[#0a0a0a] transition-colors hover:bg-gray-50">
                        {chatMessage.ctaLabel}
                      </Link>
                    )}
                    <span className={`mt-1 block text-[10px] ${chatMessage.from === "user" ? "text-gray-300" : "text-gray-400"}`}>{chatMessage.time}</span>
                  </div>
                </div>
              ))}

              {isEngineRunning && (
                <div className="flex justify-start">
                  <div className="max-w-[88%] rounded-2xl border border-gray-100 bg-white px-3.5 py-2.5 text-[#0a0a0a]">
                    <span className="mb-0.5 flex items-center gap-1 text-[10px] font-medium text-gray-400">
                      <Sparkles className="h-3 w-3" /> COS
                    </span>
                    <p className="text-sm leading-snug text-gray-500">Executando sua solicitacao...</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <AnimatePresence initial={false}>
            {micState !== "idle" && (
              <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 8, opacity: 0 }} className="rounded-2xl border border-gray-100 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#0a0a0a]">
                      {micState === "listening" && "Ouvindo..."}
                      {micState === "processing" && "Processando transcricao..."}
                      {micState === "unsupported" && "Ditado por voz indisponivel"}
                      {micState === "error" && "Erro no microfone"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {micState === "listening" && (micPreview || "Fale em portugues para preencher o campo automaticamente.")}
                      {micState === "processing" && "A transcricao sera adicionada ao campo em seguida."}
                      {micState === "unsupported" && "Ditado por voz nao disponivel neste navegador."}
                      {micState === "error" && "Permissao de microfone negada."}
                    </p>
                  </div>
                  {(micState === "unsupported" || micState === "error") && (
                    <button onClick={() => setMicState("idle")} className="rounded-full p-1.5 transition-colors hover:bg-gray-100" aria-label="Fechar aviso">
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  )}
                </div>

                {micState === "listening" && (
                  <div className="mt-3 flex items-center gap-2">
                    <button type="button" onClick={cancelListening} className="flex-1 rounded-2xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200">
                      Cancelar
                    </button>
                    <button type="button" onClick={finalizeListening} className="flex-1 rounded-2xl bg-[#0a0a0a] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]">
                      Finalizar
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div
        className="px-4 pt-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
      >
        <div className="mx-auto w-full max-w-3xl">
          <div className="relative rounded-[28px] border border-gray-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
            <input
              type="text"
              value={message || micPreview}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void handleSend()}
              placeholder="Fale com o COS..."
              className="w-full rounded-[28px] bg-transparent px-6 py-4 pr-24 text-sm focus:outline-none"
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              <button onClick={startListening} className={`rounded-full p-2 transition-colors ${micState === "listening" ? "bg-gray-100 text-[#0a0a0a]" : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"}`} aria-label="Falar">
                <Mic className="h-4 w-4" />
              </button>
              <button onClick={() => void handleSend()} disabled={!message.trim() || isEngineRunning} className="rounded-full bg-[#0a0a0a] p-2.5 text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50" aria-label="Enviar">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {balanceOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setBalanceOpen(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 400 }} className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white p-5 pb-8 lg:inset-0 lg:m-auto lg:h-fit lg:max-w-md lg:rounded-3xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#0a0a0a]">Balanço</h2>
                <button onClick={() => setBalanceOpen(false)} className="rounded-full p-1.5 transition-colors hover:bg-gray-100" aria-label="Fechar">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-2.5">
                    <span className="text-sm text-gray-600">Saldo anterior</span>
                    <span className="text-sm font-semibold text-[#0a0a0a]">{formatCurrency(stats?.anterior ?? 0)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-green-50 px-4 py-2.5">
                    <span className="text-sm text-green-700">Ganhos</span>
                    <span className="text-sm font-semibold text-green-600">+ {formatCurrency(stats?.ganhos ?? 0)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-red-50 px-4 py-2.5">
                    <span className="text-sm text-red-700">Gastos</span>
                    <span className="text-sm font-semibold text-red-600">- {formatCurrency(stats?.gastos ?? 0)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-[#0a0a0a] px-4 py-3.5">
                    <span className="text-sm font-medium text-white">Saldo final</span>
                  <span className="text-base font-bold text-white">{formatCurrency(saldoFinal)}</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 400 }} className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 lg:inset-0 lg:m-auto lg:h-fit lg:max-h-[80vh] lg:max-w-md lg:rounded-3xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#0a0a0a]">
                  {modal === "sugerir" && "Sugestões do COS"}
                  {modal === "passo" && "Próximos passos"}
                  {modal === "meet" && "COS Meet"}
                  {modal === "editar" && "Editar atalhos"}
                </h2>
                <button onClick={closeModal} className="rounded-full p-1.5 transition-colors hover:bg-gray-100" aria-label="Fechar">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {modal === "sugerir" && (
                <div className="space-y-2.5">
                  <p className="mb-1 text-sm text-gray-500">Com base na sua operação, o COS recomenda:</p>
                  {suggestions.map((suggestion) => (
                    <button key={suggestion.title} onClick={() => handleSuggestionAction(suggestion.id)} className="flex w-full items-start gap-3 rounded-2xl border border-gray-100 p-3 text-left transition-colors hover:bg-gray-50">
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: suggestion.bg }}>
                        <suggestion.icon className="h-5 w-5" style={{ color: suggestion.color }} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-[#0a0a0a]">{suggestion.title}</span>
                        <span className="block text-xs text-gray-500">{suggestion.desc}</span>
                      </span>
                      <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-gray-300" />
                    </button>
                  ))}
                </div>
              )}

              {modal === "passo" && (
                <div className="space-y-2.5">
                  <p className="mb-1 text-sm text-gray-500">Prioridades recomendadas para hoje:</p>
                  {nextSteps.map((step) => (
                    <button key={step.title} onClick={() => handleNextStepAction(step.id)} className="flex w-full items-start gap-3 rounded-2xl border border-gray-100 p-3 text-left transition-colors hover:bg-gray-50">
                      <span className="mt-0.5 flex-shrink-0">
                        <Lightbulb className="h-5 w-5" style={{ color: step.color }} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center gap-2">
                          <span className="text-sm font-medium text-[#0a0a0a]">{step.title}</span>
                        </div>
                        <span className="text-xs text-gray-500">{step.desc}</span>
                      </div>
                      <span className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ color: step.color, backgroundColor: `${step.color}1a` }}>
                        {step.priority}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {modal === "meet" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
                      <Video className="h-6 w-6 text-red-500" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-[#0a0a0a]">COS Meet</p>
                      <p className="text-sm text-gray-500">Prepare uma reunião por vídeo ou um fluxo de gravação sem simular integrações que ainda não existem.</p>
                    </div>
                  </div>

                  {!meetingFeedback?.tone || meetingFeedback.tone === "error" ? (
                    <>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-[#0a0a0a]">Tipo de reunião</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setMeetingForm((prev) => ({ ...prev, mode: "video" }))}
                            className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${meetingForm.mode === "video" ? "border-[#0a0a0a] bg-[#0a0a0a] text-white" : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"}`}
                          >
                            Reunião por vídeo
                          </button>
                          <button
                            type="button"
                            onClick={() => setMeetingForm((prev) => ({ ...prev, mode: "recording" }))}
                            className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${meetingForm.mode === "recording" ? "border-[#0a0a0a] bg-[#0a0a0a] text-white" : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"}`}
                          >
                            Gravação ou áudio
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-[#0a0a0a]">Titulo</label>
                        <input
                          type="text"
                          value={meetingForm.title}
                          onChange={(event) => setMeetingForm((prev) => ({ ...prev, title: event.target.value }))}
                          placeholder="Ex: Alinhamento semanal"
                          className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-[#0a0a0a]">Participantes</label>
                        <input
                          type="text"
                          value={meetingForm.participants}
                          onChange={(event) => setMeetingForm((prev) => ({ ...prev, participants: event.target.value }))}
                          placeholder="Participantes opcionais"
                          className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                        />
                      </div>
                      {meetingForm.mode === "video" && (
                        <>
                          <div>
                            <label className="mb-1.5 block text-sm font-medium text-[#0a0a0a]">Sala da reunião</label>
                            <input
                              type="text"
                              value={meetingForm.roomName}
                              onChange={(event) => setMeetingForm((prev) => ({ ...prev, roomName: event.target.value }))}
                              placeholder="Ex: Sala semanal comercial"
                              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-sm font-medium text-[#0a0a0a]">Link da reunião</label>
                            <input
                              type="text"
                              value={meetingForm.meetingLink}
                              onChange={(event) => setMeetingForm((prev) => ({ ...prev, meetingLink: event.target.value }))}
                              placeholder="Cole aqui o link real da videochamada, se já existir"
                              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                            />
                          </div>
                        </>
                      )}
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-[#0a0a0a]">Observacoes</label>
                        <textarea
                          value={meetingForm.notes}
                          onChange={(event) => setMeetingForm((prev) => ({ ...prev, notes: event.target.value }))}
                          placeholder="Observações da reunião"
                          rows={4}
                          className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                        />
                      </div>
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <p className="text-sm font-medium text-[#0a0a0a]">Antes de iniciar, o COS deve:</p>
                        <div className="mt-3 space-y-2">
                          <label className="flex items-center gap-3 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={meetingForm.cosShouldAttend}
                              onChange={(event) => setMeetingForm((prev) => ({ ...prev, cosShouldAttend: event.target.checked }))}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            Acompanhar a reunião
                          </label>
                          <label className="flex items-center gap-3 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={meetingForm.cosShouldRecord}
                              onChange={(event) => setMeetingForm((prev) => ({ ...prev, cosShouldRecord: event.target.checked }))}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            Gravar quando a integração existir
                          </label>
                          <label className="flex items-center gap-3 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={meetingForm.cosShouldExtract}
                              onChange={(event) => setMeetingForm((prev) => ({ ...prev, cosShouldExtract: event.target.checked }))}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            Extrair pontos importantes
                          </label>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
                        {meetingForm.mode === "video"
                          ? "Vídeo ao vivo, gravação e transcrição automática ainda não estão conectados neste fluxo. O COS vai registrar sala, link e preferências de acompanhamento de forma honesta."
                          : "Gravação, upload e transcrição automática ainda não estão ativos neste fluxo. O COS vai registrar a reunião e as preferências para continuidade sem simular execução."}
                      </div>
                      {meetingFeedback?.tone === "error" && (
                        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                          {meetingFeedback.text}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button onClick={closeModal} className="flex-1 rounded-2xl bg-gray-100 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200">
                          Cancelar
                        </button>
                        <button onClick={submitMeeting} disabled={isCreatingMeeting} className="flex-1 rounded-2xl bg-[#0a0a0a] py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50">
                          {isCreatingMeeting ? "Salvando..." : meetingForm.mode === "video" ? "Preparar reunião por vídeo" : "Preparar fluxo de gravação"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">
                        {meetingFeedback.text}
                      </div>
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <div className="mb-1.5 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium text-[#0a0a0a]">Próximo passo</span>
                        </div>
                        <p className="text-xs leading-relaxed text-gray-600">
                          A reunião foi criada no backend real e aparecerá em Reuniões e no Histórico do workspace, com a sala, o link e as preferências do COS registradas neste fluxo.
                        </p>
                        {meetingForm.mode === "video" && (
                          <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-3 text-xs text-gray-600">
                            <p><strong>Sala:</strong> {meetingForm.roomName}</p>
                            <p><strong>Link:</strong> {meetingForm.meetingLink || "Nenhum link real informado ainda."}</p>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Link href="/app/reunioes" onClick={closeModal} className="rounded-2xl bg-[#0a0a0a] py-3 text-center text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]">
                          Abrir reuniões
                        </Link>
                        <Link href="/app/reunioes" onClick={closeModal} className="rounded-2xl bg-gray-100 py-3 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200">
                          Ver em Reuniões
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {modal === "editar" && (
                <div className="space-y-2">
                  <p className="mb-1 text-sm text-gray-500">Ative, desative e reorganize os atalhos exibidos:</p>
                  {shortcuts.map((shortcut) => (
                    <div key={shortcut.id} className="flex items-center gap-3 rounded-2xl border border-gray-100 p-2.5">
                      <GripVertical className="h-4 w-4 flex-shrink-0 text-gray-300" />
                      <shortcut.icon className="h-4 w-4 flex-shrink-0 text-gray-400" />
                      <span className="flex-1 text-sm font-medium text-[#0a0a0a]">{shortcut.label}</span>
                      <button onClick={() => toggleShortcutDraft(shortcut.id)} className={`relative h-6 w-10 flex-shrink-0 rounded-full transition-colors ${shortcutDraft?.[shortcut.id] ?? shortcut.enabled ? "bg-[#0a0a0a]" : "bg-gray-200"}`} aria-label={`Alternar ${shortcut.label}`}>
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${shortcutDraft?.[shortcut.id] ?? shortcut.enabled ? "left-[18px]" : "left-0.5"}`} />
                      </button>
                    </div>
                  ))}
                  <button onClick={saveShortcutPreferences} className="mt-2 w-full rounded-2xl bg-[#0a0a0a] py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]">
                    Salvar
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
