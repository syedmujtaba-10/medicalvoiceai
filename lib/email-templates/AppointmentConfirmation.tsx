import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

interface AppointmentConfirmationEmailProps {
  patientName: string
  doctorName: string
  specialty: string
  appointmentDate: string
  confirmationCode: string
}

export function AppointmentConfirmationEmail({
  patientName,
  doctorName,
  specialty,
  appointmentDate,
  confirmationCode,
}: AppointmentConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Your appointment with {doctorName} is confirmed — {appointmentDate}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={brandName}>KYRON MEDICAL</Heading>
            <Text style={brandTagline}>Patient Care Coordination</Text>
          </Section>

          <Hr style={divider} />

          {/* Confirmation badge */}
          <Section style={badgeSection}>
            <Text style={badge}>✓ APPOINTMENT CONFIRMED</Text>
          </Section>

          {/* Greeting */}
          <Section style={content}>
            <Text style={greeting}>Hello {patientName},</Text>
            <Text style={body}>
              Your appointment has been successfully scheduled. Here are your
              details:
            </Text>
          </Section>

          {/* Appointment details card */}
          <Section style={card}>
            <Row>
              <Section style={cardRow}>
                <Text style={cardLabel}>PHYSICIAN</Text>
                <Text style={cardValue}>{doctorName}</Text>
                <Text style={cardSub}>{specialty}</Text>
              </Section>
            </Row>
            <Hr style={cardDivider} />
            <Row>
              <Section style={cardRow}>
                <Text style={cardLabel}>DATE & TIME</Text>
                <Text style={cardValue}>{appointmentDate} ET</Text>
              </Section>
            </Row>
            <Hr style={cardDivider} />
            <Row>
              <Section style={cardRow}>
                <Text style={cardLabel}>CONFIRMATION CODE</Text>
                <Text style={confirmationCodeStyle}>{confirmationCode}</Text>
              </Section>
            </Row>
          </Section>

          {/* Instructions */}
          <Section style={content}>
            <Text style={instructions}>
              <strong>Before your appointment:</strong>
            </Text>
            <Text style={instructionItem}>• Arrive 15 minutes early for paperwork</Text>
            <Text style={instructionItem}>• Bring a valid photo ID and insurance card</Text>
            <Text style={instructionItem}>• Bring a list of current medications</Text>
            <Text style={instructionItem}>
              • Reference your confirmation code <strong>{confirmationCode}</strong> when checking in
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Need to reschedule or have questions? Contact us at{' '}
              <span style={link}>appointments@wwwmedicalvoiceaidemo.org</span>
            </Text>
            <Text style={footerDisclaimer}>
              This email was sent to you because you scheduled an appointment
              through the XYZ Medical patient portal. This is an automated
              message — please do not reply directly to this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const main: React.CSSProperties = {
  backgroundColor: '#0B0D1F',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

const container: React.CSSProperties = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '560px',
}

const header: React.CSSProperties = {
  textAlign: 'center',
  paddingBottom: '24px',
}

const brandName: React.CSSProperties = {
  color: '#6B7FD4',
  fontSize: '24px',
  fontWeight: '700',
  letterSpacing: '0.1em',
  margin: '0',
}

const brandTagline: React.CSSProperties = {
  color: '#636478',
  fontSize: '12px',
  letterSpacing: '0.15em',
  margin: '4px 0 0 0',
  textTransform: 'uppercase',
}

const divider: React.CSSProperties = {
  borderColor: 'rgba(107, 127, 212, 0.2)',
  margin: '0',
}

const badgeSection: React.CSSProperties = {
  textAlign: 'center',
  padding: '24px 0 8px',
}

const badge: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: 'rgba(107, 127, 212, 0.15)',
  color: '#8B9BE0',
  borderRadius: '20px',
  padding: '6px 20px',
  fontSize: '12px',
  fontWeight: '600',
  letterSpacing: '0.08em',
  border: '1px solid rgba(107, 127, 212, 0.3)',
}

const content: React.CSSProperties = {
  padding: '16px 0',
}

const greeting: React.CSSProperties = {
  color: '#E8ECFF',
  fontSize: '18px',
  fontWeight: '500',
  margin: '0 0 8px',
}

const body: React.CSSProperties = {
  color: '#9396B0',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0',
}

const card: React.CSSProperties = {
  backgroundColor: 'rgba(107, 127, 212, 0.08)',
  borderRadius: '16px',
  border: '1px solid rgba(107, 127, 212, 0.2)',
  padding: '0 24px',
  margin: '8px 0',
}

const cardRow: React.CSSProperties = {
  padding: '16px 0',
}

const cardLabel: React.CSSProperties = {
  color: '#636478',
  fontSize: '10px',
  fontWeight: '600',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  margin: '0 0 4px',
}

const cardValue: React.CSSProperties = {
  color: '#E8ECFF',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
}

const cardSub: React.CSSProperties = {
  color: '#9396B0',
  fontSize: '13px',
  margin: '2px 0 0',
}

const cardDivider: React.CSSProperties = {
  borderColor: 'rgba(107, 127, 212, 0.12)',
  margin: '0',
}

const confirmationCodeStyle: React.CSSProperties = {
  color: '#6B7FD4',
  fontSize: '22px',
  fontWeight: '700',
  letterSpacing: '0.15em',
  fontFamily: 'monospace',
  margin: '0',
}

const instructions: React.CSSProperties = {
  color: '#E8ECFF',
  fontSize: '14px',
  margin: '0 0 8px',
}

const instructionItem: React.CSSProperties = {
  color: '#9396B0',
  fontSize: '13px',
  lineHeight: '1.7',
  margin: '0',
}

const footer: React.CSSProperties = {
  padding: '24px 0 0',
  textAlign: 'center',
}

const footerText: React.CSSProperties = {
  color: '#636478',
  fontSize: '13px',
  lineHeight: '1.5',
  margin: '0 0 12px',
}

const link: React.CSSProperties = {
  color: '#6B7FD4',
}

const footerDisclaimer: React.CSSProperties = {
  color: '#3E3F52',
  fontSize: '11px',
  lineHeight: '1.5',
  margin: '0',
}
