import { createSupabaseAdminClient } from "@/lib/supabase/server"
import { validateOperationsActor } from "@/lib/cos-engine/operations-actor"

type LedgerStatus = "success" | "insufficient_credits" | "already_processed" | "not_found" | "failed"

type LedgerRpcRow = {
  status?: string | null
  balance?: number | string | null
  updated_at?: string | null
  transaction_id?: string | null
  original_transaction_id?: string | null
}

type LedgerResult = {
  status: LedgerStatus
  balance: number
  updatedAt?: string | null
  transactionId?: string | null
  originalTransactionId?: string | null
}

type CreditMutationInput = {
  workspaceId?: string
  amount: number
  feature: string
  provider?: string | null
  reason: string
  idempotencyKey: string
  metadata?: Record<string, unknown>
}

type RefundMutationInput = {
  workspaceId?: string
  originalTransactionId: string
  reason: string
  idempotencyKey: string
  metadata?: Record<string, unknown>
}

function normalizeLedgerStatus(value: string | null | undefined): LedgerStatus {
  if (value === "success" || value === "insufficient_credits" || value === "already_processed" || value === "not_found") {
    return value
  }

  return "failed"
}

function normalizeLedgerBalance(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return 0
}

function normalizeLedgerRow(data: unknown): LedgerRpcRow | null {
  if (Array.isArray(data)) {
    return (data[0] as LedgerRpcRow | undefined) ?? null
  }

  if (data && typeof data === "object") {
    return data as LedgerRpcRow
  }

  return null
}

async function getValidatedLedgerContext(workspaceId?: string) {
  const actor = await validateOperationsActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY nao configurada para o ledger de creditos." }
  }

  const resolvedWorkspaceId = workspaceId?.trim() || actor.access.workspace?.id || ""

  if (!resolvedWorkspaceId) {
    return { error: "Nenhum workspace valido foi encontrado para consultar os creditos." }
  }

  if (resolvedWorkspaceId !== actor.access.workspace?.id) {
    return { error: "Workspace invalido para esta operacao de creditos." }
  }

  return {
    adminClient,
    workspaceId: resolvedWorkspaceId,
    userId: actor.user.id,
  }
}

async function runLedgerRpc(functionName: string, args: Record<string, unknown>) {
  const context = await getValidatedLedgerContext(typeof args.p_workspace_id === "string" ? args.p_workspace_id : undefined)

  if ("error" in context) {
    return {
      error: context.error,
      result: {
        status: "failed" as const,
        balance: 0,
      },
    }
  }

  const rpcClient = context.adminClient as unknown as {
    rpc: (name: string, parameters: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
  }

  const parameters: Record<string, unknown> = {
    ...args,
    p_workspace_id: context.workspaceId,
  }

  if (Object.prototype.hasOwnProperty.call(args, "p_user_id")) {
    parameters.p_user_id = typeof args.p_user_id === "string" ? args.p_user_id : context.userId
  }

  const { data, error } = await rpcClient.rpc(functionName, parameters)

  if (error) {
    return {
      error: error.message,
      result: {
        status: "failed" as const,
        balance: 0,
      },
    }
  }

  const row = normalizeLedgerRow(data)

  return {
    error: null,
    result: {
      status: normalizeLedgerStatus(row?.status),
      balance: normalizeLedgerBalance(row?.balance),
      updatedAt: row?.updated_at ?? null,
      transactionId: row?.transaction_id ?? null,
      originalTransactionId: row?.original_transaction_id ?? null,
    },
  }
}

export async function getWorkspaceCreditBalance(workspaceId?: string): Promise<LedgerResult> {
  const execution = await runLedgerRpc("get_workspace_credit_balance", {
    p_workspace_id: workspaceId,
  })

  if (execution.error) {
    return {
      status: "failed",
      balance: 0,
    }
  }

  return execution.result
}

export async function creditWorkspaceCredits(input: CreditMutationInput): Promise<LedgerResult> {
  const execution = await runLedgerRpc("credit_workspace_credits", {
    p_workspace_id: input.workspaceId,
    p_user_id: null,
    p_amount: input.amount,
    p_feature: input.feature,
    p_provider: input.provider ?? null,
    p_reason: input.reason,
    p_idempotency_key: input.idempotencyKey,
    p_metadata: input.metadata ?? {},
  })

  if (execution.error) {
    return {
      status: "failed",
      balance: 0,
    }
  }

  return execution.result
}

export async function debitWorkspaceCredits(input: CreditMutationInput): Promise<LedgerResult> {
  const execution = await runLedgerRpc("debit_workspace_credits", {
    p_workspace_id: input.workspaceId,
    p_user_id: null,
    p_amount: input.amount,
    p_feature: input.feature,
    p_provider: input.provider ?? null,
    p_reason: input.reason,
    p_idempotency_key: input.idempotencyKey,
    p_metadata: input.metadata ?? {},
  })

  if (execution.error) {
    return {
      status: "failed",
      balance: 0,
    }
  }

  return execution.result
}

export async function refundWorkspaceCredits(input: RefundMutationInput): Promise<LedgerResult> {
  const execution = await runLedgerRpc("refund_workspace_credits", {
    p_workspace_id: input.workspaceId,
    p_user_id: null,
    p_original_transaction_id: input.originalTransactionId,
    p_reason: input.reason,
    p_idempotency_key: input.idempotencyKey,
    p_metadata: input.metadata ?? {},
  })

  if (execution.error) {
    return {
      status: "failed",
      balance: 0,
    }
  }

  return execution.result
}
