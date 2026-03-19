import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/types'

interface MessageBubbleProps {
  message: ChatMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'flex items-end gap-3',
        isUser ? 'flex-row-reverse animate-slide-right' : 'animate-slide-left',
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
          isUser
            ? 'bg-[rgba(107,127,212,0.25)] text-[#E8ECFF] ring-1 ring-[rgba(107,127,212,0.4)]'
            : 'bg-[rgba(107,127,212,0.15)] text-[#8B9BE0] ring-1 ring-[rgba(107,127,212,0.3)]',
        )}
      >
        {isUser ? 'You' : 'K'}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'rounded-br-sm bg-[rgba(107,127,212,0.20)] text-[#E8ECFF] ring-1 ring-[rgba(107,127,212,0.35)]'
            : 'glass rounded-bl-sm text-[#E0E4FF]',
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <p
          className={cn(
            'mt-1.5 text-[10px]',
            isUser ? 'text-right text-[rgba(232,236,255,0.4)]' : 'text-[rgba(147,150,176,0.6)]',
          )}
        >
          {new Date(message.createdAt).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })}
        </p>
      </div>
    </div>
  )
}
