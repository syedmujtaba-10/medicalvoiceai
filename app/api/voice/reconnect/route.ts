import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { buildReconnectSystemPrompt } from '@/lib/anthropic'
import { buildAssistantOverrides } from '@/lib/vapi'

/**
 * Called by Vapi when an inbound call arrives at the provisioned phone number.
 * Looks up the caller's prior context by phone number and returns
 * the assistant overrides to inject that context into the new call.
 */
export async function POST(req: Request) {
  try {
    const payload = await req.json()

    // Vapi sends the caller's phone number in the webhook payload
    const phoneNumber =
      payload.message?.call?.customer?.number ??
      payload.phoneNumber ??
      null

    const assistantId = process.env.VAPI_ASSISTANT_ID
    if (!assistantId) {
      return NextResponse.json({ error: 'Vapi assistant not configured.' }, { status: 500 })
    }

    let contextSummary = 'A patient is calling. Begin a fresh intake if they are new, or ask them to confirm their name and what they were working on if they mention a prior call.'

    if (phoneNumber) {
      const db = getServiceClient()

      // Find the most recent voice session for this phone number
      const { data: session } = await db
        .from('voice_sessions')
        .select('compressed_context, last_active')
        .eq('phone_number', phoneNumber)
        .order('last_active', { ascending: false })
        .limit(1)
        .single()

      if (session?.compressed_context) {
        const stored = session.compressed_context as { summary?: string }
        if (stored.summary) {
          contextSummary = stored.summary
        }

        // Update last_active
        await db
          .from('voice_sessions')
          .update({ last_active: new Date().toISOString() })
          .eq('phone_number', phoneNumber)
          .order('last_active', { ascending: false })
      }
    }

    const systemPrompt = buildReconnectSystemPrompt(contextSummary)
    const assistantOverrides = buildAssistantOverrides(systemPrompt)

    // Return in the format Vapi expects for inbound call configuration
    return NextResponse.json({ assistantId, assistantOverrides })
  } catch (err) {
    console.error('[POST /api/voice/reconnect]', err)
    return NextResponse.json({ error: 'Failed to prepare reconnect.' }, { status: 500 })
  }
}
