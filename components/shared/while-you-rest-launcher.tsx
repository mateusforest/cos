"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  CheckCircle2,
  Circle,
  CircleAlert,
  FileText,
  Loader2,
  PauseCircle,
  PlayCircle,
  Plus,
  Sparkles,
  Square,
  UserRoundPlus,
  XCircle,
} from "lucide-react"
import type { WhileYouRestHydratedPlan } from "@/actions/while-you-rest"
import {
  continueWhileYouRestPlanAction,
  createWhileYouRestPlanAction,
  endWhileYouRestPlanAction,
  getWhileYouRestPlansAction,
  pauseWhileYouRestPlanAction,
  startWhileYouRestPlanAction,
} from "@/actions/while-you-rest"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"

type Props = {
  variant: "app" | "portal"
}

type Phase = "request" | "review" | "tracking"

const sections = [
  { key: "in_progress", title: "Em andamento", statuses: ["queued", "running"] as const },
  { key: "paused", title: "Pausadas", statuses: ["paused"] as const },
  { key: "waiting_confirmation", title: "Aguardando você", statuses: ["waiting_confirmation"] as const },
  { key: "completed", title: "Concluídas", statuses: ["completed", "completed_with_issues"] as const },
  { key: "error", title: "Com erro", statuses: ["failed"] as const },
  { key: "cancelled", title: "Encerradas", statuses: ["cancelled"] as const },
]

function getExecutionBadgeTone(status: WhileYouRestHydratedPlan["status"]) {
  if (status === "queued" || status === "running") return "bg-amber-50 text-amber-700"
  if (status === "paused") return "bg-slate-100 text-slate-700"
  if (status === "waiting_confirmation") return "bg-orange-50 text-orange-700"
  if (status === "completed" || status === "completed_with_issues") return "bg-emerald-50 text-emerald-700"
  if (status === "cancelled") return "bg-zinc-100 text-zinc-700"
  return "bg-rose-50 text-rose-700"
}

function WhileYouRestIcon({
  active = false,
  className = "",
}: {
  active?: boolean
  className?: string
}) {
  return (
    <div
      className={`relative flex items-center justify-center rounded-[22px] border border-[rgba(196,162,255,0.34)] bg-[linear-gradient(180deg,#8d46ff_0%,#6328db_100%)] text-white shadow-[0_14px_30px_rgba(122,67,223,0.18)] ${className}`}
    >
      <span className={`absolute inset-[1px] rounded-[20px] bg-[linear-gradient(180deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.03)_100%)] ${active ? "animate-pulse" : "opacity-80"}`} />
      <Sparkles className={`relative h-5 w-5 ${active ? "animate-pulse" : ""}`} />
    </div>
  )
}

function WhileYouRestLauncherIcon({ active = false }: { active?: boolean }) {
  return (
    <div className="relative flex h-[48px] w-[48px] items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_25%,#cc92ff_0%,#9245ff_38%,#6328db_70%,#4b1eb8_100%)] shadow-[0_10px_26px_rgba(140,82,255,0.28)]">
      <div className="absolute inset-[-6px] rounded-full border border-[rgba(255,255,255,0.84)] bg-white/25 blur-[0.6px]" />
      <div className={`absolute inset-[-12px] rounded-full bg-[radial-gradient(circle,rgba(194,132,255,0.22)_0%,rgba(194,132,255,0.08)_48%,rgba(194,132,255,0)_78%)] ${active ? "animate-pulse" : "opacity-70"}`} />
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
        className="relative h-7 w-7 text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.24)]"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M32 10c1.8 9.8 2.6 10.6 12.4 12.4C34.6 24.2 33.8 25 32 34.8 30.2 25 29.4 24.2 19.6 22.4 29.4 20.6 30.2 19.8 32 10Z" />
        <path d="M50 8v10" />
        <path d="M45 13h10" />
        <circle cx="18" cy="40" r="4.4" />
      </svg>
    </div>
  )
}

function formatDateTime(value: string | null) {
  if (!value) return "Agora"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Agora"
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function formatEstimatedTime(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return remaining === 0 ? `${hours} h` : `${hours} h ${remaining} min`
}

function summaryNumber(summary: Record<string, unknown>, key: string) {
  const value = summary[key]
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function getLauncherState(plans: WhileYouRestHydratedPlan[]) {
  if (plans.some((plan) => plan.status === "waiting_confirmation")) {
    return "Precisa de você"
  }

  if (plans.some((plan) => plan.status === "paused")) {
    return "Execução pausada"
  }

  if (plans.some((plan) => plan.status === "queued" || plan.status === "running")) {
    return "COS trabalhando"
  }

  return "Enquanto você descansa"
}

function getLauncherTone(plans: WhileYouRestHydratedPlan[]) {
  if (plans.some((plan) => plan.status === "waiting_confirmation")) {
    return "border-orange-200 bg-[#1b1611] text-orange-50"
  }

  if (plans.some((plan) => plan.status === "paused")) {
    return "border-slate-200 bg-[#16181b] text-slate-50"
  }

  if (plans.some((plan) => plan.status === "queued" || plan.status === "running")) {
    return "border-emerald-200 bg-[#111111] text-white"
  }

  return "border-white/70 bg-[#0a0a0a] text-white"
}

function shouldPoll(plan: WhileYouRestHydratedPlan) {
  if (plan.status === "draft" || plan.status === "completed" || plan.status === "failed") {
    return false
  }

  if (plan.status === "cancelled") {
    return plan.items.some((item) => item.runtimeStatus === "em_execucao")
  }

  if (plan.status === "paused") {
    return plan.items.some((item) => item.runtimeStatus === "em_execucao")
  }

  return plan.items.some((item) => item.runtimeStatus === "aguardando" || item.runtimeStatus === "em_execucao")
}

function resolveResultLink(item: WhileYouRestHydratedPlan["items"][number]) {
  if (item.result?.entityType === "client") {
    return { href: "/portal/cadastros/clientes", label: "Ver clientes" }
  }

  if (item.result?.entityType === "document") {
    return { href: "/portal/documentos", label: "Ver documentos" }
  }

  return null
}

function getRuntimeIcon(status: WhileYouRestHydratedPlan["items"][number]["runtimeStatus"]) {
  switch (status) {
    case "concluido":
      return CheckCircle2
    case "em_execucao":
      return Loader2
    case "falhou":
      return XCircle
    case "cancelado":
      return Square
    case "aguardando_confirmacao":
      return CircleAlert
    default:
      return Circle
  }
}

function getRuntimeTone(status: WhileYouRestHydratedPlan["items"][number]["runtimeStatus"]) {
  switch (status) {
    case "concluido":
      return "text-emerald-600"
    case "em_execucao":
      return "text-amber-600"
    case "falhou":
      return "text-rose-600"
    case "cancelado":
      return "text-zinc-500"
    case "aguardando_confirmacao":
      return "text-orange-600"
    default:
      return "text-slate-500"
  }
}

function statusHeadline(status: WhileYouRestHydratedPlan["status"]) {
  switch (status) {
    case "queued":
      return "Tudo pronto para começar."
    case "running":
      return "Estou trabalhando nisso."
    case "paused":
      return "Execução pausada."
    case "cancelled":
      return "Execução encerrada."
    case "completed":
      return "Tudo pronto."
    case "completed_with_issues":
      return "Concluí o que foi possível."
    case "failed":
      return "Não consegui concluir esta execução."
    case "waiting_confirmation":
      return "Precisa de você."
    default:
      return "Tudo pronto para revisar."
  }
}

function SoftMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-[#ede8f7] bg-[linear-gradient(180deg,#ffffff_0%,#fcfaff_100%)] px-4 py-3 shadow-[0_10px_24px_rgba(123,76,214,0.06)]">
      <p className="text-[11px] uppercase tracking-[0.12em] text-[#8b84a1]">{label}</p>
      <p className="mt-1.5 text-base font-semibold text-[#1d1340]">{value}</p>
    </div>
  )
}

function SoftTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[#ebe5f7] bg-white/90 px-3 py-1 text-[11px] font-medium text-[#6a6280] shadow-[0_4px_12px_rgba(123,76,214,0.05)]">
      {children}
    </span>
  )
}

function resolvePrioritySummary(items: WhileYouRestHydratedPlan["items"]) {
  if (items.some((item) => item.priority === "alta")) return "Alta"
  if (items.some((item) => item.priority === "media")) return "Média"
  return "Baixa"
}

function resolveNearestDeadline(items: WhileYouRestHydratedPlan["items"]) {
  return items.find((item) => item.deadline)?.deadline ?? "Sem prazo"
}

export function WhileYouRestLauncher({ variant }: Props) {
  const { workspace, canManageWorkspace, isLoading } = useAuth()
  const [requestText, setRequestText] = useState("")
  const [draftPlan, setDraftPlan] = useState<WhileYouRestHydratedPlan | null>(null)
  const [plans, setPlans] = useState<WhileYouRestHydratedPlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const [loadingPlan, setLoadingPlan] = useState(false)
  const [loadingStart, setLoadingStart] = useState(false)
  const [loadingPause, setLoadingPause] = useState(false)
  const [loadingResume, setLoadingResume] = useState(false)
  const [loadingCancel, setLoadingCancel] = useState(false)
  const [loadingRefresh, setLoadingRefresh] = useState(false)

  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const refreshInFlightRef = useRef(false)

  const isOperationsWorkspace = workspace?.type === "operations"
  const selectedPlan = useMemo(() => plans.find((plan) => plan.id === selectedPlanId) ?? null, [plans, selectedPlanId])
  const phase: Phase = draftPlan ? "review" : selectedPlan ? "tracking" : "request"
  const launcherStatus = getLauncherState(plans)
  const launcherTone = getLauncherTone(plans)
  const launcherActive = plans.some((plan) => plan.status === "queued" || plan.status === "running")

  const groupedPlans = useMemo(
    () =>
      sections.map((section) => ({
        ...section,
        plans: plans.filter((plan) => section.statuses.some((status) => status === plan.status)),
      })),
    [plans],
  )

  const refreshPlans = async (preferredPlanId?: string | null) => {
    if (refreshInFlightRef.current) {
      return
    }

    refreshInFlightRef.current = true
    setLoadingRefresh(true)

    try {
      const result = await getWhileYouRestPlansAction()
      if ("error" in result || !result.success) {
        return
      }

      setPlans(result.plans)
      setSelectedPlanId((current) => preferredPlanId ?? current ?? result.plans[0]?.id ?? null)
    } finally {
      refreshInFlightRef.current = false
      setLoadingRefresh(false)
    }
  }

  const stopPolling = () => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current)
      pollingTimerRef.current = null
    }
  }

  useEffect(() => {
    if (!isOperationsWorkspace || !canManageWorkspace) {
      return
    }

    void refreshPlans()
  }, [canManageWorkspace, isOperationsWorkspace])

  useEffect(() => {
    stopPolling()

    if (!open) {
      return
    }

    const pollable = plans.some((plan) => shouldPoll(plan))
    if (!pollable) {
      return
    }

    pollingTimerRef.current = setInterval(() => {
      void refreshPlans()
    }, 8000)

    return () => {
      stopPolling()
    }
  }, [open, plans])

  if (isLoading || !isOperationsWorkspace || !canManageWorkspace) {
    return null
  }

  const hasMutationLoading = loadingStart || loadingPause || loadingResume || loadingCancel

  const handleBuildPlan = async () => {
    if (loadingPlan || !requestText.trim()) {
      return
    }

    setLoadingPlan(true)
    try {
      const result = await createWhileYouRestPlanAction(requestText)
      if (result.error || !result.plan) {
        toast({
          title: "Não foi possível organizar esse pedido",
          description: result.error ?? "Tente novamente em instantes.",
        })
        return
      }

      setDraftPlan(result.plan)
    } finally {
      setLoadingPlan(false)
    }
  }

  const handleAdjustRequest = () => {
    if (!draftPlan) {
      return
    }

    setRequestText(draftPlan.requestText)
    setDraftPlan(null)
    setSelectedPlanId(null)
  }

  const handleStartPlan = async () => {
    if (!draftPlan || loadingStart) {
      return
    }

    setLoadingStart(true)
    try {
      const result = await startWhileYouRestPlanAction(draftPlan.id)
      if (result.error || !result.plan) {
        toast({
          title: "Não foi possível começar",
          description: result.error ?? "Tente novamente em instantes.",
        })
        return
      }

      setDraftPlan(null)
      setRequestText("")
      await refreshPlans(result.plan.id)
      toast({
        title: "Comecei a cuidar disso",
        description: "O COS colocou a execução em andamento.",
      })
    } finally {
      setLoadingStart(false)
    }
  }

  const handlePause = async () => {
    if (!selectedPlan || loadingPause) {
      return
    }

    const snapshot = selectedPlan
    setPlans((current) => current.map((plan) => (plan.id === snapshot.id ? { ...plan, status: "paused" } : plan)))
    setLoadingPause(true)

    try {
      const result = await pauseWhileYouRestPlanAction(snapshot.id)
      if (result.error || !result.plan) {
        setPlans((current) => current.map((plan) => (plan.id === snapshot.id ? snapshot : plan)))
        toast({
          title: "Não foi possível pausar",
          description: result.error ?? "Tente novamente em instantes.",
        })
        return
      }

      setPlans((current) => current.map((plan) => (plan.id === result.plan!.id ? result.plan! : plan)))
      setSelectedPlanId(result.plan.id)
    } finally {
      setLoadingPause(false)
    }
  }

  const handleResume = async () => {
    if (!selectedPlan || loadingResume) {
      return
    }

    const snapshot = selectedPlan
    setPlans((current) => current.map((plan) => (plan.id === snapshot.id ? { ...plan, status: "queued" } : plan)))
    setLoadingResume(true)

    try {
      const result = await continueWhileYouRestPlanAction(snapshot.id)
      if (result.error || !result.plan) {
        setPlans((current) => current.map((plan) => (plan.id === snapshot.id ? snapshot : plan)))
        toast({
          title: "Não foi possível continuar",
          description: result.error ?? "Tente novamente em instantes.",
        })
        return
      }

      setPlans((current) => current.map((plan) => (plan.id === result.plan!.id ? result.plan! : plan)))
      setSelectedPlanId(result.plan.id)
    } finally {
      setLoadingResume(false)
    }
  }

  const handleCancel = async () => {
    if (!selectedPlan || loadingCancel) {
      return
    }

    if (!window.confirm("Encerrar esta execução? O que já foi concluído permanece salvo.")) {
      return
    }

    const snapshot = selectedPlan
    setPlans((current) => current.map((plan) => (plan.id === snapshot.id ? { ...plan, status: "cancelled" } : plan)))
    setLoadingCancel(true)

    try {
      const result = await endWhileYouRestPlanAction(snapshot.id)
      if (result.error || !result.plan) {
        setPlans((current) => current.map((plan) => (plan.id === snapshot.id ? snapshot : plan)))
        toast({
          title: "Não foi possível encerrar",
          description: result.error ?? "Tente novamente em instantes.",
        })
        return
      }

      setPlans((current) => current.map((plan) => (plan.id === result.plan!.id ? result.plan! : plan)))
      setSelectedPlanId(result.plan.id)
    } finally {
      setLoadingCancel(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed z-40 flex items-center gap-3 rounded-full border border-[rgba(199,170,248,0.9)] bg-white/90 px-3 py-2.5 text-left backdrop-blur-xl transition-all ${
          launcherActive ? "scale-[1.01]" : "scale-100"
        } ${variant === "app" ? "bottom-24 right-4 lg:bottom-6" : "bottom-6 right-4"}`}
        style={{
          minWidth: "min(90vw, 286px)",
          backgroundImage:
            "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,245,255,0.94) 100%)",
          boxShadow:
            "0 16px 34px rgba(165, 118, 255, 0.16), 0 0 0 1px rgba(205, 174, 251, 0.52), inset 0 1px 0 rgba(255,255,255,0.98), inset 0 -8px 18px rgba(210, 176, 255, 0.05)",
        }}
      >
        <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_78%_92%,rgba(255,132,232,0.18)_0%,rgba(255,132,232,0.06)_8%,rgba(255,255,255,0)_18%)]" />
        <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_18%_110%,rgba(171,108,255,0.14)_0%,rgba(171,108,255,0.06)_14%,rgba(255,255,255,0)_30%)]" />
        <span className="pointer-events-none absolute inset-0 rounded-full border border-white/70" />
        <div className="relative shrink-0">
          <WhileYouRestLauncherIcon active={launcherActive} />
        </div>
        <div className="relative min-w-0 pr-1">
          <span className="block truncate text-[15px] font-semibold leading-none tracking-[-0.03em] text-[#34178f] sm:text-[16px]">
            Enquanto você descansa
          </span>
          <span className="mt-1 block truncate text-[11px] font-medium leading-none text-[#7b6f9a]">
            {launcherStatus === "Enquanto você descansa" ? "Planeje e acompanhe o que o COS vai deixar pronto" : launcherStatus}
          </span>
        </div>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto border-l border-[#ede8f7] bg-[linear-gradient(180deg,#fcfbff_0%,#f8f6fc_100%)] p-0 sm:max-w-[1080px]">
          <SheetHeader className="border-b border-[#ede8f7] bg-white/72 px-5 py-4 backdrop-blur-xl sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <WhileYouRestIcon active={launcherActive} className="h-10 w-10" />
                <div>
                  <SheetTitle className="text-lg font-semibold tracking-[-0.03em] text-[#1d1340]">Enquanto você descansa</SheetTitle>
                  <SheetDescription className="mt-1 text-sm text-[#716789]">
                    O que você gostaria que eu deixasse pronto?
                  </SheetDescription>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDraftPlan(null)
                  setSelectedPlanId(null)
                  setRequestText("")
                }}
                className="rounded-full border-[#e6def7] bg-white px-4 text-[#4c3f74] shadow-[0_8px_18px_rgba(123,76,214,0.06)] hover:bg-[#faf7ff]"
              >
                <Plus className="h-4 w-4" />
                Novo trabalho
              </Button>
            </div>
          </SheetHeader>

          <div className="grid gap-5 px-5 py-5 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1.25fr)_340px]">
            <div className="space-y-5">
              {phase === "request" && (
                <section className="space-y-4">
                  <div className="rounded-[28px] border border-[#ede8f7] bg-[linear-gradient(180deg,#ffffff_0%,#fcfbff_100%)] p-5 shadow-[0_18px_40px_rgba(123,76,214,0.08)] sm:p-6">
                    <p className="text-sm leading-7 text-[#544b68]">
                      Conte o que precisa deixar encaminhado. O COS organizará o plano e executará automaticamente tudo o que for possível.
                    </p>
                    <Textarea
                      value={requestText}
                      onChange={(event) => setRequestText(event.target.value)}
                      rows={9}
                      placeholder="Ex.: cadastrar cliente Clínica Aurora, preparar contrato para julho, revisar o que depende da minha confirmação e me deixar um resumo quando terminar."
                      className="mt-5 resize-none rounded-[26px] border-[#ebe4f8] bg-[#faf8ff] px-4 py-4 text-sm text-[#1d1340] shadow-none focus-visible:border-[#cdbaf8] focus-visible:ring-0"
                    />
                    <div className="mt-5 flex justify-end">
                      <Button
                        type="button"
                        onClick={() => void handleBuildPlan()}
                        disabled={!requestText.trim() || loadingPlan}
                        className="rounded-full border border-[#8750f7] bg-[linear-gradient(180deg,#8f53ff_0%,#6f35e8_100%)] px-5 text-white shadow-[0_12px_26px_rgba(123,76,214,0.18)] hover:brightness-[1.03]"
                      >
                        {loadingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        Organizar tudo
                      </Button>
                    </div>
                  </div>
                </section>
              )}

              {phase === "review" && draftPlan && (
                <section className="space-y-4">
                  <div className="rounded-[28px] border border-[#ede8f7] bg-[linear-gradient(180deg,#ffffff_0%,#fcfbff_100%)] p-5 shadow-[0_18px_40px_rgba(123,76,214,0.08)] sm:p-6">
                    <div className="flex items-center gap-3">
                      <WhileYouRestIcon className="h-10 w-10" />
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f84a9]">Planejamento</p>
                        <h2 className="mt-1 text-[28px] font-semibold tracking-[-0.04em] text-[#1d1340]">Enquanto você descansa</h2>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-[#544b68]">Vou cuidar de:</p>

                    <div className="mt-5 space-y-3">
                      {draftPlan.items.map((item) => (
                        <div key={item.id} className="rounded-[22px] border border-[#ece6f7] bg-[#faf8ff] p-4">
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 text-base leading-none text-[#5d32d5]">{item.kind === "executable" ? "✓" : "○"}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-[#1d1340]">{item.title}</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <SoftTag>{`Prioridade ${item.priority}`}</SoftTag>
                                {item.deadline ? <SoftTag>{`Prazo ${item.deadline}`}</SoftTag> : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      <SoftMetric label="Prioridade dominante" value={resolvePrioritySummary(draftPlan.items)} />
                      <SoftMetric label="Prazo mais próximo" value={resolveNearestDeadline(draftPlan.items)} />
                      <SoftMetric label="Tempo estimado total" value={formatEstimatedTime(draftPlan.estimatedMinutes)} />
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        onClick={() => void handleStartPlan()}
                        disabled={loadingStart}
                        className="rounded-full border border-[#8750f7] bg-[linear-gradient(180deg,#8f53ff_0%,#6f35e8_100%)] px-5 text-white shadow-[0_12px_26px_rgba(123,76,214,0.18)] hover:brightness-[1.03]"
                      >
                        {loadingStart ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                        Começar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAdjustRequest}
                        className="rounded-full border-[#e6def7] bg-white px-4 text-[#4c3f74] hover:bg-[#faf7ff]"
                      >
                        Ajustar pedido
                      </Button>
                    </div>
                  </div>
                </section>
              )}

              {phase === "tracking" && selectedPlan && (
                <section className="space-y-4">
                  <div className="rounded-[28px] border border-[#ede8f7] bg-[linear-gradient(180deg,#ffffff_0%,#fcfbff_100%)] p-5 shadow-[0_18px_40px_rgba(123,76,214,0.08)] sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <WhileYouRestIcon active={selectedPlan.status === "queued" || selectedPlan.status === "running"} className="h-10 w-10" />
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f84a9]">
                            {selectedPlan.status === "cancelled" ? "Execução encerrada" : "Execução"}
                          </p>
                          <h2 className="mt-1 text-[28px] font-semibold tracking-[-0.04em] text-[#1d1340]">{statusHeadline(selectedPlan.status)}</h2>
                          <p className="mt-3 text-sm leading-7 text-[#544b68]">{selectedPlan.title}</p>
                        </div>
                      </div>
                      {loadingRefresh && <Loader2 className="h-5 w-5 animate-spin text-[#8f84a9]" />}
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      <SoftMetric label="Concluídas" value={String(summaryNumber(selectedPlan.summary, "completedCount"))} />
                      <SoftMetric label="Em andamento" value={String(summaryNumber(selectedPlan.summary, "runningCount"))} />
                      <SoftMetric label="Pendentes" value={String(summaryNumber(selectedPlan.summary, "pendingCount"))} />
                      <SoftMetric label="Com erro" value={String(summaryNumber(selectedPlan.summary, "failedCount"))} />
                      <SoftMetric label="Aguardando confirmação" value={String(summaryNumber(selectedPlan.summary, "waitingConfirmationCount"))} />
                      <SoftMetric label="Canceladas" value={String(summaryNumber(selectedPlan.summary, "cancelledCount"))} />
                    </div>

                    <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-[#eee8fa]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#8f53ff_0%,#6f35e8_100%)]"
                        style={{ width: `${summaryNumber(selectedPlan.summary, "progressPercent")}%` }}
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3 text-sm text-[#716789]">
                      <span>
                        Progresso {summaryNumber(selectedPlan.summary, "finalizedCount")}/{summaryNumber(selectedPlan.summary, "totalCount")}
                      </span>
                      <span>Início {formatDateTime(selectedPlan.startedAt ?? selectedPlan.createdAt)}</span>
                      <span>Tempo decorrido {selectedPlan.elapsedLabel}</span>
                    </div>

                    {!["completed", "completed_with_issues", "failed", "cancelled"].includes(selectedPlan.status) && (
                      <div className="mt-6 flex flex-wrap items-center gap-3">
                        {selectedPlan.status === "paused" ? (
                          <Button
                            type="button"
                            onClick={() => void handleResume()}
                            disabled={loadingResume || hasMutationLoading}
                            className="rounded-full border border-[#8750f7] bg-[linear-gradient(180deg,#8f53ff_0%,#6f35e8_100%)] px-5 text-white shadow-[0_12px_26px_rgba(123,76,214,0.18)] hover:brightness-[1.03]"
                          >
                            {loadingResume ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                            Continuar
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => void handlePause()}
                            disabled={loadingPause || hasMutationLoading}
                            className="rounded-full border-[#e6def7] bg-white px-4 text-[#4c3f74] hover:bg-[#faf7ff]"
                          >
                            {loadingPause ? <Loader2 className="h-4 w-4 animate-spin" /> : <PauseCircle className="h-4 w-4" />}
                            Pausar
                          </Button>
                        )}

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void handleCancel()}
                          disabled={loadingCancel || hasMutationLoading}
                          className="rounded-full border-[#f3d9df] bg-white px-4 text-[#9b4a5d] hover:bg-[#fff8fa]"
                        >
                          {loadingCancel ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                          Encerrar
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="rounded-[28px] border border-[#ede8f7] bg-[linear-gradient(180deg,#ffffff_0%,#fcfbff_100%)] p-5 shadow-[0_18px_40px_rgba(123,76,214,0.08)] sm:p-6">
                    <div className="space-y-3">
                      {selectedPlan.items.map((item) => {
                        const Icon = getRuntimeIcon(item.runtimeStatus)
                        const tone = getRuntimeTone(item.runtimeStatus)
                        const resultLink = resolveResultLink(item)
                        return (
                          <div key={item.id} className="rounded-[22px] border border-[#ece6f7] bg-[#faf8ff] p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  {item.actionType === "create_client" ? (
                                    <UserRoundPlus className="h-4 w-4 text-[#5d32d5]" />
                                  ) : item.actionType === "create_document" ? (
                                    <FileText className="h-4 w-4 text-[#5d32d5]" />
                                  ) : (
                                    <Icon className={`h-4 w-4 ${tone} ${item.runtimeStatus === "em_execucao" ? "animate-spin" : ""}`} />
                                  )}
                                  <p className="text-sm font-medium text-[#1d1340]">{item.title}</p>
                                </div>
                                <p className="mt-2 text-sm leading-6 text-[#5f5673]">{item.description}</p>
                                {item.error ? <p className="mt-3 text-sm text-[#9b4a5d]">{item.error}</p> : null}
                              </div>
                              {resultLink ? (
                                <Link href={resultLink.href} className="text-xs font-medium text-[#4f2ac7] underline-offset-4 hover:underline">
                                  {resultLink.label}
                                </Link>
                              ) : null}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </section>
              )}
            </div>

            <aside className="space-y-4">
              <div className="rounded-[24px] border border-[#ede8f7] bg-[linear-gradient(180deg,#ffffff_0%,#fcfbff_100%)] p-4 shadow-[0_14px_30px_rgba(123,76,214,0.07)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f84a9]">Execuções</p>
                    <p className="mt-2 text-sm leading-6 text-[#5f5673]">Você delega. O COS assume e organiza o andamento.</p>
                  </div>
                  {loadingRefresh && <Loader2 className="h-4 w-4 animate-spin text-[#8f84a9]" />}
                </div>
              </div>

              {groupedPlans.map((section) =>
                section.plans.length > 0 ? (
                  <div key={section.key} className="space-y-3">
                    <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f84a9]">{section.title}</p>
                    {section.plans.map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => {
                          setDraftPlan(null)
                          setSelectedPlanId(plan.id)
                        }}
                        className={`w-full rounded-[22px] border p-4 text-left transition ${
                          plan.id === selectedPlanId
                            ? "border-[#d8c8fb] bg-[linear-gradient(180deg,#ffffff_0%,#fbf8ff_100%)] shadow-[0_14px_28px_rgba(123,76,214,0.10)]"
                            : "border-[#ece6f7] bg-white/92 hover:border-[#dccdf8]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#1d1340]">{plan.title}</p>
                            <p className="mt-1 text-xs text-[#8f84a9]">Início {formatDateTime(plan.startedAt ?? plan.createdAt)}</p>
                          </div>
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${getExecutionBadgeTone(plan.status)}`}>
                            {section.title}
                          </span>
                        </div>

                        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#eee8fa]">
                          <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,#8f53ff_0%,#6f35e8_100%)]"
                            style={{ width: `${summaryNumber(plan.summary, "progressPercent")}%` }}
                          />
                        </div>

                        <div className="mt-4 flex items-center gap-4 text-xs text-[#716789]">
                          <span>
                            <strong className="font-semibold text-[#1d1340]">{summaryNumber(plan.summary, "completedCount")}</strong> concluídas
                          </span>
                          <span>
                            <strong className="font-semibold text-[#1d1340]">{summaryNumber(plan.summary, "pendingCount")}</strong> pendentes
                          </span>
                          <span>
                            <strong className="font-semibold text-[#1d1340]">{summaryNumber(plan.summary, "failedCount")}</strong> com erro
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null,
              )}
            </aside>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
