import { getPublicMeetingBySlugAction } from "@/actions/meetings"
import { PublicMeetingRoom } from "@/components/operations/public-meeting-room"

export default async function PublicMeetRoomPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const result = await getPublicMeetingBySlugAction({ slug })

  if (result.error || !result.meeting) {
    return (
      <main className="min-h-screen bg-[#f6f7fb] px-4 py-10">
        <div className="mx-auto max-w-xl rounded-3xl border border-red-100 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-[#0a0a0a]">Sala publica nao encontrada</h1>
          <p className="mt-3 text-sm text-gray-500">{result.error ?? "Este link publico do COS Meet nao esta disponivel."}</p>
        </div>
      </main>
    )
  }

  return <PublicMeetingRoom meeting={result.meeting} slug={slug} />
}
