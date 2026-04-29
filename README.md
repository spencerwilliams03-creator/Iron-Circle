# Iron Circle — Throw Tracker

A Progressive Web App (PWA) for tracking shot put and discus training sessions.

## Features

- **Session logging** — throws, lifting, pre/post questionnaires
- **Exercise memory** — auto-remembers your recent lifts with last weight/sets/reps pre-filled
- **Favorites** — star exercises to pin them to the top
- **Quick Add bar** — one-tap access to your most recently used exercises
- **Session history** — color-coded chips for fatigue, sleep, pain, caffeine flags
- **Stats** — PR tracker, session chart, trend analysis
- **AI analysis** — Claude-powered training review across 6 focus areas

## File Structure

```
iron-circle/
├── index.html      # App shell + all HTML
├── style.css       # All styles
├── app.js          # Core logic + exercise memory system
├── ai.js           # AI analysis module
├── manifest.json   # PWA manifest
└── README.md
```

## Deploy to GitHub Pages

1. Create a new GitHub repository (e.g. `iron-circle`)
2. Push all files to the `main` branch
3. Go to **Settings → Pages → Source** → set to `main` branch, root folder
4. Your app will be live at `https://yourusername.github.io/iron-circle`

## Install on iPhone

1. Open your GitHub Pages URL in **Safari**
2. Tap the **Share** button (box with arrow)
3. Tap **"Add to Home Screen"**
4. Tap **Add** — it'll appear on your home screen like a native app

## Data Storage

All data is stored locally on-device using `localStorage`. Nothing is sent to any server except the AI analysis (which sends an anonymized training summary to Anthropic's API).

## Exercise Memory System

- Every exercise you log is remembered with usage count, last weight, and last sets/reps
- **Quick Add bar** shows your 8 most recently used exercises with last weight shown
- **Exercise Picker** sorts by: favorites first, then most used
- **Star** any exercise in the picker or on a card to pin it to favorites
- Type a custom exercise name in the search box and tap **+ Add Custom**

## AI Analysis

The AI tab uses Claude (claude-sonnet-4) to analyze your full session history. It builds a statistical summary locally (never sends raw notes) and returns coach-level feedback across 6 focus areas:

- Overall Progress Review
- Technique & Consistency
- Recovery & CNS Management
- Arousal & Competition Readiness
- Lifting & Strength Transfer
- Injury / Pain Patterns
- Peaking Strategy
