'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type {
  ChatMessage,
  ConversationStage,
  BookedAppointmentSummary,
  ChatRequest,
  ChatResponse,
} from '@/types'

const SESSION_TOKEN_KEY = 'kyron_session_token'
const CONVERSATION_ID_KEY = 'kyron_conversation_id'
const PATIENT_PHONE_KEY = 'kyron_patient_phone'

interface UseChatReturn {
  messages: ChatMessage[]
  input: string
  setInput: (value: string) => void
  sendMessage: () => Promise<void>
  isLoading: boolean
  stage: ConversationStage
  appointments: BookedAppointmentSummary[]
  sessionToken: string
  conversationId: string | null
  patientPhone: string | null
  error: string | null
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [stage, setStage] = useState<ConversationStage>('greeting')
  const [appointments, setAppointments] = useState<BookedAppointmentSummary[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [patientPhone, setPatientPhone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Stable session token — persists across page refreshes
  const sessionToken = useRef<string>('')

  useEffect(() => {
    if (typeof window === 'undefined') return

    let token = localStorage.getItem(SESSION_TOKEN_KEY)
    if (!token) {
      token = uuidv4()
      localStorage.setItem(SESSION_TOKEN_KEY, token)
    }
    sessionToken.current = token

    const savedConversationId = localStorage.getItem(CONVERSATION_ID_KEY)
    if (savedConversationId) {
      setConversationId(savedConversationId)
      // Restore prior conversation messages
      restoreConversation(savedConversationId)
    }

    const savedPhone = localStorage.getItem(PATIENT_PHONE_KEY)
    if (savedPhone) setPatientPhone(savedPhone)
  }, [])

  const restoreConversation = async (convId: string) => {
    try {
      const res = await fetch(`/api/conversations/${convId}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.messages?.length) {
        setMessages(data.messages)
        setStage(data.stage ?? 'greeting')
      }
    } catch {
      // If restore fails, start fresh — not a critical error
    }
  }

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading) return

    setInput('')
    setError(null)

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: text,
      channel: 'web',
      createdAt: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      const body: ChatRequest = {
        message: text,
        sessionToken: sessionToken.current,
        ...(conversationId ? { conversationId } : {}),
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error ?? `Server error ${res.status}`)
      }

      const data: ChatResponse = await res.json()

      // Persist conversation ID for reconnect
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId)
        localStorage.setItem(CONVERSATION_ID_KEY, data.conversationId)
      }

      setStage(data.stage)

      if (data.patientPhone && !patientPhone) {
        setPatientPhone(data.patientPhone)
        localStorage.setItem(PATIENT_PHONE_KEY, data.patientPhone)
      }

      if (data.appointment) {
        setAppointments((prev) => [...prev, data.appointment!])
      }

      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: data.text,
        channel: 'web',
        createdAt: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setError(message)

      // Add an error message to the chat so the UI reflects it
      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          role: 'assistant',
          content: "I'm sorry, I ran into a technical issue. Please try again in a moment.",
          channel: 'web',
          createdAt: new Date().toISOString(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, conversationId])

  return {
    messages,
    input,
    setInput,
    sendMessage,
    isLoading,
    stage,
    appointments,
    sessionToken: sessionToken.current,
    conversationId,
    patientPhone,
    error,
  }
}
