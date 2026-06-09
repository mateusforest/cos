import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/components/auth/auth-provider'
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
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon-32x32.png',
    apple: '/apple-touch-icon.png',
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
        <AuthProvider>{children}</AuthProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
