'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { VapiCallStatus } from '@/types'

interface UseVapiCallbacks {
  onTranscript?: (role: 'user' | 'assistant', text: string) => void
  onCallEnd?: (callId: string | null) => void
}

interface UseVapiReturn {
  status: VapiCallStatus
  liveTranscript: string
  errorMessage: string | null
  startCall: (sessionToken: string, conversationId: string | null, callbacks?: UseVapiCallbacks) => Promise<void>
  endCall: () => void
}

/** Serialize any error value to a readable string — handles non-enumerable properties */
function serializeError(err: unknown): string {
  if (!err) return 'Unknown error'
  if (typeof err === 'string') return err
  if (err instanceof Error) return `${err.name}: ${err.message}`
  try {
    // Many API/SDK errors store info in non-enumerable props — get them explicitly
    const obj = err as Record<string, unknown>
    const parts: string[] = []
    for (const key of Object.getOwnPropertyNames(obj)) {
      parts.push(`${key}: ${String(obj[key])}`)
    }
    if (parts.length) return parts.join(' | ')
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}

export function useVapi(): UseVapiReturn {
  const [status, setStatus] = useState<VapiCallStatus>('idle')
  const [liveTranscript, setLiveTranscript] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vapiRef = useRef<any>(null)
  const callIdRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      vapiRef.current?.stop()
    }
  }, [])

  const startCall = useCallback(
    async (sessionToken: string, conversationId: string | null, callbacks?: UseVapiCallbacks) => {
      setStatus('connecting')
      setLiveTranscript('')
      setErrorMessage(null)

      try {
        // 1. Fetch context from server and get Vapi overrides
        const handoffRes = await fetch('/api/voice/handoff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken, conversationId }),
        })

        if (!handoffRes.ok) {
          const errData = await handoffRes.json().catch(() => ({}))
          throw new Error(errData.error ?? 'Failed to prepare voice handoff')
        }

        const { assistantId, assistantOverrides } = await handoffRes.json()

        // 2. Dynamically import Vapi (browser-only)
        const { default: Vapi } = await import('@vapi-ai/web')
        const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY
        if (!publicKey) throw new Error('Vapi public key not configured')

        const vapi = new Vapi(publicKey)
        vapiRef.current = vapi

        // 3. Wire up event listeners — including the detailed `call-start-failed` event
        vapi.on('call-start', () => {
          setStatus('active')
          setErrorMessage(null)
          // callIdRef is populated from the first message event (msg.call?.id)
        })

        vapi.on('call-end', () => {
          setStatus('ended')
          setLiveTranscript('')
          callbacks?.onCallEnd?.(callIdRef.current)
          callIdRef.current = null
        })

        // Generic error event — often fires with opaque objects
        vapi.on('error', (err: unknown) => {
          const msg = serializeError(err)
          console.error('[Vapi error]', msg, err)
          setErrorMessage(msg)
          setStatus('error')
        })

        // Detailed failure event — stage + errorStack tell you exactly what failed
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vapi.on('call-start-failed' as any, (evt: { stage: string; error: string; errorStack?: string; context: Record<string, unknown> }) => {
          const msg = `Call failed at stage "${evt.stage}": ${evt.error}`
          console.error('[Vapi call-start-failed]', msg, evt.context)
          setErrorMessage(msg)
          setStatus('error')
        })

        vapi.on('message', (msg: { type: string; transcriptType?: string; role?: string; transcript?: string; call?: { id?: string } }) => {
          // Capture call ID from message events as fallback (call-start may not include it)
          if (msg.call?.id && !callIdRef.current) callIdRef.current = msg.call.id

          if (msg.type === 'transcript' && msg.transcriptType === 'partial' && msg.role === 'assistant') {
            setLiveTranscript(msg.transcript ?? '')
          }
          if (msg.type === 'transcript' && msg.transcriptType === 'final') {
            setLiveTranscript('')
            const role = msg.role === 'user' ? 'user' : 'assistant'
            const text = msg.transcript ?? ''
            if (text) callbacks?.onTranscript?.(role, text)
          }
        })

        // 4. Start the call
        await vapi.start(assistantId, assistantOverrides)
      } catch (err) {
        const msg = serializeError(err)
        console.error('[startCall error]', msg)
        setErrorMessage(msg)
        setStatus('error')
      }
    },
    [],
  )

  const endCall = useCallback(() => {
    vapiRef.current?.stop()
    setStatus('ended')
    setLiveTranscript('')
  }, [])

  return { status, liveTranscript, errorMessage, startCall, endCall }
}
