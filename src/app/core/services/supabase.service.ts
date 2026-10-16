import { Injectable, signal, computed, inject } from '@angular/core';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import {
  StudySession,
  Course,
  SleepLog,
  DailyHabits,
  DailySummary,
  EncouragementMessage,
  LiveTimerState,
  StreakData
} from '../models/tracker.models';
import { SoundService } from './sound.service';
import { MASTER_USER_ID } from './auth.service';

const FALLBACK_SUPABASE_URL = 'https://ybwggbohmbrkppwwslqv.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'sb_publishable_Pn_WI-_bp0g74I-nCIiRWA_MGOYi2p3';
const FALLBACK_MASTER_USER_ID = '00000000-0000-0000-0000-000000000001';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  // Master User UUID - Fallback or environment configurable
  public readonly MASTER_USER_ID = environment.MASTER_USER_ID || MASTER_USER_ID || FALLBACK_MASTER_USER_ID;
  public readonly masterUserId = this.MASTER_USER_ID;

  private sound = inject(SoundService);
  private supabase: SupabaseClient;
  private liveChannel: RealtimeChannel | null = null;
  private dbChannel: RealtimeChannel | null = null;
  private midnightCheckInterval: any = null;

  // Connection and sync statuses
  public isOnline = signal<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  public isConnectedToSupabase = signal<boolean>(false);
  public lastSyncTime = signal<Date | null>(null);
  public syncError = signal<string | null>(null);

  // App reactive state signals
  public studySessions = signal<StudySession[]>([]);
  public courses = signal<Course[]>([]);
  public sleepLogs = signal<SleepLog[]>([]);
  public dailyHabits = signal<DailyHabits | null>(null);
  public encouragements = signal<EncouragementMessage[]>([]);

  // Active Calendar Date (defaults to today: YYYY-MM-DD)
  public selectedDate = signal<string>(this.getTodayDateString());
  public todayDateString = signal<string>(this.getTodayDateString());

  public isViewingToday = computed(() => this.selectedDate() === this.todayDateString());

  // Real-time live stream state for companion & mobile sync
  public liveTimerState = signal<LiveTimerState>({
    isStudying: false,
    timerMode: 'stopwatch',
    elapsedSeconds: 0,
    targetSeconds: 0,
    sessionTitle: '',
    updatedAt: Date.now()
  });

  // Recent floating encouragement toast
  public activeEncouragementToast = signal<EncouragementMessage | null>(null);

  // Selected date computed metrics
  public todayStudySessions = computed(() => {
    const targetDate = this.selectedDate();
    return this.studySessions().filter(s => s.session_date === targetDate);
  });

  public todayStudyHours = computed(() => {
    const totalMinutes = this.todayStudySessions().reduce(
      (sum, s) => sum + (s.duration_minutes || 0),
      0
    );
    return Math.round((totalMinutes / 60) * 10) / 10;
  });

  public studyTargetPercentage = computed(() => {
    const hours = this.todayStudyHours();
    if (hours === 0) return 0;
    const pct = (hours / 8) * 100;
    return Math.min(Math.round(pct), 150);
  });

  public todaySleepLog = computed(() => {
    const targetDate = this.selectedDate();
    return this.sleepLogs().find(l => l.log_date === targetDate) || null;
  });

  public prayersCompletedCount = computed(() => {
    const habits = this.dailyHabits();
    if (!habits) return 0;
    let count = 0;
    if (habits.fajr) count++;
    if (habits.dhuhr) count++;
    if (habits.asr) count++;
    if (habits.maghrib) count++;
    if (habits.isha) count++;
    return count;
  });

  // Streak strictly computed from logged days
  public streakData = computed<StreakData>(() => {
    const today = this.todayDateString();
    const todayStudyMet = this.todayStudyHours() >= 8;
    const todayPrayersMet = this.prayersCompletedCount() === 5;

    let consecutivePastDays = 0;
    let checkDate = new Date(today);

    while (true) {
      checkDate.setDate(checkDate.getDate() - 1);
      const year = checkDate.getFullYear();
      const month = String(checkDate.getMonth() + 1).padStart(2, '0');
      const day = String(checkDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const daySessions = this.studySessions().filter(s => s.session_date === dateStr);
      const totalMinutes = daySessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
      const studyMet = (totalMinutes / 60) >= 8;

      let habitsMet = false;
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(`by_habits_${dateStr}`);
        if (stored) {
          try {
            const h: DailyHabits = JSON.parse(stored);
            habitsMet = !!(h.fajr && h.dhuhr && h.asr && h.maghrib && h.isha);
          } catch {}
        }
      }

      if (studyMet && habitsMet) {
        consecutivePastDays++;
      } else {
        break;
      }
    }

    const currentStreak = consecutivePastDays + (todayStudyMet && todayPrayersMet ? 1 : 0);

    return {
      currentStreakDays: currentStreak,
      longestStreakDays: currentStreak,
      todayStudyMet,
      todayPrayersMet,
      consistencyPercentage: currentStreak > 0 ? 100 : 0
    };
  });

  public dailySummary = computed<DailySummary>(() => {
    const habits = this.dailyHabits();
    const sleep = this.todaySleepLog();
    const studyHours = this.todayStudyHours();

    return {
      studyHours,
      studyTargetMet: studyHours >= 8,
      studyPeakMet: studyHours >= 12,
      prayersCompleted: this.prayersCompletedCount(),
      athkarCompleted: (habits?.morning_athkar ? 1 : 0) + (habits?.evening_athkar ? 1 : 0),
      workoutDone: habits?.workout_done || false,
      pagesRead: habits?.reading_pages || 0,
      sleepHours: sleep?.total_hours || 0,
      sleepQuality: sleep?.quality_rating || 0
    };
  });

  constructor() {
    const url = environment?.supabaseUrl || (environment as any)?.SUPABASE_URL || FALLBACK_SUPABASE_URL;
    const key = environment?.supabasePublishableKey || (environment as any)?.SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

    this.supabase = createClient(url, key, {
      auth: { persistSession: true },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });

    this.setupNetworkListeners();
    this.restoreCachedState();
    this.loadAllData();
    this.setupRealtimeSync();
    this.setupMidnightResetMonitor();
  }

  public getTodayDateString(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private setupNetworkListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline.set(true);
        this.loadAllData();
      });
      window.addEventListener('offline', () => {
        this.isOnline.set(false);
      });
    }
  }

  private setupMidnightResetMonitor(): void {
    if (typeof window !== 'undefined') {
      this.midnightCheckInterval = setInterval(() => {
        const currentDateStr = this.getTodayDateString();
        if (currentDateStr !== this.todayDateString()) {
          const previousViewingToday = this.isViewingToday();
          this.todayDateString.set(currentDateStr);
          if (previousViewingToday) {
            this.setSelectedDate(currentDateStr);
          }
        }
      }, 30000);
    }
  }

  private restoreCachedState(): void {
    if (typeof localStorage !== 'undefined') {
      const storedStudy = localStorage.getItem('by_study_sessions');
      if (storedStudy) {
        try { this.studySessions.set(JSON.parse(storedStudy)); } catch {}
      }

      const storedCourses = localStorage.getItem('by_courses');
      if (storedCourses) {
        try { this.courses.set(JSON.parse(storedCourses)); } catch {}
      }

      const storedSleep = localStorage.getItem('by_sleep_logs');
      if (storedSleep) {
        try { this.sleepLogs.set(JSON.parse(storedSleep)); } catch {}
      }

      const storedEncouragements = localStorage.getItem('by_encouragements');
      if (storedEncouragements) {
        try { this.encouragements.set(JSON.parse(storedEncouragements)); } catch {}
      }

      this.loadHabitsForDate(this.selectedDate());
    }
  }

  public setSelectedDate(date: string): void {
    if (!date) return;
    this.selectedDate.set(date);
    this.loadHabitsForDate(date);
    this.fetchDailyHabits(date);
  }

  public navigateDate(offsetDays: number): void {
    const current = new Date(this.selectedDate());
    current.setDate(current.getDate() + offsetDays);
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    this.setSelectedDate(`${year}-${month}-${day}`);
  }

  public jumpToToday(): void {
    this.setSelectedDate(this.todayDateString());
  }

  public loadHabitsForDate(date: string): void {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(`by_habits_${date}`);
      if (stored) {
        try {
          this.dailyHabits.set(JSON.parse(stored));
          return;
        } catch {}
      }
    }

    const freshHabits: DailyHabits = {
      id: 'h_' + date,
      user_id: this.MASTER_USER_ID,
      habit_date: date,
      fajr: false,
      dhuhr: false,
      asr: false,
      maghrib: false,
      isha: false,
      morning_athkar: false,
      evening_athkar: false,
      workout_done: false,
      workout_type: 'Full Body',
      reading_pages: 0,
      reading_book: '',
      reading_target: 20
    };
    this.dailyHabits.set(freshHabits);
  }

  private saveLocal(key: string, data: any): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch {}
    }
  }

  public async loadAllData(): Promise<void> {
    try {
      await Promise.allSettled([
        this.fetchStudySessions(),
        this.fetchCourses(),
        this.fetchSleepLogs(),
        this.fetchDailyHabits(this.selectedDate()),
        this.fetchEncouragements()
      ]);
      this.isConnectedToSupabase.set(true);
      this.lastSyncTime.set(new Date());
      this.syncError.set(null);
    } catch (err: any) {
      console.warn('Supabase fetch notice:', err?.message);
      this.syncError.set(err?.message || 'Sync warning');
    }
  }

  // --- MULTI-DEVICE REALTIME WEBSOCKET SUBSCRIPTION ---
  private setupRealtimeSync(): void {
    try {
      // 1. Broadcast channel for instantaneous timer ticks & companion cheers
      this.liveChannel = this.supabase.channel('accountability_master_channel', {
        config: { broadcast: { self: false } }
      });

      this.liveChannel
        .on('broadcast', { event: 'timer_state' }, (payload: any) => {
          if (payload && payload['payload']) {
            this.liveTimerState.set(payload['payload'] as LiveTimerState);
          }
        })
        .on('broadcast', { event: 'habit_update' }, (payload: any) => {
          if (payload && payload['payload']) {
            const h = payload['payload'] as DailyHabits;
            if (h.habit_date === this.selectedDate()) {
              this.dailyHabits.set(h);
            }
          }
        })
        .on('broadcast', { event: 'guest_encouragement' }, (payload: any) => {
          if (payload && payload['payload']) {
            const msg = payload['payload'] as EncouragementMessage;
            this.handleIncomingEncouragement(msg);
          }
        })
        .subscribe();

      // 2. Postgres change listeners for multi-device cross-browser database updates
      this.dbChannel = this.supabase.channel('db_sync_channel');

      this.dbChannel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_habits' }, (payload: any) => {
          const rec = payload.new;
          if (rec && rec.date === this.selectedDate()) {
            const mapped: DailyHabits = {
              id: rec.id,
              user_id: rec.user_id || this.MASTER_USER_ID,
              habit_date: rec.date,
              fajr: !!rec.fajr,
              dhuhr: !!rec.dhuhr,
              asr: !!rec.asr,
              maghrib: !!rec.maghrib,
              isha: !!rec.isha,
              morning_athkar: !!rec.morning_athkar,
              evening_athkar: !!rec.evening_athkar,
              workout_done: !!rec.gym,
              workout_type: 'Full Body',
              reading_pages: Number(rec.pages_read) || 0,
              reading_book: '',
              reading_target: 20
            };
            this.dailyHabits.set(mapped);
            this.saveLocal(`by_habits_${rec.date}`, mapped);
          } else {
            this.fetchDailyHabits(this.selectedDate());
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'study_sessions' }, () => {
          this.fetchStudySessions();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sleep_logs' }, () => {
          this.fetchSleepLogs();
        })
        .subscribe();

    } catch (e) {
      console.warn('Realtime channel setup notice:', e);
    }
  }

  // --- LIVE TIMER & FOCUS STATUS BROADCAST ---
  public broadcastTimerState(state: LiveTimerState): void {
    this.liveTimerState.set(state);

    if (this.liveChannel) {
      try {
        this.liveChannel.send({
          type: 'broadcast',
          event: 'timer_state',
          payload: state
        });
      } catch (err) {}
    }
  }

  // --- HABIT BROADCAST & PERSISTENCE ---
  public broadcastHabitState(habits: DailyHabits): void {
    if (this.liveChannel) {
      try {
        this.liveChannel.send({
          type: 'broadcast',
          event: 'habit_update',
          payload: habits
        });
      } catch (err) {}
    }
  }

  // --- ENCOURAGEMENTS ---
  public async sendEncouragement(
    sender_name: string,
    message: string,
    reaction_type: EncouragementMessage['reaction_type']
  ): Promise<void> {
    const newMsg: EncouragementMessage = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'enc_' + Date.now(),
      sender_name: sender_name.trim() || 'Accountability Partner',
      message: message.trim(),
      reaction_type,
      created_at: new Date().toISOString()
    };

    const updated = [newMsg, ...this.encouragements()];
    this.encouragements.set(updated);
    this.saveLocal('by_encouragements', updated);

    if (this.liveChannel) {
      try {
        this.liveChannel.send({
          type: 'broadcast',
          event: 'guest_encouragement',
          payload: newMsg
        });
      } catch (err) {}
    }
  }

  private handleIncomingEncouragement(msg: EncouragementMessage): void {
    const exists = this.encouragements().some(e => e.id === msg.id);
    if (!exists) {
      const updated = [msg, ...this.encouragements()];
      this.encouragements.set(updated);
      this.saveLocal('by_encouragements', updated);
    }

    this.activeEncouragementToast.set(msg);
    this.sound.playSuccessTone();

    setTimeout(() => {
      if (this.activeEncouragementToast()?.id === msg.id) {
        this.activeEncouragementToast.set(null);
      }
    }, 6000);
  }

  public dismissToast(): void {
    this.activeEncouragementToast.set(null);
  }

  // --- DAILY HABITS (DIRECT SELECT & PERSISTENCE) ---
  public async fetchDailyHabits(date: string): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('daily_habits')
        .select('*')
        .eq('user_id', this.MASTER_USER_ID)
        .eq('date', date)
        .maybeSingle();

      if (!error && data) {
        const mapped: DailyHabits = {
          id: data.id,
          user_id: data.user_id || this.MASTER_USER_ID,
          habit_date: data.date || date,
          fajr: !!data.fajr,
          dhuhr: !!data.dhuhr,
          asr: !!data.asr,
          maghrib: !!data.maghrib,
          isha: !!data.isha,
          morning_athkar: !!data.morning_athkar,
          evening_athkar: !!data.evening_athkar,
          workout_done: !!data.gym,
          workout_type: 'Full Body',
          reading_pages: Number(data.pages_read) || 0,
          reading_book: 'Current Book',
          reading_target: 20
        };

        this.dailyHabits.set(mapped);
        this.saveLocal(`by_habits_${date}`, mapped);
      } else if (!data) {
        // Only load local if Supabase had no entry
        const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(`by_habits_${date}`) : null;
        if (stored) {
          try {
            this.dailyHabits.set(JSON.parse(stored));
          } catch {}
        }
      }
    } catch (e) {
      console.warn('fetchDailyHabits fallback to cache:', e);
    }
  }

  public async updateDailyHabits(patch: Partial<DailyHabits>): Promise<void> {
    const current = this.dailyHabits();
    if (!current) return;

    const updated: DailyHabits = {
      ...current,
      ...patch,
      user_id: this.MASTER_USER_ID
    };

    // Immediate reactive signal update & local persistence
    this.dailyHabits.set(updated);
    this.saveLocal(`by_habits_${updated.habit_date}`, updated);
    this.broadcastHabitState(updated);

    // Explicit Supabase update/insert mapped to database columns
    const dbPayload = {
      user_id: this.MASTER_USER_ID,
      date: updated.habit_date,
      fajr: updated.fajr,
      dhuhr: updated.dhuhr,
      asr: updated.asr,
      maghrib: updated.maghrib,
      isha: updated.isha,
      morning_athkar: updated.morning_athkar,
      evening_athkar: updated.evening_athkar,
      gym: updated.workout_done,
      pages_read: updated.reading_pages
    };

    try {
      const { data: existing } = await this.supabase
        .from('daily_habits')
        .select('id')
        .eq('user_id', this.MASTER_USER_ID)
        .eq('date', updated.habit_date)
        .maybeSingle();

      if (existing && existing.id) {
        await this.supabase
          .from('daily_habits')
          .update(dbPayload)
          .eq('id', existing.id);
      } else {
        await this.supabase
          .from('daily_habits')
          .insert([dbPayload]);
      }
    } catch (err) {
      console.warn('Direct daily_habits sync notice:', err);
    }
  }

  // --- STUDY SESSIONS (DIRECT SELECT & PERSISTENCE) ---
  public async fetchStudySessions(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', this.MASTER_USER_ID)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped: StudySession[] = data.map((d: any) => ({
          id: d.id,
          user_id: d.user_id || this.MASTER_USER_ID,
          session_date: (d.created_at || '').substring(0, 10),
          duration_minutes: Number(d.duration_minutes) || 0,
          title: d.subject_or_course || d.title || 'Study Session',
          mode: (d.mode || 'stopwatch') as any,
          notes: d.notes || '',
          created_at: d.created_at
        }));
        this.studySessions.set(mapped);
        this.saveLocal('by_study_sessions', mapped);
      }
    } catch (e) {
      console.warn('fetchStudySessions notice:', e);
    }
  }

  public async addStudySession(session: Omit<StudySession, 'id' | 'created_at' | 'user_id'>): Promise<StudySession> {
    const newSession: StudySession = {
      ...session,
      user_id: this.MASTER_USER_ID,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 's_' + Date.now(),
      created_at: new Date().toISOString()
    };

    const updated = [newSession, ...this.studySessions()];
    this.studySessions.set(updated);
    this.saveLocal('by_study_sessions', updated);

    try {
      const dbPayload = {
        user_id: this.MASTER_USER_ID,
        duration_minutes: newSession.duration_minutes,
        subject_or_course: newSession.title || 'Study Session',
        created_at: newSession.created_at
      };

      const { data, error } = await this.supabase
        .from('study_sessions')
        .insert([dbPayload])
        .select()
        .single();

      if (!error && data) {
        const replaced = updated.map(s => s.id === newSession.id ? {
          ...s,
          id: data.id,
          created_at: data.created_at
        } : s);
        this.studySessions.set(replaced);
        this.saveLocal('by_study_sessions', replaced);
      }
    } catch (err) {
      console.warn('Study session persistence notice:', err);
    }
    return newSession;
  }

  public async deleteStudySession(id: string): Promise<void> {
    const updated = this.studySessions().filter(s => s.id !== id);
    this.studySessions.set(updated);
    this.saveLocal('by_study_sessions', updated);

    try {
      await this.supabase
        .from('study_sessions')
        .delete()
        .eq('id', id)
        .eq('user_id', this.MASTER_USER_ID);
    } catch (e) {
      console.warn('Deleted locally:', e);
    }
  }

  // --- SLEEP LOGS (DIRECT SELECT & PERSISTENCE) ---
  public async fetchSleepLogs(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('sleep_logs')
        .select('*')
        .eq('user_id', this.MASTER_USER_ID)
        .order('created_at', { ascending: false })
        .limit(60);

      if (!error && data) {
        const mapped: SleepLog[] = data.map((d: any) => {
          const parseTime = (iso: string) => {
            if (!iso) return '00:00';
            if (iso.length === 5 && iso.includes(':')) return iso;
            try {
              const dt = new Date(iso);
              return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
            } catch {
              return '00:00';
            }
          };

          const sTime = parseTime(d.sleep_time);
          const wTime = parseTime(d.wake_time);

          let total = 8;
          try {
            const [sh, sm] = sTime.split(':').map(Number);
            const [wh, wm] = wTime.split(':').map(Number);
            let start = sh * 60 + sm;
            let end = wh * 60 + wm;
            if (end <= start) end += 24 * 60;
            total = Math.round(((end - start) / 60) * 10) / 10;
          } catch {}

          return {
            id: d.id,
            user_id: d.user_id || this.MASTER_USER_ID,
            log_date: (d.created_at || '').substring(0, 10),
            sleep_time: sTime,
            wake_time: wTime,
            total_hours: total,
            quality_rating: Number(d.quality_rating) || 4,
            notes: '',
            created_at: d.created_at
          };
        });

        this.sleepLogs.set(mapped);
        this.saveLocal('by_sleep_logs', mapped);
      }
    } catch (e) {
      console.warn('fetchSleepLogs notice:', e);
    }
  }

  public async saveSleepLog(log: Omit<SleepLog, 'id' | 'created_at' | 'user_id'>): Promise<SleepLog> {
    const existingIndex = this.sleepLogs().findIndex(l => l.log_date === log.log_date);
    const newLog: SleepLog = {
      ...log,
      user_id: this.MASTER_USER_ID,
      id: existingIndex >= 0 ? this.sleepLogs()[existingIndex].id : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'sl_' + Date.now()),
      created_at: new Date().toISOString()
    };

    let updatedLogs: SleepLog[];
    if (existingIndex >= 0) {
      updatedLogs = this.sleepLogs().map((l, i) => (i === existingIndex ? newLog : l));
    } else {
      updatedLogs = [newLog, ...this.sleepLogs()];
    }

    this.sleepLogs.set(updatedLogs);
    this.saveLocal('by_sleep_logs', updatedLogs);

    try {
      const dateBase = log.log_date || this.getTodayDateString();
      const toIso = (timeStr: string) => {
        const parts = (timeStr || '00:00').split(':');
        const h = parts[0].padStart(2, '0');
        const m = (parts[1] || '00').padStart(2, '0');
        return new Date(`${dateBase}T${h}:${m}:00Z`).toISOString();
      };

      const dbPayload = {
        user_id: this.MASTER_USER_ID,
        sleep_time: toIso(newLog.sleep_time),
        wake_time: toIso(newLog.wake_time),
        quality_rating: newLog.quality_rating,
        created_at: dateBase
      };

      const { data: existing } = await this.supabase
        .from('sleep_logs')
        .select('id')
        .eq('user_id', this.MASTER_USER_ID)
        .eq('created_at', dateBase)
        .maybeSingle();

      if (existing && existing.id) {
        await this.supabase
          .from('sleep_logs')
          .update(dbPayload)
          .eq('id', existing.id);
      } else {
        await this.supabase
          .from('sleep_logs')
          .insert([dbPayload]);
      }
    } catch (err) {
      console.warn('Sleep log persistence notice:', err);
    }

    return newLog;
  }

  // --- COURSES ---
  public async fetchCourses(): Promise<void> {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('by_courses') : null;
    if (stored) {
      try { this.courses.set(JSON.parse(stored)); } catch {}
    }
  }

  public async addCourse(course: Omit<Course, 'id' | 'created_at' | 'user_id'>): Promise<void> {
    const newCourse: Course = {
      ...course,
      user_id: this.MASTER_USER_ID,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'c_' + Date.now(),
      created_at: new Date().toISOString()
    };
    const updated = [...this.courses(), newCourse];
    this.courses.set(updated);
    this.saveLocal('by_courses', updated);
  }

  public async updateCourseProgress(id: string, delta: number): Promise<void> {
    const target = this.courses().find(c => c.id === id);
    if (!target) return;

    const newCompleted = Math.max(0, Math.min(target.total_modules, target.completed_modules + delta));
    const updated = this.courses().map(c => (c.id === id ? { ...c, completed_modules: newCompleted } : c));
    this.courses.set(updated);
    this.saveLocal('by_courses', updated);
  }

  public async deleteCourse(id: string): Promise<void> {
    const updated = this.courses().filter(c => c.id !== id);
    this.courses.set(updated);
    this.saveLocal('by_courses', updated);
  }

  // --- ENCOURAGEMENTS ---
  public async fetchEncouragements(): Promise<void> {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('by_encouragements') : null;
    if (stored) {
      try { this.encouragements.set(JSON.parse(stored)); } catch {}
    }
  }
}
