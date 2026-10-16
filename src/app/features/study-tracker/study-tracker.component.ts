import { Component, inject, signal, effect, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase.service';
import { SoundService } from '../../core/services/sound.service';
import { LiveTimerState } from '../../core/models/tracker.models';

@Component({
  selector: 'app-study-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 relative">
      
      <!-- Section Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <h2 class="text-xl font-bold tracking-tight text-white">Intensive Study & Focus Engine</h2>
          </div>
          <p class="text-xs text-slate-400 mt-1">High-stakes cognitive endurance. Daily baseline: 8 Hours | Peak target: 12 Hours</p>
        </div>

        <!-- Today's Metric Pill & Zen Mode Button -->
        <div class="flex items-center gap-3">
          <!-- Zen Focus Mode Trigger Button -->
          <button
            (click)="toggleZenMode()"
            class="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-400 hover:text-cyan-300 text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-cyan-950/40">
            <svg class="w-4 h-4 text-cyan-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            <span>Zen Focus Mode</span>
          </button>

          <div class="bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl flex items-center gap-3">
            <div>
              <div class="text-[10px] uppercase font-bold tracking-wider text-slate-400">Today's Accumulation</div>
              <div class="text-lg font-black tracking-tight" [ngClass]="{
                'text-cyan-400': supabase.todayStudyHours() < 8,
                'text-emerald-400': supabase.todayStudyHours() >= 8 && supabase.todayStudyHours() < 12,
                'text-amber-400': supabase.todayStudyHours() >= 12
              }">
                {{ supabase.todayStudyHours() }} <span class="text-xs font-medium text-slate-400">/ 12.0 hrs</span>
              </div>
            </div>
            <div class="h-8 w-[1px] bg-slate-800"></div>
            <div>
              <div class="text-[10px] uppercase font-bold tracking-wider text-slate-400">Status</div>
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold" [ngClass]="{
                'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20': supabase.todayStudyHours() < 8,
                'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20': supabase.todayStudyHours() >= 8 && supabase.todayStudyHours() < 12,
                'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse': supabase.todayStudyHours() >= 12
              }">
                {{ supabase.todayStudyHours() >= 12 ? '🔥 Peak 12h Mastered' : (supabase.todayStudyHours() >= 8 ? '✓ 8h Target Achieved' : 'In Progress') }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Real-Time Target Goal Progress Bar (8 to 12 Hours) -->
      <div class="p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800/80 shadow-xl relative overflow-hidden">
        <div class="flex items-center justify-between text-xs mb-2.5">
          <span class="text-slate-300 font-medium flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full" [ngClass]="supabase.todayStudyHours() >= 8 ? 'bg-emerald-400 animate-ping' : 'bg-cyan-400'"></span>
            Daily Intensive Target Tracking
          </span>
          <span class="font-mono font-bold text-white">
            {{ ((supabase.todayStudyHours() / 12) * 100) | number:'1.0-0' }}% to 12h Peak
          </span>
        </div>

        <!-- Multi-segment Target Bar -->
        <div class="relative w-full h-5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800 shadow-inner">
          <div class="absolute top-0 bottom-0 left-[66.67%] w-[2px] bg-slate-400/40 z-20 pointer-events-none"></div>
          
          <div 
            class="h-full rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-2"
            [ngClass]="{
              'bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]': supabase.todayStudyHours() < 8,
              'bg-gradient-to-r from-cyan-500 via-emerald-500 to-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)]': supabase.todayStudyHours() >= 8 && supabase.todayStudyHours() < 12,
              'bg-gradient-to-r from-emerald-500 via-amber-500 to-orange-500 shadow-[0_0_25px_rgba(245,158,11,0.6)]': supabase.todayStudyHours() >= 12
            }"
            [style.width.%]="getProgressWidth()"
          >
          </div>
        </div>

        <div class="flex justify-between items-center text-[11px] text-slate-400 mt-2 font-mono">
          <span>0h (Start)</span>
          <span class="flex items-center gap-1 text-slate-300 font-semibold">
            <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span> 4h (Halfway)
          </span>
          <span class="flex items-center gap-1 font-bold text-emerald-400">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> 8h (Required Target)
          </span>
          <span class="flex items-center gap-1 font-black text-amber-400">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span> 12h (Elite Peak)
          </span>
        </div>
      </div>

      <!-- Grid: Timer on Left, Course Tracker on Right -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <!-- Timer Card (7 cols) -->
        <div class="lg:col-span-7 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-xl">
          <div>
            <!-- Timer Mode Toggles -->
            <div class="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-6">
              <div class="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  (click)="setTimerMode('stopwatch')"
                  [class]="timerMode() === 'stopwatch' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'"
                  class="px-3.5 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  Stopwatch
                </button>
                <button
                  (click)="setTimerMode('pomodoro')"
                  [class]="timerMode() === 'pomodoro' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'"
                  class="px-3.5 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  Pomodoro (25m)
                </button>
                <button
                  (click)="setTimerMode('deepwork')"
                  [class]="timerMode() === 'deepwork' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'"
                  class="px-3.5 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                  Deep Block (50m)
                </button>
              </div>

              <!-- Live Stream indicator -->
              <span class="text-xs flex items-center gap-1.5 font-mono" [ngClass]="isRunning() ? 'text-emerald-400' : 'text-slate-500'">
                <span class="w-2 h-2 rounded-full" [ngClass]="isRunning() ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'"></span>
                {{ isRunning() ? 'STREAMING LIVE' : 'STREAM IDLE' }}
              </span>
            </div>

            <!-- Subject / Focus Title Input -->
            <div class="mb-6">
              <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Current Focus Topic / Subject</label>
              <input
                type="text"
                [(ngModel)]="sessionTitle"
                (ngModelChange)="onTitleChange()"
                placeholder="e.g. Distributed Systems Architecture / LeetCode Hard"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <!-- Big Digital Timer Display -->
            <div class="text-center py-6 bg-slate-950/60 rounded-2xl border border-slate-800/80 mb-6">
              <div class="font-mono text-5xl md:text-6xl font-black tracking-tight text-white select-none">
                {{ formatDisplayTime() }}
              </div>
              <div class="text-xs text-slate-500 font-mono mt-2 uppercase tracking-widest">
                {{ timerMode() === 'stopwatch' ? 'Elapsed Time' : 'Time Remaining' }}
              </div>
            </div>
          </div>

          <!-- Timer Action Controls -->
          <div class="space-y-3">
            <div class="grid grid-cols-3 gap-3">
              @if (!isRunning()) {
                <button
                  (click)="startTimer()"
                  class="col-span-2 py-3.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-[0.98] text-slate-950 font-bold text-sm tracking-wide transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 min-h-[50px]">
                  <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  START SESSION
                </button>
              } @else {
                <button
                  (click)="pauseTimer()"
                  class="col-span-2 py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-bold text-sm tracking-wide transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 min-h-[50px]">
                  <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  PAUSE
                </button>
              }

              <button
                (click)="resetTimer()"
                class="py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-300 font-semibold text-sm transition-colors flex items-center justify-center gap-2 min-h-[50px]">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                RESET
              </button>
            </div>

            <!-- Manual Log or Save Timer Session -->
            <button
              (click)="logCurrentSession()"
              [disabled]="elapsedSeconds() < 60"
              class="w-full py-3 rounded-xl border border-slate-700 bg-slate-800/40 hover:bg-slate-800 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center justify-center gap-2 min-h-[44px]">
              <svg class="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
              Save Recorded Minutes to Supabase
            </button>
          </div>
        </div>

        <!-- Course Completion Tracker (5 cols) -->
        <div class="lg:col-span-5 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-xl">
          <div>
            <div class="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
              <div class="flex items-center gap-2">
                <span class="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                </span>
                <h3 class="text-sm font-bold text-white uppercase tracking-wider">Course Modules Tracker</h3>
              </div>
              <button
                (click)="toggleAddCourseForm()"
                class="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1">
                + Add Course
              </button>
            </div>

            <!-- Add Course Form (Collapsible) -->
            @if (showAddCourse()) {
              <div class="p-3.5 bg-slate-950 rounded-xl border border-slate-800 mb-4 space-y-2.5">
                <input
                  type="text"
                  [(ngModel)]="newCourseTitle"
                  placeholder="Course title..."
                  class="w-full bg-slate-900 border border-slate-700 text-xs rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                />
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-[10px] text-slate-400">Total Lessons</label>
                    <input
                      type="number"
                      [(ngModel)]="newCourseTotal"
                      min="1"
                      class="w-full bg-slate-900 border border-slate-700 text-xs rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label class="text-[10px] text-slate-400">Category</label>
                    <input
                      type="text"
                      [(ngModel)]="newCourseCategory"
                      placeholder="e.g. AI / System Design"
                      class="w-full bg-slate-900 border border-slate-700 text-xs rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
                <div class="flex justify-end gap-2 pt-1">
                  <button (click)="toggleAddCourseForm()" class="px-2.5 py-1 text-xs text-slate-400 hover:text-white">Cancel</button>
                  <button (click)="saveNewCourse()" class="px-3 py-1 text-xs bg-emerald-500 font-bold text-slate-950 rounded-lg hover:bg-emerald-400">Save</button>
                </div>
              </div>
            }

            <!-- Course List -->
            <div class="space-y-3.5 max-h-[320px] overflow-y-auto pr-1">
              @for (course of supabase.courses(); track course.id) {
                <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 hover:border-slate-700 transition-all">
                  <div class="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-cyan-400 mb-1">
                        {{ course.category || 'General' }}
                      </span>
                      <h4 class="text-xs font-bold text-white leading-tight">{{ course.title }}</h4>
                    </div>
                    <button
                      (click)="supabase.deleteCourse(course.id)"
                      title="Delete course"
                      class="text-slate-600 hover:text-rose-400 transition-colors p-1">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>

                  <!-- Course Progress Bar -->
                  <div class="w-full h-2 bg-slate-900 rounded-full overflow-hidden mb-2">
                    <div
                      class="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500"
                      [style.width.%]="(course.completed_modules / (course.total_modules || 1)) * 100">
                    </div>
                  </div>

                  <!-- Controls & Count -->
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-mono text-slate-300">
                      {{ course.completed_modules }}/{{ course.total_modules }} modules
                      <span class="text-emerald-400 font-bold ml-1">({{ ((course.completed_modules / course.total_modules) * 100) | number:'1.0-0' }}%)</span>
                    </span>

                    <div class="flex items-center gap-1.5">
                      <button
                        (click)="incrementCourse(course.id, -1)"
                        [disabled]="course.completed_modules <= 0"
                        class="w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white flex items-center justify-center font-bold text-xs">
                        -
                      </button>
                      <button
                        (click)="incrementCourse(course.id, 1)"
                        [disabled]="course.completed_modules >= course.total_modules"
                        class="px-2.5 h-6 rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 text-slate-950 flex items-center justify-center font-bold text-xs gap-1">
                        +1 Done
                      </button>
                    </div>
                  </div>
                </div>
              } @empty {
                <div class="text-center py-8 text-xs text-slate-500">
                  No courses added yet. Click "+ Add Course" to track modules.
                </div>
              }
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-800/80 flex justify-between text-[11px] text-slate-400">
            <span>Total Enrolled Courses: {{ supabase.courses().length }}</span>
            <span class="text-emerald-400 font-semibold">Self-Paced Ascension</span>
          </div>
        </div>
      </div>

      <!-- Today's Logged Study Sessions History -->
      <div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
          <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          Today's Logged Deep Work Sessions ({{ supabase.todayStudySessions().length }})
        </h3>

        @if (supabase.todayStudySessions().length > 0) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            @for (session of supabase.todayStudySessions(); track session.id) {
              <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div class="text-xs font-bold text-white">{{ session.title }}</div>
                  <div class="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                    <span class="text-cyan-400 font-semibold">{{ session.duration_minutes }} mins</span>
                    <span>•</span>
                    <span class="uppercase text-[10px] text-slate-500">{{ session.mode }}</span>
                  </div>
                </div>
                <button
                  (click)="supabase.deleteStudySession(session.id)"
                  class="text-slate-600 hover:text-rose-400 p-1 transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            }
          </div>
        } @else {
          <div class="text-xs text-slate-500 italic py-2">
            No study sessions logged for today yet. Start the stopwatch/pomodoro above to record deep work.
          </div>
        }
      </div>

      <!-- ======================================================== -->
      <!-- FULLSCREEN ZEN FOCUS MODE OVERLAY -->
      <!-- ======================================================== -->
      @if (isZenMode()) {
        <div class="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-between p-6 sm:p-12 selection:bg-cyan-500">
          
          <!-- Zen Top Bar -->
          <div class="w-full max-w-4xl flex items-center justify-between text-xs">
            <div class="flex items-center gap-3">
              <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
              <span class="text-cyan-400 font-mono font-bold uppercase tracking-widest text-sm">ZEN FOCUS CHAMBER</span>
              <span class="px-2 py-0.5 rounded text-[10px] bg-slate-900 border border-slate-800 text-slate-400">Zero Distraction</span>
            </div>

            <!-- Exit Zen Button -->
            <button
              (click)="toggleZenMode()"
              class="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-mono text-xs flex items-center gap-2 transition-all">
              <span>Exit Zen (Esc)</span>
              <kbd class="px-1.5 py-0.5 bg-slate-800 rounded text-[10px]">✕</kbd>
            </button>
          </div>

          <!-- Zen Floating Encouragement Alert (If partner sent something) -->
          @if (supabase.activeEncouragementToast(); as toast) {
            <div class="w-full max-w-lg p-4 rounded-2xl bg-gradient-to-r from-amber-950/80 to-slate-900 border border-amber-500/40 shadow-2xl flex items-center gap-3 animate-bounce">
              <span class="text-2xl">
                {{ toast.reaction_type === 'fire' ? '🔥' : (toast.reaction_type === 'applause' ? '👏' : (toast.reaction_type === 'muscle' ? '💪' : '⚡')) }}
              </span>
              <div class="flex-1">
                <div class="text-[10px] uppercase font-bold text-amber-400">From Accountability Partner</div>
                <div class="text-xs font-semibold text-white mt-0.5">"{{ toast.message }}"</div>
              </div>
              <button (click)="supabase.dismissToast()" class="text-slate-500 hover:text-white text-xs">✕</button>
            </div>
          }

          <!-- Zen Giant Centerpiece Timer -->
          <div class="flex flex-col items-center justify-center space-y-6 text-center my-auto">
            <!-- Focus Subject -->
            <div class="px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-sm font-semibold max-w-xl truncate">
              🎯 {{ sessionTitle || 'Deep Work Session' }}
            </div>

            <!-- Massive Timer Clock -->
            <div class="font-mono text-7xl sm:text-9xl md:text-[10rem] font-black tracking-tighter text-white drop-shadow-[0_0_50px_rgba(6,182,212,0.3)] select-none">
              {{ formatDisplayTime() }}
            </div>

            <div class="text-xs font-mono uppercase tracking-widest text-slate-500">
              {{ timerMode() === 'stopwatch' ? 'Total Elapsed Focus' : 'Target Countdown' }}
            </div>

            <!-- Minimal Controls in Zen Mode -->
            <div class="flex items-center gap-4 pt-4">
              @if (!isRunning()) {
                <button
                  (click)="startTimer()"
                  class="px-8 py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm tracking-wider transition-all shadow-xl shadow-cyan-500/30 flex items-center gap-2">
                  <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  RESUME STUDY
                </button>
              } @else {
                <button
                  (click)="pauseTimer()"
                  class="px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm tracking-wider transition-all shadow-xl shadow-amber-500/30 flex items-center gap-2">
                  <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  PAUSE
                </button>
              }

              <button
                (click)="resetTimer()"
                class="px-5 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-sm font-semibold transition-all">
                Reset
              </button>
            </div>
          </div>

          <!-- Zen Footer -->
          <div class="w-full max-w-4xl flex items-center justify-between text-xs text-slate-600 font-mono">
            <span>Today's Total: {{ supabase.todayStudyHours() }}h / 12h</span>
            <span class="text-cyan-500">Live Streaming to Partner</span>
          </div>

        </div>
      }

    </div>
  `
})
export class StudyTrackerComponent implements OnInit, OnDestroy {
  public supabase = inject(SupabaseService);
  private sound = inject(SoundService);

  public timerMode = signal<'stopwatch' | 'pomodoro' | 'deepwork'>('stopwatch');
  public isRunning = signal<boolean>(false);
  public elapsedSeconds = signal<number>(0);
  public targetSeconds = signal<number>(0);
  public sessionTitle = '';
  public isZenMode = signal<boolean>(false);

  ngOnInit(): void {
    // Explicit mandatory fetch on component init
    this.supabase.fetchStudySessions();
  }

  public showAddCourse = signal<boolean>(false);
  public newCourseTitle = '';
  public newCourseTotal = 10;
  public newCourseCategory = 'Engineering';

  private timerInterval: any = null;

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isZenMode()) {
      this.toggleZenMode();
    }
  }

  public toggleZenMode(): void {
    this.sound.playClickTone();
    const nextState = !this.isZenMode();
    this.isZenMode.set(nextState);

    if (typeof document !== 'undefined') {
      if (nextState) {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    }
  }

  public setTimerMode(mode: 'stopwatch' | 'pomodoro' | 'deepwork'): void {
    this.sound.playClickTone();
    this.pauseTimer();
    this.timerMode.set(mode);
    this.elapsedSeconds.set(0);

    if (mode === 'pomodoro') {
      this.targetSeconds.set(25 * 60);
    } else if (mode === 'deepwork') {
      this.targetSeconds.set(50 * 60);
    } else {
      this.targetSeconds.set(0);
    }
    this.broadcastState();
  }

  public startTimer(): void {
    if (this.isRunning()) return;
    this.sound.playClickTone();
    this.isRunning.set(true);

    this.timerInterval = setInterval(() => {
      if (this.timerMode() === 'stopwatch') {
        this.elapsedSeconds.update(v => v + 1);
      } else {
        if (this.targetSeconds() > 0) {
          this.targetSeconds.update(v => v - 1);
          this.elapsedSeconds.update(v => v + 1);
          if (this.targetSeconds() === 0) {
            this.handleTimerFinished();
          }
        }
      }
      this.broadcastState();
    }, 1000);

    this.broadcastState();
  }

  public pauseTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.isRunning.set(false);
    this.broadcastState();
  }

  public resetTimer(): void {
    this.sound.playClickTone();
    this.pauseTimer();
    this.elapsedSeconds.set(0);
    if (this.timerMode() === 'pomodoro') {
      this.targetSeconds.set(25 * 60);
    } else if (this.timerMode() === 'deepwork') {
      this.targetSeconds.set(50 * 60);
    }
    this.broadcastState();
  }

  public onTitleChange(): void {
    this.broadcastState();
  }

  private broadcastState(): void {
    const state: LiveTimerState = {
      isStudying: this.isRunning(),
      timerMode: this.timerMode(),
      elapsedSeconds: this.elapsedSeconds(),
      targetSeconds: this.targetSeconds(),
      sessionTitle: this.sessionTitle.trim() || 'Intensive Deep Work',
      updatedAt: Date.now()
    };
    this.supabase.broadcastTimerState(state);
  }

  private handleTimerFinished(): void {
    this.pauseTimer();
    this.sound.playTimerAlarm();
    this.logCurrentSession();
  }

  public formatDisplayTime(): string {
    const totalSecs = this.timerMode() === 'stopwatch' ? this.elapsedSeconds() : this.targetSeconds();
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  public getProgressWidth(): number {
    const hours = this.supabase.todayStudyHours();
    const pct = (hours / 12) * 100;
    return Math.min(100, Math.max(0, pct));
  }

  public async logCurrentSession(): Promise<void> {
    const minutes = Math.max(1, Math.round(this.elapsedSeconds() / 60));
    const title = this.sessionTitle.trim() || 'Intensive Focus';

    await this.supabase.addStudySession({
      title,
      duration_minutes: minutes,
      mode: this.timerMode() === 'stopwatch' ? 'stopwatch' : 'pomodoro',
      session_date: this.supabase.selectedDate(),
      notes: `Tracked via ${this.timerMode()}`
    });

    this.sound.playSuccessTone();
    this.resetTimer();
  }

  public toggleAddCourseForm(): void {
    this.showAddCourse.update(v => !v);
  }

  public async saveNewCourse(): Promise<void> {
    if (!this.newCourseTitle.trim()) return;
    await this.supabase.addCourse({
      title: this.newCourseTitle.trim(),
      total_modules: Math.max(1, this.newCourseTotal),
      completed_modules: 0,
      category: this.newCourseCategory.trim() || 'General'
    });
    this.sound.playSuccessTone();
    this.newCourseTitle = '';
    this.newCourseTotal = 10;
    this.showAddCourse.set(false);
  }

  public async incrementCourse(id: string, delta: number): Promise<void> {
    this.sound.playClickTone();
    await this.supabase.updateCourseProgress(id, delta);
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }
}
