"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import Link from "next/link"
import {
  CheckCircle2,
  Circle,
  CircleAlert,
  FileText,
  Loader2,
  MoonStar,
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

type ExecutionSection = {
  key: "in_progress" | "paused" | "waiting_confirmation" | "completed" | "error" | "cancelled"
  title: string
  statuses: WhileYouRestHydratedPlan["status"][]
}

const sections: ExecutionSection[] = [
  { key: "in_progress", title: "Em andamento", statuses: ["queued", "running"] },
  { key: "paused", title: "Pausadas", statuses: ["paused"] },
  { key: "waiting_confirmation", title: "Aguardando você", statuses: ["waiting_confirmation"] },
  { key: "completed", title: "Concluídas", statuses: ["completed", "completed_with_issues"] },
  { key: "error", title: "Com erro", statuses: ["failed"] },
  { key: "cancelled", title: "Encerradas", statuses: ["cancelled"] },
]

const statusText: Record<WhileYouRestHydratedPlan["status"], string> = {
  draft: "Tudo pronto para revisar.",
  queued: "Tudo pronto para começar.",
  running: "Estou trabalhando nisso.",
  paused: "Execução pausada.",
  waiting_confirmation: "Aguardando sua confirmação.",
  completed: "Tudo pronto.",
  completed_with_issues: "Concluí o que foi possível.",
  failed: "Não consegui concluir esta execução.",
  cancelled: "Execução encerrada.",
}

function getExecutionBadgeTone(status: WhileYouRestHydratedPlan["status"]) {
  if (status === "queued" || status === "running") return "bg-amber-50 text-amber-700"
  if (status === "paused") return "bg-slate-100 text-slate-700"
  if (status === "waiting_confirmation") return "bg-orange-50 text-orange-700"
  if (status === "completed" || status === "completed_with_issues") return "bg-emerald-50 text-emerald-700"
  if (status === "cancelled") return "bg-zinc-100 text-zinc-700"
  return "bg-rose-50 text-rose-700"
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
    case "nao_suportado":
      return Circle
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
    case "nao_suportado":
      return "text-zinc-500"
    default:
      return "text-slate-500"
  }
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

function numberFromSummary(summary: Record<string, unknown>, key: string) {
  const value = summary[key]
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

export function WhileYouRestLauncher({ variant }: Props) {
  const { workspace, canManageWorkspace, isLoading } = useAuth()
  const [open, setOpen] = useState(false)
  const [requestText, setRequestText] = useState("")
  const [draftPlan, setDraftPlan] = useState<WhileYouRestHydratedPlan | null>(null)
  const [plans, setPlans] = useState<WhileYouRestHydratedPlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [localStatusOverride, setLocalStatusOverride] = useState<Record<string, WhileYouRestHydratedPlan["status"]>>({})
  const [isPlanning, startPlanning] = useTransition()
  const [isStarting, startStarting] = useTransition()
  const [isMutating, startMutating] = useTransition()
  const [isRefreshing, startRefreshing] = useTransition()
  const pollingRef = useRef(false)

  const isOperationsWorkspace = workspace?.type === "operations"
  const selectedPlan = useMemo(() => plans.find((plan) => plan.id === selectedPlanId) ?? null, [plans, selectedPlanId])
  const phase = draftPlan ? "review" : selectedPlan ? "tracking" : "request"

  const visiblePlans = useMemo(
    () =>
      plans.map((plan) =>
        localStatusOverride[plan.id]
          ? {
              ...plan,
              status: localStatusOverride[plan.id],
            }
          : plan,
      ),
    [localStatusOverride, plans],
  )

  const visibleSelectedPlan = useMemo(
    () => visiblePlans.find((plan) => plan.id === selectedPlanId) ?? selectedPlan,
    [selectedPlan, selectedPlanId, visiblePlans],
  )

  const groupedPlans = useMemo(
    () =>
      sections.map((section) => ({
        ...section,
        plans: visiblePlans.filter((plan) => section.statuses.includes(plan.status)),
      })),
    [visiblePlans],
  )

  const hasPollingCandidate = useMemo(
    () =>
      plans.some((plan) => {
        if (["completed", "completed_with_issues", "failed"].includes(plan.status)) {
          return false
        }

        if (plan.status === "cancelled") {
          return plan.items.some((item) => item.runtimeStatus === "em_execucao")
        }

        if (plan.status === "paused") {
          return plan.items.some((item) => item.runtimeStatus === "em_execucao")
        }

        return plan.items.some((item) => item.runtimeStatus === "aguardando" || item.runtimeStatus === "em_execucao")
      }),
    [plans],
  )

  const refreshPlans = async (preferredPlanId?: string | null) => {
    if (pollingRef.current) {
      return
    }

    pollingRef.current = true

    try {
      const result = await getWhileYouRestPlansAction()
      if ("error" in result || !result.success) {
        return
      }

      setPlans(result.plans)
      setSelectedPlanId((current) => preferredPlanId ?? current ?? result.plans[0]?.id ?? null)
      setLocalStatusOverride({})
    } finally {
      pollingRef.current = false
    }
  }

  useEffect(() => {
    if (!isOperationsWorkspace || !canManageWorkspace) {
      return
    }

    startRefreshing(async () => {
      await refreshPlans()
    })
  }, [canManageWorkspace, isOperationsWorkspace])

  useEffect(() => {
    if (!open || !hasPollingCandidate) {
      return
    }

    const interval = window.setInterval(() => {
      startRefreshing(async () => {
        await refreshPlans()
      })
    }, 8000)

    return () => window.clearInterval(interval)
  }, [hasPollingCandidate, open])

  if (isLoading || !isOperationsWorkspace || !canManageWorkspace) {
    return null
  }

  const handleBuildPlan = () => {
    startPlanning(async () => {
      const result = await createWhileYouRestPlanAction(requestText)
      if (result.error || !result.plan) {
        toast({
          title: "Não foi possível organizar esse pedido",
          description: result.error ?? "Tente novamente em instantes.",
        })
        return
      }

      setDraftPlan(result.plan)
    })
  }

  const handleStartPlan = () => {
    if (!draftPlan) {
      return
    }

    startStarting(async () => {
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
    })
  }

  const runOptimisticMutation = ({
    planId,
    optimisticStatus,
    pendingTitle,
    action,
  }: {
    planId: string
    optimisticStatus: WhileYouRestHydratedPlan["status"]
    pendingTitle: string
    action: () => Promise<{ error?: string; plan?: WhileYouRestHydratedPlan; success?: boolean }>
  }) => {
    if (isMutating) {
      return
    }

    setLocalStatusOverride((current) => ({ ...current, [planId]: optimisticStatus }))

    startMutating(async () => {
      toast({
        title: pendingTitle,
      })

      const result = await action()
      if (result.error || !result.plan) {
        setLocalStatusOverride((current) => {
          const next = { ...current }
          delete next[planId]
          return next
        })
        toast({
          title: "Não foi possível concluir a ação",
          description: result.error ?? "Tente novamente em instantes.",
        })
        return
      }

      await refreshPlans(planId)
    })
  }

  const selectedPlanForActions = visibleSelectedPlan

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed z-40 flex items-center gap-3 rounded-full border border-white/70 bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white shadow-[0_18px_50px_rgba(10,10,10,0.24)] backdrop-blur ${
          variant === "app" ? "bottom-24 right-4 lg:bottom-6" : "bottom-6 right-4"
        }`}
      >
        <MoonStar className="h-4 w-4" />
        <span>Enquanto você descansa</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto border-l border-[#e7e5df] bg-[#fcfbf8] p-0 sm:max-w-[1080px]">
          <SheetHeader className="border-b border-[#ece9e2] px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#111111] text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <SheetTitle className="text-xl text-[#111111]">Enquanto você descansa</SheetTitle>
                  <SheetDescription className="mt-1 text-sm text-[#6d675f]">
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
                className="rounded-full border-[#d8d0c3] bg-white"
              >
                <Plus className="h-4 w-4" />
                Novo trabalho
              </Button>
            </div>
          </SheetHeader>

          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.25fr)_360px]">
            <div className="space-y-6">
              {phase === "request" && (
                <section className="space-y-4">
                  <div className="rounded-[32px] border border-[#ece9e2] bg-white p-6 shadow-sm">
                    <p className="text-sm leading-7 text-[#4c463f]">
                      Conte o que precisa deixar encaminhado. O COS organizará o plano e executará automaticamente tudo o que for possível.
                    </p>
                    <Textarea
                      value={requestText}
                      onChange={(event) => setRequestText(event.target.value)}
                      rows={9}
                      placeholder="Ex.: cadastrar cliente Clínica Aurora, preparar contrato para julho, revisar o que depende da minha confirmação e me deixar um resumo quando terminar."
                      className="mt-5 resize-none rounded-3xl border-[#e8e2d7] bg-[#faf8f3] px-4 py-4 text-sm text-[#111111] shadow-none focus-visible:border-[#d8d0c3] focus-visible:ring-0"
                    />
                    <div className="mt-5 flex justify-end">
                      <Button
                        type="button"
                        onClick={handleBuildPlan}
                        disabled={!requestText.trim() || isPlanning}
                        className="rounded-full bg-[#111111] px-5 text-white hover:bg-[#222222]"
                      >
                        {isPlanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        Organizar plano
                      </Button>
                    </div>
                  </div>
                </section>
              )}

              {phase === "review" && draftPlan && (
                <section className="space-y-4">
                  <div className="rounded-[32px] border border-[#ece9e2] bg-white p-6 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b847b]">Planejamento</p>
                    <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#111111]">Enquanto você descansa</h2>
                    <p className="mt-3 text-sm leading-7 text-[#4c463f]">Vou cuidar de:</p>

                    <div className="mt-5 space-y-4">
                      {draftPlan.items.map((item) => (
                        <div key={item.id} className="rounded-[24px] border border-[#ece9e2] bg-[#faf8f3] p-4">
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 text-lg leading-none text-[#111111]">{getReviewLinePrefix(item)}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-[#111111]">{item.title}</p>
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
                        onClick={handleStartPlan}
                        disabled={isStarting}
                        className="rounded-full bg-[#111111] px-5 text-white hover:bg-[#222222]"
                      >
                        {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                        Começar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setRequestText(draftPlan.requestText)
                          setDraftPlan(null)
                        }}
                        className="rounded-full border-[#d8d0c3] bg-white"
                      >
                        Ajustar pedido
                      </Button>
                    </div>
                  </div>
                </section>
              )}

              {phase === "tracking" && selectedPlanForActions && (
                <section className="space-y-4">
                  <div className="rounded-[32px] border border-[#ece9e2] bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b847b]">
                          {selectedPlanForActions.status === "cancelled" ? "Execução encerrada" : "Execução"}
                        </p>
                        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#111111]">{statusText[selectedPlanForActions.status]}</h2>
                        <p className="mt-3 text-sm leading-7 text-[#4c463f]">{selectedPlanForActions.title}</p>
                      </div>
                      {(isRefreshing || isMutating) && <Loader2 className="h-5 w-5 animate-spin text-[#8b847b]" />}
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      <SoftMetric label="Concluídas" value={String(numberFromSummary(selectedPlanForActions.summary, "completedCount"))} />
                      <SoftMetric
                        label="Em andamento"
                        value={String(numberFromSummary(selectedPlanForActions.summary, "runningCount"))}
                      />
                      <SoftMetric label="Pendentes" value={String(numberFromSummary(selectedPlanForActions.summary, "pendingCount"))} />
                      <SoftMetric label="Com erro" value={String(numberFromSummary(selectedPlanForActions.summary, "failedCount"))} />
                      <SoftMetric
                        label="Aguardando confirmação"
                        value={String(numberFromSummary(selectedPlanForActions.summary, "waitingConfirmationCount"))}
                      />
                      <SoftMetric
                        label="Canceladas"
                        value={String(numberFromSummary(selectedPlanForActions.summary, "cancelledCount"))}
                      />
                    </div>

                    <div className="mt-6 h-2 overflow-hidden rounded-full bg-[#f0ece6]">
                      <div
                        className="h-full rounded-full bg-[#111111]"
                        style={{ width: `${numberFromSummary(selectedPlanForActions.summary, "progressPercent")}%` }}
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3 text-sm text-[#6d675f]">
                      <span>Progresso {numberFromSummary(selectedPlanForActions.summary, "finalizedCount")}/{numberFromSummary(selectedPlanForActions.summary, "totalCount")}</span>
                      <span>Início {formatDateTime(selectedPlanForActions.startedAt ?? selectedPlanForActions.createdAt)}</span>
                      <span>Tempo decorrido {selectedPlanForActions.elapsedLabel}</span>
                    </div>

                    {!["completed", "completed_with_issues", "failed", "cancelled"].includes(selectedPlanForActions.status) && (
                      <div className="mt-6 flex flex-wrap items-center gap-3">
                        {selectedPlanForActions.status === "paused" ? (
                          <Button
                            type="button"
                            onClick={() =>
                              runOptimisticMutation({
                                planId: selectedPlanForActions.id,
                                optimisticStatus: "queued",
                                pendingTitle: "Retomando...",
                                action: () => continueWhileYouRestPlanAction(selectedPlanForActions.id),
                              })
                            }
                            disabled={isMutating}
                            className="rounded-full bg-[#111111] px-5 text-white hover:bg-[#222222]"
                          >
                            <PlayCircle className="h-4 w-4" />
                            Continuar
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              runOptimisticMutation({
                                planId: selectedPlanForActions.id,
                                optimisticStatus: "paused",
                                pendingTitle: "Pausando...",
                                action: () => pauseWhileYouRestPlanAction(selectedPlanForActions.id),
                              })
                            }
                            disabled={isMutating}
                            className="rounded-full border-[#d8d0c3] bg-white"
                          >
                            <PauseCircle className="h-4 w-4" />
                            Pausar
                          </Button>
                        )}

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            if (!window.confirm("Encerrar esta execução? O que já foi concluído permanece salvo.")) {
                              return
                            }

                            runOptimisticMutation({
                              planId: selectedPlanForActions.id,
                              optimisticStatus: "cancelled",
                              pendingTitle: "Encerrando...",
                              action: () => endWhileYouRestPlanAction(selectedPlanForActions.id),
                            })
                          }}
                          disabled={isMutating}
                          className="rounded-full border-[#ead4d4] bg-white text-[#8b4141] hover:bg-[#fff7f7]"
                        >
                          <Square className="h-4 w-4" />
                          Encerrar
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="rounded-[32px] border border-[#ece9e2] bg-white p-6 shadow-sm">
                    <div className="space-y-4">
                      {selectedPlanForActions.items.map((item) => {
                        const Icon = getRuntimeIcon(item.runtimeStatus)
                        const tone = getRuntimeTone(item.runtimeStatus)
                        const resultLink = resolveResultLink(item)
                        return (
                          <div key={item.id} className="rounded-[24px] border border-[#ece9e2] bg-[#faf8f3] p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  {item.actionType === "create_client" ? (
                                    <UserRoundPlus className="h-4 w-4 text-[#111111]" />
                                  ) : item.actionType === "create_document" ? (
                                    <FileText className="h-4 w-4 text-[#111111]" />
                                  ) : (
                                    <Icon className={`h-4 w-4 ${tone} ${item.runtimeStatus === "em_execucao" ? "animate-spin" : ""}`} />
                                  )}
                                  <p className="text-sm font-medium text-[#111111]">{item.title}</p>
                                </div>
                                <p className="mt-2 text-sm leading-6 text-[#5d564d]">{item.description}</p>
                                {item.error ? <p className="mt-3 text-sm text-[#8b4141]">{item.error}</p> : null}
                              </div>
                              {resultLink ? (
                                <Link href={resultLink.href} className="text-xs font-medium text-[#0a0a0a] underline-offset-4 hover:underline">
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
              <div className="rounded-[28px] border border-[#ece9e2] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b847b]">Execuções</p>
                    <p className="mt-2 text-sm text-[#5d564d]">Você delega. O COS assume e organiza o andamento.</p>
                  </div>
                  {isRefreshing && <Loader2 className="h-4 w-4 animate-spin text-[#8b847b]" />}
                </div>
              </div>

              {groupedPlans.map((section) =>
                section.plans.length > 0 ? (
                  <div key={section.key} className="space-y-3">
                    <p className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8b847b]">{section.title}</p>
                    {section.plans.map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => {
                          setDraftPlan(null)
                          setSelectedPlanId(plan.id)
                        }}
                        className={`w-full rounded-[24px] border p-4 text-left transition ${
                          plan.id === selectedPlanId ? "border-[#111111] bg-white shadow-sm" : "border-[#ece9e2] bg-white/90 hover:border-[#d8d0c3]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#111111]">{plan.title}</p>
                            <p className="mt-1 text-xs text-[#8b847b]">Início {formatDateTime(plan.startedAt ?? plan.createdAt)}</p>
                          </div>
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${getExecutionBadgeTone(plan.status)}`}>
                            {section.title}
                          </span>
                        </div>

                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#f0ece6]">
                          <div
                            className="h-full rounded-full bg-[#111111]"
                            style={{ width: `${numberFromSummary(plan.summary, "progressPercent")}%` }}
                          />
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-[#6d675f]">
                          <div>
                            <p>Concluídas</p>
                            <p className="mt-1 text-sm font-semibold text-[#111111]">{numberFromSummary(plan.summary, "completedCount")}</p>
                          </div>
                          <div>
                            <p>Pendentes</p>
                            <p className="mt-1 text-sm font-semibold text-[#111111]">{numberFromSummary(plan.summary, "pendingCount")}</p>
                          </div>
                          <div>
                            <p>Com erro</p>
                            <p className="mt-1 text-sm font-semibold text-[#111111]">{numberFromSummary(plan.summary, "failedCount")}</p>
                          </div>
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

function SoftMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#ece9e2] bg-[#faf8f3] px-4 py-3">
      <p className="text-xs text-[#8b847b]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[#111111]">{value}</p>
    </div>
  )
}

function SoftTag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-white px-3 py-1 text-xs text-[#6d675f]">{children}</span>
}

function resolvePrioritySummary(items: WhileYouRestHydratedPlan["items"]) {
  if (items.some((item) => item.priority === "alta")) {
    return "Alta"
  }
  if (items.some((item) => item.priority === "media")) {
    return "Média"
  }
  return "Baixa"
}

function resolveNearestDeadline(items: WhileYouRestHydratedPlan["items"]) {
  return items.find((item) => item.deadline)?.deadline ?? "Sem prazo"
}

function getReviewLinePrefix(item: WhileYouRestHydratedPlan["items"][number]) {
  return item.kind === "executable" ? "✓" : "○"
}
