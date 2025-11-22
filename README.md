# HomePath

A prototype AI assistant that helps first-time home buyers understand their finances, forecast affordability timelines, and get actionable recommendations.

## Tech Stack
- Vite + React 19 + TypeScript
- TailwindCSS for styling
- Recharts for visualizations
- Optional: Google Gemini via `@google/genai` (falls back to mocks when no API key)

## Prerequisites
- Node.js 18+ and npm

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. (Optional) Enable live Gemini calls by adding your key:
   ```bash
   echo "GEMINI_API_KEY=your-key" > .env.local
   ```
   Without this, the app uses mock AI responses defined in `services/geminiService.ts`.

## Scripts
- `npm run dev` — Start Vite dev server (defaults to http://localhost:3000)
- `npm run build` — Production build
- `npm run preview` — Preview the production build locally
- `npm run analyzer:server` — (Optional) Run the analyzer API locally (requires Python+pandas)

## Project Structure
- `App.tsx` — App shell, routing via `Page` enum, shared state (auth, profile, criteria, loan settings)
- `components/` — Reusable UI primitives (Button, Card, Icon, Layout)
- `pages/` — Feature views (Dashboard, Profile, Settings, Simulator, Insights, Learning, Auth, FinancialReport)
- `services/geminiService.ts` — AI integrations (mock and real Gemini calls)
- `types.ts` — Shared enums and data contracts

## Notes
- The dashboard, simulator, and insights pages will use AI only when `GEMINI_API_KEY` is present; otherwise they show deterministic mock data.
- Bank statement uploads are simulated client-side by default. If you deploy the Python analyzer service (e.g., on Fly.io using `Dockerfile.analyzer` + `server/index.js` + `scripts/statement_analyzer.py`), set `VITE_ANALYZER_API` to its URL (e.g., `https://homepath-analyzer.fly.dev`). If unset or unreachable, the app falls back to the in-browser parser.
