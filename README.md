#Names:



# hmap1122

  1. Prereqs – Node.js 18+ and npm. (Everything else is vendored; Tailwind/PostCSS run via npm scripts.)
  2. Install deps – npm install in the repo root.
  3. Optional Gemini key – Create .env.local with GEMINI_API_KEY=<key> (or leave unset to use the mock AI responses baked into
     services/geminiService.ts).
  4. Dev server – npm run dev, then open the URL Vite prints (default http://localhost:3000). Tailwind is bundled locally, so no
     CDN steps needed.
  5. Prod build/preview (if they need it) – npm run build followed by npm run preview.
