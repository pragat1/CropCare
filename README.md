<div align="center">

# 🌿 CropCare — AI Agronomic Intelligence & Disease Diagnosis

**Empowering farmers worldwide with instant leaf disease diagnosis, soil analysis, microclimate outbreak forecasting, and field-ready offline resilience.**

[![TanStack Start](https://img.shields.io/badge/TanStack%20Start-v1.0-FF4154?style=flat-square&logo=react&logoColor=white)](https://tanstack.com/start)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Edge Serverless](https://img.shields.io/badge/Edge%20Runtime-Cloudflare%20Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![PostgreSQL RLS](https://img.shields.io/badge/Database-PostgreSQL%20%7C%20RLS-336791?style=flat-square&logo=postgresql&logoColor=white)](https://supabase.com)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline%20Ready-5A0FC8?style=flat-square&logo=pwa&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

[Live Demo](https://code-companion-hub-23.lovable.app) • [Architecture](#-architecture--system-design) • [Key Features](#-core-capabilities) • [Quickstart](#-getting-started) • [Security & Privacy](#-security--data-governance)

</div>

---

## 📌 Overview

**CropCare** is a production-grade, full-stack agricultural intelligence platform engineered for edge devices and rural mobile connectivity. Built on **TanStack Start v1 (React 19)** and **Cloudflare Workers edge execution**, CropCare combines multimodal computer vision with real-time agronomic data to help farmers detect plant diseases, analyze soil composition, monitor microclimate risks, and adhere to personalized treatment schedules.

Designed with an **offline-first philosophy**, CropCare automatically caches critical reference data and queues in-field photo scans locally via **IndexedDB** when network connectivity is lost, synchronizing diagnostics immediately upon reconnection.

---

## ⚡ Core Capabilities

### 🔍 1. Multimodal AI Leaf Disease Diagnosis
* **Multi-Hypothesis Vision Analysis:** Evaluates leaf symptoms against deep agronomic models, returning the top-3 differential diagnoses with calibrated confidence percentages.
* **Granular Pathology Breakdown:** Identifies infection severity (*Mild*, *Moderate*, *Severe*), affected tissue (*foliage, stem, fruit, margins*), and symptom progression.
* **Dual Treatment Protocols:** Delivers tailored **organic biological controls** and **chemical fungicide/bactericide regimens** complete with exact dilution ratios and application frequencies.
* **Cross-Referenced Library:** Matches AI detections directly to verified, curated dossiers in the CropCare Disease Reference Database.

### 🧪 2. In-Field Soil Health Analysis
* **Texture & Type Classification:** Analyzes soil surface photos to identify textural composition (*Clay, Loamy, Sandy, Silt*).
* **Agronomic Estimation:** Predicts visual fertility indicators, organic matter presence, moisture retention curves, and likely pH ranges.
* **Crop Compatibility:** Suggests high-yield crops tailored to the identified soil profile with organic soil amendment advice.

### 🌤️ 3. Microclimate Risk & Weather Intelligence
* **Hyper-Local Atmospheric Metrics:** Real-time temperature, relative humidity, wind speed, precipitation probability, and dew point via Open-Meteo.
* **Fungal & Bacterial Spore Modeling:** Dynamic risk indexing that computes disease outbreak probabilities based on prolonged leaf wetness duration.
* **Spray Window Forecasting:** Advises farmers on optimal pesticide and fungicide application hours to prevent chemical runoff or drift.

### 🗣️ 4. Multilingual Agricultural Voice Assistant
* **Trilingual Natural Language Support:** Native conversational speech and text interfaces in **English**, **Hindi (हिन्दी)**, and **Punjabi (ਪੰਜਾਬੀ)**.
* **Context-Grounded Guidance:** The assistant automatically grounds answers in the farmer's recent scan history, registered crops, and local weather patterns.
* **Voice-First Input:** Integrated audio recording and streaming transcription for accessible field operation without typing.

### 📱 5. Progressive Web App (PWA) & Offline Queue
* **Zero App Store Friction:** Full PWA installability with native mobile home screen shortcuts (*Quick Scan, Disease Reference, Weather*).
* **Client-Side Queueing:** Scans captured in disconnected rural zones are stored in browser `IndexedDB` with automatic cloud synchronization upon reconnecting.
* **Client-Generated PDF Reports:** Instant, one-tap export of timestamped clinical diagnostic summaries with photos, treatment dosages, and emergency contacts.

---

## 🏗️ Architecture & System Design

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Client Layer (Browser / PWA)                      │
│   React 19 • Tailwind CSS v4 • IndexedDB Local Cache • Service Worker       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ RPC (createServerFn)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Serverless Edge Layer (Cloudflare Workers)               │
│   • TanStack Start v1 Full-Stack Engine                                     │
│   • Strict Zod Schema Validation & Input Sanitization                       │
│   • Rate Limiting & Tamper Protection                                       │
└──────────────┬───────────────────────────────┬──────────────────────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌────────────────────────────────────────────┐
│      Lovable AI Gateway      │ │          Database & Storage Layer           │
│  • Multimodal Vision Models  │ │  • PostgreSQL with Row-Level Security (RLS)│
│  • Speech Transcription/TTS  │ │  • Private AES-256 Storage Buckets         │
│  • Microclimate Analysis     │ │  • Role-Based Access Control (RBAC)        │
└──────────────────────────────┘ └────────────────────────────────────────────┘
```

### Component Hierarchy

| Module | Route / File Path | Description |
| :--- | :--- | :--- |
| **Detect Disease** | `/app` | Live leaf upload, camera capture, crop selector, and AI differential cards |
| **Dashboard** | `/dashboard` | KPI summaries, scan trends, disease distribution chart, and weather widget |
| **Disease Library** | `/diseases` | 28 verified disease reference dossiers across 12 global crops |
| **Crop Profiles** | `/crops/$crop` | Growth stages, climate requirements, and user symptom timeline |
| **Soil Analysis** | `/soil` | Soil texture diagnostics, fertility assessment, and amendment guidance |
| **Weather Risk** | `/weather` | Atmospheric condition tracking, disease risk score, and spraying windows |
| **Voice Assistant** | `/assistant` | Multimodal conversational advisor in English, Hindi, and Punjabi |
| **Treatment Tracker** | `/tracker` | 7/14/21-day treatment follow-up scheduler and recovery tracking |

---

## 💻 Tech Stack

### Frontend & Application Layer
* **Framework:** [TanStack Start v1](https://tanstack.com/start) with React 19
* **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) with native semantic design tokens
* **UI Components:** [Radix UI Primitives](https://www.radix-ui.com/) + [Lucide React](https://lucide.dev/)
* **State & Data Fetching:** [TanStack Query v5](https://tanstack.com/query) & [TanStack Router](https://tanstack.com/router)
* **Form & Data Validation:** [Zod](https://zod.dev/) + React Hook Form
* **Visualizations & Charts:** [Recharts](https://recharts.org/)
* **PDF Engine:** [jsPDF](https://github.com/parallax/jsPDF)

### Backend & Cloud Infrastructure
* **Runtime:** Cloudflare Workers (`workerd` Edge runtime)
* **API Paradigm:** Typed Server Functions (`createServerFn`)
* **Database:** Managed PostgreSQL with Row-Level Security (RLS)
* **Authentication:** Supabase Auth (Secure Email/Password & Google OAuth)
* **Object Storage:** Private encrypted buckets with time-limited signed URLs
* **Weather API:** Open-Meteo REST API (zero-key atmospheric modeling)

---

## 🔒 Security & Data Governance

1. **Strict Row-Level Security (RLS):**
   * Every database table enforces RLS. Farmers can only query, modify, or view their own scan records, reminders, and profile details.
2. **Private Storage with Signed URLs:**
   * Leaf and soil photos are stored in private, unlisted buckets (`leaf-images`, `soil-images`). Images are rendered using short-lived cryptographically signed tokens.
3. **Role-Based Content Administration (RBAC):**
   * Reference content modification is gated behind a database-level `has_role(auth.uid(), 'admin')` security-definer function, preventing unauthorized catalog edits.
4. **Client-Side Compression:**
   * High-resolution camera photos are resized and compressed client-side prior to transfer, minimizing edge bandwidth and upload latency in low-bandwidth regions.

---

## 🚀 Getting Started

### Prerequisites
* **Node.js:** `>= 20.x` (or **Bun:** `>= 1.1.x`)
* **Package Manager:** `npm` or `bun`

### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/cropcare.git
cd cropcare
```

### 2. Install Dependencies
```bash
Using Bun (Recommended)
bun install

Or using npm
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the project root:
```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
VITE_SUPABASE_PROJECT_ID=<your-project-id>
```

### Supabase Password Recovery Setup
In the Supabase dashboard, set **Authentication → URL Configuration → Site URL** to the deployed
application origin. Add each deployed site's exact `https://<host>/reset-password` URL to the
**Redirect URLs** allowlist; for local development, also allow `http://localhost:8080/reset-password`.

Under **Authentication → Email → Templates → Reset Password**, keep the link pointed at
`{{ .ConfirmationURL }}` so Supabase verifies the recovery token before redirecting to the app.
The app relies on Supabase's `PASSWORD_RECOVERY` event and does not change email-confirmation
settings. If the recovery email template or redirect allowlist is not configured, email links may
not return to the reset page.

### 4. Start the Local Development Server
```bash
Using Bun
bun run dev

Or using npm
npm run dev
```
Open [http://localhost:8080](http://localhost:8080) in your browser.

### 5. Build for Production
```bash
bun run build
Or
npm run build
```

---

## 📊 Database Schema Highlights

```sql
-- Detections: Stores in-depth multimodal AI diagnosis
CREATE TABLE public.detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  crop TEXT NOT NULL,
  disease TEXT NOT NULL,
  is_healthy BOOLEAN DEFAULT false,
  confidence NUMERIC(5,2) NOT NULL,
  severity TEXT CHECK (severity IN ('Low', 'Moderate', 'High', 'Critical')),
  symptoms TEXT[],
  organic_treatment TEXT[],
  chemical_treatment TEXT[],
  preventive_measures TEXT[],
  image_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Content Items: Curated reference catalog for diseases & treatments
CREATE TABLE public.content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  scientific_name TEXT,
  crop TEXT,
  data JSONB NOT NULL,
  published BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 🗺️ Roadmap

- [x] Multimodal Leaf Disease Detection with Top-3 Differentials
- [x] Curated Disease Reference Library with 28 dossiers across 12 crops
- [x] Soil Texture and Chemical Fertility AI Diagnosis
- [x] Open-Meteo Weather Integration & Disease Outbreak Risk Score
- [x] PWA Offline Scanning Queue & Local IndexedDB Sync
- [x] Multilingual Voice Assistant (English, Hindi, Punjabi)
- [ ] Direct Agronomist Tele-consultation Escalation Flow
- [ ] Drone & Multi-Spectrum NDVI Imagery Ingestion

---

## 📄 License

This project is open-source and distributed under the [MIT License](LICENSE).

---

<div align="center">
  <sub>Built with ❤️ to protect global food security and empower agricultural communities.</sub>
</div>

---

How to use this:
1. Open or create `README.md` in the root of your repository.
2. Replace `<your-username>` with your GitHub handle.
3. Commit and push to GitHub — GitHub will immediately render the formatted badges, architecture diagram, and tables cleanly on your repo home page.
