import type { Metadata } from 'next'
import { Fira_Sans_Condensed } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _fireSans = Fira_Sans_Condensed({ subsets: ["latin"], weight: "500" });

export const metadata: Metadata = {
  title: 'Spirit Messenger',
  description: 'MSN Messenger, resurrected',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${_fireSans.className} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
