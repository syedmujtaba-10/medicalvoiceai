import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import {
  compressConversationContext,
  buildVoiceSystemPrompt,
} from '@/lib/anthropic'
import { buildAssistantOverrides } from '@/lib/vapi'

interface HandoffRequest {
  sessionToken: string
  conversationId: string | null
}

export async function POST(req: Request) {
  try {
    const { sessionToken, conversationId }: HandoffRequest = await req.json()

    if (!sessionToken) {
      return NextResponse.json({ error: 'sessionToken is required.' }, { status: 400 })
    }

    const assistantId = process.env.VAPI_ASSISTANT_ID
    if (!assistantId) {
      return NextResponse.json({ error: 'Vapi assistant not configured.' }, { status: 500 })
    }

    const db = getServiceClient()
    let contextSummary = 'No prior conversation found. Greet the patient and begin the intake process.'
    let patientPhone: string | null = null
    let patientId: string | null = null

    if (conversationId) {
      // Fetch messages for context compression
      const { data: messages } = await db
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(60)

      // Fetch conversation metadata for collected patient data
      const { data: conv } = await db
        .from('conversations')
        .select('patient_id, metadata')
        .eq('id', conversationId)
        .single()

      if (conv?.patient_id) {
        patientId = conv.patient_id
        const { data: patient } = await db
          .from('patients')
          .select('phone')
          .eq('id', conv.patient_id)
          .single()
        patientPhone = patient?.phone ?? null
      }

      if (messages && messages.length > 0) {
        const patientData = (conv?.metadata as Record<string, unknown>)?.collected ?? {}
        contextSummary = await compressConversationContext(
          messages,
          patientData as Record<string, unknown>,
        )
      }
    }

    // Save voice session for reconnection
    await db.from('voice_sessions').insert({
      patient_id: patientId,
      session_token: sessionToken,
      phone_number: patientPhone,
      compressed_context: { summary: contextSummary },
      last_active: new Date().toISOString(),
    })

    const voiceSystemPrompt = buildVoiceSystemPrompt(contextSummary)
    const assistantOverrides = buildAssistantOverrides(voiceSystemPrompt)

    return NextResponse.json({ assistantId, assistantOverrides })
  } catch (err) {
    console.error('[POST /api/voice/handoff]', err)
    return NextResponse.json({ error: 'Failed to prepare voice handoff.' }, { status: 500 })
  }
}
