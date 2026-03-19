import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { getDoctorById, bookSlot } from '@/lib/doctors'
import { nanoid } from 'nanoid'

interface CreateAppointmentBody {
  patientId: string
  doctorId: string
  slotId: string
  conversationId?: string
  reason: string
  patientEmail: string
  patientPhone?: string
  patientName: string
  smsOptIn?: boolean
}

export async function POST(req: Request) {
  try {
    const body: CreateAppointmentBody = await req.json()
    const {
      patientId,
      doctorId,
      slotId,
      conversationId,
      reason,
      patientEmail,
      patientPhone,
      patientName,
      smsOptIn = false,
    } = body

    if (!patientId || !doctorId || !slotId || !reason || !patientEmail) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const doctor = getDoctorById(doctorId)
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found.' }, { status: 404 })
    }

    const slot = doctor.availability.find((s) => s.id === slotId)
    if (!slot) {
      return NextResponse.json({ error: 'Time slot not found.' }, { status: 404 })
    }
    if (slot.booked) {
      return NextResponse.json(
        { error: 'This time slot has already been booked. Please choose another.' },
        { status: 409 },
      )
    }

    // Mark the slot as booked in memory
    bookSlot(doctorId, slotId)

    const confirmationCode = nanoid(8).toUpperCase()
    const db = getServiceClient()

    const { data: appointment, error: dbError } = await db
      .from('appointments')
      .insert({
        patient_id: patientId,
        doctor_id: doctorId,
        conversation_id: conversationId ?? null,
        appointment_dt: slot.start,
        reason,
        confirmation_code: confirmationCode,
      })
      .select('id, appointment_dt, confirmation_code')
      .single()

    if (dbError) throw dbError

    // Fire email + SMS notifications in parallel
    const notificationPromises: Promise<void>[] = []

    notificationPromises.push(
      fetch(new URL('/api/email', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').href, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: patientEmail,
          patientName,
          doctorName: `Dr. ${doctor.firstName} ${doctor.lastName}`,
          specialty: doctor.specialty.name,
          appointmentDt: slot.start,
          confirmationCode,
        }),
      }).then(async (r) => {
        if (r.ok) {
          await db
            .from('appointments')
            .update({ email_sent: true })
            .eq('id', appointment.id)
        }
      }),
    )

    if (smsOptIn && patientPhone) {
      notificationPromises.push(
        fetch(new URL('/api/sms', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').href, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: patientPhone,
            patientName,
            doctorName: `Dr. ${doctor.firstName} ${doctor.lastName}`,
            appointmentDt: slot.start,
            confirmationCode,
          }),
        }).then(async (r) => {
          if (r.ok) {
            await db
              .from('appointments')
              .update({ sms_sent: true })
              .eq('id', appointment.id)
          }
        }),
      )
    }

    // Fire-and-forget — don't block the response on notifications
    Promise.allSettled(notificationPromises).catch(console.error)

    return NextResponse.json({
      appointmentId: appointment.id,
      confirmationCode,
      doctorName: `${doctor.firstName} ${doctor.lastName}`,
      specialty: doctor.specialty.name,
      appointmentDt: slot.start,
    })
  } catch (err) {
    console.error('[POST /api/appointments]', err)
    return NextResponse.json({ error: 'Failed to create appointment.' }, { status: 500 })
  }
}
