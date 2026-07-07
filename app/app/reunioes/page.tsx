"use client"

import { MeetingsManager } from "@/components/operations/meetings-manager"

export default function AppMeetingsPage() {
  return (
    <MeetingsManager
      title="COS Meet"
      description="Gerencie o módulo oficial de reuniões com histórico, participantes, sala e preferências do COS."
      variant="app"
    />
  )
}
