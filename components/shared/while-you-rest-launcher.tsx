"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { Bot, CheckCircle2, CircleAlert, Clock3, FileText, Loader2, MoonStar, Play, Sparkles, UserRoundPlus } from "lucide-react"
import {
  createWhileYouRestPlanAction,
  getLatestWhileYouRestPlanAction,
  startWhileYouRestPlanAction,
} from "@/actions/while-you-rest"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"

type RuntimeStatus = "aguardando" | "em_execucao" | "concluido" | "falhou" | "aguardando_confirmacao" | "nao_suportado"

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
  requestText: string
  status: "draft" | "running" | "completed" | "partial" | "waiting_confirmation" | "failed"
  items: PlanItem[]
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  summary: Record<string, unknown>
}

type Props = {
  variant: "app" | "portal"
}

const statusCopy = {
  aguardando: { label: "Aguardando", tone: "bg-slate-100 text-slate-700" },
  em_execucao: { label: "Em execução", tone: "bg-amber-100 text-amber-700" },
  concluido: { label: "Concluído", tone: "bg-emerald-100 text-emerald-700" },
  falhou: { label: "Falhou", tone: "bg-rose-100 text-rose-700" },
  aguardando_confirmacao: { label: "Aguardando confirmação", tone: "bg-orange-100 text-orange-700" },
  nao_suportado: { label: "Não suportado", tone: "bg-zinc-100 text-zinc-700" },
} as const

function resolveResultLink(item: HydratedPlan["items"][number]) {
  if (item.result?.entityType === "client") {
    return { href: "/portal/cadastros/clientes", label: "Ver clientes" }
  }

  if (item.result?.entityType === "document") {
    return { href: "/portal/documentos", label: "Ver documentos" }
  }

  return null
}

export function WhileYouRestLauncher({ variant }: Props) {
  const { workspace, canManageWorkspace, isLoading } = useAuth()
  const [open, setOpen] = useState(false)
  const [requestText, setRequestText] = useState("")
  const [draftPlan, setDraftPlan] = useState<HydratedPlan | null>(null)
  const [latestPlan, setLatestPlan] = useState<HydratedPlan | null>(null)
  const [isPlanning, startPlanning] = useTransition()
  const [isStarting, startExecution] = useTransition()
  const [isRefreshing, startRefreshing] = useTransition()

  const isOperationsWorkspace = workspace?.type === "operations"
  const activePlan = draftPlan ?? latestPlan
  const phase = !activePlan ? "request" : activePlan.status === "draft" ? "review" : "tracking"

  const summaryTitle =
    latestPlan && latestPlan.status !== "draft" && latestPlan.status !== "running"
      ? "Enquanto você esteve fora"
      : "Acompanhamento"

  const canPlan = useMemo(
    () => Boolean(requestText.trim()) && !isPlanning && !isStarting,
    [requestText, isPlanning, isStarting],
  )

  useEffect(() => {
    if (!isOperationsWorkspace || !canManageWorkspace) {
      return
    }

    startRefreshing(async () => {
      const result = await getLatestWhileYouRestPlanAction()
      if (!result.error) {
        setLatestPlan(result.plan ?? null)
      }
    })
  }, [canManageWorkspace, isOperationsWorkspace])

  useEffect(() => {
    if (!open || !activePlan || activePlan.status === "draft") {
      return
    }

    const shouldPoll =
      activePlan.status === "running" ||
      activePlan.items.some((item) => item.runtimeStatus === "aguardando" || item.runtimeStatus === "em_execucao")

    if (!shouldPoll) {
      return
    }

    const interval = window.setInterval(() => {
      startRefreshing(async () => {
        const result = await getLatestWhileYouRestPlanAction()
        if (!result.error) {
          setLatestPlan(result.plan ?? null)
        }
      })
    }, 8000)

    return () => window.clearInterval(interval)
  }, [activePlan, open])

  if (isLoading || !isOperationsWorkspace || !canManageWorkspace) {
    return null
  }

  const handleBuildPlan = () => {
    startPlanning(async () => {
      const result = await createWhileYouRestPlanAction(requestText)

      if (result.error || !result.plan) {
        toast({
          title: "Não foi possível montar o plano",
          description: result.error ?? "Tente novamente em instantes.",
        })
        return
      }

      setDraftPlan(result.plan)
      setLatestPlan(result.plan)
    })
  }

  const handleStartPlan = () => {
    if (!activePlan) {
      return
    }

    startExecution(async () => {
      const result = await startWhileYouRestPlanAction(activePlan.id)

      if (result.error || !result.plan) {
        toast({
          title: "Não foi possível iniciar",
          description: result.error ?? "Tente novamente em instantes.",
        })
        return
      }

      setDraftPlan(null)
      setLatestPlan(result.plan)
      toast({
        title: "Execução iniciada",
        description: "Os jobs reais foram enviados para processamento em segundo plano.",
      })
    })
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
        <SheetContent side="right" className="w-full overflow-y-auto border-l border-[#e7e5df] bg-[#fcfbf8] p-0 sm:max-w-2xl">
          <SheetHeader className="border-b border-[#ece9e2] px-6 py-5">
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
          </SheetHeader>

          <div className="space-y-6 px-6 py-6">
            {phase === "request" && (
              <section className="space-y-4">
                <div className="rounded-[28px] border border-[#ece9e2] bg-white p-5 shadow-sm">
                  <p className="text-sm leading-6 text-[#4c463f]">
                    Descreva tarefas, prazos, compromissos e contexto. Eu organizo o pedido em um plano e só inicio depois da sua confirmação.
                  </p>
                  <Textarea
                    value={requestText}
                    onChange={(event) => setRequestText(event.target.value)}
                    rows={8}
                    placeholder="Ex.: cadastrar cliente Clínica Aurora, preparar documento de proposta para julho e separar o que ainda precisa da minha confirmação."
                    className="mt-4 resize-none rounded-3xl border-[#e8e2d7] bg-[#faf8f3] px-4 py-4 text-sm text-[#111111] shadow-none focus-visible:border-[#d8d0c3] focus-visible:ring-0"
                  />
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-xs text-[#8b847b]">Hoje eu executo automaticamente apenas criação de clientes e documentos.</p>
                    <Button
                      type="button"
                      onClick={handleBuildPlan}
                      disabled={!canPlan}
                      className="rounded-full bg-[#111111] px-5 text-white hover:bg-[#222222]"
                    >
                      {isPlanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                      Montar plano
                    </Button>
                  </div>
                </div>

                {latestPlan && latestPlan.status !== "draft" && (
                  <SummaryBlock title="Enquanto você esteve fora" plan={latestPlan} />
                )}
              </section>
            )}

            {phase === "review" && activePlan && (
              <section className="space-y-4">
                <div className="rounded-[28px] border border-[#ece9e2] bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b847b]">Revisão do plano</p>
                  <p className="mt-3 text-sm leading-6 text-[#4c463f]">{activePlan.requestText}</p>
                </div>

                <PlanItemsList items={activePlan.items} />

                <div className="rounded-[28px] border border-[#ece9e2] bg-[#f7f4ee] p-5">
                  <p className="text-sm text-[#4c463f]">{String(activePlan.summary.nextStep ?? "")}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      onClick={handleStartPlan}
                      disabled={isStarting}
                      className="rounded-full bg-[#111111] px-5 text-white hover:bg-[#222222]"
                    >
                      {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      Começar agora
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDraftPlan(null)
                        setRequestText(activePlan.requestText)
                      }}
                      className="rounded-full"
                    >
                      Ajustar pedido
                    </Button>
                  </div>
                </div>
              </section>
            )}

            {phase === "tracking" && activePlan && (
              <section className="space-y-4">
                <SummaryBlock title={summaryTitle} plan={activePlan} refreshing={isRefreshing} />
                <PlanItemsList items={activePlan.items} />
              </section>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

function SummaryBlock({
  title,
  plan,
  refreshing = false,
}: {
  title: string
  plan: HydratedPlan
  refreshing?: boolean
}) {
  const completedItems = plan.items.filter((item) => item.runtimeStatus === "concluido")
  const failedItems = plan.items.filter((item) => item.runtimeStatus === "falhou")
  const pendingItems = plan.items.filter((item) => item.runtimeStatus === "aguardando_confirmacao" || item.runtimeStatus === "nao_suportado")

  return (
    <div className="rounded-[28px] border border-[#ece9e2] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b847b]">{title}</p>
          <h3 className="mt-2 text-lg font-semibold text-[#111111]">
            {plan.status === "running" ? "Seu plano está em execução." : "Resumo do que ficou pronto."}
          </h3>
        </div>
        {refreshing && <Loader2 className="h-4 w-4 animate-spin text-[#8b847b]" />}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MetricCard label="Concluídas" value={String(Number(plan.summary.completedCount ?? 0))} tone="emerald" />
        <MetricCard label="Falhas" value={String(Number(plan.summary.failedCount ?? 0))} tone="rose" />
        <MetricCard
          label="Pendências"
          value={String(Number(plan.summary.waitingConfirmationCount ?? 0) + Number(plan.summary.unsupportedCount ?? 0))}
          tone="slate"
        />
      </div>

      <p className="mt-4 text-sm text-[#5d564d]">{String(plan.summary.nextStep ?? "")}</p>

      {completedItems.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-[#111111]">Entregas concluídas</p>
          {completedItems.map((item) => {
            const link = resolveResultLink(item)
            return (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[#edf1ee] bg-[#f7fbf8] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-[#111111]">{item.title}</p>
                  <p className="text-xs text-[#6d675f]">{item.description}</p>
                </div>
                {link ? (
                  <Link href={link.href} className="text-xs font-medium text-[#0a0a0a] underline-offset-4 hover:underline">
                    {link.label}
                  </Link>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      {failedItems.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-[#111111]">Falhas</p>
          {failedItems.map((item) => (
            <div key={item.id} className="rounded-2xl border border-[#f4d9dd] bg-[#fff5f6] px-4 py-3">
              <p className="text-sm font-medium text-[#111111]">{item.title}</p>
              <p className="mt-1 text-xs text-[#7d4f59]">{item.error || "Esse item falhou durante a execução."}</p>
            </div>
          ))}
        </div>
      )}

      {pendingItems.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-[#111111]">Pendências</p>
          {pendingItems.map((item) => (
            <div key={item.id} className="rounded-2xl border border-[#ece9e2] bg-[#faf8f3] px-4 py-3">
              <p className="text-sm font-medium text-[#111111]">{item.title}</p>
              <p className="mt-1 text-xs text-[#6d675f]">{item.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PlanItemsList({ items }: { items: HydratedPlan["items"] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const copy = statusCopy[item.runtimeStatus]
        return (
          <div key={item.id} className="rounded-[26px] border border-[#ece9e2] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  {item.actionType === "create_client" ? (
                    <UserRoundPlus className="h-4 w-4 text-[#111111]" />
                  ) : item.actionType === "create_document" ? (
                    <FileText className="h-4 w-4 text-[#111111]" />
                  ) : item.runtimeStatus === "aguardando_confirmacao" ? (
                    <CircleAlert className="h-4 w-4 text-[#111111]" />
                  ) : (
                    <Clock3 className="h-4 w-4 text-[#111111]" />
                  )}
                  <h3 className="text-sm font-semibold text-[#111111]">{item.title}</h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#5d564d]">{item.description}</p>
              </div>
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${copy.tone}`}>{copy.label}</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#7a7368]">
              <span className="rounded-full bg-[#f4f1ea] px-3 py-1">Prioridade: {item.priority}</span>
              <span className="rounded-full bg-[#f4f1ea] px-3 py-1">Prazo: {item.deadline || "Sem prazo definido"}</span>
              <span className="rounded-full bg-[#f4f1ea] px-3 py-1">
                {item.kind === "executable"
                  ? "Executável"
                  : item.kind === "waiting_confirmation"
                    ? "Aguardando confirmação"
                    : "Não suportado"}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: "emerald" | "rose" | "slate"
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "rose"
        ? "bg-rose-50 text-rose-700"
        : "bg-slate-100 text-slate-700"

  const Icon = tone === "emerald" ? CheckCircle2 : tone === "rose" ? CircleAlert : Clock3

  return (
    <div className={`rounded-2xl px-4 py-3 ${toneClass}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium">{label}</span>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  )
}
