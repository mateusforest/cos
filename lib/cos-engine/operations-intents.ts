import type { DetectedIntent, OperationsConversationMemory, OperationsEngineContext } from "@/lib/cos-engine/types"
import { resolveIntentReferences } from "@/lib/cos-engine/reference-resolution"
import {
  detectDocumentType,
  detectSupportCategory,
  extractClientUpdateEntities,
  extractClientName,
  extractDocumentTitle,
  extractEmail,
  extractFinancialTitle,
  extractMeetingTitle,
  extractMoneyValue,
  extractOperationClientName,
  extractOperationTitle,
  extractPhone,
  extractSupportSubject,
  inferFinancialType,
  isClientsCountQuery,
  isFinancialSummaryQuery,
  isRecentActivityQuery,
  looksLikeCreateClient,
  looksLikeCreateDocument,
  looksLikeCreateFinancial,
  looksLikeCreateMeeting,
  looksLikeCreateOperation,
  looksLikeCreateSupportTicket,
  looksLikeUpdateClient,
} from "@/lib/cos-engine/operations-tools"

export function detectOperationsIntent(
  message: string,
  context: OperationsEngineContext,
  conversationMemory?: OperationsConversationMemory,
): DetectedIntent {
  if (isClientsCountQuery(message)) {
    return { intent: "get_clients_count", entities: {} }
  }

  if (isFinancialSummaryQuery(message)) {
    return { intent: "get_financial_summary", entities: {} }
  }

  if (isRecentActivityQuery(message)) {
    return { intent: "get_recent_activity", entities: {} }
  }

  if (looksLikeCreateClient(message, context)) {
    return {
      intent: "create_client",
      entities: {
        name: extractClientName(message, context),
        email: extractEmail(message),
        phone: extractPhone(message),
      },
    }
  }

  if (looksLikeUpdateClient(message, context)) {
    const detected = {
      intent: "update_client" as const,
      entities: extractClientUpdateEntities(message),
    }

    const resolved = resolveIntentReferences({
      resolvedIntent: {
        intent: detected.intent,
        confidence: 1,
        entities: detected.entities,
        requiresConfirmation: false,
        missingFields: [],
        unsafeReason: null,
        reply: "Vou atualizar esse cliente para voce.",
        shouldFallbackToHeuristic: false,
        source: "heuristic",
      },
      message,
      conversationMemory,
    })

    return {
      intent: "update_client",
      entities: resolved.entities,
    }
  }

  if (looksLikeCreateFinancial(message, context)) {
    const type = inferFinancialType(message, context)
    return {
      intent: type === "income" ? "create_financial_income" : "create_financial_expense",
      entities: {
        amount: extractMoneyValue(message),
        title: extractFinancialTitle(message),
      },
    }
  }

  if (looksLikeCreateOperation(message, context)) {
    return {
      intent: "create_operation",
      entities: {
        title: extractOperationTitle(message, context),
        clientName: extractOperationClientName(message),
      },
    }
  }

  if (looksLikeCreateDocument(message, context)) {
    return {
      intent: "create_document",
      entities: {
        title: extractDocumentTitle(message, context),
        type: detectDocumentType(message),
      },
    }
  }

  if (looksLikeCreateMeeting(message, context)) {
    return {
      intent: "create_meeting",
      entities: {
        title: extractMeetingTitle(message, context),
      },
    }
  }

  if (looksLikeCreateSupportTicket(message, context)) {
    return {
      intent: "create_support_ticket",
      entities: {
        category: detectSupportCategory(message, context),
        subject: extractSupportSubject(message),
      },
    }
  }

  return { intent: "unknown", entities: {} }
}
