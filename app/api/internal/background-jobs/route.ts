import { NextResponse } from "next/server"
import { processBackgroundJobsBatch } from "@/lib/background-jobs"

export async function POST(request: Request) {
  const secret = process.env.BACKGROUND_JOBS_CRON_SECRET

  if (!secret) {
    return NextResponse.json(
      { error: "BACKGROUND_JOBS_CRON_SECRET nao configurada." },
      { status: 500 },
    )
  }

  const authorization = request.headers.get("authorization")
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : ""

  if (!token || token !== secret) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 })
  }

  let body: { batchSize?: number; processingTimeoutSeconds?: number } = {}

  try {
    body = (await request.json()) as typeof body
  } catch {
    body = {}
  }

  const result = await processBackgroundJobsBatch({
    batchSize: body.batchSize,
    processingTimeoutSeconds: body.processingTimeoutSeconds,
  })

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json(result)
}
