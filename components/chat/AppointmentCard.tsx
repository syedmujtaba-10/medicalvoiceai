import { GlassCard } from '@/components/ui/GlassCard'
import type { BookedAppointmentSummary } from '@/types'
import { CalendarIcon, ClockIcon, UserIcon, CheckCircleIcon } from 'lucide-react'

interface AppointmentCardProps {
  appointment: BookedAppointmentSummary
}

function formatAppointmentDate(isoString: string): { date: string; time: string } {
  const dt = new Date(isoString)
  return {
    date: dt.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'America/New_York',
    }),
    time: dt.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York',
    }),
  }
}

export function AppointmentCard({ appointment }: AppointmentCardProps) {
  const { date, time } = formatAppointmentDate(appointment.appointmentDt)

  return (
    <div className="animate-fade-up">
      <GlassCard variant="strong" className="overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[rgba(107,127,212,0.15)] px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(107,127,212,0.2)] ring-1 ring-[rgba(107,127,212,0.4)]">
            <CheckCircleIcon className="h-5 w-5 text-[#8B9BE0]" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#6B7FD4]">
              Appointment Confirmed
            </p>
            <p className="text-[11px] text-[#636478]">
              Confirmation #{appointment.confirmationCode}
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3 px-5 py-4">
          <div className="flex items-center gap-3">
            <UserIcon className="h-4 w-4 shrink-0 text-[#636478]" />
            <div>
              <p className="text-sm font-medium text-[#E8ECFF]">
                Dr. {appointment.doctorName}
              </p>
              <p className="text-xs text-[#9396B0]">{appointment.specialty}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <CalendarIcon className="h-4 w-4 shrink-0 text-[#636478]" />
            <p className="text-sm text-[#E8ECFF]">{date}</p>
          </div>

          <div className="flex items-center gap-3">
            <ClockIcon className="h-4 w-4 shrink-0 text-[#636478]" />
            <p className="text-sm text-[#E8ECFF]">{time} ET</p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[rgba(107,127,212,0.12)] bg-[rgba(107,127,212,0.04)] px-5 py-3">
          <p className="text-[11px] text-[#636478]">
            A confirmation has been sent to{' '}
            <span className="text-[#9396B0]">{appointment.patientEmail}</span>
            {appointment.patientPhone && (
              <>
                {' '}and{' '}
                <span className="text-[#9396B0]">{appointment.patientPhone}</span>
              </>
            )}
          </p>
        </div>
      </GlassCard>
    </div>
  )
}
