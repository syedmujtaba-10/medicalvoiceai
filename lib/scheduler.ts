import { DOCTORS, getAvailableSlots } from '@/lib/doctors'
import type { Doctor, TimeSlot } from '@/types'

export interface MatchResult {
  doctor: Doctor
  score: number
  slots: TimeSlot[]
}

/**
 * Matches a patient's free-text reason to the most suitable doctor(s)
 * using keyword scoring. Returns results sorted by score descending.
 *
 * Returns an empty array if no reasonable match is found (score === 0).
 */
export function matchDoctors(reason: string, topN = 2): MatchResult[] {
  const normalized = reason.toLowerCase()

  const scored = DOCTORS.map((doctor) => {
    const score = doctor.specialty.keywords.reduce((acc, keyword) => {
      // Whole-word / substring match — weighted by keyword length for specificity
      if (normalized.includes(keyword.toLowerCase())) {
        return acc + keyword.split(' ').length // multi-word keywords score higher
      }
      return acc
    }, 0)

    return { doctor, score, slots: getAvailableSlots(doctor.id) }
  })

  return scored
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
}

/**
 * Returns the single best-matching doctor or null if no match.
 */
export function matchBestDoctor(reason: string): MatchResult | null {
  const results = matchDoctors(reason, 1)
  return results[0] ?? null
}

/**
 * Format a time slot for display in conversation.
 * e.g. "Monday, March 24 at 10:00 AM"
 */
export function formatSlotForDisplay(slot: TimeSlot): string {
  const date = new Date(slot.start)
  return date.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York',
  })
}

/**
 * Format a list of available slots into a numbered list string for the AI.
 */
export function formatSlotsForAI(slots: TimeSlot[]): string {
  return slots
    .map((slot, i) => `${i + 1}. ${formatSlotForDisplay(slot)} (ID: ${slot.id})`)
    .join('\n')
}

/**
 * Given a slotId, return the TimeSlot if it exists and is not booked.
 */
export function findSlotById(doctorId: string, slotId: string): TimeSlot | null {
  const doctor = DOCTORS.find((d) => d.id === doctorId)
  if (!doctor) return null
  return doctor.availability.find((s) => s.id === slotId && !s.booked) ?? null
}
