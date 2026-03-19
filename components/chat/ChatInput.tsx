'use client'

import { useRef, useEffect, type KeyboardEvent, type FormEvent } from 'react'
import { cn } from '@/lib/utils'
import { GlassButton } from '@/components/ui/GlassButton'
import { SendIcon } from 'lucide-react'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'Type your message…',
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize the textarea as content grows
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [value])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && value.trim()) onSubmit()
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!disabled && value.trim()) onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="relative flex-1">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className={cn(
            'w-full resize-none bg-transparent px-2 py-2 text-sm leading-relaxed',
            'text-[#E8ECFF] placeholder:text-[#5A5C78]',
            'transition-all duration-200',
            'focus:outline-none',
            disabled && 'cursor-not-allowed opacity-50',
          )}
          style={{ maxHeight: '160px', minHeight: '48px' }}
        />
      </div>

      <GlassButton
        type="submit"
        disabled={disabled || !value.trim()}
        size="md"
        className="shrink-0 !px-4 !py-3"
        aria-label="Send message"
      >
        <SendIcon className="h-4 w-4" />
      </GlassButton>
    </form>
  )
}
