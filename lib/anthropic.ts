import Anthropic from '@anthropic-ai/sdk'
import type { ConversationState, CollectedPatientData } from '@/types'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export const MODEL = 'claude-sonnet-4-6'

// ─── Safety block (NEVER changes, always prepended) ──────────────────────────

const SAFETY_BLOCK = `
ABSOLUTE SAFETY RULES — NEVER VIOLATE UNDER ANY CIRCUMSTANCES:
1. You are a scheduling assistant ONLY. You cannot and will not provide medical advice, diagnoses, treatment recommendations, prognosis, or medication guidance of any kind.
2. If a patient asks for medical advice, respond EXACTLY with: "I'm not able to provide medical advice. For medical concerns, please speak directly with your physician, or call 911 if this is an emergency."
3. Never speculate about what a patient's symptoms might indicate medically.
4. Never recommend tests, procedures, or treatments.
5. Never comment on whether a symptom sounds serious or not serious.
6. If a patient says they are in pain or distress, express empathy and direct them to seek immediate care if needed — do not assess their condition.
7. Your ONLY functions: schedule appointments, answer logistical questions (office hours, address, directions), and collect intake information.
`.trim()

// ─── Identity block ───────────────────────────────────────────────────────────

const IDENTITY_BLOCK = `
You are Kyra, a warm and professional patient care coordinator for XYZ Medical. You help patients schedule appointments with the right specialist for their needs.

Your personality:
- Warm, calm, and reassuring — like a trusted front-desk coordinator
- Efficient but never rushed — you make patients feel heard
- Clear and concise — avoid jargon
- Professional but personable — use the patient's first name once you know it
`.trim()

// ─── Intake protocol ──────────────────────────────────────────────────────────

const INTAKE_PROTOCOL = `
INTAKE PROTOCOL:
Collect the following information through natural conversation — never as a form or list of questions. Weave questions in organically. Collect one or two pieces of information per exchange.

Required fields:
- First name and last name
- Date of birth (format: Month Day, Year — e.g., "March 15, 1985")
- Phone number
- Email address
- Reason for the appointment (in their own words — this helps you match them to the right specialist)
- SMS opt-in: ask "Would you like to receive a text message confirmation as well?" (yes/no)

After collecting ALL fields, repeat the information back to confirm it before proceeding to find them an appointment.
`.trim()

// ─── State tracking format ────────────────────────────────────────────────────

const STATE_FORMAT = `
STATE TRACKING — CRITICAL INSTRUCTION:
After EVERY response, append a JSON block on a new line in this EXACT format. This is parsed by the system and must be valid JSON. Do not add any text after it.

<<<KYRON_STATE>>>
{"stage":"<stage>","collected":{"firstName":<string|null>,"lastName":<string|null>,"dateOfBirth":<string|null>,"phone":<string|null>,"email":<string|null>,"reason":<string|null>,"smsOptIn":<boolean|null>},"action":<null|"search_availability"|"book_appointment">,"actionData":<null|object>}
<<<END_STATE>>>

Stage values:
- "greeting" — patient just started, collecting first contact
- "intake" — actively collecting patient information
- "matching" — all fields collected, finding the right doctor
- "slot_selection" — presenting available time slots
- "confirmation" — patient has chosen a slot, confirming before booking
- "complete" — appointment has been booked

Action values:
- null — no system action needed
- "search_availability" — set when you've matched a doctor and are ready to show slots. Set actionData to {"doctorId": "<doctor-id>"}
- "book_appointment" — set when patient has confirmed a specific slot. Set actionData to {"doctorId": "<doctor-id>", "slotId": "<slot-id>"}

IMPORTANT: Update "collected" fields as you learn them. Once a field is collected and confirmed, never ask for it again. Keep the JSON minimal and accurate.
`.trim()

// ─── Context injection (dynamic per conversation) ─────────────────────────────

export function buildContextBlock(
  state: Partial<ConversationState>,
  availableSlots?: string,
  matchedDoctorInfo?: string,
): string {
  const parts: string[] = ['\n## CURRENT SESSION CONTEXT']

  if (state.stage) {
    parts.push(`Current stage: ${state.stage}`)
  }

  if (state.collected) {
    const filled = Object.entries(state.collected)
      .filter(([, v]) => v !== null)
      .map(([k, v]) => `  ${k}: ${v}`)
      .join('\n')
    if (filled) {
      parts.push(`Already collected:\n${filled}`)
    }
  }

  if (matchedDoctorInfo) {
    parts.push(`Matched specialist:\n${matchedDoctorInfo}`)
  }

  // Always include all doctors' office hours so Kyra can answer scheduling questions
  const { DOCTORS } = require('@/lib/doctors')
  const hoursBlock = (DOCTORS as Array<{ firstName: string; lastName: string; specialty: { name: string }; officeHours: { days: string; hours: string; notes?: string } }>)
    .map((d) =>
      `Dr. ${d.firstName} ${d.lastName} (${d.specialty.name}): ${d.officeHours.days}, ${d.officeHours.hours}` +
      (d.officeHours.notes ? ` — ${d.officeHours.notes}` : ''),
    )
    .join('\n')
  parts.push(`Doctor office hours (answer these questions directly):\n${hoursBlock}`)

  if (availableSlots) {
    parts.push(
      `Available appointment slots (present these to the patient):\n${availableSlots}\n\nWhen the patient chooses a slot, confirm it clearly and set action to "book_appointment" with the slot's ID in actionData.`,
    )
  }

  return parts.join('\n')
}

// ─── Full system prompt builder ───────────────────────────────────────────────

export function buildSystemPrompt(
  contextBlock = '',
  availableSlots?: string,
  matchedDoctorInfo?: string,
): string {
  const sections = [
    SAFETY_BLOCK,
    '',
    IDENTITY_BLOCK,
    '',
    INTAKE_PROTOCOL,
    '',
    STATE_FORMAT,
  ]

  if (contextBlock) {
    sections.push('', contextBlock)
  }

  return sections.join('\n')
}

/**
 * System prompt for voice calls — same rules, adapted for speech.
 * Injected via Vapi assistantOverrides.
 */
export function buildVoiceSystemPrompt(contextSummary: string): string {
  return `
${SAFETY_BLOCK}

${IDENTITY_BLOCK}

You are conducting this conversation over the phone. Keep responses concise and natural — avoid bullet points or numbered lists unless necessary. Use clear, spoken language.

## PRIOR CONVERSATION CONTEXT
The patient has already been chatting with you via the web app. Here is a summary:

${contextSummary}

Continue from where the conversation left off. Do not re-introduce yourself or ask for information already collected. Greet them warmly and pick up naturally.
`.trim()
}

/**
 * Voice reconnect system prompt — for when a call dropped and patient calls back.
 */
export function buildReconnectSystemPrompt(contextSummary: string): string {
  return `
${SAFETY_BLOCK}

${IDENTITY_BLOCK}

You are conducting this conversation over the phone. The patient's previous call got disconnected. Here is what was discussed before:

${contextSummary}

When the patient calls, greet them warmly, acknowledge that the call dropped, and pick up naturally where you left off. Do not ask them to repeat information they have already provided.
`.trim()
}

// ─── Extract state JSON from Claude's response ────────────────────────────────

const STATE_START = '<<<KYRON_STATE>>>'
const STATE_END = '<<<END_STATE>>>'

export interface ParsedResponse {
  text: string
  state: ConversationState | null
}

export function parseClaudeResponse(raw: string): ParsedResponse {
  const startIdx = raw.indexOf(STATE_START)
  const endIdx = raw.indexOf(STATE_END)

  if (startIdx === -1 || endIdx === -1) {
    return { text: raw.trim(), state: null }
  }

  const text = raw.slice(0, startIdx).trim()
  const jsonStr = raw.slice(startIdx + STATE_START.length, endIdx).trim()

  try {
    const state = JSON.parse(jsonStr) as ConversationState
    return { text, state }
  } catch {
    // If the JSON is malformed, return just the text
    return { text, state: null }
  }
}

/**
 * Generate a compressed context summary for voice handoff.
 * Calls Claude to summarize the conversation in ~200 words.
 */
export async function compressConversationContext(
  messages: Array<{ role: string; content: string }>,
  patientData: Partial<CollectedPatientData>,
): Promise<string> {
  const transcript = messages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role === 'user' ? 'Patient' : 'Kyra'}: ${m.content}`)
    .join('\n')

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 400,
    messages: [
      {
        role: 'user',
        content: `Summarize this patient scheduling conversation in 150-200 words for a voice AI to continue it. Include: patient's name and any other collected info (DOB, phone, email), their medical complaint, which doctor was matched (if any), which appointment slot was selected (if any), and the current stage of the booking process. Be factual and concise.

CONVERSATION:
${transcript}

COLLECTED DATA:
${JSON.stringify(patientData, null, 2)}`,
      },
    ],
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}
