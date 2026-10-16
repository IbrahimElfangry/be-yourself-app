import { Injectable, signal, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PwaService {
  private swUpdate = inject(SwUpdate, { optional: true });

  private deferredPrompt: any = null;
  public canInstall = signal<boolean>(false);
  public isInstalled = signal<boolean>(false);
  public updateAvailable = signal<boolean>(false);

  constructor() {
    this.checkStandalone();
    this.listenForInstallPrompt();
    this.listenForUpdates();
  }

  private checkStandalone(): void {
    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      this.isInstalled.set(isStandalone);
    }
  }

  private listenForInstallPrompt(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', (e: Event) => {
        e.preventDefault();
        this.deferredPrompt = e;
        this.canInstall.set(true);
      });

      window.addEventListener('appinstalled', () => {
        this.deferredPrompt = null;
        this.canInstall.set(false);
        this.isInstalled.set(true);
      });
    }
  }

  private listenForUpdates(): void {
    if (this.swUpdate?.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
        .subscribe(() => {
          this.updateAvailable.set(true);
        });
    }
  }

  public async installPwa(): Promise<boolean> {
    if (!this.deferredPrompt) {
      return false;
    }
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
    this.canInstall.set(false);
    return outcome === 'accepted';
  }

  public updateApp(): void {
    if (typeof window !== 'undefined') {
      document.location.reload();
    }
  }
}
