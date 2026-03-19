import type { Doctor, TimeSlot } from '@/types'

// ─── Seeded pseudo-random number generator ───────────────────────────────────
// Deterministic so availability is consistent across server restarts.

function seededRng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

// ─── Availability generator ──────────────────────────────────────────────────

function generateSlots(doctorId: string, seed: number): TimeSlot[] {
  const rng = seededRng(seed)
  const slots: TimeSlot[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let dayOffset = 1; dayOffset <= 45; dayOffset++) {
    const date = new Date(today)
    date.setDate(today.getDate() + dayOffset)

    // Skip weekends
    const dow = date.getDay()
    if (dow === 0 || dow === 6) continue

    // 9:00 AM – 4:30 PM, 30-min slots
    for (let hour = 9; hour < 17; hour++) {
      for (const min of [0, 30]) {
        if (hour === 16 && min === 30) continue // no 4:30 PM slot

        const start = new Date(date)
        start.setHours(hour, min, 0, 0)

        const end = new Date(start)
        end.setMinutes(end.getMinutes() + 30)

        slots.push({
          id: `${doctorId}__${start.toISOString()}`,
          doctorId,
          start: start.toISOString(),
          end: end.toISOString(),
          booked: rng() < 0.62, // ~62% pre-booked — realistic availability
        })
      }
    }
  }

  return slots
}

// ─── Doctor definitions ──────────────────────────────────────────────────────

export const DOCTORS: Doctor[] = [
  {
    id: 'sarah-chen',
    firstName: 'Sarah',
    lastName: 'Chen',
    title: 'MD',
    specialty: {
      name: 'Cardiology',
      bodyPart: 'heart',
      keywords: [
        'heart', 'cardiac', 'chest pain', 'chest pressure', 'chest tightness',
        'palpitations', 'irregular heartbeat', 'arrhythmia', 'blood pressure',
        'hypertension', 'shortness of breath', 'cardiovascular', 'ecg', 'ekg',
        'heart attack', 'coronary', 'cholesterol', 'atrial fibrillation', 'afib',
      ],
    },
    bio: 'Board-certified cardiologist with 15 years of experience in interventional cardiology and preventive heart care.',
    officeHours: { days: 'Monday – Friday', hours: '9:00 AM – 5:00 PM ET', notes: 'Closed alternate Fridays' },
    availability: generateSlots('sarah-chen', 42_317),
  },
  {
    id: 'marcus-williams',
    firstName: 'Marcus',
    lastName: 'Williams',
    title: 'MD',
    specialty: {
      name: 'Orthopedic Spine',
      bodyPart: 'spine',
      keywords: [
        'spine', 'spinal', 'back pain', 'lower back', 'upper back', 'neck pain',
        'neck', 'disc', 'herniated disc', 'bulging disc', 'sciatica', 'sciatic',
        'vertebrae', 'scoliosis', 'stenosis', 'spinal stenosis', 'pinched nerve',
        'degenerative disc', 'lumbar', 'cervical', 'thoracic', 'numbness in legs',
        'numbness in arms', 'radiating pain', 'back injury',
      ],
    },
    bio: 'Fellowship-trained orthopedic spine surgeon specializing in minimally invasive procedures and complex spinal reconstruction.',
    officeHours: { days: 'Monday, Wednesday, Friday', hours: '8:00 AM – 4:00 PM ET', notes: 'Surgery days: Tuesday & Thursday (no clinic)' },
    availability: generateSlots('marcus-williams', 78_901),
  },
  {
    id: 'elena-rodriguez',
    firstName: 'Elena',
    lastName: 'Rodriguez',
    title: 'MD',
    specialty: {
      name: 'Orthopedic — Knees & Joints',
      bodyPart: 'knees',
      keywords: [
        'knee', 'knees', 'acl', 'mcl', 'pcl', 'meniscus', 'meniscal tear',
        'cartilage', 'ligament', 'joint', 'joint pain', 'kneecap', 'patella',
        'patellar', 'tendon', 'tendonitis', 'bursitis', 'arthritis', 'osteoarthritis',
        'hip', 'hip pain', 'shoulder', 'shoulder pain', 'rotator cuff', 'sports injury',
        'swollen knee', 'clicking knee', 'knee replacement',
        'hand', 'hand pain', 'wrist', 'wrist pain', 'elbow', 'elbow pain',
        'finger', 'fingers', 'thumb', 'ankle', 'ankle pain', 'foot pain', 'feet',
        'upper extremity', 'lower extremity', 'orthopedic', 'orthopaedic',
      ],
    },
    bio: 'Sports medicine and orthopedic specialist with expertise in ACL reconstruction, joint replacement, and minimally invasive arthroscopic surgery.',
    officeHours: { days: 'Monday – Thursday', hours: '9:00 AM – 5:00 PM ET', notes: 'Friday: urgent/post-op visits only' },
    availability: generateSlots('elena-rodriguez', 13_579),
  },
  {
    id: 'james-park',
    firstName: 'James',
    lastName: 'Park',
    title: 'MD, PhD',
    specialty: {
      name: 'Neurology',
      bodyPart: 'brain',
      keywords: [
        'brain', 'neurology', 'neurological', 'headache', 'migraine', 'migraines',
        'chronic headache', 'memory', 'memory loss', 'forgetfulness', 'dementia',
        'alzheimer', 'seizure', 'epilepsy', 'dizziness', 'vertigo', 'balance',
        'tremor', 'parkinson', 'multiple sclerosis', 'ms', 'neuropathy', 'nerve pain',
        'numbness', 'tingling', 'weakness', 'stroke', 'concussion', 'tbi',
        'cognitive decline', 'brain fog',
      ],
    },
    bio: 'Neurologist and researcher specializing in movement disorders, epilepsy, and cognitive neurology with a focus on precision diagnostics.',
    officeHours: { days: 'Tuesday – Friday', hours: '9:00 AM – 4:30 PM ET', notes: 'Monday: research & teaching (no clinic)' },
    availability: generateSlots('james-park', 55_246),
  },
  {
    id: 'aisha-thompson',
    firstName: 'Aisha',
    lastName: 'Thompson',
    title: 'MD',
    specialty: {
      name: 'Pulmonology',
      bodyPart: 'lungs',
      keywords: [
        'lungs', 'lung', 'breathing', 'breath', 'shortness of breath', 'asthma',
        'copd', 'chronic obstructive', 'emphysema', 'bronchitis', 'pneumonia',
        'respiratory', 'cough', 'chronic cough', 'wheezing', 'inhaler', 'oxygen',
        'sleep apnea', 'sleep apnoea', 'pulmonary', 'pulmonary fibrosis',
        'pleural', 'chest congestion', 'airways', 'spirometry', 'lung function',
      ],
    },
    bio: 'Pulmonologist and critical care specialist with deep expertise in obstructive lung disease, sleep-related breathing disorders, and interstitial lung disease.',
    officeHours: { days: 'Monday – Friday', hours: '8:30 AM – 4:30 PM ET', notes: 'Pulmonary function testing: Mon, Wed, Fri mornings only' },
    availability: generateSlots('aisha-thompson', 99_123),
  },
]

// ─── Lookup helpers ──────────────────────────────────────────────────────────

export function getDoctorById(id: string): Doctor | undefined {
  return DOCTORS.find((d) => d.id === id)
}

export function getAvailableSlots(doctorId: string, limit = 6): TimeSlot[] {
  const doctor = getDoctorById(doctorId)
  if (!doctor) return []
  return doctor.availability.filter((s) => !s.booked).slice(0, limit)
}

export function bookSlot(doctorId: string, slotId: string): boolean {
  const doctor = getDoctorById(doctorId)
  if (!doctor) return false
  const slot = doctor.availability.find((s) => s.id === slotId)
  if (!slot || slot.booked) return false
  slot.booked = true
  return true
}
