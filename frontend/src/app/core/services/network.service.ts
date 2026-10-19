import { Injectable, NgZone, inject } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent, merge } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  private ngZone = inject(NgZone);
  private onlineSubject: BehaviorSubject<boolean>;
  public isOnline$: Observable<boolean>;

  constructor() {
    const initialStatus = typeof window !== 'undefined' && typeof window.navigator !== 'undefined'
      ? window.navigator.onLine
      : true;

    this.onlineSubject = new BehaviorSubject<boolean>(initialStatus);
    this.isOnline$ = this.onlineSubject.asObservable();

    if (typeof window !== 'undefined') {
      this.initEventListeners();
    }
  }

  private initEventListeners(): void {
    window.addEventListener('online', () => {
      this.ngZone.run(() => {
        this.onlineSubject.next(true);
      });
    });

    window.addEventListener('offline', () => {
      this.ngZone.run(() => {
        this.onlineSubject.next(false);
      });
    });
  }

  public get isOnline(): boolean {
    return this.onlineSubject.value;
  }

  public setOnlineStatus(status: boolean): void {
    this.onlineSubject.next(status);
  }

  public async checkConnection(): Promise<boolean> {
    if (typeof window === 'undefined' || !window.navigator.onLine) {
      this.setOnlineStatus(false);
      return false;
    }

    try {
      // Lightweight status ping
      const response = await fetch('/health', { method: 'HEAD', cache: 'no-store' });
      const online = response.ok;
      this.setOnlineStatus(online);
      return online;
    } catch {
      // If /health check fails, fallback to navigator status
      const online = window.navigator.onLine;
      this.setOnlineStatus(online);
      return online;
    }
  }
}
