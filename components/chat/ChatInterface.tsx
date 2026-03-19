'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChat } from '@/hooks/useChat'
import { useVapi } from '@/hooks/useVapi'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import { ChatInput } from './ChatInput'
import { VoiceHandoffButton } from './VoiceHandoffButton'
import { AppointmentCard } from './AppointmentCard'
import { GlassCard } from '@/components/ui/GlassCard'
import type { BookedAppointmentSummary } from '@/types'

type PhoneCallStatus = 'idle' | 'calling' | 'initiated'

interface ChatInterfaceProps {
  onNewAppointment?: (appointment: BookedAppointmentSummary) => void
}

export function ChatInterface({ onNewAppointment }: ChatInterfaceProps) {
  const {
    messages,
    input,
    setInput,
    sendMessage,
    isLoading,
    appointments,
    sessionToken,
    conversationId,
    patientPhone,
    addVoiceMessage,
    refreshMessages,
  } = useChat()

  const { status: vapiStatus, liveTranscript, errorMessage: vapiError, startCall, endCall } = useVapi()
  const [phoneCallStatus, setPhoneCallStatus] = useState<PhoneCallStatus>('idle')
  const [phoneCallError, setPhoneCallError] = useState<string | null>(null)

  const scrollAnchorRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages (text or voice)
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading, vapiStatus])

  // Bubble newly booked appointments up to the parent layout
  const prevAppointmentCount = useRef(0)
  useEffect(() => {
    if (appointments.length > prevAppointmentCount.current) {
      const newest = appointments[appointments.length - 1]
      onNewAppointment?.(newest)
      prevAppointmentCount.current = appointments.length
    }
  }, [appointments, onNewAppointment])

  const handleVoiceStart = () => {
    startCall(sessionToken, conversationId, {
      onTranscript: (role, text) => addVoiceMessage(role, text),
      onCallEnd: () => {
        // Give the webhook a moment to persist final transcripts, then sync from DB
        setTimeout(() => refreshMessages(), 2000)
      },
    })
  }

  const handleCallPhone = useCallback(async () => {
    if (!patientPhone || phoneCallStatus !== 'idle') return

    setPhoneCallStatus('calling')
    setPhoneCallError(null)

    try {
      const res = await fetch('/api/voice/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken, conversationId, phoneNumber: patientPhone }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to initiate call')
      }

      setPhoneCallStatus('initiated')

      // Reset after 30 seconds so button can be used again if needed
      setTimeout(() => setPhoneCallStatus('idle'), 30_000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not place call'
      setPhoneCallError(msg)
      setPhoneCallStatus('idle')
    }
  }, [patientPhone, phoneCallStatus, sessionToken, conversationId])

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Message list — flex-1 + min-h-0 lets it shrink so the bottom bar stays fixed */}
      <GlassCard className="min-h-0 flex-1 overflow-hidden" rounded="3xl">
        <div className="flex h-full flex-col">
          {/* Chat header */}
          <div className="flex items-center gap-3 border-b border-[rgba(107,127,212,0.12)] px-6 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(107,127,212,0.15)] ring-2 ring-[rgba(107,127,212,0.3)]">
              <span className="text-sm font-bold text-[#6B7FD4]">K</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#E8ECFF]">Kyra</p>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                <p className="text-xs text-[#636478]">Patient Care Coordinator · Kyron Medical</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="flex flex-col gap-4">
              {/* Empty state */}
              {messages.length === 0 && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="flex flex-col items-center gap-4 py-12 text-center"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(107,127,212,0.1)] ring-2 ring-[rgba(107,127,212,0.2)]">
                    <span className="text-2xl font-bold text-[#6B7FD4]">K</span>
                  </div>
                  <div>
                    <p className="text-base font-medium text-[#E8ECFF]">
                      Hello! I&apos;m Kyra.
                    </p>
                    <p className="mt-1 text-sm text-[#636478]">
                      I&apos;m here to help you schedule an appointment at Kyron Medical.
                      <br />
                      How can I assist you today?
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Message bubbles */}
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
              </AnimatePresence>

              {/* Appointment confirmation cards — one per booking */}
              {appointments.map((appt) => (
                <div key={appt.confirmationCode} className="py-2">
                  <AppointmentCard appointment={appt} />
                </div>
              ))}

              {/* Typing indicator */}
              {isLoading && <TypingIndicator />}

              {/* Scroll anchor */}
              <div ref={scrollAnchorRef} />
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Fixed bottom bar — voice buttons + input in one card */}
      <GlassCard className="shrink-0 px-4 py-3" rounded="2xl">
        <div className="flex items-center gap-3">
          {/* Voice buttons */}
          <VoiceHandoffButton
            status={vapiStatus}
            onStart={handleVoiceStart}
            onEnd={endCall}
            onCallPhone={handleCallPhone}
            phoneCallStatus={phoneCallStatus}
            patientPhone={patientPhone}
            disabled={messages.length === 0}
            liveTranscript={liveTranscript}
          />

          {/* Divider */}
          <div className="h-8 w-px shrink-0 bg-[rgba(107,127,212,0.15)]" />

          {/* Text input — fills remaining space */}
          <div className="flex-1">
            <ChatInput
              value={input}
              onChange={setInput}
              onSubmit={sendMessage}
              disabled={isLoading || vapiStatus === 'active'}
              placeholder={
                vapiStatus === 'active'
                  ? 'Voice call in progress…'
                  : 'Type your message… (Enter to send)'
              }
            />
          </div>
        </div>

        {(vapiError || phoneCallError) && (
          <p className="mt-2 text-center text-xs text-red-400 opacity-80">
            {vapiError ?? phoneCallError}
          </p>
        )}
      </GlassCard>
    </div>
  )
}
