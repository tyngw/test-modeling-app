// components/GoogleAnalytics.tsx
'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import ReactGA from 'react-ga4'

export function GoogleAnalytics() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const trackingId = process.env.NEXT_PUBLIC_GA_TRACKING_ID

  useEffect(() => {
    if (trackingId) {
      ReactGA.initialize(trackingId)
    } else {
      console.warn('Google Analytics tracking ID is not set.')
    }
  }, [trackingId])

  useEffect(() => {
    if (trackingId && process.env.NODE_ENV === 'production') {
      const url = pathname + (searchParams.toString() ? `?${searchParams}` : '')
      ReactGA.send({ hitType: 'pageview', page: url })
    }
  }, [pathname, searchParams, trackingId])

  return null
}