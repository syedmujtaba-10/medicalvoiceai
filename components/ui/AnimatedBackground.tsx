'use client'

import { motion } from 'framer-motion'

/**
 * Three large gradient orbs that drift slowly behind all content.
 * Uses CSS animations for performance — Framer Motion only for the
 * initial fade-in so there's no JS animation loop overhead.
 */
export function AnimatedBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Orb 1 — Kyron blue, bottom-left */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2.5, ease: 'easeOut' }}
        className="animate-orb-1 absolute -bottom-48 -left-48 h-[600px] w-[600px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(107,127,212,0.22) 0%, rgba(107,127,212,0.08) 50%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Orb 2 — Deeper blue/violet, top-right */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 3, ease: 'easeOut', delay: 0.4 }}
        className="animate-orb-2 absolute -right-32 -top-32 h-[700px] w-[700px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(74,92,181,0.20) 0%, rgba(107,127,212,0.07) 50%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Orb 3 — Subtle center accent */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 3.5, ease: 'easeOut', delay: 0.8 }}
        className="animate-orb-3 absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(139,155,224,0.10) 0%, transparent 65%)',
          filter: 'blur(50px)',
        }}
      />

      {/* Noise grain overlay for depth */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
        }}
      />
    </div>
  )
}
