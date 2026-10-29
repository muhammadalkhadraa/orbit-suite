import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, interval, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  ActivityActionRequest,
  UserActivityStatusDto,
  LiveEmployeeActivityDto,
  LiveMonitorResponse,
  ActivityReportFilter,
  ActivityReportResponse
} from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/activity`;

  private readonly statusSubject = new BehaviorSubject<UserActivityStatusDto | null>(null);
  public readonly status$ = this.statusSubject.asObservable();

  private isTimerInitialized = false;
  private readonly CACHE_KEY = 'orbit_activity_status';

  // Inactivity tracking (Auto-pause after 5 minutes of no mouse / interaction)
  public readonly IDLE_TIMEOUT_SECONDS = 300; // 5 minutes
  private idleTimeoutSeconds = 300;
  private lastInteractionTimestamp = Date.now();
  private lastThrottledRecord = 0;
  private isIdleActionInProgress = false;

  private readonly isIdleSubject = new BehaviorSubject<boolean>(false);
  public readonly isIdle$ = this.isIdleSubject.asObservable();

  private readonly idleCountdownSubject = new BehaviorSubject<number>(300);
  public readonly idleCountdown$ = this.idleCountdownSubject.asObservable();

  private readonly idleToastSubject = new BehaviorSubject<string | null>(null);
  public readonly idleToast$ = this.idleToastSubject.asObservable();

  constructor() {
    this.restoreCachedStatus();
    this.initRealtimeTicker();
    this.initInteractionListeners();
  }

  public get currentStatus(): UserActivityStatusDto | null {
    return this.statusSubject.value;
  }

  private initInteractionListeners(): void {
    if (typeof window === 'undefined') return;

    const onUserAction = () => this.recordUserInteraction();

    window.addEventListener('mousemove', onUserAction, { passive: true });
    window.addEventListener('mousedown', onUserAction, { passive: true });
    window.addEventListener('keydown', onUserAction, { passive: true });
    window.addEventListener('wheel', onUserAction, { passive: true });
    window.addEventListener('scroll', onUserAction, { passive: true });
    window.addEventListener('touchstart', onUserAction, { passive: true });
  }

  public setCustomIdleTimeout(seconds: number): void {
    this.idleTimeoutSeconds = Math.max(5, seconds);
    this.idleCountdownSubject.next(this.idleTimeoutSeconds);
  }

  public recordUserInteraction(): void {
    const now = Date.now();
    // Throttle checks to at most once per 300ms
    if (now - this.lastThrottledRecord < 300) {
      return;
    }
    this.lastThrottledRecord = now;

    const current = this.statusSubject.value;

    // If currently Idle, user interaction automatically unpauses work!
    if (this.isIdleSubject.value || current?.state === 'Idle') {
      this.lastInteractionTimestamp = now;
      this.isIdleSubject.next(false);
      this.resumeFromIdle();
      return;
    }

    this.lastInteractionTimestamp = now;
  }

  public pauseDueToIdle(): void {
    if (this.isIdleActionInProgress) return;
    const current = this.statusSubject.value;
    if (!current || current.state !== 'Working') return;

    this.isIdleActionInProgress = true;
    this.isIdleSubject.next(true);

    // Freeze current timer and transition locally to Idle immediately
    const paused: UserActivityStatusDto = {
      ...current,
      state: 'Idle'
    };
    this.statusSubject.next(paused);
    this.showIdleToast('⏸️ Work timer auto-paused: 5 minutes of inactivity detected. Move mouse to resume.');

    this.executeAction({
      employeeCode: current.employeeNumber,
      action: 'pause-idle'
    }).subscribe({
      next: (res) => {
        this.isIdleActionInProgress = false;
        if (res.data) {
          this.setStatus(res.data);
        }
      },
      error: () => {
        this.isIdleActionInProgress = false;
      }
    });
  }

  public resumeFromIdle(): void {
    if (this.isIdleActionInProgress) return;
    const current = this.statusSubject.value;
    if (!current || current.state !== 'Idle') return;

    this.isIdleActionInProgress = true;
    this.isIdleSubject.next(false);
    this.lastInteractionTimestamp = Date.now();

    // Optimistically transition to Working so timer ticks instantly
    const nowUtc = new Date().toISOString();
    const resumed: UserActivityStatusDto = {
      ...current,
      state: 'Working',
      lastWorkResumedAtUtc: nowUtc
    };
    this.statusSubject.next(resumed);
    this.showIdleToast('▶️ Welcome back! Work timer resumed.');

    this.executeAction({
      employeeCode: current.employeeNumber,
      action: 'resume-idle'
    }).subscribe({
      next: (res) => {
        this.isIdleActionInProgress = false;
        if (res.data) {
          this.setStatus(res.data);
        }
      },
      error: () => {
        this.isIdleActionInProgress = false;
      }
    });
  }

  private showIdleToast(msg: string): void {
    this.idleToastSubject.next(msg);
    setTimeout(() => {
      if (this.idleToastSubject.value === msg) {
        this.idleToastSubject.next(null);
      }
    }, 4500);
  }

  private restoreCachedStatus(): void {
    try {
      const cached = sessionStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as UserActivityStatusDto;
        this.statusSubject.next(this.normalizeStatus(parsed));
      }
    } catch {
      // Ignore cache parse errors
    }
  }

  private setStatus(status: UserActivityStatusDto): void {
    const normalized = this.normalizeStatus(status);
    this.statusSubject.next(normalized);
    try {
      sessionStorage.setItem(this.CACHE_KEY, JSON.stringify(normalized));
    } catch {
      // Ignore storage errors
    }
  }

  private normalizeStatus(data: UserActivityStatusDto): UserActivityStatusDto {
    const copy = { ...data };
    const now = Date.now();

    if (copy.state === 'Working' && copy.lastWorkResumedAtUtc) {
      const resumedMs = new Date(copy.lastWorkResumedAtUtc).getTime();
      if (!isNaN(resumedMs)) {
        const elapsed = Math.max(0, Math.floor((now - resumedMs) / 1000));
        copy.currentWorkSeconds = (copy.totalWorkSeconds || 0) + elapsed;
      }
    } else if (copy.state === 'Idle') {
      copy.currentWorkSeconds = copy.totalWorkSeconds || 0;
    } else if (copy.state === 'OnBreak' && copy.currentBreakStartedAtUtc) {
      const breakMs = new Date(copy.currentBreakStartedAtUtc).getTime();
      if (!isNaN(breakMs)) {
        const elapsed = Math.max(0, Math.floor((now - breakMs) / 1000));
        copy.currentBreakSeconds = (copy.totalBreakSeconds || 0) + elapsed;
        copy.breakSecondsRemaining = Math.max(0, 3600 - copy.currentBreakSeconds);
        copy.hasExceededBreak = copy.currentBreakSeconds > 3600;
      }
    }

    return copy;
  }

  private initRealtimeTicker(): void {
    if (this.isTimerInitialized) return;
    this.isTimerInitialized = true;

    // Run every second to advance the active work or break timer seamlessly based on timestamps
    interval(1000).subscribe(() => {
      const current = this.statusSubject.value;
      if (!current) return;

      if (current.state === 'Working') {
        const idleSec = Math.floor((Date.now() - this.lastInteractionTimestamp) / 1000);
        const remaining = Math.max(0, this.idleTimeoutSeconds - idleSec);
        this.idleCountdownSubject.next(remaining);

        // Check 5-minute inactivity timeout
        if (idleSec >= this.idleTimeoutSeconds) {
          this.pauseDueToIdle();
          return;
        }

        let workSec = current.currentWorkSeconds || 0;
        if (current.lastWorkResumedAtUtc) {
          const resumedMs = new Date(current.lastWorkResumedAtUtc).getTime();
          if (!isNaN(resumedMs)) {
            const elapsed = Math.max(0, Math.floor((Date.now() - resumedMs) / 1000));
            workSec = (current.totalWorkSeconds || 0) + elapsed;
          } else {
            workSec++;
          }
        } else {
          workSec++;
        }

        const updated: UserActivityStatusDto = {
          ...current,
          currentWorkSeconds: workSec
        };
        this.statusSubject.next(updated);
      } else if (current.state === 'Idle') {
        // While Idle, timer is frozen!
        this.idleCountdownSubject.next(0);
      } else if (current.state === 'OnBreak') {
        let breakSec = current.currentBreakSeconds || 0;
        if (current.currentBreakStartedAtUtc) {
          const breakStartMs = new Date(current.currentBreakStartedAtUtc).getTime();
          if (!isNaN(breakStartMs)) {
            const elapsed = Math.max(0, Math.floor((Date.now() - breakStartMs) / 1000));
            breakSec = (current.totalBreakSeconds || 0) + elapsed;
          } else {
            breakSec++;
          }
        } else {
          breakSec++;
        }

        const exceeded = breakSec > 3600;
        const faults = exceeded ? Math.max(1, Math.floor((breakSec - 3600) / 600) + 1) : current.faultsCount;
        const faultReason = exceeded ? `Exceeded 1-hour allowed break by ${Math.floor((breakSec - 3600) / 60)}m` : current.faultReason;

        const updated: UserActivityStatusDto = {
          ...current,
          currentBreakSeconds: breakSec,
          breakSecondsRemaining: Math.max(0, 3600 - breakSec),
          hasExceededBreak: exceeded,
          faultsCount: faults,
          faultReason: faultReason
        };
        this.statusSubject.next(updated);
      }
    });

    // Send heartbeat every 60 seconds
    interval(60000).subscribe(() => {
      const current = this.statusSubject.value;
      if (current && (current.state === 'Working' || current.state === 'OnBreak' || current.state === 'Idle')) {
        this.sendHeartbeat().subscribe();
      }
    });
  }

  public loadMyStatus(): Observable<ApiResponse<UserActivityStatusDto>> {
    return this.http.get<ApiResponse<UserActivityStatusDto>>(`${this.apiUrl}/my-status`).pipe(
      tap(res => {
        if (res.data) {
          this.setStatus(res.data);
        }
      }),
      catchError(err => {
        // Fallback demo state if offline
        const fallback: UserActivityStatusDto = {
          employeeId: 'emp-1',
          employeeNumber: 'EMP-001',
          employeeName: 'Sarah Connor',
          departmentName: 'Executive Leadership',
          jobTitle: 'Chief Executive Officer',
          date: new Date().toISOString(),
          state: 'NotStarted',
          totalWorkSeconds: 0,
          totalBreakSeconds: 0,
          currentWorkSeconds: 0,
          currentBreakSeconds: 0,
          isLate: false,
          lateMinutes: 0,
          faultsCount: 0,
          breakSecondsRemaining: 3600,
          hasExceededBreak: false,
          serverTimeUtc: new Date().toISOString()
        };
        this.setStatus(fallback);
        return of({ success: true, data: fallback } as ApiResponse<UserActivityStatusDto>);
      })
    );
  }

  public executeAction(request: ActivityActionRequest): Observable<ApiResponse<UserActivityStatusDto>> {
    const now = new Date();
    const payload: ActivityActionRequest = {
      ...request,
      clientLocalHour: request.clientLocalHour ?? now.getHours(),
      clientLocalMinute: request.clientLocalMinute ?? now.getMinutes()
    };

    return this.http.post<ApiResponse<UserActivityStatusDto>>(`${this.apiUrl}/action`, payload).pipe(
      tap(res => {
        if (res.data) {
          this.setStatus(res.data);
        }
      })
    );
  }

  public getMyHistory(days = 30): Observable<ApiResponse<LiveEmployeeActivityDto[]>> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<ApiResponse<LiveEmployeeActivityDto[]>>(`${this.apiUrl}/my-history`, { params });
  }

  public getLiveMonitor(): Observable<ApiResponse<LiveMonitorResponse>> {
    return this.http.get<ApiResponse<LiveMonitorResponse>>(`${this.apiUrl}/live-monitor`);
  }

  public getActivityReport(filter: ActivityReportFilter): Observable<ApiResponse<ActivityReportResponse>> {
    let params = new HttpParams();
    if (filter.dateFrom) params = params.set('dateFrom', filter.dateFrom);
    if (filter.dateTo) params = params.set('dateTo', filter.dateTo);
    if (filter.departmentId) params = params.set('departmentId', filter.departmentId);
    if (filter.employeeId) params = params.set('employeeId', filter.employeeId);
    if (filter.state) params = params.set('state', filter.state);
    if (filter.lateOnly !== undefined) params = params.set('lateOnly', filter.lateOnly.toString());
    if (filter.faultsOnly !== undefined) params = params.set('faultsOnly', filter.faultsOnly.toString());
    if (filter.page) params = params.set('page', filter.page.toString());
    if (filter.pageSize) params = params.set('pageSize', filter.pageSize.toString());

    return this.http.get<ApiResponse<ActivityReportResponse>>(`${this.apiUrl}/report`, { params });
  }

  public sendHeartbeat(): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/heartbeat`, {});
  }

  public formatDuration(totalSeconds: number): string {
    if (!totalSeconds || totalSeconds < 0) return '00:00:00';
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }

  public formatShortDuration(totalSeconds: number): string {
    if (!totalSeconds || totalSeconds < 0) return '0m';
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  }
}
