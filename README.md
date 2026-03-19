# Kyron Medical — AI Patient Scheduling Portal

A production-ready patient scheduling web application that enables patients to book medical appointments through an intelligent AI chat interface, with seamless handoff to live voice calls. Built as a full-stack assessment for Kyron Medical Group.

---

## Table of Contents

- [Overview](#overview)
- [Live Demo](#live-demo)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Design Decisions](#design-decisions)
- [External APIs](#external-apis)
- [Database Schema](#database-schema)
- [API Routes](#api-routes)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Doctors & Availability](#doctors--availability)

---

## Overview

Kyron Medical's patient portal lets patients describe their symptoms, get matched to the right specialist, select an appointment slot, and receive confirmation — all through a natural conversation with **Kyra**, an AI care coordinator. When preferred, patients can seamlessly switch to a live voice call that picks up exactly where the chat left off, with no repeated intake questions.

---
## Live Demo

🔗 https://wwwmedicalvoiceaidemo.org/
📹 Demo Video: <link>

Test Flow:
1. Enter symptoms (e.g. "I have knee pain")
2. Provide patient details
3. Select appointment slot
4. Click "Continue on Call"
5. AI continues via voice with full context

## Features

### Chat
- **Conversational intake** — Kyra collects name, DOB, phone, email, and medical reason through natural dialogue
- **Semantic doctor matching** — keyword scoring maps symptoms to the right specialist (no embeddings needed)
- **Real-time slot injection** — available appointment times are injected into context as soon as a reason is detected
- **Appointment booking** — confirmed in-chat with a styled confirmation card
- **Markdown rendering** — AI responses render formatted lists, bold, code blocks
- **Session persistence** — conversation restored from database on page reload via `localStorage` session token

### Voice
- **Browser mic call** — one-click voice call in the browser, no phone number needed
- **Outbound phone call** — after intake, Kyra can call the patient's number directly
- **Full context handoff** — Claude compresses the entire chat into a concise brief; Kyra resumes without the patient repeating anything
- **Live transcription** — voice messages appear in the chat window in real-time during the call
- **Transcript persistence** — full conversation stored in database after call ends (via Vapi REST API + `end-of-call-report` webhook)
- **Appointment booking by voice** — Kyra can call `checkAvailability` and `bookAppointment` tools during voice calls

### Notifications
- **Email confirmation** — React Email template sent via Resend on every booking
- **SMS confirmation** — Twilio SMS sent if patient opted in during intake (Requires ADLC Setup)

### UI
- **Liquid glass design** — animated gradient orbs, frosted glass cards, subtle glow effects
- **Fixed chat layout** — messages scroll independently; input bar stays pinned (ChatGPT-style)
- **Appointments sidebar** — booked appointments appear as cards in the left panel
- **Specialist roster** — left panel shows all 5 doctors with live available slot counts
- **Voice channel badge** — mic icon on voice messages distinguishes them from text

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Patient Browser                          │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Chat UI    │  │ Voice Button │  │  Appointments Panel  │  │
│  │ (useChat)   │  │  (useVapi)   │  │   (PatientPortal)    │  │
│  └──────┬──────┘  └──────┬───────┘  └──────────────────────┘  │
└─────────┼────────────────┼─────────────────────────────────────┘
          │ HTTP           │ WebRTC + HTTP
          ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js App (EC2 / Node)                      │
│                                                                  │
│  /api/chat              — Claude conversation, state machine     │
│  /api/appointments      — Book slot, fire email + SMS            │
│  /api/patients          — Upsert patient record                  │
│  /api/voice/handoff     — Compress context, build Vapi overrides │
│  /api/voice/call        — Initiate outbound phone call via Vapi  │
│  /api/voice/link-call   — Link Vapi callId to conversation row   │
│  /api/voice/save-transcript — Fetch & store call transcript      │
│  /api/voice/webhook     — Receive Vapi events (tool calls, EOC)  │
│  /api/voice/reconnect   — Reconnect dropped calls by phone       │
│  /api/email             — Send confirmation via Resend           │
│  /api/sms               — Send SMS via Twilio                    │
│  /api/conversations/[id] — Restore conversation history          │
└────┬──────────┬───────────┬───────────┬──────────┬──────────────┘
     │          │           │           │          │
     ▼          ▼           ▼           ▼          ▼
 Anthropic   Supabase    Vapi.ai     Resend    Twilio
 (Claude)  (PostgreSQL)  (Voice)    (Email)    (SMS)
```

### Conversation State Machine

```
greeting → intake → matching → slot_selection → confirmation → complete
```

State is tracked in `conversations.stage` and `conversations.metadata` (JSONB). Claude embeds a hidden `<<<KYRON_STATE>>>` JSON block in every response that the API route parses to drive state transitions.

### Voice Handoff Flow

```
[Patient clicks mic button]
  → POST /api/voice/handoff { sessionToken, conversationId }
  → Fetch last 60 messages from DB
  → Claude compresses to ~200-word context summary
  → Build assistantOverrides { systemPrompt + tools + serverUrl }
  → vapi.start(assistantId, overrides) → call.id captured
  → POST /api/voice/link-call { callId, conversationId }
  → Kyra starts with full patient context — no repeated intake

[Call ends]
  → POST /api/voice/save-transcript { callId, conversationId }
  → GET https://api.vapi.ai/call/{callId}
  → Store call.messages (role: user / bot) into messages table
  → refreshMessages() merges DB state back into React
```

### Transcript Storage (Dual Path)

| Event | Path | Use case |
|-------|------|----------|
| `call-end` (client SDK) | `/api/voice/save-transcript` → Vapi REST | Browser mic calls |
| `end-of-call-report` (webhook) | artifact in payload → direct insert | Phone calls + browser fallback |

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.0 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS v4 | ^4 |
| Animation | Framer Motion | ^12 |
| UI Primitives | shadcn/ui + Lucide React | — |
| AI Chat | Anthropic Claude Sonnet | claude-sonnet-4-6 |
| Voice AI | Vapi.ai Web SDK | ^2.5.2 |
| Database | Supabase (PostgreSQL) | ^2 |
| Email | Resend + React Email | ^6 |
| SMS | Twilio | ^5 |
| Markdown | react-markdown | ^10 |
| Runtime | Node.js + PM2 | 20 LTS |
| Reverse Proxy | Nginx + certbot | — |
| CI/CD | GitHub Actions → EC2 SSH | — |

---

## Design Decisions

### Claude for Safety-Critical Conversations
The assistant must strictly avoid giving medical advice. I chose Claude due to its strong instruction-following behavior and reliability in constrained domains. Its larger context window also simplifies injecting structured context (patient info, slots, doctor metadata) without aggressive truncation.

---

### Vapi for Voice + Fast Context Injection
Vapi enabled the fastest path to implementing real-time voice with minimal infrastructure. Its ability to inject dynamic context (`assistantOverrides`) allowed seamless handoff from chat to voice without building a custom voice orchestration layer. This was critical for delivering the core feature under time constraints.

---

### Next.js as Full-Stack (No Separate Backend)
To optimize for speed and simplicity, I used Next.js API routes instead of a separate backend. This reduced deployment complexity while still supporting all required workflows (chat, booking, voice, notifications).

---

### Backend-Owned Memory (Not Vendor Memory)
All conversation state is stored in the database (not the voice provider). This ensures consistent context across:
- chat → voice transitions
- dropped call reconnections
- future sessions

The voice layer receives a compressed summary at call start.

---

### Reliability Under Real-World Conditions
Voice systems are inherently unreliable (network issues, webhook delays). To handle this:
- implemented dual transcript capture (client + webhook)
- used message merging instead of full reloads

This ensures the UI never loses visible conversation state.

---

### MVP-First Prioritization
Given the time constraint, I prioritized:
1. Appointment scheduling
2. Chat → voice handoff
3. End-to-end booking flow

Other features (authentication, advanced scheduling logic, dashboard) were intentionally deferred.

---

## External APIs

### Anthropic (Claude)
- **Purpose**: AI chat responses, conversation state machine, context compression for voice handoff
- **Model**: `claude-sonnet-4-6`
- **Usage**: Every chat message → `POST /v1/messages`; voice handoff context compression
- **Docs**: https://docs.anthropic.com
- **Keys**: `ANTHROPIC_API_KEY`

### Vapi.ai
- **Purpose**: Browser voice calls, outbound phone calls, real-time transcription, tool calls during voice
- **Usage**:
  - Browser: `@vapi-ai/web` SDK → `vapi.start(assistantId, overrides)` returns `Call` object
  - Outbound: `POST https://api.vapi.ai/call/phone`
  - Transcript fetch: `GET https://api.vapi.ai/call/{id}` → `call.messages[]` (roles: `user` / `bot`)
  - Webhook receives: `end-of-call-report` (full transcript), `tool-calls` (checkAvailability, bookAppointment)
- **Docs**: https://docs.vapi.ai
- **Keys**: `NEXT_PUBLIC_VAPI_PUBLIC_KEY`, `VAPI_PRIVATE_KEY`, `VAPI_ASSISTANT_ID`, `VAPI_PHONE_NUMBER_ID`

### Supabase (PostgreSQL)
- **Purpose**: All persistent state — patients, conversations, messages, appointments, voice sessions
- **Usage**: Service role key used server-side for all writes; RLS enforced for anon reads
- **Docs**: https://supabase.com/docs
- **Keys**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

### Resend
- **Purpose**: Appointment confirmation emails with branded React Email template
- **Trigger**: Every successful appointment booking
- **Docs**: https://resend.com/docs
- **Keys**: `RESEND_API_KEY`, `EMAIL_FROM`

### Twilio
- **Purpose**: SMS appointment confirmation
- **Trigger**: Booking completion, only when `smsOptIn: true`
- **Docs**: https://www.twilio.com/docs
- **Keys**: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

---

## Database Schema

Core tables:
- patients
- conversations (stores state + session)
- messages (chat + voice)
- appointments

---

## API Routes

Key APIs:
- Chat: handles AI + state machine
- Appointments: booking + notifications
- Voice: handoff, call initiation, transcript storage

---

## Project Structure

```
app/
components/
hooks/
lib/
```

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Vapi
NEXT_PUBLIC_VAPI_PUBLIC_KEY=...
VAPI_PRIVATE_KEY=...
VAPI_ASSISTANT_ID=...
VAPI_PHONE_NUMBER_ID=...
VAPI_PHONE_NUMBER=+1...

# Resend
RESEND_API_KEY=re_...
EMAIL_FROM=Kyron Medical <appointments@yourdomain.com>

# Twilio (optional — SMS only fires when smsOptIn: true)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com
SESSION_SECRET=<openssl rand -base64 48>
```

---

## Local Development

```bash
# 1. Clone and install
git clone <repo-url>
cd kyron-medical
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in all values — minimum required: Supabase + Anthropic + Vapi

# 3. Set up database
# Open Supabase → SQL Editor → paste and run tasks/SCHEMA.sql

# 4. Start dev server
npm run dev
# → http://localhost:3000
```

> **Note on Vapi webhooks**: Transcript storage via `end-of-call-report` requires Vapi to reach your server. In local dev, use [ngrok](https://ngrok.com): `ngrok http 3000` and set `NEXT_PUBLIC_APP_URL` to the ngrok HTTPS URL.

---

## Production Deployment

### Infrastructure
- **Server**: AWS EC2 (Ubuntu 22.04, t3.small recommended)
- **Process manager**: PM2 (auto-restart on crash, survives reboots)
- **Reverse proxy**: Nginx → `localhost:3000`
- **SSL**: Let's Encrypt via certbot (auto-renew)



### CI/CD (GitHub Actions)

Every push to `master` automatically deploys:

```yaml
# .github/workflows/deploy.yml
push to master → SSH to EC2 → git pull → npm install → npm run build → pm2 restart
```


---

## Safety Notice

Kyra is a scheduling assistant only. She is explicitly instructed never to provide medical advice, diagnoses, or treatment recommendations, and to redirect all clinical questions to the physician or to 911 in emergencies.

