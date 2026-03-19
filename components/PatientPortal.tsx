'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { GlassCard } from '@/components/ui/GlassCard'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { DOCTORS } from '@/lib/doctors'
import type { BookedAppointmentSummary } from '@/types'
import {
  HeartPulseIcon,
  BrainIcon,
  ActivityIcon,
  ZapIcon,
  WindIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
} from 'lucide-react'

const SPECIALTY_ICONS: Record<string, React.ReactNode> = {
  'sarah-chen':      <HeartPulseIcon className="h-4 w-4" />,
  'marcus-williams': <ActivityIcon className="h-4 w-4" />,
  'elena-rodriguez': <ZapIcon className="h-4 w-4" />,
  'james-park':      <BrainIcon className="h-4 w-4" />,
  'aisha-thompson':  <WindIcon className="h-4 w-4" />,
}

function formatApptDate(iso: string) {
  const dt = new Date(iso)
  return {
    date: dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/New_York' }),
    time: dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' }),
  }
}

interface AppointmentMiniCardProps {
  appointment: BookedAppointmentSummary
}

function AppointmentMiniCard({ appointment }: AppointmentMiniCardProps) {
  const { date, time } = formatApptDate(appointment.appointmentDt)
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[rgba(107,127,212,0.18)] bg-[rgba(107,127,212,0.06)] px-3 py-3"
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <CheckCircleIcon className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
        <p className="truncate text-xs font-medium text-[#E8ECFF]">Dr. {appointment.doctorName}</p>
      </div>
      <p className="mb-1 truncate text-[11px] text-[#636478]">{appointment.specialty}</p>
      <div className="flex items-center gap-3 text-[11px] text-[#9396B0]">
        <span className="flex items-center gap-1">
          <CalendarIcon className="h-3 w-3" />{date}
        </span>
        <span className="flex items-center gap-1">
          <ClockIcon className="h-3 w-3" />{time}
        </span>
      </div>
      <p className="mt-1.5 text-[10px] text-[#3E3F52]">#{appointment.confirmationCode}</p>
    </motion.div>
  )
}

interface PatientPortalProps {
  /** Lifted from useChat via ChatInterface callback */
  initialAppointments?: BookedAppointmentSummary[]
}

export function PatientPortal({ initialAppointments = [] }: PatientPortalProps) {
  const [appointments, setAppointments] = useState<BookedAppointmentSummary[]>(initialAppointments)

  const handleNewAppointment = (appt: BookedAppointmentSummary) => {
    setAppointments((prev) => {
      // Deduplicate by confirmation code
      if (prev.some((a) => a.confirmationCode === appt.confirmationCode)) return prev
      return [...prev, appt]
    })
  }

  return (
    <div className="relative h-dvh overflow-hidden">
      <AnimatedBackground />

      {/* h-full + overflow-hidden locks the layout to the viewport — sidebars scroll independently,
          chat column clips so only the message list scrolls, input stays pinned */}
      <div className="relative z-10 flex h-full flex-col overflow-hidden lg:flex-row">

        {/* ── Left panel ─────────────────────────────────────────────────── */}
        <aside className="flex flex-col gap-5 overflow-y-auto p-5 lg:w-80 lg:shrink-0 xl:w-96">
          {/* Logo */}
          <GlassCard className="flex flex-col items-center gap-3 px-6 py-5" rounded="3xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/kyron_medical.webp"
              alt="Kyron Medical"
              width={180}
              className="object-contain"
              style={{ width: '180px', height: 'auto' }}
            />
            <div className="h-px w-full bg-[rgba(107,127,212,0.15)]" />
            <p className="text-center text-xs leading-relaxed text-[#636478]">
              Intelligent patient scheduling powered by AI. Talk to Kyra to find the right specialist and book your appointment.
            </p>
          </GlassCard>

          {/* Specialists */}
          <GlassCard className="flex flex-col gap-1 px-4 py-4" rounded="2xl">
            <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-widest text-[#636478]">
              Our Specialists
            </p>
            {DOCTORS.map((doctor) => {
              const available = doctor.availability.filter((s) => !s.booked).length
              return (
                <div
                  key={doctor.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[rgba(107,127,212,0.06)]"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(107,127,212,0.12)] text-[#8B9BE0] ring-1 ring-[rgba(107,127,212,0.2)]">
                    {SPECIALTY_ICONS[doctor.id]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#E8ECFF]">
                      Dr. {doctor.firstName} {doctor.lastName}
                    </p>
                    <p className="truncate text-xs text-[#636478]">
                      {doctor.specialty.name}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-medium text-[#6B7FD4]">{available}</p>
                    <p className="text-[10px] text-[#3E3F52]">open</p>
                  </div>
                </div>
              )
            })}
          </GlassCard>

          {/* Booked appointments — shown once at least one is booked */}
          <AnimatePresence>
            {appointments.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
              >
                <GlassCard className="flex flex-col gap-2 px-4 py-4" rounded="2xl">
                  <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-widest text-[#636478]">
                    Your Appointments
                  </p>
                  <div className="flex flex-col gap-2">
                    {appointments.map((appt) => (
                      <AppointmentMiniCard key={appt.confirmationCode} appointment={appt} />
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Practice info */}
          <GlassCard className="px-5 py-4" rounded="2xl">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#636478]">
              Practice Info
            </p>
            <div className="space-y-1.5 text-xs text-[#636478]">
              <p className="font-medium text-[#9396B0]">Kyron Medical Group</p>
              <p>123 Medical Center Drive, Suite 400</p>
              <p>Boston, MA 02115</p>
              <div className="my-3 h-px bg-[rgba(107,127,212,0.10)]" />
              <p className="text-[#9396B0]">Mon – Fri &nbsp;·&nbsp; 9:00 AM – 5:00 PM ET</p>
              <p className="text-[10px] text-[#3E3F52]">Closed weekends & federal holidays</p>
            </div>
          </GlassCard>
        </aside>

        {/* ── Center — chat ──────────────────────────────────────────────── */}
        <main className="flex min-h-0 flex-1 flex-col p-5">
          <ChatInterface onNewAppointment={handleNewAppointment} />
        </main>

        {/* ── Right panel ────────────────────────────────────────────────── */}
        <aside className="flex flex-col gap-5 overflow-y-auto p-5 lg:w-72 lg:shrink-0 xl:w-80">
          {/* How it works */}
          <GlassCard className="px-5 py-5" rounded="2xl">
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-[#636478]">
              How It Works
            </p>
            <div className="space-y-3.5">
              {[
                { n: '01', t: 'Tell Kyra why you need an appointment' },
                { n: '02', t: 'Get matched to the right specialist' },
                { n: '03', t: 'Choose a date & time that works for you' },
                { n: '04', t: 'Receive email & SMS confirmation instantly' },
              ].map(({ n, t }) => (
                <div key={n} className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 rounded-md bg-[rgba(107,127,212,0.12)] px-1.5 py-0.5 text-[10px] font-bold text-[#6B7FD4]">
                    {n}
                  </span>
                  <p className="text-xs leading-relaxed text-[#9396B0]">{t}</p>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Voice */}
          <GlassCard className="px-5 py-4" rounded="2xl">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#636478]">
              Prefer to Call?
            </p>
            <p className="text-xs leading-relaxed text-[#9396B0]">
              Use the{' '}
              <span className="font-medium text-[#8B9BE0]">microphone button</span>{' '}
              in the chat to switch to a live voice call with Kyra. She&apos;ll remember your full conversation.
            </p>
          </GlassCard>

          {/* Safety */}
          <GlassCard
            className="border-amber-400/10 bg-[rgba(251,191,36,0.04)] px-5 py-4"
            rounded="2xl"
          >
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-amber-500/60">
              Important Notice
            </p>
            <p className="text-xs leading-relaxed text-[#636478]">
              Kyra cannot provide medical advice or diagnoses. If you are
              experiencing an emergency, call{' '}
              <span className="font-semibold text-red-400">911</span> immediately.
            </p>
          </GlassCard>

          {/* Privacy */}
          <GlassCard className="px-5 py-4" rounded="2xl">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#636478]">
              Privacy & Security
            </p>
            <p className="text-xs leading-relaxed text-[#3E3F52]">
              Your information is encrypted in transit and at rest. We do not sell or share personal health information with third parties.
            </p>
          </GlassCard>
        </aside>
      </div>
    </div>
  )
}
