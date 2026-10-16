import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { SupabaseService } from './core/services/supabase.service';
import { PwaService } from './core/services/pwa.service';
import { NotificationService } from './core/services/notification.service';
import { SoundService } from './core/services/sound.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  public supabase = inject(SupabaseService);
  public pwa = inject(PwaService);
  public notifications = inject(NotificationService);
  private sound = inject(SoundService);

  public async installApp(): Promise<void> {
    await this.pwa.installPwa();
  }

  public async triggerRefresh(): Promise<void> {
    this.sound.playClickTone();
    await this.supabase.loadAllData();
  }
}
