import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';
import { SoundService } from '../../core/services/sound.service';
import { AuthService } from '../../core/services/auth.service';
import { EncouragementMessage } from '../../core/models/tracker.models';

@Component({
  selector: 'app-live-companion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950">

      <!-- Live Broadcast Header -->
      <header class="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 via-amber-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-rose-500/20 border border-rose-400/30">
                <span class="w-3 h-3 rounded-full bg-slate-950 animate-ping"></span>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h1 class="font-black text-base sm:text-lg tracking-wider text-white">LIVE COMPANION FEED</h1>
                  <span class="px-2 py-0.5 text-[10px] font-bold tracking-widest bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                    READ-ONLY
                  </span>
                </div>
                <p class="text-[10px] text-slate-400 font-mono">ACCOUNTABILITY RADAR • WEBSOCKET REALTIME</p>
              </div>
            </div>

            <!-- Header Action Controls -->
            <div class="flex items-center gap-2 sm:gap-3">
              <!-- Live State Indicator -->
              <div class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
                <span class="w-2 h-2 rounded-full" [ngClass]="supabase.liveTimerState().isStudying ? 'bg-emerald-400 animate-ping' : 'bg-cyan-400'"></span>
                <span class="text-slate-300">
                  {{ supabase.liveTimerState().isStudying ? 'User Actively Studying' : 'User Idle / In Routine' }}
                </span>
              </div>

              <!-- Unlock Master Access Modal Trigger -->
              <button
                (click)="togglePinModal()"
                title="Master User Unlock PIN"
                class="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:text-white font-semibold transition-all flex items-center gap-1.5 min-h-[38px]">
                <svg class="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                <span class="hidden sm:inline">Master Unlock</span>
                <span class="sm:hidden">Unlock</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      <!-- Sub Navigation / History Filter Tabs & Date Selector -->
      <nav class="bg-slate-950 border-b border-slate-800/80 sticky top-16 z-30 backdrop-blur-md">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 gap-2">
            <div class="flex space-x-2 text-xs font-semibold">
              <button
                (click)="activeView.set('live')"
                [class]="activeView() === 'live' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' : 'text-slate-400 hover:text-slate-200'"
                class="px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 min-h-[36px]">
                <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                Real-Time Live Radar
              </button>

              <button
                (click)="activeView.set('history')"
                [class]="activeView() === 'history' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'"
                class="px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 min-h-[36px]">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                Performance History & Logs
              </button>
            </div>

            <!-- Date Selector & Streak Indicator for Companion -->
            <div class="flex items-center justify-between sm:justify-end gap-2">
              <div class="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl text-xs">
                <button (click)="supabase.navigateDate(-1)" class="text-slate-400 hover:text-white px-1.5 py-1 min-h-[32px]">◀</button>
                <input
                  type="date"
                  [ngModel]="supabase.selectedDate()"
                  (ngModelChange)="supabase.setSelectedDate($event)"
                  class="bg-transparent text-white font-mono text-[11px] focus:outline-none cursor-pointer"
                />
                <button (click)="supabase.navigateDate(1)" class="text-slate-400 hover:text-white px-1.5 py-1 min-h-[32px]">▶</button>
                @if (supabase.isViewingToday()) {
                  <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-400 font-mono">TODAY</span>
                } @else {
                  <button (click)="supabase.jumpToToday()" class="text-[10px] text-cyan-400 underline ml-1">Today</button>
                }
              </div>

              <!-- Streak Fire Counter in Companion View -->
              <div class="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1 rounded-xl text-xs font-mono">
                <span class="text-amber-400 font-bold flex items-center gap-1">
                  🔥 {{ supabase.streakData().currentStreakDays }}d
                </span>
                <span class="text-slate-600">|</span>
                <span class="text-emerald-400 font-semibold">{{ supabase.streakData().consistencyPercentage }}%</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <!-- Main Content Area -->
      <main class="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-8">

        <!-- VIEW 1: REAL-TIME LIVE RADAR -->
        @if (activeView() === 'live') {
          
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

            <!-- STREAMING LIVE TIMER (7 cols) -->
            <div class="lg:col-span-7 p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col justify-between">
              <div class="absolute -top-12 -right-12 w-36 h-36 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

              <div>
                <div class="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-6">
                  <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full" [ngClass]="supabase.liveTimerState().isStudying ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'"></span>
                    <span class="text-xs uppercase font-bold tracking-widest text-white">Live Stopwatch / Pomodoro Stream</span>
                  </div>
                  <span class="text-xs font-mono text-cyan-400 uppercase bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                    {{ supabase.liveTimerState().timerMode }}
                  </span>
                </div>

                <!-- Active Focus Subject Banner -->
                <div class="mb-6 p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span class="text-[10px] uppercase font-bold text-slate-500 block">User Is Currently Tackling:</span>
                    <span class="text-sm font-bold text-white tracking-wide">
                      {{ supabase.liveTimerState().sessionTitle || 'Deep Cognitive Focus Block' }}
                    </span>
                  </div>
                  <span class="text-xs font-mono font-semibold" [ngClass]="supabase.liveTimerState().isStudying ? 'text-emerald-400' : 'text-slate-500'">
                    {{ supabase.liveTimerState().isStudying ? '● LIVE RECORDING' : '○ TIMER IDLE' }}
                  </span>
                </div>

                <!-- Big Streaming Timer Display -->
                <div class="text-center py-8 bg-slate-950 rounded-2xl border border-slate-800/80 mb-6 relative">
                  <div class="font-mono text-5xl sm:text-7xl font-black tracking-tight text-white select-none drop-shadow-[0_0_30px_rgba(6,182,212,0.25)]">
                    {{ formatLiveTimer() }}
                  </div>
                  <div class="text-xs text-slate-500 font-mono mt-2 uppercase tracking-widest">
                    {{ supabase.liveTimerState().isStudying ? 'Seconds Ticking Live via WebSockets' : 'Awaiting Next Session Start' }}
                  </div>
                </div>
              </div>

              <!-- Today's Total Hours Accumulated (Live) -->
              <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span class="text-xs text-slate-400 block font-medium">Accumulated For {{ supabase.selectedDate() }}:</span>
                  <span class="text-xl font-black text-cyan-400 font-mono">{{ supabase.todayStudyHours() }} <span class="text-xs text-slate-400">/ 12.0 hrs</span></span>
                </div>
                <!-- 8-12h Mini Progress Bar -->
                <div class="w-full sm:w-1/2">
                  <div class="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span>Progress to 12h</span>
                    <span>{{ ((supabase.todayStudyHours() / 12) * 100) | number:'1.0-0' }}%</span>
                  </div>
                  <div class="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div class="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500" [style.width.%]="(supabase.todayStudyHours() / 12) * 100"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- INTERACTIVE ENCOURAGEMENT & COMMENTS SYSTEM (5 cols) -->
            <div class="lg:col-span-5 p-5 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                  <div class="flex items-center gap-2">
                    <span class="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/></svg>
                    </span>
                    <h3 class="text-sm font-bold text-white uppercase tracking-wider">Accountability Cheering</h3>
                  </div>
                  <span class="text-[10px] text-amber-400 font-mono">Live Push Toast</span>
                </div>

                <p class="text-xs text-slate-400 mb-4">
                  Send instant reactions and notes directly to the user's active screen & Zen Focus mode:
                </p>

                <!-- Quick Action Reaction Buttons -->
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                  <button
                    (click)="sendQuickReaction('Keep Going! 🔥', 'fire')"
                    class="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 hover:bg-amber-950/20 active:scale-95 text-xs font-semibold text-slate-300 hover:text-white transition-all text-center min-h-[44px]">
                    Keep Going! 🔥
                  </button>
                  <button
                    (click)="sendQuickReaction('So Proud! 👏', 'applause')"
                    class="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-950/20 active:scale-95 text-xs font-semibold text-slate-300 hover:text-white transition-all text-center min-h-[44px]">
                    So Proud! 👏
                  </button>
                  <button
                    (click)="sendQuickReaction('Stay Strong 💪', 'muscle')"
                    class="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 hover:bg-cyan-950/20 active:scale-95 text-xs font-semibold text-slate-300 hover:text-white transition-all text-center min-h-[44px]">
                    Stay Strong 💪
                  </button>
                  <button
                    (click)="sendQuickReaction('Locked In! ⚡', 'lightning')"
                    class="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-950/20 active:scale-95 text-xs font-semibold text-slate-300 hover:text-white transition-all text-center min-h-[44px]">
                    Locked In! ⚡
                  </button>
                  <button
                    (click)="sendQuickReaction('Take a Breath ☕', 'coffee')"
                    class="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-violet-500/50 hover:bg-violet-950/20 active:scale-95 text-xs font-semibold text-slate-300 hover:text-white transition-all text-center col-span-2 sm:col-span-2 min-h-[44px]">
                    Take a Breath ☕
                  </button>
                </div>

                <!-- Custom Note Form -->
                <div class="space-y-2 mb-4">
                  <div class="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      [(ngModel)]="guestName"
                      placeholder="Your Name / Handle"
                      class="w-full sm:w-1/3 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                    <input
                      type="text"
                      [(ngModel)]="customMessage"
                      placeholder="Write encouragement note..."
                      (keyup.enter)="sendCustomComment()"
                      class="w-full sm:w-2/3 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    (click)="sendCustomComment()"
                    [disabled]="!customMessage.trim()"
                    class="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs tracking-wider transition-all shadow-md shadow-amber-500/20 min-h-[44px]">
                    Send Live Encouragement Note
                  </button>
                </div>
              </div>

              <!-- Recent Feed of Encouragement Messages -->
              <div class="pt-3 border-t border-slate-800/80">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Live Message Stream</span>
                <div class="space-y-2 max-h-36 overflow-y-auto pr-1">
                  @for (note of supabase.encouragements().slice(0, 5); track note.id) {
                    <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start gap-2.5 text-xs">
                      <span class="text-base">
                        {{ note.reaction_type === 'fire' ? '🔥' : (note.reaction_type === 'applause' ? '👏' : (note.reaction_type === 'muscle' ? '💪' : '⚡')) }}
                      </span>
                      <div class="flex-1 truncate">
                        <div class="flex items-center justify-between text-[10px] text-slate-400">
                          <span class="font-bold text-slate-300">{{ note.sender_name }}</span>
                          <span class="font-mono">{{ note.created_at | date:'shortTime' }}</span>
                        </div>
                        <p class="text-slate-200 mt-0.5 truncate">{{ note.message }}</p>
                      </div>
                    </div>
                  } @empty {
                    <div class="text-xs text-slate-600 italic text-center py-2">No messages sent yet. Be the first to cheer!</div>
                  }
                </div>
              </div>
            </div>

          </div>

          <!-- Bottom Grid: Live Habit Radar & Sleep Status -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

            <!-- LIVE HABIT RADAR (Read-Only) -->
            <div class="p-5 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live Habit Radar (Read-Only)
                </h3>
                <span class="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  {{ supabase.prayersCompletedCount() }}/5 Prayers Done
                </span>
              </div>

              <!-- Prayer Checklist Stream (Read-Only) -->
              <div class="grid grid-cols-5 gap-2">
                <div class="p-2.5 rounded-xl border text-center transition-all select-none"
                  [ngClass]="supabase.dailyHabits()?.fajr ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-600'">
                  <div class="text-[10px] uppercase font-bold font-mono">Fajr</div>
                  <div class="text-sm font-bold mt-1">{{ supabase.dailyHabits()?.fajr ? '✓' : '○' }}</div>
                </div>

                <div class="p-2.5 rounded-xl border text-center transition-all select-none"
                  [ngClass]="supabase.dailyHabits()?.dhuhr ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-600'">
                  <div class="text-[10px] uppercase font-bold font-mono">Dhuhr</div>
                  <div class="text-sm font-bold mt-1">{{ supabase.dailyHabits()?.dhuhr ? '✓' : '○' }}</div>
                </div>

                <div class="p-2.5 rounded-xl border text-center transition-all select-none"
                  [ngClass]="supabase.dailyHabits()?.asr ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-600'">
                  <div class="text-[10px] uppercase font-bold font-mono">Asr</div>
                  <div class="text-sm font-bold mt-1">{{ supabase.dailyHabits()?.asr ? '✓' : '○' }}</div>
                </div>

                <div class="p-2.5 rounded-xl border text-center transition-all select-none"
                  [ngClass]="supabase.dailyHabits()?.maghrib ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-600'">
                  <div class="text-[10px] uppercase font-bold font-mono">Maghrib</div>
                  <div class="text-sm font-bold mt-1">{{ supabase.dailyHabits()?.maghrib ? '✓' : '○' }}</div>
                </div>

                <div class="p-2.5 rounded-xl border text-center transition-all select-none"
                  [ngClass]="supabase.dailyHabits()?.isha ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-600'">
                  <div class="text-[10px] uppercase font-bold font-mono">Isha</div>
                  <div class="text-sm font-bold mt-1">{{ supabase.dailyHabits()?.isha ? '✓' : '○' }}</div>
                </div>
              </div>

              <!-- Gym & Reading Status (Read-Only) -->
              <div class="grid grid-cols-2 gap-3 pt-2">
                <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between select-none">
                  <div>
                    <span class="text-[10px] uppercase font-bold text-slate-500 block">Gym / Workout</span>
                    <span class="text-xs font-bold" [ngClass]="supabase.dailyHabits()?.workout_done ? 'text-emerald-400' : 'text-rose-400'">
                      {{ supabase.dailyHabits()?.workout_done ? '✓ Completed' : 'Pending / Missed' }}
                    </span>
                  </div>
                  <span class="text-lg">{{ supabase.dailyHabits()?.workout_done ? '🏋️' : '⏳' }}</span>
                </div>

                <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between select-none">
                  <div>
                    <span class="text-[10px] uppercase font-bold text-slate-500 block">Book Reading</span>
                    <span class="text-xs font-bold text-cyan-400 font-mono">
                      {{ supabase.dailyHabits()?.reading_pages || 0 }} pages read
                    </span>
                  </div>
                  <span class="text-lg">📖</span>
                </div>
              </div>
            </div>

            <!-- LIVE SLEEP & ENERGY RADAR (Read-Only) -->
            <div class="p-5 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
                  Circadian Recovery Status
                </h3>
                <span class="text-xs text-amber-400 font-mono">
                  {{ supabase.todaySleepLog() ? '★'.repeat(supabase.todaySleepLog()?.quality_rating || 0) : 'Awaiting Sleep Log' }}
                </span>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div class="text-[10px] uppercase font-bold text-slate-500">Sleep Duration</div>
                  <div class="text-2xl font-black text-indigo-400 font-mono mt-1">
                    {{ supabase.todaySleepLog()?.total_hours || 0 }}h
                  </div>
                  <div class="text-[10px] text-slate-400 mt-1 font-mono truncate">
                    @if (supabase.todaySleepLog()) {
                      {{ supabase.todaySleepLog()?.sleep_time }} → {{ supabase.todaySleepLog()?.wake_time }}
                    } @else {
                      No sleep logged
                    }
                  </div>
                </div>

                <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div class="text-[10px] uppercase font-bold text-slate-500">Recovery Status</div>
                    <div class="text-xs font-bold text-emerald-400 mt-1">
                      {{ supabase.todaySleepLog() ? 'Circadian Recovery Recorded' : 'Pending Sleep Entry' }}
                    </div>
                  </div>
                  <span class="text-[10px] text-slate-500">Master tenant synchronization active</span>
                </div>
              </div>

              <!-- Enrolled Course Progress Live View -->
              <div class="pt-2">
                <span class="text-[10px] uppercase font-bold text-slate-500 block mb-2">Active Learning Courses</span>
                <div class="space-y-2">
                  @for (c of supabase.courses().slice(0, 3); track c.id) {
                    <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                      <span class="font-bold text-white truncate max-w-xs">{{ c.title }}</span>
                      <span class="font-mono text-cyan-400">{{ c.completed_modules }}/{{ c.total_modules }} ({{ ((c.completed_modules / c.total_modules) * 100) | number:'1.0-0' }}%)</span>
                    </div>
                  } @empty {
                    <div class="text-xs text-slate-600 italic py-1">No active courses yet</div>
                  }
                </div>
              </div>
            </div>

          </div>

        } @else {
          
          <!-- VIEW 2: HISTORICAL LOG ACCESS -->
          <div class="space-y-6">
            <div class="p-5 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
              <h3 class="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Study Sessions Historical Log
              </h3>

              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs font-mono">
                  <thead class="text-slate-500 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th class="py-2.5 px-3">Date</th>
                      <th class="py-2.5 px-3">Subject / Focus</th>
                      <th class="py-2.5 px-3">Duration</th>
                      <th class="py-2.5 px-3">Mode</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-800/60">
                    @for (s of supabase.studySessions(); track s.id) {
                      <tr class="hover:bg-slate-800/30 transition-colors">
                        <td class="py-2.5 px-3 text-slate-400">{{ s.session_date }}</td>
                        <td class="py-2.5 px-3 text-white font-semibold font-sans">{{ s.title }}</td>
                        <td class="py-2.5 px-3 text-cyan-400 font-bold">{{ s.duration_minutes }} mins</td>
                        <td class="py-2.5 px-3 uppercase text-slate-500 text-[10px]">{{ s.mode }}</td>
                      </tr>
                    } @empty {
                      <tr><td colspan="4" class="text-center py-6 text-slate-600">No sessions recorded yet</td></tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Historical Sleep Logs -->
            <div class="p-5 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
              <h3 class="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
                Circadian Sleep Consistency Record
              </h3>

              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs font-mono">
                  <thead class="text-slate-500 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th class="py-2.5 px-3">Date</th>
                      <th class="py-2.5 px-3">Bedtime → Wake</th>
                      <th class="py-2.5 px-3">Total Rest</th>
                      <th class="py-2.5 px-3">Quality</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-800/60">
                    @for (l of supabase.sleepLogs(); track l.id) {
                      <tr class="hover:bg-slate-800/30 transition-colors">
                        <td class="py-2.5 px-3 text-slate-400">{{ l.log_date }}</td>
                        <td class="py-2.5 px-3 text-slate-300">{{ l.sleep_time }} → {{ l.wake_time }}</td>
                        <td class="py-2.5 px-3 text-indigo-400 font-bold">{{ l.total_hours }}h</td>
                        <td class="py-2.5 px-3 text-amber-400">{{ '★'.repeat(l.quality_rating) }}</td>
                      </tr>
                    } @empty {
                      <tr><td colspan="4" class="text-center py-6 text-slate-600">No sleep records yet</td></tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        }

      </main>

      <!-- Master PIN Unlock Modal -->
      @if (showPinModal()) {
        <div class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div class="w-full max-w-sm p-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl space-y-4">
            <div class="flex items-center justify-between pb-2 border-b border-slate-800">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-amber-400"></span>
                <h3 class="text-sm font-bold text-white uppercase tracking-wider">Master Access Unlock</h3>
              </div>
              <button (click)="togglePinModal()" class="text-slate-500 hover:text-white text-xs">✕</button>
            </div>

            <p class="text-xs text-slate-400">
              Enter master unlock passcode to enable full editing controls on this device:
            </p>

            <div class="space-y-2">
              <input
                type="password"
                [(ngModel)]="enteredPin"
                (ngModelChange)="pinError.set(false)"
                placeholder="Enter Passcode"
                (keyup.enter)="verifyPin()"
                class="w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-center text-lg tracking-widest text-white focus:outline-none transition-colors"
                [ngClass]="pinError() ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-amber-500'"
              />
              @if (pinError()) {
                <div class="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold text-center flex items-center justify-center gap-1.5 animate-pulse">
                  <svg class="w-4 h-4 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  <span>Incorrect Unlock Passcode</span>
                </div>
              }
            </div>

            <div class="flex gap-2 pt-2">
              <button
                (click)="togglePinModal()"
                class="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold">
                Cancel
              </button>
              <button
                (click)="verifyPin()"
                class="w-1/2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20">
                Unlock
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Footer -->
      <footer class="bg-slate-950 border-t border-slate-800/80 py-4 text-xs text-slate-500 mt-12 text-center">
        <span>Be Yourself Accountability Companion • Read-Only Live Stream • Supabase WebSockets Enabled</span>
      </footer>

    </div>
  `
})
export class LiveCompanionComponent {
  public supabase = inject(SupabaseService);
  private sound = inject(SoundService);
  private auth = inject(AuthService);
  private router = inject(Router);

  public activeView = signal<'live' | 'history'>('live');
  public guestName = 'Accountability Partner';
  public customMessage = '';

  public showPinModal = signal<boolean>(false);
  public enteredPin = '';
  public pinError = signal<boolean>(false);

  public formatLiveTimer(): string {
    const state = this.supabase.liveTimerState();
    const totalSecs = state.timerMode === 'stopwatch' ? state.elapsedSeconds : state.targetSeconds;
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  public async sendQuickReaction(message: string, reactionType: EncouragementMessage['reaction_type']): Promise<void> {
    this.sound.playClickTone();
    await this.supabase.sendEncouragement(this.guestName, message, reactionType);
  }

  public async sendCustomComment(): Promise<void> {
    if (!this.customMessage.trim()) return;
    this.sound.playClickTone();
    await this.supabase.sendEncouragement(this.guestName, this.customMessage.trim(), 'text');
    this.customMessage = '';
  }

  public togglePinModal(): void {
    this.showPinModal.update(v => !v);
    this.enteredPin = '';
    this.pinError.set(false);
  }

  public verifyPin(): void {
    if (this.auth.unlockMaster(this.enteredPin.trim())) {
      this.sound.playSuccessTone();
      this.showPinModal.set(false);
      this.router.navigate(['/']);
    } else {
      this.sound.playErrorTone();
      this.pinError.set(true);
    }
  }
}
