// app/layout.tsx
import React from 'react'
import type { Metadata } from 'next'
import { Providers } from '../components/providers'
import { GoogleAnalytics } from '../components/googleAnalytics'
import '../index.css'
// import '../src/App.css'

export const metadata: Metadata = {
  title: 'Test Modeling App',
  description: '',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <GoogleAnalytics />
          <div className="App">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}