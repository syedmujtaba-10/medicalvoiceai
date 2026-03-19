// Server-safe Vapi utilities.
// The Vapi browser SDK (@vapi-ai/web) is loaded dynamically in useVapi.ts
// only on the client — never imported here.

// ─── Assistant config builder ─────────────────────────────────────────────────

export interface VapiStartOptions {
  assistantId: string
  contextSystemPrompt: string
}

/**
 * Build the assistantOverrides object passed to vapi.start().
 *
 * Injects:
 * - The full conversation context as the system prompt
 * - Tools so the voice AI can check availability and book appointments
 * - serverUrl so Vapi routes webhook events (transcripts, tool-calls) to our server
 */
export function buildAssistantOverrides(
  contextSystemPrompt: string,
  metadata?: Record<string, unknown>,
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return {
    // Route all Vapi events (transcripts, tool-calls, call lifecycle) to our server
    serverUrl: `${appUrl}/api/voice/webhook`,

    // Vapi echoes metadata back in every webhook payload — we use this to reliably
    // identify the originating conversation without any fuzzy session matching.
    ...(metadata ? { metadata } : {}),

    model: {
      provider: 'anthropic' as const,
      model: 'claude-sonnet-4-6',
      messages: [
        {
          role: 'system' as const,
          content: contextSystemPrompt,
        },
      ],
      // Tools the voice AI can call during the conversation
      tools: [
        {
          type: 'function' as const,
          function: {
            name: 'checkAvailability',
            description:
              'Search for available appointment slots for a patient based on their medical concern. Call this when the patient describes their reason for visiting.',
            parameters: {
              type: 'object',
              properties: {
                reason: {
                  type: 'string',
                  description: "The patient's medical concern or reason for the appointment.",
                },
              },
              required: ['reason'],
            },
          },
        },
        {
          type: 'function' as const,
          function: {
            name: 'bookAppointment',
            description:
              'Book a confirmed appointment slot after the patient has agreed to a specific date and time.',
            parameters: {
              type: 'object',
              properties: {
                doctorId: { type: 'string', description: 'The doctor ID from checkAvailability.' },
                slotId: { type: 'string', description: 'The slot ID the patient chose.' },
                patientName: { type: 'string', description: 'Full name of the patient.' },
                patientEmail: { type: 'string', description: "Patient's email address." },
                patientPhone: { type: 'string', description: "Patient's phone number." },
                patientDob: { type: 'string', description: "Patient's date of birth." },
                reason: { type: 'string', description: 'Reason for the appointment.' },
                smsOptIn: {
                  type: 'boolean',
                  description: 'Whether the patient agreed to receive SMS confirmations.',
                },
              },
              required: ['doctorId', 'slotId', 'patientName', 'patientEmail', 'reason'],
            },
          },
        },
      ],
    },
  }
}

// ─── Vapi event types ─────────────────────────────────────────────────────────

export interface VapiTranscriptMessage {
  type: 'transcript'
  transcriptType: 'partial' | 'final'
  role: 'user' | 'assistant'
  transcript: string
}

export interface VapiSpeechUpdate {
  type: 'speech-update'
  status: 'started' | 'stopped'
  role: 'user' | 'assistant'
}

export type VapiMessage = VapiTranscriptMessage | VapiSpeechUpdate | { type: string }
