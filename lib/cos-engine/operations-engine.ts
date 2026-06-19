import { createClientAction, getClientsAction } from "@/actions/clients"
import { createFinancialEntryAction, getFinancialSummaryAction } from "@/actions/financial"
import { createOperationAction } from "@/actions/operations"
import { createDocumentAction } from "@/actions/documents"
import { createMeetingAction } from "@/actions/meetings"
import { createSupportTicketAction } from "@/actions/support"
import { getWorkspaceActivityLogsAction } from "@/actions/activity"
import { validateOperationsActor } from "@/lib/cos-engine/operations-actor"
import { buildOperationsContext } from "@/lib/cos-engine/operations-context"
import { detectOperationsIntent } from "@/lib/cos-engine/operations-intents"
import {
  buildEngineError,
  buildEngineSuccess,
  formatCurrencyBRL,
  humanizeActivityAction,
} from "@/lib/cos-engine/operations-response"
import { toTitleCase } from "@/lib/cos-engine/operations-tools"
import type { OperationsEngineInput, OperationsEngineResult } from "@/lib/cos-engine/types"

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

export async function runOperationsEngine(input: OperationsEngineInput): Promise<OperationsEngineResult> {
  const actor = await validateOperationsActor()

  if ("error" in actor && actor.error) {
    return buildEngineError(actor.error)
  }

  const message = input.message.trim()

  if (!message) {
    return buildEngineError("Escreva uma solicitacao para eu poder ajudar.")
  }

  const context = buildOperationsContext(input)
  const detected = detectOperationsIntent(message, context)

  switch (detected.intent) {
    case "create_client": {
      const name = String(detected.entities.name || "").trim()
      const email = String(detected.entities.email || "").trim()
      const phone = String(detected.entities.phone || "").trim()

      if (!name) {
        return buildEngineError("Para criar o cliente, preciso pelo menos do nome.", "create_client")
      }

      const result = await createClientAction({
        name,
        email,
        phone,
        company: "",
        notes: "",
        status: "active",
      })

      if (result.error) {
        return buildEngineError("Nao consegui criar o cliente agora. Tente novamente em instantes.", "create_client")
      }

      return buildEngineSuccess({
        action: "create_client",
        resultId: result.clientId,
        message: `Cliente ${name} criado com sucesso.`,
        suggestedLabel: "Ver clientes no Portal",
        suggestedHref: "/portal/cadastros",
      })
    }

    case "create_financial_income":
    case "create_financial_expense": {
      const amount = String(detected.entities.amount || "").trim()
      const rawTitle = String(detected.entities.title || "").trim()
      const title = rawTitle ? toTitleCase(rawTitle) : ""

      if (!amount) {
        return buildEngineError("Para registrar esse lancamento, preciso do valor.", detected.intent)
      }

      if (!title) {
        return buildEngineError("Para registrar esse lancamento, preciso da descricao.", detected.intent)
      }

      const isIncome = detected.intent === "create_financial_income"
      const result = await createFinancialEntryAction({
        type: isIncome ? "income" : "expense",
        title,
        amount,
        category: title,
        dueDate: "",
        notes: message,
      })

      if (result.error) {
        return buildEngineError("Nao consegui registrar o lancamento agora. Tente novamente em instantes.", detected.intent)
      }

      return buildEngineSuccess({
        action: detected.intent,
        resultId: result.entryId,
        message: `${isIncome ? "Lancei o ganho" : "Lancei o gasto"} de ${formatCurrencyBRL(Number(amount.replace(/\./g, "").replace(",", ".")))} em ${title}.`,
        suggestedLabel: "Ver financeiro no Portal",
        suggestedHref: "/portal/financeiro",
      })
    }

    case "create_operation": {
      const title = String(detected.entities.title || "").trim()
      const clientName = String(detected.entities.clientName || "").trim()

      if (!title) {
        return buildEngineError("Para criar a operacao, preciso do titulo.", "create_operation")
      }

      let clientId: string | undefined
      let resolvedClientName = ""

      if (clientName) {
        const clientResolution = await resolveClientIdByName(clientName)
        if (!("clientId" in clientResolution)) {
          return buildEngineError(clientResolution.error || "Nao consegui localizar este cliente agora.", "create_operation")
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
        return buildEngineError("Nao consegui criar a operacao agora. Tente novamente em instantes.", "create_operation")
      }

      return buildEngineSuccess({
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
      const title = String(detected.entities.title || "").trim()
      const type = String(detected.entities.type || "outro").trim()

      if (!title) {
        return buildEngineError("Para criar o documento, preciso do titulo.", "create_document")
      }

      const result = await createDocumentAction({
        title,
        type,
        fileUrl: "",
        content: message,
        status: "draft",
      })

      if (result.error) {
        return buildEngineError("Nao consegui criar o documento agora. Tente novamente em instantes.", "create_document")
      }

      return buildEngineSuccess({
        action: "create_document",
        resultId: result.documentId,
        message: `Documento ${title} criado com sucesso.`,
        suggestedLabel: "Ver documentos no Portal",
        suggestedHref: "/portal/documentos",
      })
    }

    case "create_meeting": {
      const title = String(detected.entities.title || "").trim()

      if (!title) {
        return buildEngineError("Para criar a reuniao, preciso do titulo.", "create_meeting")
      }

      const result = await createMeetingAction({
        title,
        summary: `Solicitacao enviada pelo chat: ${message}`,
        status: "draft",
      })

      if (result.error) {
        return buildEngineError("Nao consegui criar a reuniao agora. Tente novamente em instantes.", "create_meeting")
      }

      return buildEngineSuccess({
        action: "create_meeting",
        resultId: result.meetingId,
        message: `Criei a reuniao ${title} como rascunho.`,
        suggestedLabel: "Ver reunioes",
        suggestedHref: "/app/conversas/reunioes",
      })
    }

    case "create_support_ticket": {
      const category = String(detected.entities.category || "Duvida sobre o COS")
      const subject = String(detected.entities.subject || "Solicitacao de suporte").trim()

      const result = await createSupportTicketAction({
        category,
        subject: subject || "Solicitacao de suporte",
        description: message,
        priority: "Media",
      })

      if (result.error) {
        return buildEngineError("Nao consegui abrir o chamado agora. Tente novamente em instantes.", "create_support_ticket")
      }

      return buildEngineSuccess({
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
        return buildEngineError("Nao consegui consultar seus clientes agora.", "get_clients_count")
      }

      const clientsCount = (result.clients ?? []).filter((client) => client.status !== "archived").length

      return buildEngineSuccess({
        action: "get_clients_count",
        message: `Voce tem ${clientsCount} cliente${clientsCount === 1 ? "" : "s"} cadastrado${clientsCount === 1 ? "" : "s"}.`,
      })
    }

    case "get_financial_summary": {
      const result = await getFinancialSummaryAction()

      if (result.error || !result.summary) {
        return buildEngineError("Nao consegui consultar seu resumo financeiro agora.", "get_financial_summary")
      }

      return buildEngineSuccess({
        action: "get_financial_summary",
        message: `Seu saldo atual e ${formatCurrencyBRL(result.summary.balance)}.`,
        suggestedLabel: "Ver financeiro no Portal",
        suggestedHref: "/portal/financeiro",
      })
    }

    case "get_recent_activity": {
      const result = await getWorkspaceActivityLogsAction()

      if (result.error) {
        return buildEngineError("Nao consegui consultar as ultimas atividades agora.", "get_recent_activity")
      }

      const recentLogs = (result.logs ?? []).slice(0, 3)

      if (recentLogs.length === 0) {
        return buildEngineSuccess({
          action: "get_recent_activity",
          message: "Ainda nao ha atividades registradas no seu workspace.",
          suggestedLabel: "Abrir historico",
          suggestedHref: "/app/historico",
        })
      }

      const summary = recentLogs
        .map((log) => humanizeActivityAction(log.action))
        .join(", ")

      return buildEngineSuccess({
        action: "get_recent_activity",
        message: `Suas ultimas atividades foram: ${summary}.`,
        suggestedLabel: "Abrir historico",
        suggestedHref: "/app/historico",
      })
    }

    case "unknown":
    default:
      return buildEngineError(
        "Ainda nao consigo executar essa solicitacao, mas posso ajudar com clientes, financeiro, operacoes, documentos, reunioes e suporte.",
        "unknown",
      )
  }
}
