import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  public permission = signal<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  public remindersEnabled = signal<boolean>(
    typeof localStorage !== 'undefined' ? localStorage.getItem('by_reminders_enabled') === 'true' : false
  );

  constructor() {
    this.checkPermission();
  }

  public checkPermission(): void {
    if (typeof Notification !== 'undefined') {
      this.permission.set(Notification.permission);
    }
  }

  public async requestPermission(): Promise<boolean> {
    if (typeof Notification === 'undefined') return false;

    try {
      const perm = await Notification.requestPermission();
      this.permission.set(perm);
      if (perm === 'granted') {
        this.remindersEnabled.set(true);
        this.persistSetting(true);
        this.sendNotification('Reminders Active 🚀', {
          body: 'You will receive reminders for Athkar and intensive study targets.',
          icon: 'icons/icon-192x192.png'
        });
        return true;
      }
    } catch (e) {
      console.warn('Error requesting notification permission:', e);
    }
    return false;
  }

  public toggleReminders(): void {
    if (this.permission() !== 'granted') {
      this.requestPermission();
      return;
    }
    const current = this.remindersEnabled();
    this.remindersEnabled.set(!current);
    this.persistSetting(!current);
  }

  private persistSetting(val: boolean): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('by_reminders_enabled', val ? 'true' : 'false');
    }
  }

  public sendNotification(title: string, options?: NotificationOptions): void {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return;
    }
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(reg => {
          const opts: any = {
            icon: 'icons/icon-192x192.png',
            badge: 'icons/icon-72x72.png',
            vibrate: [200, 100, 200],
            ...options
          };
          reg.showNotification(title, opts);
        });
      } else {
        new Notification(title, {
          icon: 'icons/icon-192x192.png',
          ...options
        });
      }
    } catch (e) {
      console.warn('Could not dispatch notification:', e);
    }
  }
}
