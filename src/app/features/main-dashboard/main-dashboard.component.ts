import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StudyTrackerComponent } from '../study-tracker/study-tracker.component';
import { SleepTrackerComponent } from '../sleep-tracker/sleep-tracker.component';
import { DisciplineChecklistComponent } from '../discipline-checklist/discipline-checklist.component';
import { SupabaseService } from '../../core/services/supabase.service';
import { PwaService } from '../../core/services/pwa.service';
import { NotificationService } from '../../core/services/notification.service';
import { SoundService } from '../../core/services/sound.service';

export type MainTab = 'overview' | 'study' | 'sleep' | 'discipline';

@Component({
  selector: 'app-main-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    StudyTrackerComponent,
    SleepTrackerComponent,
    DisciplineChecklistComponent
  ],
  template: `
    <div class="space-y-6">

      <!-- Navigation Tab Bar & Live Link Pill -->
      <nav class="bg-slate-950 border-b border-slate-800/80 sticky top-16 z-30 backdrop-blur-md">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between py-2.5">
            <div class="flex space-x-1 sm:space-x-3 overflow-x-auto no-scrollbar text-xs font-semibold">
              <button
                (click)="switchTab('overview')"
                [class]="activeTab() === 'overview' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-slate-200'"
                class="px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
                All Overview
              </button>

              <button
                (click)="switchTab('study')"
                [class]="activeTab() === 'study' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'"
                class="px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                1. Study & Pomodoro
              </button>

              <button
                (click)="switchTab('sleep')"
                [class]="activeTab() === 'sleep' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200'"
                class="px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                2. Sleep & Energy
              </button>

              <button
                (click)="switchTab('discipline')"
                [class]="activeTab() === 'discipline' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'"
                class="px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                3. Prayers & Habits
              </button>
            </div>

            <!-- Accountability Partner Live Link -->
            <div class="flex items-center gap-2">
              <a
                routerLink="/live-stream"
                class="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold transition-all flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>
                <span class="hidden sm:inline">Partner Live View</span>
                <span class="sm:hidden">Live</span>
              </a>

              <!-- Copy Live Stream URL Button -->
              <button
                (click)="copyLiveLink()"
                title="Copy Live Stream Link for Partner"
                class="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <!-- Calendar / Date-Picker Navigation Bar -->
      <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div class="flex items-center gap-2">
            <!-- Prev Day -->
            <button
              (click)="supabase.navigateDate(-1)"
              title="Previous Day"
              class="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-xs">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
              <span class="hidden sm:inline">Prev Day</span>
            </button>

            <!-- Native Date Picker Input & Display -->
            <div class="flex items-center gap-2 bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800">
              <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <input
                type="date"
                [ngModel]="supabase.selectedDate()"
                (ngModelChange)="supabase.setSelectedDate($event)"
                class="bg-transparent text-white font-mono text-xs font-bold focus:outline-none cursor-pointer"
              />
              @if (supabase.isViewingToday()) {
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                  TODAY
                </span>
              }
            </div>

            <!-- Next Day -->
            <button
              (click)="supabase.navigateDate(1)"
              title="Next Day"
              class="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-xs">
              <span class="hidden sm:inline">Next Day</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>

          <!-- Jump to Today Button -->
          <div class="flex items-center gap-2">
            @if (!supabase.isViewingToday()) {
              <button
                (click)="supabase.jumpToToday()"
                class="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-xs font-bold tracking-wide transition-all flex items-center gap-1.5 animate-pulse">
                <span>↩ Return to Today ({{ supabase.todayDateString() }})</span>
              </button>
            }
            <span class="text-[11px] text-slate-500 font-mono hidden md:inline">
              Data strictly locked to selected calendar day
            </span>
          </div>
        </div>
      </section>

      <!-- Streak & Real-Time KPI Banner -->
      <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <!-- Streak Engine Highlight (Calculated dynamically) -->
        <div class="mb-4 p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
          <div class="flex items-center gap-3">
            <span class="text-3xl">🔥</span>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-base font-black text-white font-mono">
                  {{ supabase.streakData().currentStreakDays }} DAY DISCIPLINE STREAK
                </h3>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold" [ngClass]="supabase.streakData().currentStreakDays > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'">
                  {{ supabase.streakData().currentStreakDays > 0 ? 'ACTIVE MOMENTUM' : 'CLEAN SLATE • READY TO BUILD' }}
                </span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">Consecutive days achieving 8-12h Study Intensity and all 5 Prayers fulfilled.</p>
            </div>
          </div>

          <!-- Streak Metrics -->
          <div class="flex items-center gap-4 text-xs font-mono">
            <div class="text-right">
              <span class="text-[10px] text-slate-500 uppercase block">Study Goal</span>
              <span class="font-bold" [ngClass]="supabase.streakData().todayStudyMet ? 'text-emerald-400' : 'text-amber-400'">
                {{ supabase.streakData().todayStudyMet ? '✓ Achieved' : 'In Progress' }}
              </span>
            </div>
            <div class="h-8 w-[1px] bg-slate-800"></div>
            <div class="text-right">
              <span class="text-[10px] text-slate-500 uppercase block">Prayers Goal</span>
              <span class="font-bold" [ngClass]="supabase.streakData().todayPrayersMet ? 'text-emerald-400' : 'text-slate-400'">
                {{ supabase.prayersCompletedCount() }}/5 Done
              </span>
            </div>
          </div>
        </div>

        <!-- 3 KPI Cards for Selected Date (Study, Sleep, Prayers) -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          <!-- KPI 1: Study Progress -->
          <div 
            (click)="switchTab('study')"
            class="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-all shadow-md group">
            <div class="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span class="uppercase tracking-wider font-semibold">Study Engine</span>
              <span class="text-cyan-400 font-mono text-[10px]">Goal: 8-12h</span>
            </div>
            <div class="flex items-baseline justify-between">
              <span class="text-3xl font-black text-white font-mono">{{ supabase.todayStudyHours() }}h</span>
              <span class="text-xs font-semibold" [ngClass]="supabase.todayStudyHours() >= 8 ? 'text-emerald-400' : 'text-slate-400'">
                {{ supabase.todayStudyHours() >= 8 ? '✓ Standard Met' : 'In Progress' }}
              </span>
            </div>
            <div class="w-full h-1.5 bg-slate-800 rounded-full mt-2.5 overflow-hidden">
              <div class="h-full bg-cyan-400 transition-all duration-500" [style.width.%]="(supabase.todayStudyHours() / 12) * 100"></div>
            </div>
          </div>

          <!-- KPI 2: Sleep Hours -->
          <div 
            (click)="switchTab('sleep')"
            class="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 cursor-pointer transition-all shadow-md group">
            <div class="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span class="uppercase tracking-wider font-semibold">Sleep & Energy</span>
              <span class="text-indigo-400 font-mono text-[10px]">Optimal: 7.5h</span>
            </div>
            <div class="flex items-baseline justify-between">
              <span class="text-3xl font-black text-indigo-400 font-mono">
                {{ supabase.todaySleepLog()?.total_hours || 0 }}h
              </span>
              <span class="text-xs text-amber-400">
                {{ supabase.todaySleepLog() ? '★'.repeat(supabase.todaySleepLog()?.quality_rating || 0) : 'Not Logged' }}
              </span>
            </div>
            <div class="text-[11px] text-slate-400 mt-2 truncate font-mono">
              @if (supabase.todaySleepLog()) {
                {{ supabase.todaySleepLog()?.sleep_time }} → {{ supabase.todaySleepLog()?.wake_time }}
              } @else {
                Awaiting sleep log for {{ supabase.selectedDate() }}
              }
            </div>
          </div>

          <!-- KPI 3: Prayers & Discipline -->
          <div 
            (click)="switchTab('discipline')"
            class="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition-all shadow-md group">
            <div class="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span class="uppercase tracking-wider font-semibold">Salawat & Intellect</span>
              <span class="text-emerald-400 font-mono text-[10px]">5 Daily Prayers</span>
            </div>
            <div class="flex items-baseline justify-between">
              <span class="text-3xl font-black text-emerald-400 font-mono">
                {{ supabase.prayersCompletedCount() }}/5
              </span>
              <span class="text-xs font-semibold" [ngClass]="supabase.dailyHabits()?.workout_done ? 'text-emerald-400' : 'text-slate-500'">
                {{ supabase.dailyHabits()?.workout_done ? 'Gym ✓' : 'Gym Pending' }}
              </span>
            </div>
            <div class="text-[11px] text-slate-400 mt-2 truncate">
              Reading: {{ supabase.dailyHabits()?.reading_pages || 0 }} pages read
            </div>
          </div>

        </div>
      </section>

      <!-- Main Workspace Views -->
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 pb-12">

        <!-- OVERVIEW TAB -->
        @if (activeTab() === 'overview') {
          <div class="space-y-12">
            <section id="study-section">
              <app-study-tracker></app-study-tracker>
            </section>

            <section id="sleep-section">
              <app-sleep-tracker></app-sleep-tracker>
            </section>

            <section id="discipline-section">
              <app-discipline-checklist></app-discipline-checklist>
            </section>
          </div>
        }

        <!-- TAB 1: STUDY ONLY -->
        @if (activeTab() === 'study') {
          <app-study-tracker></app-study-tracker>
        }

        <!-- TAB 2: SLEEP ONLY -->
        @if (activeTab() === 'sleep') {
          <app-sleep-tracker></app-sleep-tracker>
        }

        <!-- TAB 3: DISCIPLINE & RELIGION ONLY -->
        @if (activeTab() === 'discipline') {
          <app-discipline-checklist></app-discipline-checklist>
        }

      </main>

    </div>
  `
})
export class MainDashboardComponent {
  public supabase = inject(SupabaseService);
  public pwa = inject(PwaService);
  public notifications = inject(NotificationService);
  private sound = inject(SoundService);

  public activeTab = signal<MainTab>('overview');

  public switchTab(tab: MainTab): void {
    this.sound.playClickTone();
    this.activeTab.set(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  public copyLiveLink(): void {
    if (typeof window !== 'undefined') {
      const liveUrl = `${window.location.origin}/live-stream`;
      navigator.clipboard.writeText(liveUrl).then(() => {
        alert(`Accountability Live Stream Link copied to clipboard!\n\nSend this to your partner:\n${liveUrl}`);
      });
    }
  }
}
