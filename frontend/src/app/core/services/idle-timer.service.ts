import { Injectable, NgZone, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class IdleTimerService {
  private ngZone = inject(NgZone);

  // Default: 15 minutes idle threshold, 60 seconds warning countdown
  private idleTimeoutMs = 15 * 60 * 1000;
  private warningDurationSeconds = 60;

  private isWarningSubject = new BehaviorSubject<boolean>(false);
  public isWarning$: Observable<boolean> = this.isWarningSubject.asObservable();

  private countdownSubject = new BehaviorSubject<number>(this.warningDurationSeconds);
  public countdownSeconds$: Observable<number> = this.countdownSubject.asObservable();

  private expiredSubject = new Subject<void>();
  public expired$: Observable<void> = this.expiredSubject.asObservable();

  private idleTimerId: any = null;
  private countdownIntervalId: any = null;
  private isMonitoring = false;
  private eventListenersAttached = false;

  private userActivityHandler = () => {
    if (!this.isWarningSubject.value) {
      this.resetTimer();
    }
  };

  public setTiming(idleTimeoutMs: number, warningDurationSeconds: number): void {
    this.idleTimeoutMs = idleTimeoutMs;
    this.warningDurationSeconds = warningDurationSeconds;
    this.countdownSubject.next(warningDurationSeconds);
  }

  public startMonitoring(): void {
    if (typeof window === 'undefined' || this.isMonitoring) return;
    this.isMonitoring = true;

    this.attachActivityListeners();
    this.resetTimer();
  }

  public stopMonitoring(): void {
    this.isMonitoring = false;
    this.clearTimers();
    this.detachActivityListeners();
    this.isWarningSubject.next(false);
  }

  public resetTimer(): void {
    if (!this.isMonitoring) return;
    this.clearTimers();
    this.isWarningSubject.next(false);
    this.countdownSubject.next(this.warningDurationSeconds);

    this.ngZone.runOutsideAngular(() => {
      this.idleTimerId = setTimeout(() => {
        this.triggerWarning();
      }, this.idleTimeoutMs);
    });
  }

  public staySignedIn(): void {
    this.resetTimer();
  }

  private triggerWarning(): void {
    this.ngZone.run(() => {
      this.isWarningSubject.next(true);
      let remaining = this.warningDurationSeconds;
      this.countdownSubject.next(remaining);

      this.countdownIntervalId = setInterval(() => {
        remaining -= 1;
        this.countdownSubject.next(Math.max(0, remaining));

        if (remaining <= 0) {
          this.clearTimers();
          this.isWarningSubject.next(false);
          this.expiredSubject.next();
        }
      }, 1000);
    });
  }

  private clearTimers(): void {
    if (this.idleTimerId) {
      clearTimeout(this.idleTimerId);
      this.idleTimerId = null;
    }
    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
  }

  private attachActivityListeners(): void {
    if (typeof window === 'undefined' || this.eventListenersAttached) return;
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    this.ngZone.runOutsideAngular(() => {
      events.forEach(event => {
        window.addEventListener(event, this.userActivityHandler, { passive: true });
      });
    });
    this.eventListenersAttached = true;
  }

  private detachActivityListeners(): void {
    if (typeof window === 'undefined' || !this.eventListenersAttached) return;
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.removeEventListener(event, this.userActivityHandler);
    });
    this.eventListenersAttached = false;
  }
}
