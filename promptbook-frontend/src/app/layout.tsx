import './globals.css'
import NextAuthSessionProvider from '@/components/providers/session-provider'
import Header from '@/components/layout/header'
import BottomNavigation from '@/components/layout/BottomNavigation'
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

export const metadata = {
  title: 'AI Prompt Encyclopedia',
  description: 'Discover, share, and optimize AI prompts with our community-driven platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <NextAuthSessionProvider>
          <Header />
          {children}
          <BottomNavigation />
        </NextAuthSessionProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
