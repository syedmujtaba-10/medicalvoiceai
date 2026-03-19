// ─── Conversation ───────────────────────────────────────────────────────────

export type ConversationStage =
  | 'greeting'
  | 'intake'
  | 'matching'
  | 'slot_selection'
  | 'confirmation'
  | 'complete'

export type MessageRole = 'user' | 'assistant' | 'system'
export type Channel = 'web' | 'voice'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  channel: Channel
  createdAt: string
}

// ─── Patient ─────────────────────────────────────────────────────────────────

export interface Patient {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: string // YYYY-MM-DD
  phone: string
  email: string
  smsOptIn: boolean
  createdAt: string
}

export interface CollectedPatientData {
  firstName: string | null
  lastName: string | null
  dateOfBirth: string | null
  phone: string | null
  email: string | null
  reason: string | null
  smsOptIn: boolean | null
}

// ─── Doctors & Availability ──────────────────────────────────────────────────

export interface DoctorSpecialty {
  name: string
  bodyPart: string
  keywords: string[]
}

export interface TimeSlot {
  id: string
  doctorId: string
  start: string // ISO 8601
  end: string   // ISO 8601
  booked: boolean
}

export interface DoctorOfficeHours {
  days: string   // e.g. "Monday – Friday"
  hours: string  // e.g. "9:00 AM – 5:00 PM ET"
  notes?: string // e.g. "Closed alternate Fridays"
}

export interface Doctor {
  id: string
  firstName: string
  lastName: string
  title: string
  specialty: DoctorSpecialty
  bio: string
  officeHours: DoctorOfficeHours
  availability: TimeSlot[]
}

// ─── Appointments ────────────────────────────────────────────────────────────

export interface Appointment {
  id: string
  patientId: string
  doctorId: string
  conversationId: string
  appointmentDt: string
  reason: string
  status: 'confirmed' | 'cancelled' | 'completed'
  confirmationCode: string
  emailSent: boolean
  smsSent: boolean
  createdAt: string
}

export interface AppointmentDetails extends Appointment {
  doctor: Doctor
  patient: Patient
}

// ─── API Payloads ────────────────────────────────────────────────────────────

export interface ChatRequest {
  message: string
  sessionToken: string
  conversationId?: string
}

export interface ChatResponse {
  text: string
  conversationId: string
  stage: ConversationStage
  patientId?: string
  patientPhone?: string
  appointment?: BookedAppointmentSummary
  availableSlots?: TimeSlot[]
  matchedDoctor?: Pick<Doctor, 'id' | 'firstName' | 'lastName' | 'specialty'>
}

export interface BookedAppointmentSummary {
  id: string
  confirmationCode: string
  doctorName: string
  specialty: string
  appointmentDt: string
  patientEmail: string
  patientPhone: string
}

// ─── Voice ───────────────────────────────────────────────────────────────────

export type VapiCallStatus = 'idle' | 'connecting' | 'active' | 'ended' | 'error'

export interface VoiceSession {
  id: string
  patientId: string
  sessionToken: string
  phoneNumber: string
  compressedContext: string
  lastActive: string
}

// ─── Internal state (parsed from Claude's hidden JSON block) ─────────────────

export interface ConversationState {
  stage: ConversationStage
  collected: CollectedPatientData
  action: 'search_availability' | 'book_appointment' | 'send_confirmation' | null
  actionData?: Record<string, unknown>
}
