-- =========================================================================
-- HIGH-PERFORMANCE HABIT & STUDY TRACKER SCHEMA (BE-YOURSELF)
-- MASTER SINGLE-TENANT ARCHITECTURE (User ID: 00000000-0000-0000-0000-000000000001)
-- Run this in your Supabase SQL Editor: https://app.supabase.com/project/_/sql
-- =========================================================================

-- 1. STUDY SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 0),
    title TEXT NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('pomodoro', 'stopwatch', 'deepwork')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. COURSES & LESSON MODULES TABLE
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    title TEXT NOT NULL,
    completed_modules INTEGER NOT NULL DEFAULT 0 CHECK (completed_modules >= 0),
    total_modules INTEGER NOT NULL DEFAULT 1 CHECK (total_modules > 0),
    category TEXT DEFAULT 'General',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. SLEEP & ENERGY OPTIMIZATION TABLE
CREATE TABLE IF NOT EXISTS public.sleep_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    sleep_time TEXT NOT NULL,
    wake_time TEXT NOT NULL,
    total_hours NUMERIC(4,2) NOT NULL CHECK (total_hours >= 0),
    quality_rating INTEGER NOT NULL CHECK (quality_rating BETWEEN 1 AND 5),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_user_sleep_log_date UNIQUE(user_id, log_date)
);

-- 4. RELIGIOUS & DISCIPLINE HABITS TABLE
CREATE TABLE IF NOT EXISTS public.daily_habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    habit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    fajr BOOLEAN NOT NULL DEFAULT FALSE,
    dhuhr BOOLEAN NOT NULL DEFAULT FALSE,
    asr BOOLEAN NOT NULL DEFAULT FALSE,
    maghrib BOOLEAN NOT NULL DEFAULT FALSE,
    isha BOOLEAN NOT NULL DEFAULT FALSE,
    morning_athkar BOOLEAN NOT NULL DEFAULT FALSE,
    evening_athkar BOOLEAN NOT NULL DEFAULT FALSE,
    workout_done BOOLEAN NOT NULL DEFAULT FALSE,
    workout_type TEXT DEFAULT 'Full Body',
    reading_pages INTEGER NOT NULL DEFAULT 0 CHECK (reading_pages >= 0),
    reading_book TEXT DEFAULT 'Current Book',
    reading_target INTEGER NOT NULL DEFAULT 20,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_user_habit_date UNIQUE(user_id, habit_date)
);

-- 5. LIVE ACCOUNTABILITY ENCOURAGEMENTS & REACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.encouragements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    sender_name TEXT NOT NULL DEFAULT 'Accountability Partner',
    message TEXT NOT NULL,
    reaction_type TEXT NOT NULL DEFAULT 'text',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. LIVE USER STATE (FOR REALTIME TIMER & FOCUS STATUS)
CREATE TABLE IF NOT EXISTS public.live_user_state (
    id TEXT PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
    user_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    is_studying BOOLEAN DEFAULT FALSE,
    timer_mode TEXT DEFAULT 'stopwatch',
    elapsed_seconds INTEGER DEFAULT 0,
    session_title TEXT DEFAULT 'Deep Work',
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encouragements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_user_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read/write on study_sessions"
    ON public.study_sessions FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read/write on courses"
    ON public.courses FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read/write on sleep_logs"
    ON public.sleep_logs FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read/write on daily_habits"
    ON public.daily_habits FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read/write on encouragements"
    ON public.encouragements FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read/write on live_user_state"
    ON public.live_user_state FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime replication on these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.courses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sleep_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_habits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.encouragements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_user_state;
