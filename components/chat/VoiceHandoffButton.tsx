'use client'

import { PhoneOffIcon, Loader2Icon, MicIcon, PhoneCallIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VapiCallStatus } from '@/types'

interface VoiceHandoffButtonProps {
  status: VapiCallStatus
  onStart: () => void
  onEnd: () => void
  onCallPhone?: () => void
  phoneCallStatus?: 'idle' | 'calling' | 'initiated'
  disabled?: boolean
  patientPhone?: string | null
  liveTranscript?: string
}

export function VoiceHandoffButton({
  status,
  onStart,
  onEnd,
  onCallPhone,
  phoneCallStatus = 'idle',
  disabled = false,
  patientPhone,
  liveTranscript,
}: VoiceHandoffButtonProps) {
  const isIdle = status === 'idle' || status === 'ended' || status === 'error'
  const isConnecting = status === 'connecting'
  const isActive = status === 'active'

  const maskedPhone = patientPhone
    ? `···· ${patientPhone.replace(/\D/g, '').slice(-4)}`
    : null

  const phoneAvailable =
    !!patientPhone &&
    !!onCallPhone &&
    !isActive &&
    !isConnecting &&
    phoneCallStatus === 'idle'

  return (
    <div className="flex items-center gap-2">
      {/* ── Browser mic button ───────────────────────────────────────────── */}
      <div className="group relative">
        {/* Active pulse rings */}
        {isActive && (
          <>
            <span className="absolute inset-0 animate-ping rounded-full bg-red-500/20" />
            <span className="absolute inset-[-4px] animate-pulse rounded-full bg-red-500/10" />
          </>
        )}

        <button
          onClick={isActive ? onEnd : onStart}
          disabled={disabled || isConnecting || phoneCallStatus === 'calling'}
          aria-label={isActive ? 'End voice call' : 'Start browser voice call'}
          title={isActive ? 'End call' : isConnecting ? 'Connecting…' : 'Talk in browser'}
          className={cn(
            'relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B7FD4]/60 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent',
            // Idle
            isIdle && !disabled && [
              'bg-[rgba(107,127,212,0.1)] text-[#8B9BE0] ring-1 ring-[rgba(107,127,212,0.2)]',
              'hover:bg-[rgba(107,127,212,0.22)] hover:text-[#B0BEFF] hover:ring-[rgba(107,127,212,0.5)]',
              'hover:shadow-[0_0_16px_rgba(107,127,212,0.35)] hover:scale-110 active:scale-95',
            ],
            // Connecting
            isConnecting && 'bg-[rgba(107,127,212,0.1)] text-[#8B9BE0] ring-1 ring-[rgba(107,127,212,0.2)] cursor-not-allowed opacity-60',
            // Active
            isActive && [
              'bg-red-500/80 text-white ring-1 ring-red-400/50 shadow-[0_0_20px_rgba(239,68,68,0.4)]',
              'hover:bg-red-500 hover:shadow-[0_0_28px_rgba(239,68,68,0.55)] hover:scale-110 active:scale-95',
            ],
            disabled && !isActive && 'cursor-not-allowed opacity-35',
          )}
        >
          {isConnecting && <Loader2Icon className="h-4 w-4 animate-spin" />}
          {isActive && <PhoneOffIcon className="h-4 w-4" />}
          {isIdle && <MicIcon className="h-4 w-4" />}
        </button>

        {/* Tooltip */}
        <span className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] text-[#636478] opacity-0 transition-opacity group-hover:opacity-100">
          {isActive ? 'End call' : isConnecting ? 'Connecting…' : 'Browser'}
        </span>
      </div>

      {/* ── Separator ───────────────────────────────────────────────────── */}
      <span className="text-[11px] text-[#3E3F52]">or</span>

      {/* ── Call my phone button ─────────────────────────────────────────── */}
      <div className="group relative">
        {/* Initiated pulse */}
        {phoneCallStatus === 'initiated' && (
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20" />
        )}

        <button
          onClick={onCallPhone}
          disabled={!phoneAvailable}
          aria-label="Call my phone"
          title={
            phoneCallStatus === 'calling'
              ? 'Dialling…'
              : phoneCallStatus === 'initiated'
                ? `Calling ${maskedPhone}`
                : patientPhone
                  ? `Call ${maskedPhone}`
                  : 'Available after intake'
          }
          className={cn(
            'relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B7FD4]/60 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent',
            phoneAvailable && [
              'bg-[rgba(107,127,212,0.1)] text-[#8B9BE0] ring-1 ring-[rgba(107,127,212,0.2)]',
              'hover:bg-[rgba(107,127,212,0.22)] hover:text-[#B0BEFF] hover:ring-[rgba(107,127,212,0.5)]',
              'hover:shadow-[0_0_16px_rgba(107,127,212,0.35)] hover:scale-110 active:scale-95',
            ],
            phoneCallStatus === 'initiated' && [
              'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40',
              'shadow-[0_0_16px_rgba(52,211,153,0.3)]',
            ],
            !phoneAvailable && phoneCallStatus !== 'initiated' && [
              'bg-[rgba(107,127,212,0.06)] text-[#3E3F52] ring-1 ring-[rgba(107,127,212,0.1)] cursor-not-allowed',
            ],
          )}
        >
          {phoneCallStatus === 'calling'
            ? <Loader2Icon className="h-4 w-4 animate-spin" />
            : <PhoneCallIcon className="h-4 w-4" />
          }
        </button>

        {/* Tooltip */}
        <span className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] text-[#636478] opacity-0 transition-opacity group-hover:opacity-100">
          {phoneCallStatus === 'calling'
            ? 'Dialling…'
            : phoneCallStatus === 'initiated'
              ? `Calling ${maskedPhone}`
              : maskedPhone ?? 'My phone'}
        </span>
      </div>

      {/* ── Live transcript (shown beside buttons when active) ───────────── */}
      {isActive && liveTranscript && (
        <p className="ml-3 max-w-[200px] truncate text-xs italic text-[#636478]">
          &ldquo;{liveTranscript}&rdquo;
        </p>
      )}

      {/* ── Initiated confirmation ───────────────────────────────────────── */}
      {phoneCallStatus === 'initiated' && (
        <p className="ml-1 text-xs text-emerald-400">
          Calling {maskedPhone}…
        </p>
      )}
    </div>
  )
}
