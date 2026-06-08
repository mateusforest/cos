import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const geist = Geist({ 
  subsets: ["latin"],
  variable: '--font-geist',
});

export const metadata: Metadata = {
  title: 'COS - Conversational Operating System',
  description: 'Uma nova forma de operar negócios, criar softwares e conectar sistemas. Sua empresa conversa. O COS executa.',
  generator: 'COS',
  manifest: '/manifest.json',
  icons: {
    icon: '/cos-icon.png',
    apple: '/cos-icon.png',
  },
  openGraph: {
    title: 'COS - Conversational Operating System',
    description: 'Uma nova forma de operar negócios, criar softwares e conectar sistemas.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#f5f5f3',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${geist.variable} bg-[#f5f5f3]`}>
      <body className="font-sans antialiased bg-[#f5f5f3]">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
