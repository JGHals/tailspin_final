import type { Metadata } from "next"
import "./globals.css"
import { Providers } from "@/components/providers"

export const metadata: Metadata = {
  title: "Tailspin - Word Chain Game",
  description: "Connect words where each new word starts with the last two letters of the previous word",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <Providers>
          {children}
        </Providers>
        <div id="portal-root" />
      </body>
    </html>
  )
}
