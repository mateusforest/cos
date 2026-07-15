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
  return (
    <div className="w-full rounded-3xl border border-gray-100 bg-gray-50 px-6 py-10 text-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2, ease: "linear" }}
        className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-sm"
      >
        <Image src={COS_LOGO_MARK} alt="COS" width={34} height={34} className="h-8 w-8" />
      </motion.div>

      <p className="text-base font-semibold text-[#0a0a0a]">{title}</p>

      {description ? <p className="mt-2 text-sm leading-relaxed text-gray-500">{description}</p> : null}

      <div className="mt-6 overflow-hidden rounded-full bg-white">
        <motion.div
          className="h-2 rounded-full bg-[#0a0a0a]"
          animate={{ x: ["-55%", "155%"] }}
          transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.4, ease: "easeInOut" }}
          style={{ width: "45%" }}
        />
      </div>

      {currentStep ? <p className="mt-4 text-xs font-medium uppercase tracking-[0.14em] text-gray-400">{currentStep}</p> : null}
    </div>
  )
}
