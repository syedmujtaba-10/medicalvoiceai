import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

/**
 * After a browser voice call ends, the client POSTs here with the Vapi call ID.
 * We fetch the full transcript from Vapi's REST API and store each message in the DB.
 * This is more reliable than relying on real-time webhooks.
 */
export async function POST(req: Request) {
  try {
    const { callId, conversationId } = await req.json()

    if (!callId || !conversationId) {
      return NextResponse.json({ error: 'callId and conversationId are required.' }, { status: 400 })
    }

    const vapiPrivateKey = process.env.VAPI_PRIVATE_KEY
    if (!vapiPrivateKey) {
      return NextResponse.json({ error: 'Vapi not configured.' }, { status: 500 })
    }

    // Fetch the completed call from Vapi (transcript is available once call ends)
    const vapiRes = await fetch(`https://api.vapi.ai/call/${callId}`, {
      headers: { Authorization: `Bearer ${vapiPrivateKey}` },
    })

    if (!vapiRes.ok) {
      console.error('[save-transcript] Vapi fetch failed', vapiRes.status)
      return NextResponse.json({ error: 'Failed to fetch call from Vapi.' }, { status: 502 })
    }

    const callData = await vapiRes.json()

    // Vapi stores messages in call.messages (top-level array).
    // Roles: "user" = patient, "bot" = AI assistant, "system"/"tool"/"tool-result" = skip.
    const vapiMessages: Array<{ role: string; message?: string }> = callData.messages ?? []

    console.log(`[save-transcript] call ${callId} has ${vapiMessages.length} raw messages`)

    const db = getServiceClient()

    // Link vapi_call_id to the conversation (in case webhook didn't fire)
    await db
      .from('conversations')
      .update({ vapi_call_id: callId, channel: 'voice' })
      .eq('id', conversationId)

    // Deduplicate against already-stored voice messages for this conversation
    const { data: existing } = await db
      .from('messages')
      .select('content')
      .eq('conversation_id', conversationId)
      .eq('channel', 'voice')

    const existingContents = new Set((existing ?? []).map((m: { content: string }) => m.content))

    // Keep only user + bot messages with non-empty text not already stored
    const toInsert = vapiMessages
      .filter((m) => {
        const isUserOrBot = m.role === 'user' || m.role === 'bot'
        const text = m.message ?? ''
        return isUserOrBot && text && !existingContents.has(text)
      })
      .map((m) => ({
        conversation_id: conversationId,
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.message ?? '',
        channel: 'voice',
      }))

    if (toInsert.length) {
      await db.from('messages').insert(toInsert)
    }

    console.log(`[save-transcript] Stored ${toInsert.length} messages for conversation ${conversationId}`)
    return NextResponse.json({ stored: toInsert.length })
  } catch (err) {
    console.error('[POST /api/voice/save-transcript]', err)
    return NextResponse.json({ error: 'Failed to save transcript.' }, { status: 500 })
  }
}
