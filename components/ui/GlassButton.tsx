import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function GlassButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  disabled,
  ...props
}: GlassButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        // Base
        'relative inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(107,127,212,0.7)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
        // Disabled / loading
        (disabled || loading) && 'cursor-not-allowed opacity-50',
        // Size
        size === 'sm' && 'rounded-xl px-4 py-2 text-sm',
        size === 'md' && 'rounded-xl px-6 py-3 text-sm',
        size === 'lg' && 'rounded-2xl px-8 py-4 text-base',
        // Variants
        variant === 'primary' && [
          'glass border-[rgba(107,127,212,0.3)] bg-[rgba(107,127,212,0.15)] text-[#E8ECFF]',
          !disabled &&
            !loading &&
            'hover:border-[rgba(107,127,212,0.5)] hover:bg-[rgba(107,127,212,0.25)] hover:shadow-[0_0_20px_rgba(107,127,212,0.3)] active:scale-[0.98]',
        ],
        variant === 'ghost' && [
          'border border-transparent bg-transparent text-[#9396B0]',
          !disabled &&
            !loading &&
            'hover:border-[rgba(107,127,212,0.2)] hover:bg-[rgba(107,127,212,0.06)] hover:text-[#E8ECFF] active:scale-[0.98]',
        ],
        variant === 'danger' && [
          'border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.1)] text-red-300',
          !disabled &&
            !loading &&
            'hover:border-[rgba(239,68,68,0.5)] hover:bg-[rgba(239,68,68,0.18)] active:scale-[0.98]',
        ],
        className,
      )}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </span>
      )}
      <span className={cn(loading && 'invisible')}>{children}</span>
    </button>
  )
}
