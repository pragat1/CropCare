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
