"use client"

import { use } from "react"
import { PortalHeader } from "@/components/portal/portal-header"
import { MeetingDetailsView } from "@/components/operations/meeting-details-view"

export default function PortalMeetingDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  return (
    <div className="flex-1 flex flex-col h-full">
      <PortalHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <MeetingDetailsView meetingId={id} variant="portal" />
        </div>
      </div>
    </div>
  )
}
