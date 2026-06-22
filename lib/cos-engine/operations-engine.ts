import { validateOperationsActor } from "@/lib/cos-engine/operations-actor"
import { buildOperationsContext } from "@/lib/cos-engine/operations-context"
import { executeResolvedIntent } from "@/lib/cos-engine/execution"
import { validateIntentPayload } from "@/lib/cos-engine/intent-validation"
import { resolveOperationsIntent } from "@/lib/cos-engine/openai-intent"
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
    resolvedIntent ??
    (await resolveOperationsIntent({ ...input, message, area: context.area, subArea: context.subArea })).resolvedIntent
  const validation = validateIntentPayload({
    resolvedIntent: nextResolvedIntent,
    message,
    conversationMemory: input.conversationMemory,
  })

  if (!validation.ok) {
    return {
      ok: false,
      action: validation.resolvedIntent.intent,
      message: validation.message,
      error: validation.message,
      executionStatus: validation.executionStatus,
      resolvedIntent: validation.resolvedIntent,
      entities: validation.resolvedIntent.entities,
    }
  }

  return executeResolvedIntent({
    message,
    resolvedIntent: validation.resolvedIntent,
  })
}
