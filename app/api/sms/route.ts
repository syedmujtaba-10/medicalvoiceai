import { NextResponse } from 'next/server'
import twilio from 'twilio'

interface SmsBody {
  to: string
  patientName: string
  doctorName: string
  appointmentDt: string
  confirmationCode: string
}

export async function POST(req: Request) {
  try {
    const body: SmsBody = await req.json()
    const { to, patientName, doctorName, appointmentDt, confirmationCode } = body

    if (!to || !patientName || !doctorName || !appointmentDt || !confirmationCode) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const from = process.env.TWILIO_PHONE_NUMBER

    if (!accountSid || !authToken || !from) {
      console.warn('[SMS] Twilio credentials not configured — skipping SMS.')
      return NextResponse.json({ success: true, skipped: true })
    }

    const client = twilio(accountSid, authToken)

    const appointmentDate = new Date(appointmentDt).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York',
    })

    const messageBody =
      `Hi ${patientName}! Your Kyron Medical appointment is confirmed.\n\n` +
      `📅 ${appointmentDate} ET\n` +
      `👨‍⚕️ ${doctorName}\n` +
      `🔑 Confirmation: ${confirmationCode}\n\n` +
      `Reply STOP to opt out of text messages.`

    await client.messages.create({ body: messageBody, from, to })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[POST /api/sms]', err)
    // SMS failure is non-critical — don't block the booking flow
    return NextResponse.json({ error: 'Failed to send SMS.' }, { status: 500 })
  }
}
