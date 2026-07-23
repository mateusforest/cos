"use server"

import { createBackgroundJob, getBackgroundJobStatus } from "@/lib/background-jobs"

export async function createBackgroundJobAction(input: {
  type: string
  payload: Record<string, unknown>
  idempotencyKey: string
  maxAttempts?: number
  availableAt?: string
}) {
  return createBackgroundJob(input)
}

export async function createBackgroundTestClientJobAction(input: {
  name: string
  email?: string
  phone?: string
  company?: string
  notes?: string
  idempotencyKey: string
}) {
  return createBackgroundJob({
    type: "create_client",
    idempotencyKey: input.idempotencyKey,
    payload: {
      name: input.name,
      email: input.email ?? "",
      phone: input.phone ?? "",
      company: input.company ?? "",
      notes: input.notes ?? "",
      status: "active",
    },
  })
}

export async function getBackgroundJobStatusAction(jobId: string) {
  return getBackgroundJobStatus(jobId)
}
