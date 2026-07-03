"use client"

import { createSupabaseBrowserClient } from "@/lib/supabase/client"

const MAX_DOCUMENT_SIZE = 15 * 1024 * 1024

export async function uploadDocumentFile({
  file,
  userId,
  workspaceId,
}: {
  file: File
  userId: string
  workspaceId: string
}) {
  if (!file) {
    return { error: "Selecione um arquivo ou imagem para anexar." }
  }

  if (file.size > MAX_DOCUMENT_SIZE) {
    return { error: "O arquivo deve ter no maximo 15 MB." }
  }

  const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-")
  const filePath = `${workspaceId}/${userId}/${Date.now()}-${fileName}`

  try {
    const supabase = createSupabaseBrowserClient()
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, file, { upsert: true, contentType: file.type || undefined })

    if (uploadError) {
      const normalizedMessage = uploadError.message.toLowerCase()
      return {
        error:
          normalizedMessage.includes("bucket") || normalizedMessage.includes("storage")
            ? "Storage de documentos ainda nao configurado."
            : uploadError.message,
      }
    }

    const { data } = supabase.storage.from("documents").getPublicUrl(filePath)

    return {
      success: true,
      publicUrl: data.publicUrl,
      filePath,
    }
  } catch {
    return { error: "Storage de documentos ainda nao configurado." }
  }
}
