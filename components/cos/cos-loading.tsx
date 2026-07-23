"use client"

import Image from "next/image"
import { motion } from "framer-motion"

const COS_LOGO_MARK =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/COS%20LOGO%20%281%29-mBU7xqdIZoWP3indGVxJrDFLu8urZH.png"

type COSLoadingProps = {
  title: string
  description?: string
  currentStep?: string
}

export function COSLoading({ title, description, currentStep }: COSLoadingProps) {
  const accessibleLabel = currentStep || description || title

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-white/42 px-6 backdrop-blur-[5px]" role="status" aria-live="polite" aria-label={accessibleLabel}>
      <div className="flex items-center gap-4 text-[#1d1340]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.8, ease: "linear" }}
          className="flex h-12 w-12 items-center justify-center"
        >
          <Image src={COS_LOGO_MARK} alt="COS" width={30} height={30} className="h-8 w-8" />
        </motion.div>
        <p className="text-base font-medium tracking-[-0.02em] text-[#34178f]">Preparando</p>
      </div>
    </div>
  )
}
