import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

/**
 * Called immediately after vapi.start() resolves in the browser so we can
 * link the Vapi call ID to the web conversation before the call ends.
 * This lets the webhook end-of-call-report find the conversation by vapi_call_id.
 */
export async function POST(req: Request) {
  try {
    const { callId, conversationId } = await req.json()
    if (!callId || !conversationId) {
      return NextResponse.json({ error: 'callId and conversationId required.' }, { status: 400 })
    }

    const db = getServiceClient()
    await db
      .from('conversations')
      .update({ vapi_call_id: callId, channel: 'voice' })
      .eq('id', conversationId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/voice/link-call]', err)
    return NextResponse.json({ error: 'Failed to link call.' }, { status: 500 })
  }
}
