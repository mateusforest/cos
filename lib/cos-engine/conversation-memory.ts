import type { ConversationContextMessageRow } from "@/lib/cos-engine/context-window"
import type {
  OperationsConversationClient,
  OperationsConversationEntity,
  OperationsConversationMemory,
  OperationsEngineIntent,
} from "@/lib/cos-engine/types"

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function readEntities(metadata: Record<string, unknown>) {
  if (!isRecord(metadata.entities)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(metadata.entities).filter(([, value]) => {
      return value === null || ["string", "number", "boolean", "undefined"].includes(typeof value)
    }),
  ) as Record<string, string | number | boolean | null | undefined>
}

function extractClientFromMetadata(metadata: Record<string, unknown>): OperationsConversationClient | null {
  const entities = readEntities(metadata)
  const targetType = readString(metadata.targetType)
  const targetId = readString(metadata.targetId) ?? readString(metadata.resultId)
  const targetName =
    readString(metadata.targetName) ??
    readString(entities.name) ??
    readString(entities.clientName)

  const action = readString(metadata.action)
  const intent = readString(metadata.intent)
  const looksLikeClientAction =
    targetType === "client" || action === "create_client" || action === "update_client" || intent === "create_client" || intent === "update_client"

  if (!looksLikeClientAction || !targetId || !targetName) {
    return null
  }

  return {
    id: targetId,
    name: targetName,
    email: readString(entities.email),
    phone: readString(entities.phone),
    company: readString(entities.company),
    notes: readString(entities.notes),
  }
}

function extractGenericEntityFromMetadata(metadata: Record<string, unknown>): OperationsConversationEntity | null {
  const entities = readEntities(metadata)
  const targetId = readString(metadata.targetId) ?? readString(metadata.resultId)
  const targetName =
    readString(metadata.targetName) ??
    readString(entities.name) ??
    readString(entities.title) ??
    readString(entities.subject) ??
    readString(entities.clientName)
  const entityType = readString(metadata.targetType) ?? readString(metadata.entityType)
  const area = readString(metadata.area)
  const executionStatus = readString(metadata.executionStatus)

  if (executionStatus !== "executed" || !targetId || !targetName) {
    return null
  }

  return {
    id: targetId,
    name: targetName,
    entityType: (entityType as OperationsConversationEntity["entityType"]) ?? null,
    area: (area as OperationsConversationEntity["area"]) ?? null,
    fields: entities,
  }
}

function extractSuccessfulAction(metadata: Record<string, unknown>) {
  const executionStatus = readString(metadata.executionStatus)
  const action = readString(metadata.action)

  if (executionStatus !== "executed" || !action) {
    return null
  }

  return action as OperationsEngineIntent
}

export function createEmptyConversationMemory(): OperationsConversationMemory {
  return {
    lastSuccessfulAction: null,
    lastResultId: null,
    lastEntities: {},
    lastClient: null,
    lastEntity: null,
    lastEntityType: null,
    lastEntityArea: null,
    recentEntities: [],
  }
}

export function buildConversationMemory(rows: ConversationContextMessageRow[]): OperationsConversationMemory {
  const memory = createEmptyConversationMemory()

  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const metadata = rows[index]?.metadata
    if (!isRecord(metadata)) {
      continue
    }

    if (!memory.lastSuccessfulAction) {
      memory.lastSuccessfulAction = extractSuccessfulAction(metadata)
    }

    if (!memory.lastResultId) {
      memory.lastResultId = readString(metadata.resultId)
    }

    if (Object.keys(memory.lastEntities).length === 0) {
      memory.lastEntities = readEntities(metadata)
    }

    if (!memory.lastClient) {
      memory.lastClient = extractClientFromMetadata(metadata)
    }

    const extractedEntity = extractGenericEntityFromMetadata(metadata)

    if (extractedEntity) {
      if (!memory.lastEntity) {
        memory.lastEntity = extractedEntity
      }

      if (!memory.lastEntityType) {
        memory.lastEntityType = extractedEntity.entityType
      }

      if (!memory.lastEntityArea) {
        memory.lastEntityArea = extractedEntity.area
      }

      if (!memory.recentEntities.some((entity) => entity.id === extractedEntity.id)) {
        memory.recentEntities.push(extractedEntity)
      }
    }

    if (memory.lastSuccessfulAction && memory.lastResultId && memory.lastClient && memory.lastEntity) {
      break
    }
  }

  return memory
}
