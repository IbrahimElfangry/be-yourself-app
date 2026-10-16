import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase.service';
import { SoundService } from '../../core/services/sound.service';
import { DailyHabits } from '../../core/models/tracker.models';

@Component({
  selector: 'app-discipline-checklist',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Section Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <h2 class="text-xl font-bold tracking-tight text-white">Religious & Physical Discipline Engine</h2>
          </div>
          <p class="text-xs text-slate-400 mt-1">Spiritual grounding, morning/evening remembrance, physical strength, and daily intellect.</p>
        </div>

        <!-- Discipline Completion Badge -->
        <div class="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl flex items-center gap-4">
          <div>
            <div class="text-[10px] uppercase font-bold tracking-wider text-slate-400">Prayers Fulfilled</div>
            <div class="text-lg font-black text-emerald-400 font-mono">
              {{ supabase.prayersCompletedCount() }} <span class="text-xs font-medium text-slate-400">/ 5</span>
            </div>
          </div>
          <div class="h-8 w-[1px] bg-slate-800"></div>
          <div>
            <div class="text-[10px] uppercase font-bold tracking-wider text-slate-400">Physical Protocol</div>
            <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold" [ngClass]="habits()?.workout_done ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'">
              {{ habits()?.workout_done ? '✓ WORKOUT DONE' : 'PENDING / MISSED' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Main Discipline Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

        <!-- 5 Daily Prayers (6 cols) -->
        <div class="lg:col-span-6 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                Daily 5 Prayers (Salawat)
              </h3>
              <p class="text-[11px] text-slate-400 mt-0.5">The non-negotiable anchor of daily consciousness</p>
            </div>
            <span class="text-xs font-mono font-bold px-2 py-0.5 rounded" [ngClass]="supabase.prayersCompletedCount() === 5 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-300'">
              {{ supabase.prayersCompletedCount() }}/5 Done
            </span>
          </div>

          <!-- Prayer Checkbox Cards -->
          <div class="space-y-2.5">
            <!-- FAJR -->
            <label 
              (click)="togglePrayer('fajr')"
              class="flex items-center justify-between p-3.5 rounded-xl border cursor-pointer select-none transition-all active:scale-[0.98] min-h-[54px] group"
              [ngClass]="habits()?.fajr ? 'bg-emerald-950/20 border-emerald-500/40 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'">
              <div class="flex items-center gap-3">
                <div class="w-6 h-6 rounded-lg border flex items-center justify-center transition-all"
                  [ngClass]="habits()?.fajr ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold' : 'border-slate-700 bg-slate-900'">
                  @if (habits()?.fajr) {
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                  }
                </div>
                <div>
                  <span class="text-xs font-bold font-mono tracking-wide">Fajr</span>
                  <span class="text-[10px] text-slate-500 ml-2">Dawn (Before Sunrise)</span>
                </div>
              </div>
              <span class="text-xs font-serif text-slate-500 group-hover:text-emerald-400/80 transition-colors">الفجر</span>
            </label>

            <!-- DHUHR -->
            <label 
              (click)="togglePrayer('dhuhr')"
              class="flex items-center justify-between p-3.5 rounded-xl border cursor-pointer select-none transition-all active:scale-[0.98] min-h-[54px] group"
              [ngClass]="habits()?.dhuhr ? 'bg-emerald-950/20 border-emerald-500/40 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'">
              <div class="flex items-center gap-3">
                <div class="w-6 h-6 rounded-lg border flex items-center justify-center transition-all"
                  [ngClass]="habits()?.dhuhr ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold' : 'border-slate-700 bg-slate-900'">
                  @if (habits()?.dhuhr) {
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                  }
                </div>
                <div>
                  <span class="text-xs font-bold font-mono tracking-wide">Dhuhr</span>
                  <span class="text-[10px] text-slate-500 ml-2">Noon</span>
                </div>
              </div>
              <span class="text-xs font-serif text-slate-500 group-hover:text-emerald-400/80 transition-colors">الظهر</span>
            </label>

            <!-- ASR -->
            <label 
              (click)="togglePrayer('asr')"
              class="flex items-center justify-between p-3.5 rounded-xl border cursor-pointer select-none transition-all active:scale-[0.98] min-h-[54px] group"
              [ngClass]="habits()?.asr ? 'bg-emerald-950/20 border-emerald-500/40 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'">
              <div class="flex items-center gap-3">
                <div class="w-6 h-6 rounded-lg border flex items-center justify-center transition-all"
                  [ngClass]="habits()?.asr ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold' : 'border-slate-700 bg-slate-900'">
                  @if (habits()?.asr) {
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                  }
                </div>
                <div>
                  <span class="text-xs font-bold font-mono tracking-wide">Asr</span>
                  <span class="text-[10px] text-slate-500 ml-2">Late Afternoon</span>
                </div>
              </div>
              <span class="text-xs font-serif text-slate-500 group-hover:text-emerald-400/80 transition-colors">العصر</span>
            </label>

            <!-- MAGHRIB -->
            <label 
              (click)="togglePrayer('maghrib')"
              class="flex items-center justify-between p-3.5 rounded-xl border cursor-pointer select-none transition-all active:scale-[0.98] min-h-[54px] group"
              [ngClass]="habits()?.maghrib ? 'bg-emerald-950/20 border-emerald-500/40 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'">
              <div class="flex items-center gap-3">
                <div class="w-6 h-6 rounded-lg border flex items-center justify-center transition-all"
                  [ngClass]="habits()?.maghrib ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold' : 'border-slate-700 bg-slate-900'">
                  @if (habits()?.maghrib) {
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                  }
                </div>
                <div>
                  <span class="text-xs font-bold font-mono tracking-wide">Maghrib</span>
                  <span class="text-[10px] text-slate-500 ml-2">Sunset</span>
                </div>
              </div>
              <span class="text-xs font-serif text-slate-500 group-hover:text-emerald-400/80 transition-colors">المغرب</span>
            </label>

            <!-- ISHA -->
            <label 
              (click)="togglePrayer('isha')"
              class="flex items-center justify-between p-3.5 rounded-xl border cursor-pointer select-none transition-all active:scale-[0.98] min-h-[54px] group"
              [ngClass]="habits()?.isha ? 'bg-emerald-950/20 border-emerald-500/40 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'">
              <div class="flex items-center gap-3">
                <div class="w-6 h-6 rounded-lg border flex items-center justify-center transition-all"
                  [ngClass]="habits()?.isha ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold' : 'border-slate-700 bg-slate-900'">
                  @if (habits()?.isha) {
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                  }
                </div>
                <div>
                  <span class="text-xs font-bold font-mono tracking-wide">Isha</span>
                  <span class="text-[10px] text-slate-500 ml-2">Nightfall</span>
                </div>
              </div>
              <span class="text-xs font-serif text-slate-500 group-hover:text-emerald-400/80 transition-colors">العشاء</span>
            </label>
          </div>

          <!-- Morning & Evening Athkar (Sub-section) -->
          <div class="pt-4 border-t border-slate-800">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2.5">Morning & Evening Athkar (أذكار الصباح والمساء)</h4>
            <div class="grid grid-cols-2 gap-3">
              <label 
                (click)="toggleAthkar('morning_athkar')"
                class="p-3 rounded-xl border cursor-pointer select-none transition-all flex items-center gap-2.5"
                [ngClass]="habits()?.morning_athkar ? 'bg-cyan-950/30 border-cyan-500/40 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'">
                <div class="w-4 h-4 rounded border flex items-center justify-center"
                  [ngClass]="habits()?.morning_athkar ? 'bg-cyan-500 border-cyan-400 text-slate-950 font-bold' : 'border-slate-700 bg-slate-900'">
                  @if (habits()?.morning_athkar) {
                    <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                  }
                </div>
                <span class="text-xs font-semibold">Morning Athkar</span>
              </label>

              <label 
                (click)="toggleAthkar('evening_athkar')"
                class="p-3 rounded-xl border cursor-pointer select-none transition-all flex items-center gap-2.5"
                [ngClass]="habits()?.evening_athkar ? 'bg-indigo-950/30 border-indigo-500/40 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'">
                <div class="w-4 h-4 rounded border flex items-center justify-center"
                  [ngClass]="habits()?.evening_athkar ? 'bg-indigo-500 border-indigo-400 text-slate-950 font-bold' : 'border-slate-700 bg-slate-900'">
                  @if (habits()?.evening_athkar) {
                    <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                  }
                </div>
                <span class="text-xs font-semibold">Evening Athkar</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Gym / Workout & Book Reading (6 cols) -->
        <div class="lg:col-span-6 space-y-6">

          <!-- Gym / Workout Binary Tracker -->
          <div class="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"/></svg>
                Physical Discipline (Gym / Workout)
              </h3>
              <span class="text-xs font-mono text-slate-400">Binary State</span>
            </div>

            <!-- Big High-Contrast Workout Toggle -->
            <button
              type="button"
              (click)="toggleWorkout()"
              class="w-full p-4 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 focus:outline-none active:scale-[0.98] min-h-[58px]"
              [ngClass]="habits()?.workout_done ? 'bg-gradient-to-r from-emerald-950/60 to-emerald-900/40 border-emerald-500/50 shadow-lg shadow-emerald-500/10' : 'bg-slate-950 border-slate-800 hover:border-slate-700'">
              <div class="flex items-center gap-2 text-sm font-black tracking-wide" [ngClass]="habits()?.workout_done ? 'text-emerald-400' : 'text-slate-400'">
                @if (habits()?.workout_done) {
                  <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  <span>WORKOUT COMPLETED (DONE)</span>
                } @else {
                  <svg class="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  <span>SESSION PENDING / MISSED (CLICK TO TOGGLE)</span>
                }
              </div>
              <span class="text-[11px] text-slate-500">
                {{ habits()?.workout_done ? 'Physical standard executed today. Recovery initiated.' : 'Never negotiate with weakness. Complete your session.' }}
              </span>
            </button>

            <!-- Workout Type Routine Input -->
            <div class="space-y-1.5">
              <label class="block text-xs font-semibold text-slate-400">Workout Focus / Routine</label>
              <input
                type="text"
                [ngModel]="habits()?.workout_type"
                (ngModelChange)="updateWorkoutType($event)"
                placeholder="e.g. Heavy Squat & Pull Day / 5km Run"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          <!-- Book Reading Tracker -->
          <div class="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                Book Reading & Intellect
              </h3>
              <span class="text-xs font-mono font-bold text-cyan-400">
                {{ habits()?.reading_pages || 0 }} / {{ habits()?.reading_target || 20 }} Pages
              </span>
            </div>

            <!-- Book Title -->
            <div class="space-y-1.5">
              <label class="block text-xs font-semibold text-slate-400">Current Reading Volume</label>
              <input
                type="text"
                [ngModel]="habits()?.reading_book"
                (ngModelChange)="updateBookTitle($event)"
                placeholder="e.g. Atomic Habits / Quran Tafseer / Clean Code"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <!-- Reading Progress Bar -->
            <div class="space-y-1">
              <div class="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  class="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-500"
                  [style.width.%]="getReadingProgress()">
                </div>
              </div>
              <div class="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0</span>
                <span>{{ ((habits()?.reading_pages || 0) / (habits()?.reading_target || 20) * 100) | number:'1.0-0' }}% Target Met</span>
                <span>Goal: {{ habits()?.reading_target || 20 }}p</span>
              </div>
            </div>

            <!-- Quick Increment Buttons -->
            <div class="grid grid-cols-4 gap-2 pt-1">
              <button
                (click)="addPages(5)"
                class="py-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 active:scale-95 text-xs font-mono font-bold text-slate-300 hover:text-white transition-all min-h-[44px]">
                +5 pgs
              </button>
              <button
                (click)="addPages(10)"
                class="py-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 active:scale-95 text-xs font-mono font-bold text-slate-300 hover:text-white transition-all min-h-[44px]">
                +10 pgs
              </button>
              <button
                (click)="addPages(25)"
                class="py-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 active:scale-95 text-xs font-mono font-bold text-slate-300 hover:text-white transition-all min-h-[44px]">
                +25 pgs
              </button>
              <button
                (click)="resetPages()"
                class="py-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-rose-500 active:scale-95 text-xs font-mono font-medium text-slate-500 hover:text-rose-400 transition-all min-h-[44px]">
                Reset
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  `
})
export class DisciplineChecklistComponent implements OnInit {
  public supabase = inject(SupabaseService);
  private sound = inject(SoundService);

  public habits = computed(() => this.supabase.dailyHabits());

  ngOnInit(): void {
    // Explicit mandatory fetch on component init
    this.supabase.fetchDailyHabits(this.supabase.selectedDate());
  }

  public async togglePrayer(prayer: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'): Promise<void> {
    const current = this.habits();
    if (!current) return;
    this.sound.playClickTone();
    const newValue = !current[prayer];
    await this.supabase.updateDailyHabits({ [prayer]: newValue });
  }

  public async toggleAthkar(athkar: 'morning_athkar' | 'evening_athkar'): Promise<void> {
    const current = this.habits();
    if (!current) return;
    this.sound.playClickTone();
    const newValue = !current[athkar];
    await this.supabase.updateDailyHabits({ [athkar]: newValue });
  }

  public async toggleWorkout(): Promise<void> {
    const current = this.habits();
    if (!current) return;
    this.sound.playSuccessTone();
    const newValue = !current.workout_done;
    await this.supabase.updateDailyHabits({ workout_done: newValue });
  }

  public async updateWorkoutType(workout_type: string): Promise<void> {
    await this.supabase.updateDailyHabits({ workout_type });
  }

  public async updateBookTitle(reading_book: string): Promise<void> {
    await this.supabase.updateDailyHabits({ reading_book });
  }

  public getReadingProgress(): number {
    const pages = this.habits()?.reading_pages || 0;
    const target = this.habits()?.reading_target || 20;
    return Math.min(100, Math.round((pages / target) * 100));
  }

  public async addPages(amount: number): Promise<void> {
    const current = this.habits();
    if (!current) return;
    this.sound.playClickTone();
    const updated = (current.reading_pages || 0) + amount;
    await this.supabase.updateDailyHabits({ reading_pages: updated });
  }

  public async resetPages(): Promise<void> {
    this.sound.playClickTone();
    await this.supabase.updateDailyHabits({ reading_pages: 0 });
  }
}
