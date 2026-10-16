# Be Yourself — High-Performance Habit, Intensive Study & Ascension Suite

A production-ready, full-stack Progressive Web App (PWA) built with **Angular 21**, **Tailwind CSS**, and **Supabase Realtime Cloud WebSockets**. Built for relentless cognitive output (8-12h daily study), circadian sleep optimization, daily prayers & Athkar discipline, and a real-time live companion stream for your accountability partner.

---

## ⚡ Core Upgraded Feature Suite

### 1. Dedicated Real-Time Live Companion View (`/live-stream`)
- **Public Read-Only Stream**: Dedicated route designed specifically for your accountability partner or coach.
- **Supabase Realtime WebSockets**: Sub-second synchronization — zero page refreshing needed.
- **Streaming Live Timer**: Live stopwatch / Pomodoro seconds ticking in real-time on the guest's screen as you study.
- **Live Habit Radar**: Prayer checkmarks (Fajr, Dhuhr, Asr, Maghrib, Isha), gym logs, and pages read update and animate live as they happen.
- **Historical Log Access**: Guests can switch tabs to view past days' performance history, study totals, and sleep regularity.

### 2. Interactive Encouragement & Reaction System
- **Quick-Action Cheer Buttons**:
  - `Keep Going! 🔥`
  - `So Proud! 👏`
  - `Stay Strong 💪`
  - `Locked In! ⚡`
  - `Take a Breath ☕`
- **Guest Comment Box**: Short custom encouragement notes sent live over Supabase Realtime Channels.
- **Floating Toast Alert**: Incoming cheers trigger an audio chime and float onto the user's active screen and Zen Focus Mode.

### 3. Streak Engine & Fullscreen Zen Focus Mode
- **Daily Streak Engine**: Tracks consecutive days meeting the **8 to 12-hour study target** AND all **5 daily prayers** fulfilled (`🔥 12+ Day Streak`).
- **Zen Focus Chamber**: One-click fullscreen zero-distraction view for deep work blocks with giant digital clock, active subject badge, minimal controls, and live incoming guest reactions. Press `Esc` to exit anytime.

### 4. Intensive Study & Cognitive Engine
- **Stopwatch, Pomodoro (25m), and Deep Work (50m) blocks**.
- **Daily 8 to 12 Hours Target Progress Bar**: Visual milestone markers at 4h (halfway), 8h (daily baseline standard), and 12h (elite peak intensity).
- **Course & Lesson Module Tracker**: Real-time progress bars with quick `+1 Done` / `-1` increment buttons and dynamic course creation.

### 5. Sleep & Energy Optimization Tracker
- **Circadian Window Calculator**: Enter Bedtime and Wake Time; auto-calculates total hours (correctly handles times crossing midnight).
- **1-to-5 Star Sleep Quality Rating**: Interactive glowing star selectors.
- **Circadian Regularity**: Rolling 7-day average duration, consistency score, and recovery tags.

### 6. Religious & Physical Discipline Checklist
- **Daily 5 Prayers (Salawat)**: Fajr, Dhuhr, Asr, Maghrib, and Isha with custom checkboxes, Arabic typography, and counter.
- **Athkar**: Morning (أذكار الصباح) and Evening (أذكار المساء) remembrance cards.
- **Gym / Physical Discipline**: Binary toggle (*Workout Completed* vs *Pending / Missed*) with routine notes.
- **Book Reading Tracker**: Pages read counter with quick `+5`, `+10`, `+25` buttons, customizable target, and progress bar.

### 7. PWA Push Notifications & Offline First
- **Push Reminders**: Native browser notifications for morning/evening Athkar and study session blocks.
- **Offline Cache**: Works seamlessly offline with `localStorage` fallback and auto-syncs when online.
- **Installable PWA**: Install button in header with support for iOS, Android, and Desktop standalone mode.

---

## 🗄️ Supabase Cloud Database Setup

Your Supabase credentials are pre-configured in `src/environments/environment.ts`:
- **URL**: `https://ybwggbohmbrkppwwslqv.supabase.co`
- **Publishable Key**: `sb_publishable_Pn_WI-_bp0g74I-nCIiRWA_MGOYi2p3`

### Run SQL Schema in Supabase
Run the contents of `supabase-schema.sql` in your [Supabase SQL Editor](https://app.supabase.com):
```sql
-- Tables created:
-- 1. study_sessions
-- 2. courses
-- 3. sleep_logs
-- 4. daily_habits
-- 5. encouragements (Accountability cheers & reactions)
-- 6. live_user_state (Realtime timer & focus state)
```

---

## 🚀 Running the App

### Start Local Development Server
```bash
npm start
# App: http://localhost:4200
# Live Companion Stream: http://localhost:4200/live-stream
```

### Production PWA Build
```bash
npm run build
npx http-server dist/be-yourself -p 8080 -c-1
# Test offline PWA installation at http://localhost:8080
```
