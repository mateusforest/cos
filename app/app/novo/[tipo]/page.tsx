"use client"

import { useState, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { ChevronLeft, Check, Camera, Upload, FileQuestion } from "lucide-react"
import { novoConfigs, fotoConfig, type NovoConfig } from "@/lib/novo-configs"

export default function NovoPage({ params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = use(params)
  const router = useRouter()
  const [submitted, setSubmitted] = useState(false)

  const config: NovoConfig | undefined = tipo === "foto" ? fotoConfig : novoConfigs[tipo]

  // Unknown type — honest fallback, never a 404
  if (!config) {
    return (
      <div className="px-4 py-4 max-w-lg mx-auto">
        <BackButton />
        <div className="flex flex-col items-center justify-center text-center py-20">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <FileQuestion className="w-7 h-7 text-gray-400" />
          </div>
          <h1 className="text-lg font-semibold text-[#0a0a0a] mb-1">Em preparação</h1>
          <p className="text-sm text-gray-500 max-w-xs">
            Este recurso ainda está sendo preparado e estará disponível em breve.
          </p>
          <Link href="/app" className="mt-5 px-4 py-2.5 bg-[#0a0a0a] text-white rounded-xl text-sm font-medium">
            Voltar ao início
          </Link>
        </div>
      </div>
    )
  }

  const Icon = config.icon

  if (submitted) {
    return (
      <div className="px-4 py-4 max-w-lg mx-auto">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center justify-center text-center py-20"
        >
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-lg font-semibold text-[#0a0a0a] mb-1">Tudo certo!</h1>
          <p className="text-sm text-gray-500 mb-6">{config.title} salvo com sucesso.</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSubmitted(false)}
              className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Criar outro
            </button>
            <Link href="/app" className="px-4 py-2.5 bg-[#0a0a0a] text-white rounded-xl text-sm font-medium hover:bg-[#1a1a1a] transition-colors">
              Concluir
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 max-w-lg mx-auto">
      <BackButton />

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: config.bg }}>
          <Icon className="w-6 h-6" style={{ color: config.color }} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-[#0a0a0a]">{config.title}</h1>
          <p className="text-sm text-gray-500">{config.subtitle}</p>
        </div>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); setSubmitted(true) }}
        className="space-y-4"
      >
        {tipo === "foto" ? (
          <PhotoCapture />
        ) : (
          config.fields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-[#0a0a0a] mb-1.5">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  required={field.required}
                  placeholder={field.placeholder}
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-400 resize-none"
                />
              ) : field.type === "select" ? (
                <select
                  required={field.required}
                  defaultValue=""
                  className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-400 appearance-none"
                >
                  <option value="" disabled>Selecione...</option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : field.type === "file" ? (
                <label className="flex flex-col items-center justify-center gap-2 w-full py-8 bg-white rounded-xl border-2 border-dashed border-gray-200 cursor-pointer hover:border-gray-300 transition-colors">
                  <Upload className="w-6 h-6 text-gray-400" />
                  <span className="text-sm text-gray-500">Clique para selecionar um arquivo</span>
                  <input type="file" className="hidden" />
                </label>
              ) : (
                <input
                  type={field.type}
                  required={field.required}
                  placeholder={field.placeholder}
                  className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
                />
              )}
            </div>
          ))
        )}

        <button
          type="submit"
          className="w-full py-3 bg-[#0a0a0a] text-white rounded-xl text-sm font-medium hover:bg-[#1a1a1a] transition-colors mt-2"
        >
          {config.cta}
        </button>
      </form>
    </div>
  )
}

function BackButton() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
    >
      <ChevronLeft className="w-4 h-4" /> Voltar
    </button>
  )
}

function PhotoCapture() {
  const [preview, setPreview] = useState<string | null>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setPreview(URL.createObjectURL(file))
  }

  return (
    <div className="space-y-3">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview || "/placeholder.svg"} alt="Pré-visualização" className="w-full rounded-2xl border border-gray-200" />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col items-center justify-center gap-2 py-8 bg-white rounded-2xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
            <span className="w-11 h-11 rounded-full bg-pink-50 flex items-center justify-center">
              <Camera className="w-5 h-5 text-pink-500" />
            </span>
            <span className="text-sm font-medium text-[#0a0a0a]">Tirar foto</span>
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
          </label>
          <label className="flex flex-col items-center justify-center gap-2 py-8 bg-white rounded-2xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
            <span className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center">
              <Upload className="w-5 h-5 text-blue-500" />
            </span>
            <span className="text-sm font-medium text-[#0a0a0a]">Upload</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </label>
        </div>
      )}
      {preview && (
        <button
          type="button"
          onClick={() => setPreview(null)}
          className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          Trocar imagem
        </button>
      )}
    </div>
  )
}
