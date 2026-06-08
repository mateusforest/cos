"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles,
  ArrowRight,
  Video,
  Mic,
  Send,
  Users,
  Briefcase,
  Wallet,
  UsersRound,
  X,
  Circle,
  Pause,
  Square,
  FileText,
  CheckSquare,
  GripVertical,
  Check,
  Lightbulb,
  LifeBuoy,
} from "lucide-react"
import { useSupport } from "@/components/support/support-context"
import { toast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth/auth-provider"

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

const suggestions = [
  { icon: Users, color: "#ec4899", bg: "#fce7f3", title: "Cadastrar primeiro cliente", desc: "Comece organizando sua base de clientes." },
  { icon: Wallet, color: "#22c55e", bg: "#dcfce7", title: "Registrar primeiro lançamento", desc: "Seus ganhos e gastos aparecerão aqui depois do primeiro registro." },
  { icon: FileText, color: "#3b82f6", bg: "#dbeafe", title: "Criar primeiro documento", desc: "Use o COS para centralizar propostas, contratos e arquivos." },
  { icon: Video, color: "#ef4444", bg: "#fee2e2", title: "Gravar primeira reunião", desc: "Os resumos gerados ficarão disponíveis nesta área." },
]

const nextSteps = [
  { priority: "Alta", color: "#ef4444", title: "Cadastrar primeiro cliente", desc: "Sua operação começa quando os primeiros dados reais entrarem no COS." },
  { priority: "Alta", color: "#ef4444", title: "Criar primeira operação", desc: "Estruture pedidos, projetos ou atendimentos no seu workspace." },
  { priority: "Média", color: "#f97316", title: "Registrar primeiro lançamento", desc: "Isso libera os indicadores financeiros reais." },
  { priority: "Baixa", color: "#22c55e", title: "Convidar a equipe", desc: "Adicione membros quando quiser começar a colaboração." },
]

const defaultShortcuts = [
  { id: "clientes", icon: Users, value: "0", label: "Clientes", enabled: true },
  { id: "operacoes", icon: Briefcase, value: "0", label: "Operações", enabled: true },
  { id: "balanco", icon: Wallet, value: "R$ 0,00", label: "Balanço", isBalance: true, enabled: true },
  { id: "equipe", icon: UsersRound, value: "0", label: "Equipe", enabled: true },
  { id: "vendas", icon: ArrowRight, value: "0", label: "Vendas", enabled: false },
  { id: "reunioes", icon: Video, value: "0", label: "Reuniões", enabled: false },
]

export default function AppHomePage() {
  const { user, profile } = useAuth()
  const [message, setMessage] = useState("")
  const [balanceOpen, setBalanceOpen] = useState(false)
  const [modal, setModal] = useState<ModalType>(null)
  const [shortcuts, setShortcuts] = useState(defaultShortcuts)
  const [recording, setRecording] = useState<"idle" | "recording" | "paused" | "done">("idle")
  const [seconds, setSeconds] = useState(0)
  const [micState, setMicState] = useState<MicState>("idle")
  const [micPreview, setMicPreview] = useState("")
  const { openSupport } = useSupport()

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const finalTranscriptRef = useRef("")
  const micActionRef = useRef<"finalize" | "cancel">("finalize")

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  const quickActions = [
    { icon: Sparkles, label: "Sugerir ação", onClick: () => setModal("sugerir") },
    { icon: ArrowRight, label: "Próximo passo", onClick: () => setModal("passo") },
    { icon: Video, label: "Gravar reunião", onClick: () => { setRecording("idle"); setSeconds(0); setModal("meet") } },
    { icon: LifeBuoy, label: "Suporte", onClick: openSupport },
  ]

  const balance = { anterior: 0, ganhos: 0, gastos: 0 }
  const saldoFinal = balance.anterior + balance.ganhos - balance.gastos
  const enabledShortcuts = shortcuts.filter((s) => s.enabled)
  const displayName = profile?.full_name || user?.email?.split("@")[0] || "sua equipe"

  const formatCurrency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`

  const toggleShortcut = (id: string) =>
    setShortcuts((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)))

  const closeModal = () => setModal(null)

  const handleSend = () => {
    if (!message.trim()) return
    toast({
      title: "Mensagem pronta",
      description: "Sua mensagem foi preparada localmente. O envio real será conectado ao backend.",
    })
    setMessage("")
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
          description: "Permissão de microfone negada.",
        })
        return
      }

      setMicState("error")
      toast({
        title: "Não foi possível transcrever",
        description: "Ocorreu um erro ao capturar o áudio.",
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
          title: "Transcrição concluída",
          description: "Transcrição adicionada ao campo.",
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
        title: "Microfone indisponível",
        description: "Ditado por voz não disponível neste navegador.",
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
        title: "Microfone indisponível",
        description: "Não foi possível iniciar a captura de voz.",
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

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] lg:h-full lg:min-h-[600px]">
      <div className="flex-1 flex flex-col items-center justify-center px-5">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }} className="mb-4">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
            <Image src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/COS%20LOGO%20%281%29-mBU7xqdIZoWP3indGVxJrDFLu8urZH.png" alt="COS" width={28} height={28} className="w-7 h-7" />
          </div>
        </motion.div>

        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05, duration: 0.3 }} className="text-center mb-5">
          <h1 className="text-2xl font-semibold text-[#0a0a0a] mb-1">{`Olá, ${displayName}`}</h1>
          <p className="text-gray-500 text-sm">O que você deseja fazer hoje?</p>
        </motion.div>

        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1, duration: 0.3 }} className="w-full max-w-sm mb-4">
          <div className="relative bg-white rounded-full shadow-sm border border-gray-200">
            <input
              type="text"
              value={message || micPreview}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Fale com o COS..."
              className="w-full px-5 py-3 pr-20 rounded-full text-sm bg-transparent focus:outline-none"
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              <button
                onClick={startListening}
                className={`p-2 transition-colors ${micState === "listening" ? "text-[#0a0a0a]" : "text-gray-400 hover:text-gray-600"}`}
                aria-label="Falar"
              >
                <Mic className="w-4 h-4" />
              </button>
              <button
                onClick={handleSend}
                disabled={!message.trim()}
                className="p-2 bg-[#0a0a0a] text-white rounded-full hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Enviar"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {micState !== "idle" && (
              <motion.div
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 8, opacity: 0 }}
                className="mt-2 rounded-2xl border border-gray-100 bg-white p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#0a0a0a]">
                      {micState === "listening" && "Ouvindo..."}
                      {micState === "processing" && "Processando transcrição..."}
                      {micState === "unsupported" && "Ditado por voz indisponível"}
                      {micState === "error" && "Erro no microfone"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {micState === "listening" && (micPreview || "Fale em português para preencher o campo automaticamente.")}
                      {micState === "processing" && "A transcrição será adicionada ao campo em seguida."}
                      {micState === "unsupported" && "Ditado por voz não disponível neste navegador."}
                      {micState === "error" && "Permissão de microfone negada."}
                    </p>
                  </div>
                  {(micState === "unsupported" || micState === "error") && (
                    <button onClick={() => setMicState("idle")} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors" aria-label="Fechar aviso">
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  )}
                </div>

                {micState === "listening" && (
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={cancelListening}
                      className="flex-1 rounded-2xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={finalizeListening}
                      className="flex-1 rounded-2xl bg-[#0a0a0a] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1a1a1a] transition-colors"
                    >
                      Finalizar
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15, duration: 0.3 }} className="flex flex-wrap justify-center gap-2">
          {quickActions.map((action) => (
            <button key={action.label} onClick={action.onClick} className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-full border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <action.icon className="w-3.5 h-3.5" />
              {action.label}
            </button>
          ))}
        </motion.div>
      </div>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.3 }} className="px-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">Atalhos inteligentes</span>
          </div>
          <button onClick={() => setModal("editar")} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Editar
          </button>
        </div>

        <div className="bg-white rounded-xl p-3 border border-gray-100">
          <div className={`grid gap-2 ${enabledShortcuts.length <= 4 ? "grid-cols-4" : "grid-cols-3"}`}>
            {enabledShortcuts.map((shortcut) => (
              <button key={shortcut.id} onClick={() => shortcut.isBalance && setBalanceOpen(true)} className="flex flex-col items-center text-center">
                <shortcut.icon className="w-4 h-4 text-gray-400 mb-1" />
                <span className="text-base font-semibold text-[#0a0a0a]">{shortcut.value}</span>
                <span className="text-[10px] text-gray-500 leading-tight">{shortcut.label}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {balanceOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setBalanceOpen(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 400 }} className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl p-5 pb-8 lg:inset-0 lg:m-auto lg:h-fit lg:max-w-md lg:rounded-3xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#0a0a0a]">Balanço</h2>
                <button onClick={() => setBalanceOpen(false)} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors" aria-label="Fechar">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between py-2.5 px-4 bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-600">Saldo anterior</span>
                  <span className="text-sm font-semibold text-[#0a0a0a]">{formatCurrency(balance.anterior)}</span>
                </div>
                <div className="flex items-center justify-between py-2.5 px-4 bg-green-50 rounded-xl">
                  <span className="text-sm text-green-700">Ganhos</span>
                  <span className="text-sm font-semibold text-green-600">+ {formatCurrency(balance.ganhos)}</span>
                </div>
                <div className="flex items-center justify-between py-2.5 px-4 bg-red-50 rounded-xl">
                  <span className="text-sm text-red-700">Gastos</span>
                  <span className="text-sm font-semibold text-red-600">- {formatCurrency(balance.gastos)}</span>
                </div>
                <div className="flex items-center justify-between py-3.5 px-4 bg-[#0a0a0a] rounded-xl">
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={closeModal} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 400 }} className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto lg:inset-0 lg:m-auto lg:h-fit lg:max-h-[80vh] lg:max-w-md lg:rounded-3xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#0a0a0a]">
                  {modal === "sugerir" && "Sugestões do COS"}
                  {modal === "passo" && "Próximos passos"}
                  {modal === "meet" && "COS Meet"}
                  {modal === "editar" && "Editar atalhos"}
                </h2>
                <button onClick={closeModal} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors" aria-label="Fechar">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {modal === "sugerir" && (
                <div className="space-y-2.5">
                  <p className="text-sm text-gray-500 mb-1">Com base na sua operação, o COS recomenda:</p>
                  {suggestions.map((s) => (
                    <button key={s.title} className="flex items-start gap-3 w-full p-3 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors text-left">
                      <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: s.bg }}>
                        <s.icon className="w-5 h-5" style={{ color: s.color }} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-[#0a0a0a]">{s.title}</span>
                        <span className="block text-xs text-gray-500">{s.desc}</span>
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-300 mt-1 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {modal === "passo" && (
                <div className="space-y-2.5">
                  <p className="text-sm text-gray-500 mb-1">Prioridades recomendadas para hoje:</p>
                  {nextSteps.map((s) => (
                    <div key={s.title} className="flex items-start gap-3 w-full p-3 rounded-2xl border border-gray-100">
                      <span className="mt-0.5 flex-shrink-0">
                        <Lightbulb className="w-5 h-5" style={{ color: s.color }} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-[#0a0a0a]">{s.title}</span>
                        </div>
                        <span className="text-xs text-gray-500">{s.desc}</span>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ color: s.color, backgroundColor: `${s.color}1a` }}>
                        {s.priority}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {modal === "meet" && (
                <div className="flex flex-col items-center">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${recording === "recording" ? "bg-red-50" : "bg-gray-100"}`}>
                    <motion.div animate={recording === "recording" ? { scale: [1, 1.15, 1] } : { scale: 1 }} transition={{ repeat: recording === "recording" ? Infinity : 0, duration: 1.5 }}>
                      {recording === "done" ? <Check className="w-9 h-9 text-green-600" /> : <Mic className={`w-9 h-9 ${recording === "recording" ? "text-red-500" : "text-gray-500"}`} />}
                    </motion.div>
                  </div>

                  <span className="text-2xl font-semibold text-[#0a0a0a] tabular-nums mb-1">{formatTime(seconds)}</span>
                  <span className="text-sm text-gray-500 mb-6">
                    {recording === "idle" && "Pronto para gravar"}
                    {recording === "recording" && "Gravando reunião..."}
                    {recording === "paused" && "Pausado"}
                    {recording === "done" && "Gravação concluída"}
                  </span>

                  {recording === "idle" && (
                    <button onClick={() => { setRecording("recording"); setSeconds(0) }} className="flex items-center justify-center gap-2 w-full py-3 bg-red-500 text-white rounded-2xl text-sm font-medium hover:bg-red-600 transition-colors">
                      <Circle className="w-4 h-4 fill-current" /> Iniciar gravação
                    </button>
                  )}

                  {(recording === "recording" || recording === "paused") && (
                    <div className="flex items-center gap-2 w-full">
                      <button onClick={() => setRecording(recording === "recording" ? "paused" : "recording")} className="flex items-center justify-center gap-2 flex-1 py-3 bg-gray-100 text-gray-700 rounded-2xl text-sm font-medium hover:bg-gray-200 transition-colors">
                        {recording === "recording" ? <><Pause className="w-4 h-4" /> Pausar</> : <><Circle className="w-4 h-4 fill-current" /> Retomar</>}
                      </button>
                      <button onClick={() => setRecording("done")} className="flex items-center justify-center gap-2 flex-1 py-3 bg-[#0a0a0a] text-white rounded-2xl text-sm font-medium hover:bg-[#1a1a1a] transition-colors">
                        <Square className="w-4 h-4 fill-current" /> Encerrar
                      </button>
                    </div>
                  )}

                  {recording === "done" && (
                    <div className="w-full space-y-2.5">
                      <div className="p-3 rounded-2xl bg-gray-50">
                        <div className="flex items-center gap-2 mb-1.5">
                          <FileText className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium text-[#0a0a0a]">Resumo gerado</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Nenhum resumo de reunião gerado ainda. Quando você gravar uma reunião real, o COS mostrará o conteúdo aqui.
                        </p>
                      </div>
                      <div className="p-3 rounded-2xl bg-gray-50">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckSquare className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-medium text-[#0a0a0a]">Tarefas geradas</span>
                        </div>
                        <ul className="space-y-1.5">
                          {["Nenhuma tarefa gerada ainda", "As próximas ações aparecerão aqui", "Grave uma reunião para começar"].map((t) => (
                            <li key={t} className="flex items-center gap-2 text-xs text-gray-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-300" /> {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <button onClick={closeModal} className="w-full py-3 bg-[#0a0a0a] text-white rounded-2xl text-sm font-medium hover:bg-[#1a1a1a] transition-colors">
                        Concluir
                      </button>
                    </div>
                  )}
                </div>
              )}

              {modal === "editar" && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500 mb-1">Ative, desative e reorganize os atalhos exibidos:</p>
                  {shortcuts.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-2xl border border-gray-100">
                      <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      <s.icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="flex-1 text-sm font-medium text-[#0a0a0a]">{s.label}</span>
                      <button onClick={() => toggleShortcut(s.id)} className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${s.enabled ? "bg-[#0a0a0a]" : "bg-gray-200"}`} aria-label={`Alternar ${s.label}`}>
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${s.enabled ? "left-[18px]" : "left-0.5"}`} />
                      </button>
                    </div>
                  ))}
                  <button onClick={closeModal} className="w-full mt-2 py-3 bg-[#0a0a0a] text-white rounded-2xl text-sm font-medium hover:bg-[#1a1a1a] transition-colors">
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
