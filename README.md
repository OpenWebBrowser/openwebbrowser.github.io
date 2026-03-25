# OpenWebBrowser

Static GitHub Pages frontend for OpenWebBrowser.

## What This Repo Contains
- Frontend-only (no backend).
- AI chat (Gemini) and a proxied web viewer tab.
- Designed to deploy to GitHub Pages via GitHub Actions.

## Requirements
- Node 20+
- A Gemini API key (stored as `GEMINI_API_KEY` in GitHub Secrets)

## Local Development
```bash
cd apps/web
npm install
cp .env.example .env
npm run dev
```

## Environment Variables
Vite reads variables prefixed with `VITE_`.

- `VITE_GEMINI_API_KEY` — Gemini API key (client-side; will be embedded in the build).
- `VITE_API_BASE` — Base URL for your backend proxy (dummy by default).

## GitHub Pages Deployment
This repo uses `.github/workflows/pages.yml`.

Steps:
1. Add `GEMINI_API_KEY` to GitHub Secrets.
2. In repo settings → Pages → Source: **GitHub Actions**.
3. Push to `main`.

If this repo is named `openwebbrowser.github.io`, it will deploy to:
- `https://openwebbrowser.github.io/`

If this repo is named `OpenWebBrowser`, it will deploy to:
- `https://openwebbrowser.github.io/OpenWebBrowser/`

## Important Security Note
This frontend calls Gemini directly from the browser. Any API key used here is **publicly visible** in the built JavaScript. For production, route AI requests through your backend and remove the client-side key.

## Proxy Browser Tab
The Browser tab expects a backend endpoint:
```
GET {VITE_API_BASE}/proxy?url=https://example.com
```
It should return HTML as text. The UI will render it inside an iframe via `srcdoc`.

## License
See `LICENSE`.
