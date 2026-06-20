import { createClientAction, getClientsAction } from "@/actions/clients"
import { createDocumentAction } from "@/actions/documents"
import { createFinancialEntryAction, getFinancialSummaryAction } from "@/actions/financial"
import { createMeetingAction } from "@/actions/meetings"
import { createOperationAction } from "@/actions/operations"
import { createSupportTicketAction } from "@/actions/support"
import { getWorkspaceActivityLogsAction } from "@/actions/activity"
import { formatCurrencyBRL, humanizeActivityAction } from "@/lib/cos-engine/operations-response"
import { toTitleCase } from "@/lib/cos-engine/operations-tools"
import type { OperationsEngineResult, OperationsResolvedIntent } from "@/lib/cos-engine/types"

async function resolveClientIdByName(clientName: string) {
  const clientsResult = await getClientsAction()

  if (clientsResult.error) {
    return { error: clientsResult.error }
  }

  const normalizedTarget = clientName.trim().toLowerCase()
  const activeClients = (clientsResult.clients ?? []).filter((client) => client.status !== "archived")
  const exactMatch =
    activeClients.find((client) => client.name.trim().toLowerCase() === normalizedTarget) ??
    activeClients.find((client) => client.name.trim().toLowerCase().includes(normalizedTarget))

  if (!exactMatch) {
    return { error: `Nao encontrei um cliente chamado ${clientName}.` }
  }

  return { clientId: exactMatch.id, clientName: exactMatch.name }
}

function buildExecutionSuccess(input: Omit<OperationsEngineResult, "ok" | "executionStatus">): OperationsEngineResult {
  return {
    ok: true,
    executionStatus: "executed",
    ...input,
  }
}

function buildExecutionFailure(
  message: string,
  action?: OperationsResolvedIntent["intent"],
  executionStatus: OperationsEngineResult["executionStatus"] = "failed",
): OperationsEngineResult {
  return {
    ok: false,
    executionStatus,
    action,
    message,
    error: message,
  }
}

export async function executeResolvedIntent(input: {
  message: string
  resolvedIntent: OperationsResolvedIntent
}): Promise<OperationsEngineResult> {
  const { message, resolvedIntent } = input

  switch (resolvedIntent.intent) {
    case "create_client": {
      const name = String(resolvedIntent.entities.name || "").trim()
      const email = String(resolvedIntent.entities.email || "").trim()
      const phone = String(resolvedIntent.entities.phone || "").trim()
      const result = await createClientAction({
        name,
        email,
        phone,
        company: "",
        notes: "",
        status: "active",
      })

      if (result.error) {
        return buildExecutionFailure("Nao consegui criar o cliente agora. Tente novamente em instantes.", "create_client")
      }

      return buildExecutionSuccess({
        action: "create_client",
        resultId: result.clientId,
        message: `Cliente ${name} criado com sucesso.`,
        suggestedLabel: "Ver clientes no Portal",
        suggestedHref: "/portal/cadastros",
      })
    }

    case "create_financial_income":
    case "create_financial_expense": {
      const amount = String(resolvedIntent.entities.amount || "").trim()
      const rawTitle = String(resolvedIntent.entities.title || "").trim()
      const title = rawTitle ? toTitleCase(rawTitle) : ""
      const isIncome = resolvedIntent.intent === "create_financial_income"
      const result = await createFinancialEntryAction({
        type: isIncome ? "income" : "expense",
        title,
        amount,
        category: title,
        dueDate: "",
        notes: message,
      })

      if (result.error) {
        return buildExecutionFailure(
          "Nao consegui registrar o lancamento agora. Tente novamente em instantes.",
          resolvedIntent.intent,
        )
      }

      return buildExecutionSuccess({
        action: resolvedIntent.intent,
        resultId: result.entryId,
        message: `${isIncome ? "Lancei o ganho" : "Lancei o gasto"} de ${formatCurrencyBRL(Number(amount.replace(/\./g, "").replace(",", ".")))} em ${title}.`,
        suggestedLabel: "Ver financeiro no Portal",
        suggestedHref: "/portal/financeiro",
      })
    }

    case "create_operation": {
      const title = String(resolvedIntent.entities.title || "").trim()
      const clientName = String(resolvedIntent.entities.clientName || "").trim()

      let clientId: string | undefined
      let resolvedClientName = ""

      if (clientName) {
        const clientResolution = await resolveClientIdByName(clientName)
        if (!("clientId" in clientResolution)) {
          return buildExecutionFailure(
            clientResolution.error || "Nao consegui localizar este cliente agora.",
            "create_operation",
          )
        }

        clientId = clientResolution.clientId
        resolvedClientName = clientResolution.clientName || clientName
      }

      const result = await createOperationAction({
        clientId,
        title,
        description: message,
        status: "open",
        priority: "medium",
        dueDate: "",
      })

      if (result.error) {
        return buildExecutionFailure("Nao consegui criar a operacao agora. Tente novamente em instantes.", "create_operation")
      }

      return buildExecutionSuccess({
        action: "create_operation",
        resultId: result.operationId,
        message: resolvedClientName
          ? `Operacao ${title} criada com sucesso para ${resolvedClientName}.`
          : `Operacao ${title} criada com sucesso.`,
        suggestedLabel: "Ver operacoes no Portal",
        suggestedHref: "/portal/operacoes",
      })
    }

    case "create_document": {
      const title = String(resolvedIntent.entities.title || "").trim()
      const type = String(resolvedIntent.entities.type || "outro").trim()
      const result = await createDocumentAction({
        title,
        type,
        fileUrl: "",
        content: message,
        status: "draft",
      })

      if (result.error) {
        return buildExecutionFailure("Nao consegui criar o documento agora. Tente novamente em instantes.", "create_document")
      }

      return buildExecutionSuccess({
        action: "create_document",
        resultId: result.documentId,
        message: `Documento ${title} criado com sucesso.`,
        suggestedLabel: "Ver documentos no Portal",
        suggestedHref: "/portal/documentos",
      })
    }

    case "create_meeting": {
      const title = String(resolvedIntent.entities.title || "").trim()
      const result = await createMeetingAction({
        title,
        summary: `Solicitacao enviada pelo chat: ${message}`,
        status: "draft",
      })

      if (result.error) {
        return buildExecutionFailure("Nao consegui criar a reuniao agora. Tente novamente em instantes.", "create_meeting")
      }

      return buildExecutionSuccess({
        action: "create_meeting",
        resultId: result.meetingId,
        message: `Criei a reuniao ${title} como rascunho.`,
        suggestedLabel: "Ver reunioes",
        suggestedHref: "/app/conversas/reunioes",
      })
    }

    case "create_support_ticket": {
      const category = String(resolvedIntent.entities.category || "Duvida sobre o COS")
      const subject = String(resolvedIntent.entities.subject || "Solicitacao de suporte").trim()
      const result = await createSupportTicketAction({
        category,
        subject: subject || "Solicitacao de suporte",
        description: message,
        priority: "Media",
      })

      if (result.error) {
        return buildExecutionFailure("Nao consegui abrir o chamado agora. Tente novamente em instantes.", "create_support_ticket")
      }

      return buildExecutionSuccess({
        action: "create_support_ticket",
        resultId: result.ticketId,
        message: "Chamado de suporte criado com sucesso.",
        suggestedLabel: "Abrir suporte",
        suggestedHref: "/app/conversas/suporte",
      })
    }

    case "get_clients_count": {
      const result = await getClientsAction()
      if (result.error) {
        return buildExecutionFailure("Nao consegui consultar seus clientes agora.", "get_clients_count")
      }

      const clientsCount = (result.clients ?? []).filter((client) => client.status !== "archived").length
      return buildExecutionSuccess({
        action: "get_clients_count",
        message: `Voce tem ${clientsCount} cliente${clientsCount === 1 ? "" : "s"} cadastrado${clientsCount === 1 ? "" : "s"}.`,
      })
    }

    case "get_financial_summary": {
      const result = await getFinancialSummaryAction()
      if (result.error || !result.summary) {
        return buildExecutionFailure("Nao consegui consultar seu resumo financeiro agora.", "get_financial_summary")
      }

      return buildExecutionSuccess({
        action: "get_financial_summary",
        message: `Seu saldo atual e ${formatCurrencyBRL(result.summary.balance)}.`,
        suggestedLabel: "Ver financeiro no Portal",
        suggestedHref: "/portal/financeiro",
      })
    }

    case "get_recent_activity": {
      const result = await getWorkspaceActivityLogsAction()
      if (result.error) {
        return buildExecutionFailure("Nao consegui consultar as ultimas atividades agora.", "get_recent_activity")
      }

      const recentLogs = (result.logs ?? []).slice(0, 3)
      if (recentLogs.length === 0) {
        return buildExecutionSuccess({
          action: "get_recent_activity",
          message: "Ainda nao ha atividades registradas no seu workspace.",
          suggestedLabel: "Abrir historico",
          suggestedHref: "/app/historico",
        })
      }

      const summary = recentLogs.map((log) => humanizeActivityAction(log.action)).join(", ")
      return buildExecutionSuccess({
        action: "get_recent_activity",
        message: `Suas ultimas atividades foram: ${summary}.`,
        suggestedLabel: "Abrir historico",
        suggestedHref: "/app/historico",
      })
    }

    case "unknown":
    default:
      return buildExecutionFailure(
        "Ainda nao consigo executar essa solicitacao, mas posso ajudar com clientes, financeiro, operacoes, documentos, reunioes e suporte.",
        "unknown",
        "not_executed",
      )
  }
}
