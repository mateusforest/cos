import { validateOperationsActor } from "@/lib/cos-engine/operations-actor"
import { buildOperationsContext } from "@/lib/cos-engine/operations-context"
import { executeResolvedIntent } from "@/lib/cos-engine/execution"
import { detectOperationsIntent } from "@/lib/cos-engine/operations-intents"
import { validateIntentPayload } from "@/lib/cos-engine/intent-validation"
import { buildResolvedIntentFromDetected } from "@/lib/cos-engine/schemas"
import type {
  OperationsEngineInput,
  OperationsEngineResult,
  OperationsResolvedIntent,
} from "@/lib/cos-engine/types"

export async function runOperationsEngine(
  input: OperationsEngineInput,
  resolvedIntent?: OperationsResolvedIntent,
): Promise<OperationsEngineResult> {
  const actor = await validateOperationsActor()

  if ("error" in actor && actor.error) {
    return {
      ok: false,
      message: actor.error,
      error: actor.error,
      executionStatus: "failed",
    }
  }

  const message = input.message.trim()
  if (!message) {
    return {
      ok: false,
      message: "Escreva uma solicitacao para eu poder ajudar.",
      error: "Mensagem vazia.",
      executionStatus: "validation_failed",
    }
  }

  const context = buildOperationsContext(input)
  const nextResolvedIntent =
    resolvedIntent ?? buildResolvedIntentFromDetected(detectOperationsIntent(message, context))
  const validation = validateIntentPayload({
    resolvedIntent: nextResolvedIntent,
    message,
  })

  if (!validation.ok) {
    return {
      ok: false,
      action: validation.resolvedIntent.intent,
      message: validation.message,
      error: validation.message,
      executionStatus: validation.executionStatus,
    }
  }

  return executeResolvedIntent({
    message,
    resolvedIntent: validation.resolvedIntent,
  })
}
