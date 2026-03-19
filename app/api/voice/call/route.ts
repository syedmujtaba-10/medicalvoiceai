import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { compressConversationContext, buildVoiceSystemPrompt } from '@/lib/anthropic'
import { buildAssistantOverrides } from '@/lib/vapi'

interface CallRequest {
  sessionToken: string
  conversationId: string | null
  phoneNumber: string
}

/**
 * Initiates an outbound phone call to the patient via Vapi's REST API.
 * Vapi dials the patient's number from our provisioned phone number,
 * with the full conversation context injected as the system prompt.
 */
export async function POST(req: Request) {
  try {
    const { sessionToken, conversationId, phoneNumber }: CallRequest = await req.json()

    if (!sessionToken || !phoneNumber) {
      return NextResponse.json(
        { error: 'sessionToken and phoneNumber are required.' },
        { status: 400 },
      )
    }

    const assistantId = process.env.VAPI_ASSISTANT_ID
    const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID
    const vapiPrivateKey = process.env.VAPI_PRIVATE_KEY

    if (!assistantId || !phoneNumberId || !vapiPrivateKey) {
      return NextResponse.json({ error: 'Voice call not configured.' }, { status: 500 })
    }

    // Normalise phone number — ensure it has a + prefix
    const normalised = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber.replace(/\D/g, '')}`

    const db = getServiceClient()
    let contextSummary =
      'No prior conversation found. Greet the patient warmly and begin the intake process.'
    let patientId: string | null = null

    if (conversationId) {
      const { data: messages } = await db
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(60)

      const { data: conv } = await db
        .from('conversations')
        .select('patient_id, metadata')
        .eq('id', conversationId)
        .single()

      if (conv?.patient_id) {
        patientId = conv.patient_id
      }

      if (messages && messages.length > 0) {
        const patientData = (conv?.metadata as Record<string, unknown>)?.collected ?? {}
        contextSummary = await compressConversationContext(
          messages,
          patientData as Record<string, unknown>,
        )
      }
    }

    // Persist voice session for reconnect (patient may call back if dropped)
    await db.from('voice_sessions').insert({
      patient_id: patientId,
      session_token: sessionToken,
      phone_number: normalised,
      compressed_context: { summary: contextSummary },
      last_active: new Date().toISOString(),
    })

    const voiceSystemPrompt = buildVoiceSystemPrompt(contextSummary)
    const assistantOverrides = buildAssistantOverrides(
      voiceSystemPrompt,
      conversationId ? { conversationId } : undefined,
    )

    // Initiate the outbound call via Vapi REST API
    const vapiRes = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${vapiPrivateKey}`,
      },
      body: JSON.stringify({
        assistantId,
        assistantOverrides,
        phoneNumberId,
        customer: { number: normalised },
      }),
    })

    if (!vapiRes.ok) {
      const vapiError = await vapiRes.json().catch(() => ({}))
      console.error('[POST /api/voice/call] Vapi error:', vapiError)
      return NextResponse.json(
        { error: vapiError.message ?? 'Failed to initiate call.' },
        { status: vapiRes.status },
      )
    }

    const callData = await vapiRes.json()
    const vapiCallId: string = callData.id

    // Immediately link the Vapi call ID to the web conversation so that:
    // 1. Voice transcripts get persisted against the right conversation
    // 2. bookAppointment tool calls find the conversation_id without a race condition
    if (conversationId && vapiCallId) {
      await db
        .from('conversations')
        .update({ vapi_call_id: vapiCallId, channel: 'voice' })
        .eq('id', conversationId)
    }

    return NextResponse.json({ callId: vapiCallId, status: 'initiated' })
  } catch (err) {
    console.error('[POST /api/voice/call]', err)
    return NextResponse.json({ error: 'Failed to initiate phone call.' }, { status: 500 })
  }
}
