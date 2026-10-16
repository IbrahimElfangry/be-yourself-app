export interface StudySession {
  id: string;
  user_id?: string;
  session_date: string; // YYYY-MM-DD
  duration_minutes: number;
  title: string;
  mode: 'pomodoro' | 'stopwatch';
  notes?: string;
  created_at?: string;
}

export interface Course {
  id: string;
  user_id?: string;
  title: string;
  completed_modules: number;
  total_modules: number;
  category?: string;
  created_at?: string;
}

export interface SleepLog {
  id: string;
  user_id?: string;
  log_date: string; // YYYY-MM-DD
  sleep_time: string; // HH:mm
  wake_time: string; // HH:mm
  total_hours: number;
  quality_rating: number; // 1-5
  notes?: string;
  created_at?: string;
}

export interface DailyHabits {
  id: string;
  user_id?: string;
  habit_date: string; // YYYY-MM-DD
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
  morning_athkar: boolean;
  evening_athkar: boolean;
  workout_done: boolean;
  workout_type?: string;
  reading_pages: number;
  reading_book?: string;
  reading_target: number;
  created_at?: string;
}

export interface EncouragementMessage {
  id: string;
  sender_name: string;
  message: string;
  reaction_type: 'fire' | 'applause' | 'muscle' | 'lightning' | 'coffee' | 'text';
  created_at: string;
}

export interface LiveTimerState {
  isStudying: boolean;
  timerMode: 'stopwatch' | 'pomodoro' | 'deepwork';
  elapsedSeconds: number;
  targetSeconds: number;
  sessionTitle: string;
  startedAt?: string;
  updatedAt: number;
}

export interface StreakData {
  currentStreakDays: number;
  longestStreakDays: number;
  todayStudyMet: boolean;
  todayPrayersMet: boolean;
  consistencyPercentage: number;
}

export interface DailySummary {
  studyHours: number;
  studyTargetMet: boolean;
  studyPeakMet: boolean;
  prayersCompleted: number;
  athkarCompleted: number;
  workoutDone: boolean;
  pagesRead: number;
  sleepHours: number;
  sleepQuality: number;
}
