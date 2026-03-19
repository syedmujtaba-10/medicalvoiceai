import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import {
  anthropic,
  MODEL,
  buildSystemPrompt,
  buildContextBlock,
  parseClaudeResponse,
} from '@/lib/anthropic'
import { matchBestDoctor, formatSlotsForAI } from '@/lib/scheduler'
import { getDoctorById, getAvailableSlots } from '@/lib/doctors'
import type { ChatRequest, ChatResponse, ConversationState } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeConversationId(): string {
  return crypto.randomUUID()
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request): Promise<NextResponse<ChatResponse | { error: string }>> {
  try {
    const body: ChatRequest = await req.json()
    const { message, sessionToken, conversationId: existingConvId } = body

    if (!message?.trim() || !sessionToken) {
      return NextResponse.json({ error: 'message and sessionToken are required.' }, { status: 400 })
    }

    const db = getServiceClient()

    // ── 1. Get or create conversation ─────────────────────────────────────────

    let conversationId = existingConvId ?? null
    let conversationState: Partial<ConversationState> = {}

    if (conversationId) {
      const { data: conv } = await db
        .from('conversations')
        .select('id, stage, metadata')
        .eq('id', conversationId)
        .single()

      if (conv) {
        conversationState = {
          stage: conv.stage,
          ...(conv.metadata as object),
        }
      } else {
        conversationId = null // conversation not found, start fresh
      }
    }

    if (!conversationId) {
      const { data: newConv, error: convError } = await db
        .from('conversations')
        .insert({ session_token: sessionToken, channel: 'web', stage: 'greeting' })
        .select('id')
        .single()

      if (convError) throw convError
      conversationId = newConv.id
    }

    // ── 2. Fetch message history ───────────────────────────────────────────────

    const { data: dbMessages } = await db
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(60)

    const history = (dbMessages ?? []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    // ── 3. Build context for system prompt ────────────────────────────────────

    let slotsText: string | undefined
    let matchedDoctorText: string | undefined

    // If we're in matching stage, prepare doctor match info
    if (conversationState.stage === 'matching' || conversationState.stage === 'slot_selection') {
      const reason = conversationState.collected?.reason
      if (reason) {
        const match = matchBestDoctor(reason)
        if (match) {
          const slots = getAvailableSlots(match.doctor.id, 6)
          slotsText = formatSlotsForAI(slots)
          matchedDoctorText =
            `Dr. ${match.doctor.firstName} ${match.doctor.lastName}, ${match.doctor.title}\n` +
            `Specialty: ${match.doctor.specialty.name}\n` +
            `Bio: ${match.doctor.bio}`
        }
      }
    }

    const contextBlock = buildContextBlock(conversationState, slotsText, matchedDoctorText)
    const systemPrompt = buildSystemPrompt(contextBlock)

    // ── 4. Call Anthropic ─────────────────────────────────────────────────────

    const anthropicMessages = [
      ...history,
      { role: 'user' as const, content: message.trim() },
    ]

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: anthropicMessages,
    })

    const rawText =
      response.content.find((b) => b.type === 'text')?.text ?? ''

    const { text: cleanText, state: newState } = parseClaudeResponse(rawText)

    // ── 5. Persist messages ───────────────────────────────────────────────────

    await db.from('messages').insert([
      { conversation_id: conversationId, role: 'user', content: message.trim(), channel: 'web' },
      { conversation_id: conversationId, role: 'assistant', content: cleanText, channel: 'web' },
    ])

    // ── 6. Process state changes ──────────────────────────────────────────────

    let patientId: string | undefined
    let appointment = null

    if (newState) {
      // Update conversation stage in DB
      const metadataUpdate: Record<string, unknown> = {
        collected: newState.collected,
      }

      await db
        .from('conversations')
        .update({ stage: newState.stage, metadata: metadataUpdate })
        .eq('id', conversationId)

      // Action: create/upsert patient when all intake fields are collected
      const c = newState.collected
      const intakeComplete =
        c?.firstName && c?.lastName && c?.dateOfBirth && c?.phone && c?.email && c?.reason

      if (intakeComplete) {
        const patientRes = await fetch(
          new URL('/api/patients', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').href,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...c,
              conversationId,
            }),
          },
        )
        if (patientRes.ok) {
          const patientData = await patientRes.json()
          patientId = patientData.patientId
        }
      }

      // Action: book appointment
      if (newState.action === 'book_appointment' && newState.actionData && patientId) {
        const { doctorId, slotId } = newState.actionData as { doctorId: string; slotId: string }
        const doctor = getDoctorById(doctorId)

        if (doctor && doctorId && slotId && c?.email) {
          const apptRes = await fetch(
            new URL('/api/appointments', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').href,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                patientId,
                doctorId,
                slotId,
                conversationId,
                reason: c.reason,
                patientEmail: c.email,
                patientPhone: c.phone,
                patientName: `${c.firstName} ${c.lastName}`,
                smsOptIn: c.smsOptIn ?? false,
              }),
            },
          )

          if (apptRes.ok) {
            const apptData = await apptRes.json()
            appointment = {
              id: apptData.appointmentId,
              confirmationCode: apptData.confirmationCode,
              doctorName: apptData.doctorName,
              specialty: apptData.specialty,
              appointmentDt: apptData.appointmentDt,
              patientEmail: c.email!,
              patientPhone: c.phone ?? '',
            }
          }
        }
      }
    }

    // conversationId is always set by this point (created above if null)
    return NextResponse.json({
      text: cleanText,
      conversationId: conversationId as string,
      stage: newState?.stage ?? conversationState.stage ?? 'greeting',
      ...(patientId ? { patientId } : {}),
      ...(appointment ? { appointment } : {}),
    } satisfies ChatResponse)
  } catch (err) {
    console.error('[POST /api/chat]', err)
    return NextResponse.json(
      { error: 'Failed to process message. Please try again.' },
      { status: 500 },
    )
  }
}
