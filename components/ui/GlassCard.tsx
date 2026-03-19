import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  /** Use a stronger blur/opacity for prominent sections */
  variant?: 'default' | 'strong' | 'subtle'
  /** Adds a hover transition effect */
  hoverable?: boolean
  rounded?: 'md' | 'lg' | 'xl' | '2xl' | '3xl'
}

export function GlassCard({
  children,
  className,
  variant = 'default',
  hoverable = false,
  rounded = '2xl',
}: GlassCardProps) {
  return (
    <div
      className={cn(
        // Base glass
        variant === 'default' && 'glass',
        variant === 'strong' && 'glass-strong',
        variant === 'subtle' &&
          'border border-[rgba(107,127,212,0.10)] bg-[rgba(107,127,212,0.03)] backdrop-blur-md',
        // Hover
        hoverable && 'glass-hover cursor-pointer',
        // Rounded
        rounded === 'md' && 'rounded-md',
        rounded === 'lg' && 'rounded-lg',
        rounded === 'xl' && 'rounded-xl',
        rounded === '2xl' && 'rounded-2xl',
        rounded === '3xl' && 'rounded-3xl',
        className,
      )}
    >
      {children}
    </div>
  )
}
