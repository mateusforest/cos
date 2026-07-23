"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
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

type RuntimeStatus = "aguardando" | "em_execucao" | "concluido" | "falhou" | "aguardando_confirmacao" | "nao_suportado"
type DisplayStatus = "in_progress" | "waiting_confirmation" | "completed" | "error" | "paused"

type PlanItem = {
  id: string
  title: string
  description: string
  priority: string
  deadline: string | null
  actionType: string
  kind: "executable" | "waiting_confirmation" | "unsupported"
  predictedStatus: string
  requiresConfirmation: boolean
  payload: Record<string, unknown>
  runtimeStatus: RuntimeStatus
  jobId: string | null
  result: Record<string, unknown> | null
  error: string | null
}

type HydratedPlan = {
  id: string
  title: string
  requestText: string
  status: "draft" | "running" | "completed" | "partial" | "waiting_confirmation" | "failed"
  displayStatus: DisplayStatus
  controlState: "draft" | "running" | "paused" | "ended"
  isFinished: boolean
  items: PlanItem[]
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  elapsedLabel: string
  estimatedMinutes: number
  summary: Record<string, unknown>
}

type Props = {
  variant: "app" | "portal"
}

const sectionOrder: Array<{ key: DisplayStatus; title: string }> = [
  { key: "in_progress", title: "Em andamento" },
  { key: "waiting_confirmation", title: "Aguardando confirmação" },
  { key: "completed", title: "Concluídas" },
  { key: "error", title: "Com erro" },
  { key: "paused", title: "Pausadas" },
]

const itemStatusCopy: Record<
  RuntimeStatus,
  {
    label: string
    icon: typeof CheckCircle2
    tone: string
  }
> = {
  concluido: { label: "Vou cuidar disso", icon: CheckCircle2, tone: "text-emerald-600" },
  em_execucao: { label: "Estou cuidando disso", icon: Loader2, tone: "text-amber-600" },
  aguardando: { label: "Na fila", icon: Circle, tone: "text-slate-500" },
  aguardando_confirmacao: { label: "Depende da sua confirmação", icon: Circle, tone: "text-orange-600" },
  nao_suportado: { label: "Ainda não consigo assumir essa parte", icon: Circle, tone: "text-zinc-500" },
  falhou: { label: "Precisa de revisão", icon: XCircle, tone: "text-rose-600" },
}

const executionTone: Record<DisplayStatus, string> = {
  in_progress: "bg-amber-50 text-amber-700",
  waiting_confirmation: "bg-orange-50 text-orange-700",
  completed: "bg-emerald-50 text-emerald-700",
  error: "bg-rose-50 text-rose-700",
  paused: "bg-slate-100 text-slate-700",
}

function resolveResultLink(item: PlanItem) {
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
  if (minutes < 60) {
    return `${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return remaining === 0 ? `${hours} h` : `${hours} h ${remaining} min`
}

function buildProgressLabel(plan: HydratedPlan) {
  const completed = Number(plan.summary.completedCount ?? 0)
  const total = Number(plan.summary.totalCount ?? plan.items.length)
  return `${completed}/${total}`
}

export function WhileYouRestLauncher({ variant }: Props) {
  const { workspace, canManageWorkspace, isLoading } = useAuth()
  const [open, setOpen] = useState(false)
  const [requestText, setRequestText] = useState("")
  const [draftPlan, setDraftPlan] = useState<HydratedPlan | null>(null)
  const [plans, setPlans] = useState<HydratedPlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [isPlanning, startPlanning] = useTransition()
  const [isStarting, startStarting] = useTransition()
  const [isRefreshing, startRefreshing] = useTransition()
  const [isMutating, startMutating] = useTransition()

  const isOperationsWorkspace = workspace?.type === "operations"
  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  )
  const activePlan = draftPlan ?? selectedPlan
  const phase = draftPlan ? "review" : selectedPlan ? "tracking" : "request"
  const hasActiveExecution = plans.some((plan) => plan.displayStatus === "in_progress")

  const groupedPlans = useMemo(() => {
    return sectionOrder.map((section) => ({
      ...section,
      plans: plans.filter((plan) => plan.displayStatus === section.key),
    }))
  }, [plans])

  useEffect(() => {
    if (!isOperationsWorkspace || !canManageWorkspace) {
      return
    }

    startRefreshing(async () => {
      const result = await getWhileYouRestPlansAction()
      if ("error" in result || !result.success) {
        return
      }

      setPlans(result.plans)
      setSelectedPlanId((current) => current ?? result.plans[0]?.id ?? null)
    })
  }, [canManageWorkspace, isOperationsWorkspace])

  useEffect(() => {
    if (!open) {
      return
    }

    const shouldPoll = plans.some(
      (plan) => plan.displayStatus === "in_progress" || plan.displayStatus === "paused" || plan.displayStatus === "waiting_confirmation",
    )

    if (!shouldPoll) {
      return
    }

    const interval = window.setInterval(() => {
      startRefreshing(async () => {
        const result = await getWhileYouRestPlansAction()
        if ("error" in result || !result.success) {
          return
        }

        setPlans(result.plans)
        setSelectedPlanId((current) => current ?? result.plans[0]?.id ?? null)
      })
    }, 8000)

    return () => window.clearInterval(interval)
  }, [open, plans])

  if (isLoading || !isOperationsWorkspace || !canManageWorkspace) {
    return null
  }

  const refreshPlans = async (nextSelectedId?: string | null) => {
    const result = await getWhileYouRestPlansAction()
    if ("error" in result || !result.success) {
      return
    }

    setPlans(result.plans)
    setSelectedPlanId(nextSelectedId ?? result.plans[0]?.id ?? null)
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
        description: "O COS já colocou a execução em andamento.",
      })
    })
  }

  const handlePause = (planId: string) => {
    startMutating(async () => {
      const result = await pauseWhileYouRestPlanAction(planId)
      if (result.error || !result.plan) {
        toast({
          title: "Não foi possível pausar",
          description: result.error ?? "Tente novamente em instantes.",
        })
        return
      }

      await refreshPlans(planId)
    })
  }

  const handleContinue = (planId: string) => {
    startMutating(async () => {
      const result = await continueWhileYouRestPlanAction(planId)
      if (result.error || !result.plan) {
        toast({
          title: "Não foi possível continuar",
          description: result.error ?? "Tente novamente em instantes.",
        })
        return
      }

      await refreshPlans(planId)
    })
  }

  const handleEnd = (planId: string) => {
    if (!window.confirm("Encerrar esta execução? O que já estiver em andamento continua, mas nada novo será iniciado.")) {
      return
    }

    startMutating(async () => {
      const result = await endWhileYouRestPlanAction(planId)
      if (result.error || !result.plan) {
        toast({
          title: "Não foi possível encerrar",
          description: result.error ?? "Tente novamente em instantes.",
        })
        return
      }

      await refreshPlans(planId)
    })
  }

  const resetToNewRequest = () => {
    setDraftPlan(null)
    setSelectedPlanId(null)
    setRequestText("")
  }

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

              {hasActiveExecution && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetToNewRequest}
                  className="rounded-full border-[#d8d0c3] bg-white"
                >
                  <Plus className="h-4 w-4" />
                  Novo trabalho
                </Button>
              )}
            </div>
          </SheetHeader>

          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.25fr)_360px]">
            <div className="space-y-6">
              {phase === "request" && (
                <RequestView
                  requestText={requestText}
                  setRequestText={setRequestText}
                  onBuildPlan={handleBuildPlan}
                  isPlanning={isPlanning}
                />
              )}

              {phase === "review" && draftPlan && (
                <ReviewView
                  plan={draftPlan}
                  onStart={handleStartPlan}
                  onBack={() => {
                    setRequestText(draftPlan.requestText)
                    setDraftPlan(null)
                  }}
                  isStarting={isStarting}
                />
              )}

              {phase === "tracking" && selectedPlan && (
                <TrackingView
                  plan={selectedPlan}
                  isRefreshing={isRefreshing}
                  isMutating={isMutating}
                  onPause={() => handlePause(selectedPlan.id)}
                  onContinue={() => handleContinue(selectedPlan.id)}
                  onEnd={() => handleEnd(selectedPlan.id)}
                />
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
                      <ExecutionCard
                        key={plan.id}
                        plan={plan}
                        active={plan.id === selectedPlanId}
                        onSelect={() => {
                          setDraftPlan(null)
                          setSelectedPlanId(plan.id)
                        }}
                      />
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

function RequestView({
  requestText,
  setRequestText,
  onBuildPlan,
  isPlanning,
}: {
  requestText: string
  setRequestText: (value: string) => void
  onBuildPlan: () => void
  isPlanning: boolean
}) {
  return (
    <section className="space-y-4">
      <div className="rounded-[32px] border border-[#ece9e2] bg-white p-6 shadow-sm">
        <p className="text-sm leading-7 text-[#4c463f]">
          Conte o que precisa deixar encaminhado. O COS organizará o plano e executará automaticamente tudo o que for possível.
        </p>
        <Textarea
          value={requestText}
          onChange={(event) => setRequestText(event.target.value)}
          rows={9}
          placeholder="Ex.: cadastrar cliente Clínica Aurora, preparar contrato de proposta para julho, revisar o que depende da minha confirmação e me deixar um resumo quando terminar."
          className="mt-5 resize-none rounded-3xl border-[#e8e2d7] bg-[#faf8f3] px-4 py-4 text-sm text-[#111111] shadow-none focus-visible:border-[#d8d0c3] focus-visible:ring-0"
        />
        <div className="mt-5 flex justify-end">
          <Button
            type="button"
            onClick={onBuildPlan}
            disabled={!requestText.trim() || isPlanning}
            className="rounded-full bg-[#111111] px-5 text-white hover:bg-[#222222]"
          >
            {isPlanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Organizar plano
          </Button>
        </div>
      </div>
    </section>
  )
}

function ReviewView({
  plan,
  onStart,
  onBack,
  isStarting,
}: {
  plan: HydratedPlan
  onStart: () => void
  onBack: () => void
  isStarting: boolean
}) {
  return (
    <section className="space-y-4">
      <div className="rounded-[32px] border border-[#ece9e2] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b847b]">Planejamento</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#111111]">Enquanto você descansa</h2>
        <p className="mt-3 text-sm leading-7 text-[#4c463f]">Vou cuidar de:</p>

        <div className="mt-5 space-y-4">
          {plan.items.map((item) => (
            <PlanPreviewItem key={item.id} item={item} />
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <SoftMetric label="Prioridade dominante" value={resolvePrioritySummary(plan.items)} />
          <SoftMetric label="Prazo mais próximo" value={resolveNearestDeadline(plan.items)} />
          <SoftMetric label="Tempo estimado total" value={formatEstimatedTime(plan.estimatedMinutes)} />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={onStart}
            disabled={isStarting}
            className="rounded-full bg-[#111111] px-5 text-white hover:bg-[#222222]"
          >
            {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            Começar
          </Button>
          <Button type="button" variant="outline" onClick={onBack} className="rounded-full border-[#d8d0c3] bg-white">
            Ajustar pedido
          </Button>
        </div>
      </div>
    </section>
  )
}

function TrackingView({
  plan,
  isRefreshing,
  isMutating,
  onPause,
  onContinue,
  onEnd,
}: {
  plan: HydratedPlan
  isRefreshing: boolean
  isMutating: boolean
  onPause: () => void
  onContinue: () => void
  onEnd: () => void
}) {
  const completedItems = plan.items.filter((item) => item.runtimeStatus === "concluido")
  const failedItems = plan.items.filter((item) => item.runtimeStatus === "falhou")
  const waitingItems = plan.items.filter(
    (item) => item.runtimeStatus === "aguardando_confirmacao" || item.runtimeStatus === "nao_suportado",
  )

  return (
    <section className="space-y-4">
      <div className="rounded-[32px] border border-[#ece9e2] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b847b]">
              {plan.isFinished ? "Enquanto você esteve fora" : "Execução ativa"}
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#111111]">
              {plan.isFinished ? "O COS deixou isso encaminhado." : "Estou trabalhando nisso."}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#4c463f]">{plan.title}</p>
          </div>
          {(isRefreshing || isMutating) && <Loader2 className="h-5 w-5 animate-spin text-[#8b847b]" />}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <SoftMetric label="Progresso" value={`${Number(plan.summary.progressPercent ?? 0)}%`} />
          <SoftMetric label="Concluídas" value={String(Number(plan.summary.completedCount ?? 0))} />
          <SoftMetric label="Pendentes" value={String(Number(plan.summary.pendingCount ?? 0))} />
          <SoftMetric label="Tempo decorrido" value={plan.elapsedLabel} />
        </div>

        {!plan.isFinished && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {plan.displayStatus === "paused" ? (
              <Button type="button" onClick={onContinue} disabled={isMutating} className="rounded-full bg-[#111111] px-5 text-white hover:bg-[#222222]">
                <PlayCircle className="h-4 w-4" />
                Continuar
              </Button>
            ) : (
              <Button type="button" onClick={onPause} disabled={isMutating} variant="outline" className="rounded-full border-[#d8d0c3] bg-white">
                <PauseCircle className="h-4 w-4" />
                Pausar
              </Button>
            )}

            <Button type="button" onClick={onEnd} disabled={isMutating} variant="outline" className="rounded-full border-[#ead4d4] bg-white text-[#8b4141] hover:bg-[#fff7f7]">
              <Square className="h-4 w-4" />
              Encerrar
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-[32px] border border-[#ece9e2] bg-white p-6 shadow-sm">
        <div className="space-y-4">
          {plan.items.map((item) => (
            <ResultItem key={item.id} item={item} />
          ))}
        </div>
      </div>

      {(completedItems.length > 0 || failedItems.length > 0 || waitingItems.length > 0) && (
        <div className="rounded-[32px] border border-[#ece9e2] bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b847b]">Resumo</p>
          <div className="mt-4 space-y-4">
            {completedItems.length > 0 && (
              <ResultSection
                title="Entregas realizadas"
                items={completedItems}
              />
            )}
            {failedItems.length > 0 && (
              <ResultSection
                title="Pendências com erro"
                items={failedItems}
              />
            )}
            {waitingItems.length > 0 && (
              <ResultSection
                title="Itens aguardando confirmação"
                items={waitingItems}
              />
            )}
          </div>
          <p className="mt-5 text-sm text-[#5d564d]">{String(plan.summary.nextStep ?? "")}</p>
        </div>
      )}
    </section>
  )
}

function PlanPreviewItem({ item }: { item: PlanItem }) {
  const isDone = item.kind === "executable"
  const icon = isDone ? CheckCircle2 : Circle
  const Icon = icon

  return (
    <div className="rounded-[24px] border border-[#ece9e2] bg-[#faf8f3] p-4">
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 ${isDone ? "text-emerald-600" : "text-[#8b847b]"}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#111111]">{item.title}</p>
          <p className="mt-1 text-sm leading-6 text-[#5d564d]">{item.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <SoftTag>{`Prioridade ${item.priority}`}</SoftTag>
            {item.deadline ? <SoftTag>{`Prazo ${item.deadline}`}</SoftTag> : null}
            {item.kind === "waiting_confirmation" ? <SoftTag>Depende de confirmação</SoftTag> : null}
            {item.kind === "unsupported" ? <SoftTag>Ainda não suportado</SoftTag> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function ResultItem({ item }: { item: PlanItem }) {
  const copy = itemStatusCopy[item.runtimeStatus]
  const Icon = copy.icon
  const resultLink = resolveResultLink(item)

  return (
    <div className="rounded-[24px] border border-[#ece9e2] bg-[#faf8f3] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {item.actionType === "create_client" ? (
              <UserRoundPlus className="h-4 w-4 text-[#111111]" />
            ) : item.actionType === "create_document" ? (
              <FileText className="h-4 w-4 text-[#111111]" />
            ) : (
              <Icon className={`h-4 w-4 ${copy.tone} ${item.runtimeStatus === "em_execucao" ? "animate-spin" : ""}`} />
            )}
            <p className="text-sm font-medium text-[#111111]">{item.title}</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#5d564d]">{item.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <SoftTag>{copy.label}</SoftTag>
            <SoftTag>{`Prioridade ${item.priority}`}</SoftTag>
            {item.deadline ? <SoftTag>{`Prazo ${item.deadline}`}</SoftTag> : null}
          </div>
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
}

function ExecutionCard({
  plan,
  active,
  onSelect,
}: {
  plan: HydratedPlan
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-[24px] border p-4 text-left transition ${
        active ? "border-[#111111] bg-white shadow-sm" : "border-[#ece9e2] bg-white/90 hover:border-[#d8d0c3]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#111111]">{plan.title}</p>
          <p className="mt-1 text-xs text-[#8b847b]">Início {formatDateTime(plan.startedAt ?? plan.createdAt)}</p>
        </div>
        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${executionTone[plan.displayStatus]}`}>
          {sectionOrder.find((section) => section.key === plan.displayStatus)?.title ?? "Execução"}
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#f0ece6]">
        <div className="h-full rounded-full bg-[#111111]" style={{ width: `${Number(plan.summary.progressPercent ?? 0)}%` }} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-[#6d675f]">
        <div>
          <p>Concluídas</p>
          <p className="mt-1 text-sm font-semibold text-[#111111]">{Number(plan.summary.completedCount ?? 0)}</p>
        </div>
        <div>
          <p>Pendentes</p>
          <p className="mt-1 text-sm font-semibold text-[#111111]">{Number(plan.summary.pendingCount ?? 0)}</p>
        </div>
        <div>
          <p>Com erro</p>
          <p className="mt-1 text-sm font-semibold text-[#111111]">{Number(plan.summary.failedCount ?? 0)}</p>
        </div>
      </div>

      <p className="mt-3 text-xs text-[#8b847b]">Tempo decorrido {plan.elapsedLabel}</p>
    </button>
  )
}

function ResultSection({ title, items }: { title: string; items: PlanItem[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-[#111111]">{title}</p>
      {items.map((item) => {
        const resultLink = resolveResultLink(item)
        return (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[#ece9e2] bg-[#faf8f3] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[#111111]">{item.title}</p>
              <p className="text-xs text-[#6d675f]">{item.description}</p>
            </div>
            {resultLink ? (
              <Link href={resultLink.href} className="text-xs font-medium text-[#0a0a0a] underline-offset-4 hover:underline">
                {resultLink.label}
              </Link>
            ) : null}
          </div>
        )
      })}
    </div>
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

function resolvePrioritySummary(items: PlanItem[]) {
  if (items.some((item) => item.priority === "alta")) {
    return "Alta"
  }

  if (items.some((item) => item.priority === "media")) {
    return "Média"
  }

  return "Baixa"
}

function resolveNearestDeadline(items: PlanItem[]) {
  return items.find((item) => item.deadline)?.deadline ?? "Sem prazo"
}
