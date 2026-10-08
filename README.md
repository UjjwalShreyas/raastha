# Raastha (रास्ता) 🛣️
### Voice-First Civic Safety & Safe Corridor Navigation Platform

Raastha is a civic safety and municipal hazard dispatch web application designed for urban commuters, pedestrians, and city ward authorities. It features automated AI vision inspection for road hazards (such as potholes, open manholes, and defective streetlights) powered by Google Gemini Vision.

---

## ✨ Key Features

- **Gemini AI Vision Hazard Inspector**: Upload or snap a roadway defect photo. Google's Gemini Vision API calculates the cavity depth, assigns a severity score (Level 1–5), determines whether it strictly requires urgent civic repair, and generates engineering impact assessments.
- **Manual Severity Override**: Complete manual adjustment support (Levels 1–5) in case of poor lighting or custom civic evaluation.
- **Multilingual Voice Navigation & Dictation**: Real-time voice assistance and hazard reporting in English, Hindi, and Telugu with text-to-speech audio guidance.
- **Safe Lighted Corridor Routing**: Real-time GPS pathfinding optimized for well-lit streets, verified CCTV coverage, and high-footfall routes.
- **Ward Officer Municipal Dispatch Queue**: Exposure-weighted ranking formula `(Severity × Daily Commuters) / 100` with SLA timers for rapid municipal crew action.
- **Before / After Verification**: Citizen verification portal to review municipal asphalt repair proofs.
- **Emergency SOS Broadcast**: Instant one-tap location broadcasting to emergency contacts and direct dial action.
- **Minimalist Aesthetic**: Sand (`#FFECD1`) & Chocolate (`#3E000C`) color palette with Helvetica typography.

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/UjjwalShreyas/raastha.git
cd raastha
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Add your Gemini API key in `.env.local`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router & Turbopack)
- **Styling**: Tailwind CSS & Vanilla CSS Design System
- **Mapping**: Leaflet & React-Leaflet (OpenStreetMap)
- **AI Vision**: Google Gemini 3.5 / 2.5 Flash Vision Multimodal API
- **Icons & Motion**: Lucide React & Framer Motion
- **Typography**: Helvetica / Helvetica Neue
