import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { AppointmentConfirmationEmail } from '@/lib/email-templates/AppointmentConfirmation'

const resend = new Resend(process.env.RESEND_API_KEY)

interface EmailBody {
  to: string
  patientName: string
  doctorName: string
  specialty: string
  appointmentDt: string
  confirmationCode: string
}

export async function POST(req: Request) {
  try {
    const body: EmailBody = await req.json()
    const { to, patientName, doctorName, specialty, appointmentDt, confirmationCode } = body

    if (!to || !patientName || !doctorName || !appointmentDt || !confirmationCode) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const appointmentDate = new Date(appointmentDt).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York',
    })

    // In dev/test mode Resend only delivers to the account owner's email.
    // Set EMAIL_TEST_RECIPIENT in .env.local to redirect all emails there.
    // Remove this override once a verified domain is configured in Resend.
    const recipient = process.env.EMAIL_TEST_RECIPIENT ?? to

    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? 'XYZ Medical <onboarding@resend.dev>',
      to: recipient,
      subject: `Appointment Confirmed — ${appointmentDate} with ${doctorName}`,
      react: AppointmentConfirmationEmail({
        patientName,
        doctorName,
        specialty,
        appointmentDate,
        confirmationCode,
      }),
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[POST /api/email]', err)
    return NextResponse.json({ error: 'Failed to send email.' }, { status: 500 })
  }
}
