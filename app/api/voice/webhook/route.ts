import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

/**
 * Vapi webhook receiver.
 *
 * Vapi sends events here because we set `serverUrl` in assistantOverrides
 * (built in lib/vapi.ts → buildAssistantOverrides). No dashboard config needed.
 *
 * Events handled:
 * - transcript      → persist final transcripts to messages table
 * - call-started    → create/link voice conversation record
 * - call-ended      → mark conversation completed
 * - tool-calls      → checkAvailability + bookAppointment
 */
export async function POST(req: Request) {
  try {
    const payload = await req.json()
    const { message } = payload

    if (!message) {
      return NextResponse.json({ result: 'no-op' })
    }

    const db = getServiceClient()

    switch (message.type) {
      // ── Persist final voice transcripts ──────────────────────────────────────
      case 'transcript': {
        if (message.transcriptType !== 'final') break

        const callId = message.call?.id
        if (!callId) break

        const { data: conv } = await db
          .from('conversations')
          .select('id')
          .eq('vapi_call_id', callId)
          .single()

        if (conv) {
          await db.from('messages').insert({
            conversation_id: conv.id,
            role: message.role === 'user' ? 'user' : 'assistant',
            content: message.transcript,
            channel: 'voice',
          })
        }
        break
      }

      // ── Create/link a conversation record for this voice call ─────────────────
      case 'call-started': {
        const callId = message.call?.id
        if (!callId) break

        const phoneNumber = message.call?.customer?.number ?? null

        // For web-initiated calls, link to the existing web conversation via voice_sessions
        let sessionToken = `voice-${callId}`
        if (phoneNumber) {
          const { data: voiceSession } = await db
            .from('voice_sessions')
            .select('session_token')
            .eq('phone_number', phoneNumber)
            .order('last_active', { ascending: false })
            .limit(1)
            .single()

          if (voiceSession) {
            sessionToken = voiceSession.session_token
            await db
              .from('voice_sessions')
              .update({ last_active: new Date().toISOString() })
              .eq('session_token', sessionToken)
          }
        }

        // If the web conversation exists, just add the vapi_call_id to it
        const { data: existing } = await db
          .from('conversations')
          .select('id')
          .eq('session_token', sessionToken)
          .single()

        if (existing) {
          await db
            .from('conversations')
            .update({ vapi_call_id: callId, channel: 'voice' })
            .eq('id', existing.id)
        } else {
          await db.from('conversations').insert({
            session_token: sessionToken,
            channel: 'voice',
            vapi_call_id: callId,
            stage: 'greeting',
          })
        }
        break
      }

      // ── Mark conversation complete on hang-up ─────────────────────────────────
      case 'call-ended': {
        const callId = message.call?.id
        if (callId) {
          await db
            .from('conversations')
            .update({ status: 'completed' })
            .eq('vapi_call_id', callId)
        }
        break
      }

      // ── Handle tool calls from the voice AI ──────────────────────────────────
      case 'tool-calls': {
        const toolCallList = message.toolCallList ?? []
        const results: Array<{ toolCallId: string; result: string }> = []

        for (const toolCall of toolCallList) {
          const { id, function: fn } = toolCall
          let result = 'Tool executed.'

          try {
            // ── checkAvailability ────────────────────────────────────────────
            if (fn.name === 'checkAvailability') {
              const args =
                typeof fn.arguments === 'string' ? JSON.parse(fn.arguments) : fn.arguments
              const { reason } = args as { reason: string }

              const { matchBestDoctor, formatSlotsForAI } = await import('@/lib/scheduler')
              const { getAvailableSlots } = await import('@/lib/doctors')

              const match = matchBestDoctor(reason)
              if (match) {
                const slots = getAvailableSlots(match.doctor.id, 5)
                result =
                  `Matched specialist: Dr. ${match.doctor.firstName} ${match.doctor.lastName} ` +
                  `(${match.doctor.specialty.name}), Doctor ID: ${match.doctor.id}\n` +
                  `Available slots:\n${formatSlotsForAI(slots)}`
              } else {
                result =
                  "I'm sorry, we don't currently have a specialist at Kyron Medical for that condition. I can connect you with our general care team."
              }
            }

            // ── bookAppointment ──────────────────────────────────────────────
            if (fn.name === 'bookAppointment') {
              const args =
                typeof fn.arguments === 'string' ? JSON.parse(fn.arguments) : fn.arguments
              const {
                doctorId,
                slotId,
                patientName,
                patientEmail,
                patientPhone,
                patientDob,
                reason,
                smsOptIn = false,
              } = args as {
                doctorId: string
                slotId: string
                patientName: string
                patientEmail: string
                patientPhone?: string
                patientDob?: string
                reason: string
                smsOptIn?: boolean
              }

              // Look up existing patient by email, or create a new record
              let patientId: string | null = null

              const { data: existingPatient } = await db
                .from('patients')
                .select('id')
                .eq('email', patientEmail.toLowerCase())
                .single()

              if (existingPatient) {
                patientId = existingPatient.id
              } else {
                const nameParts = patientName.trim().split(/\s+/)
                const firstName = nameParts[0] ?? patientName
                const lastName = nameParts.slice(1).join(' ') || 'Unknown'

                const { data: newPatient, error: patientErr } = await db
                  .from('patients')
                  .insert({
                    first_name: firstName,
                    last_name: lastName,
                    date_of_birth: patientDob ?? '1900-01-01',
                    phone: patientPhone ?? null,
                    email: patientEmail.toLowerCase(),
                    sms_opt_in: smsOptIn,
                  })
                  .select('id')
                  .single()

                if (patientErr) {
                  console.error('[bookAppointment] patient insert error:', patientErr)
                  result =
                    'I was unable to create a patient record. Please try again or call our office directly.'
                  results.push({ toolCallId: id, result })
                  continue
                }
                patientId = newPatient!.id
              }

              // Resolve the conversation ID for this call
              const callId = message.call?.id
              let conversationId: string | null = null
              if (callId) {
                const { data: conv } = await db
                  .from('conversations')
                  .select('id')
                  .eq('vapi_call_id', callId)
                  .single()
                conversationId = conv?.id ?? null
              }

              // Delegate to the appointments route for slot booking + email/SMS
              const appRes = await fetch(
                new URL(
                  '/api/appointments',
                  process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
                ).href,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    patientId,
                    doctorId,
                    slotId,
                    conversationId,
                    reason,
                    patientEmail,
                    patientPhone: patientPhone ?? '',
                    patientName,
                    smsOptIn,
                  }),
                },
              )

              const data = await appRes.json()
              if (appRes.ok) {
                const apptDate = new Date(data.appointmentDt).toLocaleString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  timeZone: 'America/New_York',
                })
                result =
                  `Appointment confirmed! Dr. ${data.doctorName} on ${apptDate} ET. ` +
                  `Confirmation code: ${data.confirmationCode}. ` +
                  `A confirmation email has been sent to ${patientEmail}.`
              } else {
                result = `I was unable to complete the booking: ${data.error ?? 'Unknown error'}. Please choose a different time slot or contact our office.`
              }
            }
          } catch (toolErr) {
            console.error(`[Tool ${fn.name}] error:`, toolErr)
            result = 'There was an error processing this request. Please try again.'
          }

          results.push({ toolCallId: id, result })
        }

        // Vapi requires results returned synchronously in the HTTP response
        return NextResponse.json({ results })
      }

      default:
        break
    }

    return NextResponse.json({ result: 'ok' })
  } catch (err) {
    console.error('[POST /api/voice/webhook]', err)
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 })
  }
}
