import Image from 'next/image'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { GlassCard } from '@/components/ui/GlassCard'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { DOCTORS } from '@/lib/doctors'
import {
  HeartPulseIcon,
  BrainIcon,
  ActivityIcon,
  ZapIcon,
  WindIcon,
} from 'lucide-react'

const SPECIALTY_ICONS: Record<string, React.ReactNode> = {
  'sarah-chen':      <HeartPulseIcon className="h-4 w-4" />,
  'marcus-williams': <ActivityIcon className="h-4 w-4" />,
  'elena-rodriguez': <ZapIcon className="h-4 w-4" />,
  'james-park':      <BrainIcon className="h-4 w-4" />,
  'aisha-thompson':  <WindIcon className="h-4 w-4" />,
}

export default function Home() {
  return (
    <div className="relative min-h-dvh">
      <AnimatedBackground />

      <div className="relative z-10 flex min-h-dvh flex-col lg:flex-row">

        {/* ── Left panel — branding + doctors ──────────────────────────── */}
        <aside className="flex flex-col gap-5 p-5 lg:w-80 lg:shrink-0 xl:w-96">
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

        {/* ── Center — chat ─────────────────────────────────────────────── */}
        <main className="flex min-h-[600px] flex-1 flex-col p-5 lg:min-h-0">
          <ChatInterface />
        </main>

        {/* ── Right panel — info + safety ───────────────────────────────── */}
        <aside className="flex flex-col gap-5 p-5 lg:w-72 lg:shrink-0 xl:w-80">
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
