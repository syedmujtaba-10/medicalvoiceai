import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const db = getServiceClient()

    const { data: conversation, error: convError } = await db
      .from('conversations')
      .select('id, stage, metadata')
      .eq('id', id)
      .single()

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 })
    }

    const { data: messages, error: msgError } = await db
      .from('messages')
      .select('id, role, content, channel, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    if (msgError) throw msgError

    const formattedMessages = (messages ?? [])
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        channel: m.channel,
        createdAt: m.created_at,
      }))

    return NextResponse.json({
      id: conversation.id,
      stage: conversation.stage,
      messages: formattedMessages,
    })
  } catch (err) {
    console.error('[GET /api/conversations/[id]]', err)
    return NextResponse.json({ error: 'Failed to fetch conversation.' }, { status: 500 })
  }
}
