// components/CountUp.tsx
'use client'

import { useEffect, useRef, useState } from 'react'

interface CountUpProps {
  end: number
  duration?: number
  suffix?: string
  prefix?: string
}

export default function CountUp({ end, duration = 2, suffix = '', prefix = '' }: CountUpProps) {
  const [count, setCount] = useState(0)
  const [hasAnimated, setHasAnimated] = useState(false)
  const elementRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    // Create intersection observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Start animation when element is visible and hasn't animated yet
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true)
          }
        })
      },
      { 
        threshold: 0.3, // Trigger when 30% of the element is visible
        rootMargin: '0px'
      }
    )

    // Start observing
    if (elementRef.current) {
      observer.observe(elementRef.current)
    }

    // Cleanup
    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current)
      }
    }
  }, [hasAnimated])

  // Animation effect
  useEffect(() => {
    if (!hasAnimated) return

    let startTime: number
    let animationFrame: number

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1)
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.floor(eased * end)
      
      setCount(current)

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      } else {
        setCount(end)
      }
    }

    animationFrame = requestAnimationFrame(animate)

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [end, duration, hasAnimated])

  return (
    <span ref={elementRef}>
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  )
}