'use client'

import { PhoneIcon, PhoneOffIcon, Loader2Icon, MicIcon, PhoneCallIcon } from 'lucide-react'
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

  // Mask phone for display: show last 4 digits only
  const maskedPhone = patientPhone
    ? `···· ${patientPhone.replace(/\D/g, '').slice(-4)}`
    : null

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Live transcript */}
      {isActive && liveTranscript && (
        <div className="glass animate-fade-up w-full max-w-sm rounded-2xl px-4 py-3">
          <p className="text-center text-xs italic text-[#9396B0]">
            &ldquo;{liveTranscript}&rdquo;
          </p>
        </div>
      )}

      {/* Phone call initiated banner */}
      {phoneCallStatus === 'initiated' && (
        <div className="glass animate-fade-up w-full max-w-sm rounded-2xl px-4 py-3">
          <p className="text-center text-xs text-emerald-400">
            Calling {maskedPhone} — Kyra will pick up with your full context.
          </p>
        </div>
      )}

      {/* Button row */}
      <div className="flex items-center gap-4">
        {/* Pulse rings — visible when browser call is active */}
        {isActive && (
          <div className="relative flex items-center justify-center">
            <span className="animate-pulse-ring absolute h-14 w-14 rounded-full bg-[rgba(107,127,212,0.25)]" />
            <span className="animate-pulse-ring absolute h-14 w-14 rounded-full bg-[rgba(107,127,212,0.15)] [animation-delay:0.5s]" />
          </div>
        )}

        {/* Browser mic button */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={isActive ? onEnd : onStart}
            disabled={disabled || isConnecting || phoneCallStatus === 'calling'}
            aria-label={isActive ? 'End voice call' : 'Talk in browser'}
            className={cn(
              'relative flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(107,127,212,0.7)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
              isIdle && [
                'glass animate-mic text-[#8B9BE0]',
                !disabled &&
                  'hover:bg-[rgba(107,127,212,0.18)] hover:border-[rgba(107,127,212,0.45)] hover:shadow-[0_0_24px_rgba(107,127,212,0.35)] active:scale-95',
              ],
              isConnecting && 'glass cursor-not-allowed opacity-60 text-[#8B9BE0]',
              isActive && [
                'bg-red-500/80 border border-red-400/50 text-white shadow-[0_0_24px_rgba(239,68,68,0.4)]',
                'hover:bg-red-500/90 active:scale-95',
              ],
              (disabled && !isActive) && 'cursor-not-allowed opacity-40',
            )}
          >
            {isConnecting && <Loader2Icon className="h-6 w-6 animate-spin" />}
            {isActive && <PhoneOffIcon className="h-6 w-6" />}
            {isIdle && <MicIcon className="h-6 w-6" />}
          </button>
          <span className="text-[10px] text-[#636478]">
            {isActive ? 'End call' : isConnecting ? 'Connecting…' : 'In browser'}
          </span>
        </div>

        {/* Divider */}
        <div className="flex flex-col items-center gap-1">
          <div className="h-8 w-px bg-[rgba(107,127,212,0.15)]" />
          <span className="text-[10px] text-[#3E3F52]">or</span>
          <div className="h-8 w-px bg-[rgba(107,127,212,0.15)]" />
        </div>

        {/* Call my phone button — only shown when patient phone is known */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={onCallPhone}
            disabled={
              !patientPhone ||
              !onCallPhone ||
              isActive ||
              isConnecting ||
              phoneCallStatus === 'calling' ||
              phoneCallStatus === 'initiated'
            }
            aria-label="Call my phone"
            className={cn(
              'relative flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(107,127,212,0.7)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
              'glass text-[#8B9BE0]',
              patientPhone &&
                onCallPhone &&
                !isActive &&
                !isConnecting &&
                phoneCallStatus === 'idle' && [
                  'hover:bg-[rgba(107,127,212,0.18)] hover:border-[rgba(107,127,212,0.45)] hover:shadow-[0_0_24px_rgba(107,127,212,0.35)] active:scale-95',
                ],
              (!patientPhone || isActive || isConnecting || phoneCallStatus !== 'idle') &&
                'cursor-not-allowed opacity-40',
            )}
          >
            {phoneCallStatus === 'calling' ? (
              <Loader2Icon className="h-6 w-6 animate-spin" />
            ) : (
              <PhoneCallIcon className="h-6 w-6" />
            )}
          </button>
          <span className="text-[10px] text-[#636478]">
            {phoneCallStatus === 'calling'
              ? 'Dialling…'
              : phoneCallStatus === 'initiated'
                ? 'Calling you'
                : patientPhone
                  ? `Call ${maskedPhone}`
                  : 'My phone'}
          </span>
        </div>

        {/* Label */}
        <div className="flex flex-col">
          <span className="text-sm font-medium text-[#E8ECFF]">
            {isConnecting && 'Connecting…'}
            {isActive && 'On Call'}
            {isIdle && status !== 'ended' && 'Continue by voice'}
            {status === 'ended' && 'Call ended'}
            {status === 'error' && 'Call failed — retry?'}
          </span>
          <span className="text-xs text-[#636478]">
            {isActive
              ? 'Kyra has your full context'
              : 'Kyra will remember this conversation'}
          </span>
        </div>
      </div>
    </div>
  )
}
