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

const DATA_VERSION_KEY = 'by_data_version';
const CURRENT_VERSION = 'master_tenant_2026_10_16_v2';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  public readonly masterUserId = MASTER_USER_ID;

  private sound = inject(SoundService);
  private supabase: SupabaseClient;
  private liveChannel: RealtimeChannel | null = null;
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

  // Active Calendar Date (defaults to today: 2026-10-16)
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

  // Streak Calculation strictly computed from master historical data
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
    this.supabase = createClient(environment.supabaseUrl, environment.supabasePublishableKey, {
      auth: { persistSession: true },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });

    this.purgeLegacyMockData();
    this.setupNetworkListeners();
    this.initDefaultData();
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

  private purgeLegacyMockData(): void {
    if (typeof localStorage !== 'undefined') {
      const storedVersion = localStorage.getItem(DATA_VERSION_KEY);
      if (storedVersion !== CURRENT_VERSION) {
        localStorage.removeItem('by_study_sessions');
        localStorage.removeItem('by_courses');
        localStorage.removeItem('by_sleep_logs');
        localStorage.removeItem('by_encouragements');
        localStorage.removeItem('by_career_tasks');

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('by_habits_') || key.startsWith('by_career_'))) {
            localStorage.removeItem(key);
          }
        }
        localStorage.setItem(DATA_VERSION_KEY, CURRENT_VERSION);
      }
    }
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

  private initDefaultData(): void {
    if (typeof localStorage !== 'undefined') {
      const storedStudy = localStorage.getItem('by_study_sessions');
      if (storedStudy) this.studySessions.set(JSON.parse(storedStudy));

      const storedCourses = localStorage.getItem('by_courses');
      if (storedCourses) this.courses.set(JSON.parse(storedCourses));

      const storedSleep = localStorage.getItem('by_sleep_logs');
      if (storedSleep) this.sleepLogs.set(JSON.parse(storedSleep));

      const storedEncouragements = localStorage.getItem('by_encouragements');
      if (storedEncouragements) this.encouragements.set(JSON.parse(storedEncouragements));

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
        this.dailyHabits.set(JSON.parse(stored));
      } else {
        const freshHabits: DailyHabits = {
          id: 'h_' + date,
          user_id: this.masterUserId,
          habit_date: date,
          fajr: false,
          dhuhr: false,
          asr: false,
          maghrib: false,
          isha: false,
          morning_athkar: false,
          evening_athkar: false,
          workout_done: false,
          workout_type: '',
          reading_pages: 0,
          reading_book: '',
          reading_target: 20
        };
        this.dailyHabits.set(freshHabits);
      }
    }
  }

  private saveLocal(key: string, data: any): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(data));
    }
  }

  public async loadAllData(): Promise<void> {
    try {
      await Promise.allSettled([
        this.fetchStudySessions(),
        this.fetchCourses(),
        this.fetchSleepLogs(),
        this.fetchDailyHabits(this.selectedDate()),
        this.fetchLiveUserState(),
        this.fetchEncouragements()
      ]);
      this.isConnectedToSupabase.set(true);
      this.lastSyncTime.set(new Date());
      this.syncError.set(null);
    } catch (err: any) {
      console.warn('Supabase offline or initial fetch fallback:', err.message);
      this.syncError.set(err.message);
    }
  }

  // --- MULTI-DEVICE REALTIME WEBSOCKET SUBSCRIPTION ---
  private setupRealtimeSync(): void {
    try {
      this.liveChannel = this.supabase.channel('accountability_master_channel', {
        config: {
          broadcast: { self: false }
        }
      });

      // WebSocket broadcast listeners for instantaneous sub-second streaming
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
        // Postgres real-time database change listeners for cross-device synchronization
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'daily_habits',
          filter: `user_id=eq.${this.masterUserId}`
        }, (payload: any) => {
          if (payload.new && payload.new.habit_date === this.selectedDate()) {
            this.dailyHabits.set(payload.new as DailyHabits);
            this.saveLocal(`by_habits_${payload.new.habit_date}`, payload.new);
          } else {
            this.fetchDailyHabits(this.selectedDate());
          }
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'study_sessions',
          filter: `user_id=eq.${this.masterUserId}`
        }, () => {
          this.fetchStudySessions();
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'sleep_logs',
          filter: `user_id=eq.${this.masterUserId}`
        }, () => {
          this.fetchSleepLogs();
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'courses',
          filter: `user_id=eq.${this.masterUserId}`
        }, () => {
          this.fetchCourses();
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'live_user_state',
          filter: `user_id=eq.${this.masterUserId}`
        }, (payload: any) => {
          if (payload.new) {
            this.liveTimerState.set({
              isStudying: !!payload.new.is_studying,
              timerMode: payload.new.timer_mode || 'stopwatch',
              elapsedSeconds: payload.new.elapsed_seconds || 0,
              targetSeconds: 0,
              sessionTitle: payload.new.session_title || '',
              updatedAt: Date.now()
            });
          }
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'encouragements',
          filter: `user_id=eq.${this.masterUserId}`
        }, (payload: any) => {
          if (payload.new) {
            this.handleIncomingEncouragement(payload.new as EncouragementMessage);
          }
        })
        .subscribe();
    } catch (e) {
      console.warn('Realtime channel error or offline:', e);
    }
  }

  // --- LIVE TIMER & FOCUS STATUS BROADCAST & SUPABASE PERSISTENCE ---
  public async broadcastTimerState(state: LiveTimerState): Promise<void> {
    this.liveTimerState.set(state);

    // 1. Broadcast over WebSocket for sub-second live rendering
    if (this.liveChannel) {
      try {
        this.liveChannel.send({
          type: 'broadcast',
          event: 'timer_state',
          payload: state
        });
      } catch (err) {}
    }

    // 2. Persist to live_user_state table in Supabase so new devices instantly restore state
    try {
      await this.supabase.from('live_user_state').upsert([{
        id: this.masterUserId,
        user_id: this.masterUserId,
        is_studying: state.isStudying,
        timer_mode: state.timerMode,
        elapsed_seconds: state.elapsedSeconds,
        session_title: state.sessionTitle,
        updated_at: new Date().toISOString()
      }]);
    } catch (err) {}
  }

  public async fetchLiveUserState(): Promise<void> {
    const { data } = await this.supabase
      .from('live_user_state')
      .select('*')
      .eq('user_id', this.masterUserId)
      .maybeSingle();

    if (data) {
      this.liveTimerState.set({
        isStudying: !!data.is_studying,
        timerMode: data.timer_mode || 'stopwatch',
        elapsedSeconds: data.elapsed_seconds || 0,
        targetSeconds: 0,
        sessionTitle: data.session_title || '',
        updatedAt: Date.now()
      });
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

    // Broadcast across channel
    if (this.liveChannel) {
      try {
        this.liveChannel.send({
          type: 'broadcast',
          event: 'guest_encouragement',
          payload: newMsg
        });
      } catch (err) {}
    }

    // Persist to Supabase with master_user_id
    try {
      await this.supabase.from('encouragements').insert([{
        user_id: this.masterUserId,
        sender_name: newMsg.sender_name,
        message: newMsg.message,
        reaction_type: newMsg.reaction_type
      }]);
    } catch (e) {
      console.warn('Encouragement saved locally:', e);
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

  // --- DAILY HABITS (MASTER SINGLE-TENANT & UNIFIED RESTORATION) ---
  public async fetchDailyHabits(date: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('daily_habits')
      .select('*')
      .eq('user_id', this.masterUserId)
      .eq('habit_date', date)
      .maybeSingle();

    if (!error && data) {
      this.dailyHabits.set(data as DailyHabits);
      this.saveLocal(`by_habits_${date}`, data);
    } else if (!data) {
      // Unified initial state restoration: create fresh zeroed row in Supabase
      const fresh: DailyHabits = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'h_' + Date.now(),
        user_id: this.masterUserId,
        habit_date: date,
        fajr: false,
        dhuhr: false,
        asr: false,
        maghrib: false,
        isha: false,
        morning_athkar: false,
        evening_athkar: false,
        workout_done: false,
        workout_type: '',
        reading_pages: 0,
        reading_book: '',
        reading_target: 20
      };

      this.dailyHabits.set(fresh);
      this.saveLocal(`by_habits_${date}`, fresh);

      try {
        await this.supabase.from('daily_habits').insert([fresh]);
      } catch (err) {}
    }
  }

  public async updateDailyHabits(patch: Partial<DailyHabits>): Promise<void> {
    const current = this.dailyHabits();
    if (!current) return;

    const updated: DailyHabits = {
      ...current,
      ...patch,
      user_id: this.masterUserId
    };

    this.dailyHabits.set(updated);
    this.saveLocal(`by_habits_${updated.habit_date}`, updated);
    this.broadcastHabitState(updated);

    try {
      await this.supabase
        .from('daily_habits')
        .upsert([{
          user_id: this.masterUserId,
          habit_date: updated.habit_date,
          fajr: updated.fajr,
          dhuhr: updated.dhuhr,
          asr: updated.asr,
          maghrib: updated.maghrib,
          isha: updated.isha,
          morning_athkar: updated.morning_athkar,
          evening_athkar: updated.evening_athkar,
          workout_done: updated.workout_done,
          workout_type: updated.workout_type,
          reading_pages: updated.reading_pages,
          reading_book: updated.reading_book,
          reading_target: updated.reading_target
        }], { onConflict: 'user_id,habit_date' });
    } catch (e) {
      console.warn('Updated daily habits locally:', e);
    }
  }

  // --- STUDY SESSIONS (MASTER SINGLE-TENANT) ---
  public async fetchStudySessions(): Promise<void> {
    const { data, error } = await this.supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', this.masterUserId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      this.studySessions.set(data as StudySession[]);
      this.saveLocal('by_study_sessions', data);
    }
  }

  public async addStudySession(session: Omit<StudySession, 'id' | 'created_at' | 'user_id'>): Promise<StudySession> {
    const newSession: StudySession = {
      ...session,
      user_id: this.masterUserId,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 's_' + Date.now(),
      created_at: new Date().toISOString()
    };

    const updated = [newSession, ...this.studySessions()];
    this.studySessions.set(updated);
    this.saveLocal('by_study_sessions', updated);

    try {
      const { data, error } = await this.supabase
        .from('study_sessions')
        .insert([{
          user_id: this.masterUserId,
          duration_minutes: newSession.duration_minutes,
          title: newSession.title,
          mode: newSession.mode,
          notes: newSession.notes || '',
          session_date: newSession.session_date
        }])
        .select()
        .single();

      if (!error && data) {
        const replaced = updated.map(s => s.id === newSession.id ? (data as StudySession) : s);
        this.studySessions.set(replaced);
        this.saveLocal('by_study_sessions', replaced);
        return data as StudySession;
      }
    } catch (e) {
      console.warn('Saved study session locally:', e);
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
        .eq('user_id', this.masterUserId);
    } catch (e) {
      console.warn('Deleted locally:', e);
    }
  }

  // --- SLEEP LOGS (MASTER SINGLE-TENANT) ---
  public async fetchSleepLogs(): Promise<void> {
    const { data, error } = await this.supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', this.masterUserId)
      .order('log_date', { ascending: false })
      .limit(60);

    if (!error && data) {
      this.sleepLogs.set(data as SleepLog[]);
      this.saveLocal('by_sleep_logs', data);
    }
  }

  public async saveSleepLog(log: Omit<SleepLog, 'id' | 'created_at' | 'user_id'>): Promise<SleepLog> {
    const existingIndex = this.sleepLogs().findIndex(l => l.log_date === log.log_date);
    const newLog: SleepLog = {
      ...log,
      user_id: this.masterUserId,
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
      const { data, error } = await this.supabase
        .from('sleep_logs')
        .upsert([{
          user_id: this.masterUserId,
          log_date: newLog.log_date,
          sleep_time: newLog.sleep_time,
          wake_time: newLog.wake_time,
          total_hours: newLog.total_hours,
          quality_rating: newLog.quality_rating,
          notes: newLog.notes || ''
        }], { onConflict: 'user_id,log_date' })
        .select()
        .single();

      if (!error && data) {
        const replaced = updatedLogs.map(l => l.log_date === newLog.log_date ? (data as SleepLog) : l);
        this.sleepLogs.set(replaced);
        this.saveLocal('by_sleep_logs', replaced);
        return data as SleepLog;
      }
    } catch (e) {
      console.warn('Saved sleep log locally:', e);
    }

    return newLog;
  }

  // --- COURSES (MASTER SINGLE-TENANT) ---
  public async fetchCourses(): Promise<void> {
    const { data, error } = await this.supabase
      .from('courses')
      .select('*')
      .eq('user_id', this.masterUserId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      this.courses.set(data as Course[]);
      this.saveLocal('by_courses', data);
    }
  }

  public async addCourse(course: Omit<Course, 'id' | 'created_at' | 'user_id'>): Promise<void> {
    const newCourse: Course = {
      ...course,
      user_id: this.masterUserId,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'c_' + Date.now(),
      created_at: new Date().toISOString()
    };
    const updated = [...this.courses(), newCourse];
    this.courses.set(updated);
    this.saveLocal('by_courses', updated);

    try {
      const { data, error } = await this.supabase
        .from('courses')
        .insert([{
          ...course,
          user_id: this.masterUserId
        }])
        .select()
        .single();

      if (!error && data) {
        const replaced = updated.map(c => c.id === newCourse.id ? (data as Course) : c);
        this.courses.set(replaced);
        this.saveLocal('by_courses', replaced);
      }
    } catch (e) {
      console.warn('Saved course locally:', e);
    }
  }

  public async updateCourseProgress(id: string, delta: number): Promise<void> {
    const target = this.courses().find(c => c.id === id);
    if (!target) return;

    const newCompleted = Math.max(0, Math.min(target.total_modules, target.completed_modules + delta));
    const updated = this.courses().map(c => (c.id === id ? { ...c, completed_modules: newCompleted } : c));
    this.courses.set(updated);
    this.saveLocal('by_courses', updated);

    try {
      await this.supabase
        .from('courses')
        .update({ completed_modules: newCompleted })
        .eq('id', id)
        .eq('user_id', this.masterUserId);
    } catch (e) {
      console.warn('Updated course progress locally:', e);
    }
  }

  public async deleteCourse(id: string): Promise<void> {
    const updated = this.courses().filter(c => c.id !== id);
    this.courses.set(updated);
    this.saveLocal('by_courses', updated);

    try {
      await this.supabase
        .from('courses')
        .delete()
        .eq('id', id)
        .eq('user_id', this.masterUserId);
    } catch (e) {
      console.warn('Deleted course locally:', e);
    }
  }

  // --- ENCOURAGEMENTS ---
  public async fetchEncouragements(): Promise<void> {
    const { data, error } = await this.supabase
      .from('encouragements')
      .select('*')
      .eq('user_id', this.masterUserId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      this.encouragements.set(data as EncouragementMessage[]);
      this.saveLocal('by_encouragements', data);
    }
  }
}
