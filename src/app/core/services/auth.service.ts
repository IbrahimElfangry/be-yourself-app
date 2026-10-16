import { Injectable, signal } from '@angular/core';

export const MASTER_USER_ID = '00000000-0000-0000-0000-000000000001';
export const MASTER_DEFAULT_PIN = '0510';
const AUTH_STORAGE_KEY = 'by_master_auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  public isMaster = signal<boolean>(this.checkInitialAuth());

  constructor() {
    this.checkUrlParams();
  }

  private checkInitialAuth(): boolean {
    if (typeof window !== 'undefined') {
      try {
        const local = localStorage.getItem(AUTH_STORAGE_KEY);
        const session = sessionStorage.getItem(AUTH_STORAGE_KEY);
        return local === 'authorized' || session === 'authorized';
      } catch {
        return false;
      }
    }
    return false;
  }

  private checkUrlParams(): void {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const key = params.get('key') || params.get('pin');
      if (key === 'master' || key === MASTER_DEFAULT_PIN) {
        this.unlockMaster(key);
      }
    }
  }

  public unlockMaster(pinOrKey: string): boolean {
    if (pinOrKey === MASTER_DEFAULT_PIN || pinOrKey === 'master') {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(AUTH_STORAGE_KEY, 'authorized');
          sessionStorage.setItem(AUTH_STORAGE_KEY, 'authorized');
        } catch (e) {
          console.warn('Storage unavailable:', e);
        }
      }
      this.isMaster.set(true);
      return true;
    }
    return false;
  }

  public lockMaster(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
      } catch (e) {
        console.warn('Storage unavailable:', e);
      }
    }
    this.isMaster.set(false);
  }
}

