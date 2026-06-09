"use server"

import { runOperationsEngine } from "@/lib/cos-engine/operations-engine"
import type { OperationsEngineInput } from "@/lib/cos-engine/types"

export async function runOperationsEngineAction(input: OperationsEngineInput) {
  return runOperationsEngine(input)
}
