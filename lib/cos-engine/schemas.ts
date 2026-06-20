import type {
  DetectedIntent,
  OperationsEngineIntent,
  OperationsResolvedIntent,
  OperationsIntentSource,
} from "@/lib/cos-engine/types"

const defaultReplies: Record<OperationsEngineIntent, string> = {
  create_client: "Vou criar esse cliente para voce.",
  create_financial_income: "Vou registrar essa receita para voce.",
  create_financial_expense: "Vou registrar esse gasto para voce.",
  create_operation: "Vou criar essa operacao para voce.",
  create_document: "Vou criar esse documento para voce.",
  create_meeting: "Vou criar essa reuniao para voce.",
  create_support_ticket: "Vou abrir esse chamado para voce.",
  get_clients_count: "Vou consultar seus clientes.",
  get_financial_summary: "Vou consultar seu resumo financeiro.",
  get_recent_activity: "Vou consultar suas ultimas atividades.",
  unknown: "Ainda nao consegui interpretar essa solicitacao com seguranca.",
}

const requiredFieldsByIntent: Partial<Record<OperationsEngineIntent, string[]>> = {
  create_client: ["name"],
  create_financial_income: ["amount", "title"],
  create_financial_expense: ["amount", "title"],
  create_operation: ["title"],
  create_document: ["title"],
  create_meeting: ["title"],
  create_support_ticket: ["subject", "description"],
}

export const futureMinimumIntentConfidence = 0.55

export function getRequiredFieldsForIntent(intent: OperationsEngineIntent) {
  return requiredFieldsByIntent[intent] ?? []
}

export function isSideEffectIntent(intent: OperationsEngineIntent) {
  return [
    "create_client",
    "create_financial_income",
    "create_financial_expense",
    "create_operation",
    "create_document",
    "create_meeting",
    "create_support_ticket",
  ].includes(intent)
}

export function buildResolvedIntentFromDetected(
  detected: DetectedIntent,
  source: OperationsIntentSource = "heuristic",
): OperationsResolvedIntent {
  return {
    intent: detected.intent,
    confidence: detected.intent === "unknown" ? 0 : 1,
    entities: detected.entities,
    requiresConfirmation: false,
    missingFields: [],
    unsafeReason: null,
    reply: defaultReplies[detected.intent] ?? defaultReplies.unknown,
    shouldFallbackToHeuristic: source !== "heuristic",
    source,
  }
}
