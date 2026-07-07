"use client"

import { use } from "react"
import { MeetingDetailsView } from "@/components/operations/meeting-details-view"

export default function AppMeetingDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  return <MeetingDetailsView meetingId={id} variant="app" />
}
