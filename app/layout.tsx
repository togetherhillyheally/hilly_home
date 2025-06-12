import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hilly Heally',
  description: 'HILL YOUR WAY, HEAL YOUR WAY',
  generator: 'hillyheally.com',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/images/favicon/favicon.ico" type="image/x-icon" />
      </head>
      <body>{children}</body>
    </html>
  )
}
