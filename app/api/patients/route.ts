import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import type { CollectedPatientData } from '@/types'

export async function POST(req: Request) {
  try {
    const body: CollectedPatientData & { conversationId?: string } = await req.json()

    const {
      firstName,
      lastName,
      dateOfBirth,
      phone,
      email,
      smsOptIn,
      conversationId,
    } = body

    if (!firstName || !lastName || !dateOfBirth || !email) {
      return NextResponse.json(
        { error: 'Missing required patient fields.' },
        { status: 400 },
      )
    }

    const db = getServiceClient()

    // Check if a patient with this email already exists (returning patient)
    const { data: existing } = await db
      .from('patients')
      .select('id, first_name, last_name, phone, email, sms_opt_in')
      .eq('email', email.toLowerCase().trim())
      .single()

    let patientId: string

    if (existing) {
      // Update with any new information
      const { error } = await db
        .from('patients')
        .update({
          first_name: firstName,
          last_name: lastName,
          date_of_birth: dateOfBirth,
          phone: phone ?? existing.phone,
          sms_opt_in: smsOptIn ?? existing.sms_opt_in,
        })
        .eq('id', existing.id)

      if (error) throw error
      patientId = existing.id
    } else {
      const { data, error } = await db
        .from('patients')
        .insert({
          first_name: firstName,
          last_name: lastName,
          date_of_birth: dateOfBirth,
          phone: phone ?? null,
          email: email.toLowerCase().trim(),
          sms_opt_in: smsOptIn ?? false,
        })
        .select('id')
        .single()

      if (error) throw error
      patientId = data.id
    }

    // Link patient to their conversation
    if (conversationId) {
      await db
        .from('conversations')
        .update({ patient_id: patientId })
        .eq('id', conversationId)
    }

    return NextResponse.json({ patientId, isReturning: !!existing })
  } catch (err) {
    console.error('[POST /api/patients]', err)
    return NextResponse.json({ error: 'Failed to save patient.' }, { status: 500 })
  }
}
