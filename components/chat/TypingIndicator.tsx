/**
 * Three-dot animated typing indicator shown while the AI is thinking.
 */
export function TypingIndicator() {
  return (
    <div className="flex items-end gap-3">
      {/* Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(107,127,212,0.15)] ring-1 ring-[rgba(107,127,212,0.3)]">
        <span className="text-xs font-semibold text-[#8B9BE0]">K</span>
      </div>

      {/* Bubble */}
      <div className="glass flex items-center gap-1.5 rounded-2xl rounded-bl-sm px-4 py-3 animate-fade-up">
        <span className="h-2 w-2 rounded-full bg-[#8B9BE0] dot-1" />
        <span className="h-2 w-2 rounded-full bg-[#8B9BE0] dot-2" />
        <span className="h-2 w-2 rounded-full bg-[#8B9BE0] dot-3" />
      </div>
    </div>
  )
}
