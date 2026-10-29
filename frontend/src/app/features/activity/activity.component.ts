import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { ActivityService } from '../../core/services/activity.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import {
  ActivityState,
  UserActivityStatusDto,
  LiveEmployeeActivityDto,
  LiveMonitorResponse,
  ActivityReportResponse
} from '../../core/models/models';

@Component({
  selector: 'app-activity',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="activity-page">
      <!-- Top Operational Header -->
      <header class="activity-header">
        <div class="header-left">
          <div class="header-icon-box">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div>
            <div class="title-row">
              <h1 class="page-title">Activity & Time Tracking</h1>
              <span class="live-pill">
                <span class="pulse-dot"></span>
                LIVE RADAR
              </span>
            </div>
            <p class="page-subtitle">Continuous workplace activity monitoring, break governance & daily punctuality logs</p>
          </div>
        </div>

        <div class="header-actions">
          <!-- Policy Badges -->
          <div class="policy-badge-group">
            <div class="policy-chip on-time-window">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 10"/></svg>
              <span>Clock-in: <strong>08:00 – 08:10 AM</strong></span>
            </div>
            <div class="policy-chip break-rule">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
              <span>Break Allowance: <strong>1h Max</strong></span>
            </div>
          </div>

          <!-- Primary Trigger Button for Modal -->
          <button (click)="openActionModal()" class="btn-primary-clock">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
            <span>Time Clock Controls</span>
          </button>
        </div>
      </header>

      <!-- Navigation Tabs -->
      <div class="tab-navigation">
        <button (click)="activeTab = 'radar'" class="tab-btn" [class.active]="activeTab === 'radar'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          <span>Live Workforce Radar</span>
          <span class="tab-counter">{{ liveData?.employees?.length || 0 }}</span>
        </button>

        <button (click)="activeTab = 'my-activity'" class="tab-btn" [class.active]="activeTab === 'my-activity'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>My Daily Shift</span>
          <span *ngIf="myStatus" class="status-indicator-badge" [ngClass]="getStateBadgeClass(myStatus.state)">
            {{ myStatus.state }}
          </span>
        </button>

        <button (click)="activeTab = 'reports'" class="tab-btn" [class.active]="activeTab === 'reports'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          <span>Executive Audit & Reports</span>
        </button>
      </div>

      <!-- ======================================================== -->
      <!-- TAB 1: LIVE WORKFORCE RADAR (OWNER / MANAGER REALTIME)    -->
      <!-- ======================================================== -->
      <section *ngIf="activeTab === 'radar'" class="tab-content radar-section">
        <!-- Telemetry KPI Overview Cards -->
        <div class="kpi-grid">
          <div class="kpi-card card-working">
            <div class="kpi-header">
              <span class="kpi-title">Currently Working</span>
              <span class="kpi-icon working-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </span>
            </div>
            <div class="kpi-value text-emerald">{{ liveData?.workingCount || 0 }}</div>
            <div class="kpi-footer">Active keyboard / PC sessions</div>
          </div>

          <div class="kpi-card card-idle">
            <div class="kpi-header">
              <span class="kpi-title">Idle (Auto-Paused)</span>
              <span class="kpi-icon idle-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/></svg>
              </span>
            </div>
            <div class="kpi-value text-amber">{{ liveData?.idleCount || 0 }}</div>
            <div class="kpi-footer">No mouse move for 5+ mins</div>
          </div>

          <div class="kpi-card card-break">
            <div class="kpi-header">
              <span class="kpi-title">On Break</span>
              <span class="kpi-icon break-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              </span>
            </div>
            <div class="kpi-value text-amber">{{ liveData?.onBreakCount || 0 }}</div>
            <div class="kpi-footer">Stepped away / paused work</div>
          </div>

          <div class="kpi-card card-closed">
            <div class="kpi-header">
              <span class="kpi-title">Shift Closed / Done</span>
              <span class="kpi-icon closed-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
            </div>
            <div class="kpi-value text-slate">{{ liveData?.closedCount || 0 }}</div>
            <div class="kpi-footer">Ended session & logged out</div>
          </div>

          <div class="kpi-card card-notstarted">
            <div class="kpi-header">
              <span class="kpi-title">Not Started Today</span>
              <span class="kpi-icon notstarted-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </span>
            </div>
            <div class="kpi-value text-zinc">{{ liveData?.notStartedCount || 0 }}</div>
            <div class="kpi-footer">Pending morning clock-in</div>
          </div>

          <div class="kpi-card card-late">
            <div class="kpi-header">
              <span class="kpi-title">Late Arrivals Today</span>
              <span class="kpi-icon late-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 15 15"/></svg>
              </span>
            </div>
            <div class="kpi-value text-rose">{{ liveData?.lateTodayCount || 0 }}</div>
            <div class="kpi-footer">Clocked in after 08:10 AM</div>
          </div>

          <div class="kpi-card card-faults">
            <div class="kpi-header">
              <span class="kpi-title">Break Faults Today</span>
              <span class="kpi-icon fault-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </span>
            </div>
            <div class="kpi-value text-red">{{ liveData?.faultsTodayCount || 0 }}</div>
            <div class="kpi-footer">Exceeded 1-hour break limit</div>
          </div>
        </div>

        <!-- Filter & Search Controls -->
        <div class="radar-toolbar">
          <div class="filter-pill-group">
            <button (click)="radarFilter = 'All'" class="filter-pill" [class.active]="radarFilter === 'All'">All ({{ liveData?.employees?.length || 0 }})</button>
            <button (click)="radarFilter = 'Working'" class="filter-pill" [class.active]="radarFilter === 'Working'">🟢 Working ({{ liveData?.workingCount || 0 }})</button>
            <button (click)="radarFilter = 'Idle'" class="filter-pill" [class.active]="radarFilter === 'Idle'">⏸️ Idle ({{ liveData?.idleCount || 0 }})</button>
            <button (click)="radarFilter = 'OnBreak'" class="filter-pill" [class.active]="radarFilter === 'OnBreak'">🟡 In Break ({{ liveData?.onBreakCount || 0 }})</button>
            <button (click)="radarFilter = 'Closed'" class="filter-pill" [class.active]="radarFilter === 'Closed'">⚪ Closed ({{ liveData?.closedCount || 0 }})</button>
            <button (click)="radarFilter = 'NotStarted'" class="filter-pill" [class.active]="radarFilter === 'NotStarted'">⏳ Awaiting ({{ liveData?.notStartedCount || 0 }})</button>
            <button (click)="radarFilter = 'Late'" class="filter-pill" [class.active]="radarFilter === 'Late'">⚠️ Late ({{ liveData?.lateTodayCount || 0 }})</button>
            <button (click)="radarFilter = 'Faults'" class="filter-pill" [class.active]="radarFilter === 'Faults'">🚨 Over-Break ({{ liveData?.faultsTodayCount || 0 }})</button>
          </div>

          <div class="search-and-refresh">
            <div class="search-input-box">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" [(ngModel)]="searchQuery" placeholder="Search by name or code (EMP-001)..." class="search-field" />
            </div>

            <button (click)="loadLiveData()" class="btn-refresh" title="Refresh Live Radar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" [class.spin]="loadingLive"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            </button>
          </div>
        </div>

        <!-- Live Employee Cards Grid -->
        <div class="employee-grid">
          <div *ngFor="let emp of filteredLiveEmployees" class="employee-card" [ngClass]="getCardBorderClass(emp.state)">
            <div class="emp-card-top">
              <div class="emp-info">
                <div class="emp-avatar-box">
                  <div class="emp-avatar">{{ getInitials(emp.employeeName) }}</div>
                  <span class="avatar-status-dot" [ngClass]="getDotClass(emp.state)"></span>
                </div>
                <div>
                  <div class="emp-name-row">
                    <h3 class="emp-name">{{ emp.employeeName }}</h3>
                    <span class="emp-code">{{ emp.employeeNumber }}</span>
                  </div>
                  <p class="emp-role">{{ emp.jobTitle }} • {{ emp.departmentName }}</p>
                </div>
              </div>

              <!-- Main State Badge -->
              <span class="state-badge" [ngClass]="getStateBadgeClass(emp.state)">
                <span *ngIf="emp.state === 'Working'" class="pulse-emerald"></span>
                <span *ngIf="emp.state === 'Idle'" class="pulse-amber"></span>
                <span *ngIf="emp.state === 'OnBreak'" class="pulse-amber"></span>
                {{ emp.state === 'OnBreak' ? 'In Break' : (emp.state === 'Idle' ? 'Idle (Paused)' : emp.state) }}
              </span>
            </div>

            <!-- Time Stats Container -->
            <div class="emp-card-stats">
              <!-- Actual Work Timer -->
              <div class="stat-block work-stat">
                <div class="stat-label">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span>Actual Worked</span>
                </div>
                <div class="stat-value font-mono" [class.text-emerald]="emp.state === 'Working'">
                  {{ activityService.formatDuration(emp.currentWorkSeconds) }}
                </div>
              </div>

              <!-- Break Timer -->
              <div class="stat-block break-stat">
                <div class="stat-label">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/></svg>
                  <span>Break Time</span>
                </div>
                <div class="stat-value font-mono" [class.text-amber]="emp.state === 'OnBreak'" [class.text-red]="emp.breakExceeded">
                  {{ activityService.formatDuration(emp.currentBreakSeconds) }}
                  <span class="limit-caption">/ 60m</span>
                </div>
              </div>
            </div>

            <!-- Policy Flags & Timestamps -->
            <div class="emp-card-footer">
              <div class="timestamps-row">
                <span *ngIf="emp.workStartedAtUtc" class="time-stamp">
                  <strong>Open PC:</strong> {{ formatTimeOnly(emp.workStartedAtUtc) }}
                </span>
                <span *ngIf="emp.workEndedAtUtc" class="time-stamp">
                  <strong>Closed PC:</strong> {{ formatTimeOnly(emp.workEndedAtUtc) }}
                </span>
                <span *ngIf="!emp.workStartedAtUtc" class="time-stamp text-muted">
                  No clock-in recorded today
                </span>
              </div>

              <div class="flags-row">
                <!-- Punctuality Tag -->
                <span *ngIf="emp.workStartedAtUtc && !emp.isLate" class="tag tag-ontime">
                  ✓ On Time (8:00-8:10)
                </span>
                <span *ngIf="emp.isLate" class="tag tag-late">
                  ⚠️ Late by {{ emp.lateMinutes }}m
                </span>

                <!-- Over Break Fault Tag -->
                <span *ngIf="emp.faultsCount > 0" class="tag tag-fault">
                  🚨 Fault: {{ emp.faultsCount }} (Over-break)
                </span>
              </div>
            </div>
          </div>
        </div>

        <div *ngIf="filteredLiveEmployees.length === 0" class="empty-state-box">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          <p>No workforce members matched the selected filter criteria.</p>
        </div>
      </section>

      <!-- ======================================================== -->
      <!-- TAB 2: MY DAILY ACTIVITY & CLOCK (EMPLOYEE DASHBOARD)    -->
      <!-- ======================================================== -->
      <section *ngIf="activeTab === 'my-activity'" class="tab-content personal-section">
        <div class="personal-hero-card">
          <div class="hero-left">
            <div class="profile-header">
              <div class="personal-avatar">{{ getInitials(myStatus?.employeeName || 'Me') }}</div>
              <div>
                <h2 class="personal-name">{{ myStatus?.employeeName || 'Current Employee' }}</h2>
                <p class="personal-sub">{{ myStatus?.jobTitle }} • Code: <strong>{{ myStatus?.employeeNumber || 'N/A' }}</strong></p>
              </div>
              <span class="personal-status-pill" [ngClass]="getStateBadgeClass(myStatus?.state || 'NotStarted')">
                <span *ngIf="myStatus?.state === 'Working'" class="pulse-emerald"></span>
                <span *ngIf="myStatus?.state === 'Idle'" class="pulse-amber"></span>
                <span *ngIf="myStatus?.state === 'OnBreak'" class="pulse-amber"></span>
                {{ myStatus?.state === 'OnBreak' ? 'In Break' : (myStatus?.state === 'Idle' ? 'Idle (Auto-Paused)' : (myStatus?.state || 'Not Started')) }}
              </span>
            </div>

            <!-- Inactivity Alert Message in My Daily Shift -->
            <div *ngIf="myStatus?.state === 'Idle'" class="idle-alert-banner">
              <span class="idle-banner-icon">⏸️</span>
              <div class="idle-banner-text">
                <strong>Inactivity Auto-Pause Active:</strong> No mouse movement was detected for 5 minutes. The work clock has stopped.
                <div class="idle-banner-hint">Move your mouse, click anywhere, or press any key to resume counting immediately.</div>
              </div>
              <button (click)="activityService.resumeFromIdle()" class="btn-resume-idle-now">
                ▶️ Resume Timer Now
              </button>
            </div>

            <!-- Inactivity Guard Countdown (visible when working) -->
            <div *ngIf="myStatus?.state === 'Working'" class="idle-countdown-hint">
              <span class="dot-guard-active"></span>
              <span>Inactivity Guard: Pauses if no mouse movement for 5 minutes (remaining: <strong>{{ activityService.formatDuration((activityService.idleCountdown$ | async) || 0) }}</strong>)</span>
            </div>

            <!-- Big Live Digital Stopwatch -->
            <div class="personal-timer-display">
              <div class="timer-box">
                <span class="timer-label">ACTUAL WORK TIME TODAY</span>
                <span class="timer-digits">{{ activityService.formatDuration(myStatus?.currentWorkSeconds || 0) }}</span>
              </div>

              <div class="timer-box break-meter-box">
                <div class="break-meter-header">
                  <span class="timer-label">BREAK DURATION (1 HOUR ALLOWANCE)</span>
                  <span class="break-fraction" [class.text-red]="myStatus?.hasExceededBreak">
                    {{ Math.floor((myStatus?.currentBreakSeconds || 0) / 60) }} / 60 mins
                  </span>
                </div>
                <!-- Visual Break Bar -->
                <div class="break-progress-track">
                  <div class="break-progress-fill" 
                       [style.width.%]="getBreakPercentage(myStatus?.currentBreakSeconds || 0)"
                       [ngClass]="getBreakBarClass(myStatus?.currentBreakSeconds || 0)">
                  </div>
                </div>
                <div class="break-footer-note">
                  <span *ngIf="!myStatus?.hasExceededBreak">
                    {{ Math.max(0, 60 - Math.floor((myStatus?.currentBreakSeconds || 0) / 60)) }} minutes break remaining
                  </span>
                  <span *ngIf="myStatus?.hasExceededBreak" class="text-red font-bold">
                    ⚠️ Policy Fault: Exceeded 1-hour break limit!
                  </span>
                </div>
              </div>
            </div>

            <!-- Shift Checkpoints -->
            <div class="checkpoints-grid">
              <div class="checkpoint-item">
                <div class="cp-title">PC Opened (Start)</div>
                <div class="cp-val">{{ formatTimeOnly(myStatus?.workStartedAtUtc) }}</div>
                <div *ngIf="myStatus?.workStartedAtUtc" class="cp-tag">
                  <span *ngIf="!myStatus?.isLate" class="tag tag-ontime">✓ On Time</span>
                  <span *ngIf="myStatus?.isLate" class="tag tag-late">⚠️ Late (+{{ myStatus?.lateMinutes }}m)</span>
                </div>
              </div>

              <div class="checkpoint-item">
                <div class="cp-title">PC Closed (End)</div>
                <div class="cp-val">{{ formatTimeOnly(myStatus?.workEndedAtUtc) }}</div>
                <div class="cp-tag text-muted">
                  {{ myStatus?.workEndedAtUtc ? 'Completed' : 'Session open' }}
                </div>
              </div>

              <div class="checkpoint-item">
                <div class="cp-title">Policy Faults</div>
                <div class="cp-val" [class.text-red]="(myStatus?.faultsCount || 0) > 0">
                  {{ myStatus?.faultsCount || 0 }} Fault(s)
                </div>
                <div class="cp-tag text-muted">
                  {{ (myStatus?.faultsCount || 0) === 0 ? '✓ Clean Record' : myStatus?.faultReason }}
                </div>
              </div>
            </div>
          </div>

          <!-- Hero Action Controls -->
          <div class="hero-actions-panel">
            <h3 class="action-panel-title">Quick Time Controls</h3>
            <p class="action-panel-sub">Record active shift events in real-time:</p>

            <button (click)="executeQuickAction('Start')" 
                    [disabled]="submittingAction || myStatus?.state === 'Working'"
                    class="action-btn btn-start-work">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <span>{{ myStatus?.state === 'Closed' ? 'Restart Work' : 'Start Work' }}</span>
            </button>

            <button (click)="executeQuickAction(myStatus?.state === 'OnBreak' ? 'Resume' : 'Break')" 
                    [disabled]="submittingAction || myStatus?.state === 'NotStarted' || myStatus?.state === 'Closed'"
                    class="action-btn btn-break-work"
                    [class.btn-resume]="myStatus?.state === 'OnBreak'">
              <svg *ngIf="myStatus?.state !== 'OnBreak'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              <svg *ngIf="myStatus?.state === 'OnBreak'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <span>{{ myStatus?.state === 'OnBreak' ? 'Resume Work' : 'Take Break' }}</span>
            </button>

            <button (click)="executeQuickAction('End')" 
                    [disabled]="submittingAction || myStatus?.state === 'NotStarted' || myStatus?.state === 'Closed'"
                    class="action-btn btn-end-work">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>
              <span>End Work (Close PC)</span>
            </button>
          </div>
        </div>

        <!-- Personal 30-Day Activity History -->
        <div class="history-table-card">
          <div class="history-header">
            <h3 class="section-title">My Recent Activity History (Last 30 Days)</h3>
            <span class="text-muted text-sm">{{ myHistory.length }} recorded session(s)</span>
          </div>

          <div class="table-responsive">
            <table class="activity-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Clock-In (Open PC)</th>
                  <th>Clock-Out (Close PC)</th>
                  <th>Total Worked</th>
                  <th>Total Break</th>
                  <th>Punctuality</th>
                  <th>Faults</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let record of myHistory">
                  <td><strong>{{ formatDate(record.date) }}</strong></td>
                  <td>{{ formatTimeOnly(record.workStartedAtUtc) }}</td>
                  <td>{{ formatTimeOnly(record.workEndedAtUtc) }}</td>
                  <td class="font-mono font-bold">{{ activityService.formatShortDuration(record.totalWorkSeconds) }}</td>
                  <td class="font-mono">{{ activityService.formatShortDuration(record.totalBreakSeconds) }}</td>
                  <td>
                    <span *ngIf="!record.isLate" class="tag tag-ontime">✓ On Time</span>
                    <span *ngIf="record.isLate" class="tag tag-late">⚠️ Late (+{{ record.lateMinutes }}m)</span>
                  </td>
                  <td>
                    <span *ngIf="record.faultsCount === 0" class="tag tag-clean">0 Clean</span>
                    <span *ngIf="record.faultsCount > 0" class="tag tag-fault">🚨 {{ record.faultsCount }} Fault</span>
                  </td>
                </tr>
                <tr *ngIf="myHistory.length === 0">
                  <td colspan="7" class="text-center py-6 text-muted">No prior activity history found.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- ======================================================== -->
      <!-- TAB 3: EXECUTIVE AUDIT & REPORTS (OWNER VIEW)            -->
      <!-- ======================================================== -->
      <section *ngIf="activeTab === 'reports'" class="tab-content reports-section">
        <!-- Filter Controls Bar -->
        <div class="reports-filter-bar">
          <div class="filter-controls-group">
            <div class="filter-field">
              <label>Punctuality & Faults</label>
              <select [(ngModel)]="reportLateFilter" (change)="loadReportData()" class="report-select">
                <option value="all">All Records</option>
                <option value="lateOnly">Late Arrivals Only (> 8:10 AM)</option>
                <option value="faultsOnly">Break Policy Violations Only</option>
              </select>
            </div>

            <div class="filter-field">
              <label>Activity State</label>
              <select [(ngModel)]="reportStateFilter" (change)="loadReportData()" class="report-select">
                <option value="all">All States</option>
                <option value="Working">Working</option>
                <option value="OnBreak">On Break</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          <div class="report-actions">
            <button (click)="exportReport('csv')" class="btn-export">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Export CSV</span>
            </button>
            <button (click)="exportReport('json')" class="btn-export">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        <!-- Aggregated Report Metric Highlights -->
        <div class="report-summary-cards">
          <div class="summary-card">
            <div class="sum-title">Total Tracked Work</div>
            <div class="sum-value">{{ reportData?.totalWorkHours || 0 }}h</div>
            <div class="sum-sub">Across all organization personnel</div>
          </div>

          <div class="summary-card">
            <div class="sum-title">Total Break Hours</div>
            <div class="sum-value">{{ reportData?.totalBreakHours || 0 }}h</div>
            <div class="sum-sub">Accumulated pauses</div>
          </div>

          <div class="summary-card">
            <div class="sum-title">Late Check-ins</div>
            <div class="sum-value text-rose">{{ reportData?.totalLateCount || 0 }}</div>
            <div class="sum-sub">Logged in after 08:10 AM</div>
          </div>

          <div class="summary-card">
            <div class="sum-title">Break Policy Faults</div>
            <div class="sum-value text-red">{{ reportData?.totalFaultsCount || 0 }}</div>
            <div class="sum-sub">Exceeded 1-hour daily limit</div>
          </div>

          <div class="summary-card">
            <div class="sum-title">Avg Work Day</div>
            <div class="sum-value">{{ reportData?.averageWorkHoursPerDay || 0 }}h</div>
            <div class="sum-sub">Per logged shift</div>
          </div>
        </div>

        <!-- Master Organization Activity Ledger -->
        <div class="report-table-card">
          <div class="table-responsive">
            <table class="activity-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Department</th>
                  <th>Open PC</th>
                  <th>Close PC</th>
                  <th>Total Worked</th>
                  <th>Total Break</th>
                  <th>Punctuality</th>
                  <th>Faults</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of reportData?.records">
                  <td>
                    <div class="emp-cell">
                      <strong>{{ row.employeeName }}</strong>
                      <span class="text-xs text-muted">{{ row.employeeNumber }}</span>
                    </div>
                  </td>
                  <td>{{ formatDate(row.date) }}</td>
                  <td>{{ row.departmentName }}</td>
                  <td>{{ formatTimeOnly(row.workStartedAtUtc) }}</td>
                  <td>{{ formatTimeOnly(row.workEndedAtUtc) }}</td>
                  <td class="font-mono font-bold">{{ activityService.formatShortDuration(row.totalWorkSeconds) }}</td>
                  <td class="font-mono">{{ activityService.formatShortDuration(row.totalBreakSeconds) }}</td>
                  <td>
                    <span *ngIf="row.workStartedAtUtc && !row.isLate" class="tag tag-ontime">✓ On Time</span>
                    <span *ngIf="row.isLate" class="tag tag-late">⚠️ Late (+{{ row.lateMinutes }}m)</span>
                    <span *ngIf="!row.workStartedAtUtc" class="text-muted text-xs">—</span>
                  </td>
                  <td>
                    <span *ngIf="row.faultsCount === 0" class="tag tag-clean">0 Clean</span>
                    <span *ngIf="row.faultsCount > 0" class="tag tag-fault">🚨 {{ row.faultsCount }} Fault</span>
                  </td>
                </tr>
                <tr *ngIf="!reportData?.records || reportData!.records.length === 0">
                  <td colspan="9" class="text-center py-8 text-muted">No activity records match the selected filter.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- ======================================================== -->
      <!-- MODAL POPUP: TIME CLOCK POPUP WITH 3 BUTTONS             -->
      <!-- ======================================================== -->
      <div *ngIf="showModal" class="modal-backdrop" (click)="closeModalOnBackdrop($event)">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-row">
              <div class="clock-icon-badge">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div>
                <h2 class="modal-title">Employee Time Clock</h2>
                <p class="modal-subtitle">Authenticate with your code & password to record shift events</p>
              </div>
            </div>
            <button (click)="closeActionModal()" class="btn-close-modal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <!-- Real-Time Client Clock & Punctuality Meter -->
          <div class="live-clock-card">
            <div class="clock-time-display">
              <span class="digital-clock">{{ currentClockDisplay }}</span>
              <span class="clock-tz">Local Workstation Time</span>
            </div>

            <div class="punctuality-banner" [ngClass]="isCurrentlyLate() ? 'banner-late' : 'banner-ontime'">
              <span *ngIf="!isCurrentlyLate()">
                ✓ <strong>Standard Window Active (08:00 – 08:10 AM):</strong> Pressing <strong>Start</strong> now will log you as <strong>On Time</strong>.
              </span>
              <span *ngIf="isCurrentlyLate()">
                ⚠️ <strong>Past 08:10 AM:</strong> Clocking in now will record your status as <strong>Late</strong> (+{{ getMinutesLateNow() }} minutes).
              </span>
            </div>
          </div>

          <!-- Form Fields: Code & Password -->
          <div class="modal-form">
            <div class="form-group">
              <label class="form-label">Employee Code <span class="text-rose">*</span></label>
              <div class="input-wrapper">
                <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <input type="text" 
                       [(ngModel)]="employeeCodeInput" 
                       placeholder="e.g. EMP-001" 
                       class="form-input" 
                       autocomplete="username" />
              </div>
              <span class="field-hint">Enter your designated employee code (e.g., EMP-001, EMP-002, EMP-003)</span>
            </div>

            <div class="form-group">
              <label class="form-label">Password <span class="text-rose">*</span></label>
              <div class="input-wrapper">
                <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input [type]="showPassword ? 'text' : 'password'" 
                       [(ngModel)]="passwordInput" 
                       placeholder="Enter your account password" 
                       class="form-input" 
                       autocomplete="current-password" />
                <button type="button" (click)="showPassword = !showPassword" class="btn-toggle-eye">
                  <svg *ngIf="!showPassword" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  <svg *ngIf="showPassword" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                </button>
              </div>
            </div>

            <!-- Optional Shift Note -->
            <div class="form-group">
              <label class="form-label">Session Note <span class="text-muted">(Optional)</span></label>
              <input type="text" [(ngModel)]="sessionNotesInput" placeholder="e.g. Remote work session, project sync..." class="form-input" />
            </div>

            <!-- Error Banner -->
            <div *ngIf="actionError" class="action-error-banner">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>{{ actionError }}</span>
            </div>

            <!-- Split Shift Notice if shift was closed earlier -->
            <div *ngIf="myStatus?.state === 'Closed'" style="margin-bottom: 1.25rem; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.85rem; border: 1px solid rgba(56, 189, 248, 0.4); background: rgba(56, 189, 248, 0.1); color: #bae6fd;">
              <span>ℹ️ <strong>Split Shift:</strong> Your earlier shift was paused ({{ activityService.formatShortDuration(myStatus?.totalWorkSeconds || 0) }} worked). Press <strong>REOPEN SHIFT</strong> below to continue your daily shift hours.</span>
            </div>

            <!-- ======================================================== -->
            <!-- THE 3 PRIMARY ACTION BUTTONS: START, BREAK, END           -->
            <!-- ======================================================== -->
            <div class="clock-action-buttons-grid">
              <!-- BUTTON 1: START -->
              <button (click)="submitClockAction('Start')" 
                      [disabled]="submittingAction || myStatus?.state === 'Working'"
                      class="clock-big-btn btn-action-start">
                <div class="btn-icon-wrapper">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
                <div class="btn-text-content">
                  <span class="btn-primary-text">{{ myStatus?.state === 'Closed' ? 'REOPEN SHIFT' : 'START WORK' }}</span>
                  <span class="btn-sub-text">{{ myStatus?.state === 'Closed' ? 'Continue split shift' : 'Begin active timer' }}</span>
                </div>
              </button>

              <!-- BUTTON 2: BREAK / RESUME -->
              <button (click)="submitClockAction(myStatus?.state === 'OnBreak' ? 'Resume' : 'Break')" 
                      [disabled]="submittingAction || myStatus?.state === 'NotStarted' || myStatus?.state === 'Closed'"
                      class="clock-big-btn btn-action-break"
                      [class.btn-action-resume]="myStatus?.state === 'OnBreak'">
                <div class="btn-icon-wrapper">
                  <svg *ngIf="myStatus?.state !== 'OnBreak'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  <svg *ngIf="myStatus?.state === 'OnBreak'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
                <div class="btn-text-content">
                  <span class="btn-primary-text">{{ myStatus?.state === 'OnBreak' ? 'RESUME WORK' : 'TAKE BREAK' }}</span>
                  <span class="btn-sub-text">{{ myStatus?.state === 'OnBreak' ? 'Stop break timer' : '1h daily allowance' }}</span>
                </div>
              </button>

              <!-- BUTTON 3: END -->
              <button (click)="submitClockAction('End')" 
                      [disabled]="submittingAction || myStatus?.state === 'NotStarted' || myStatus?.state === 'Closed'"
                      class="clock-big-btn btn-action-end">
                <div class="btn-icon-wrapper">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>
                </div>
                <div class="btn-text-content">
                  <span class="btn-primary-text">END WORK</span>
                  <span class="btn-sub-text">Close PC & finish day</span>
                </div>
              </button>
            </div>
          </div>

          <div class="modal-footer-notice">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <span>All timestamps are audited and preserved for organizational compliance and payroll calculations.</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .activity-page {
      padding: 1.5rem;
      max-width: 1600px;
      margin: 0 auto;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    /* Header */
    .activity-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1.25rem;
      margin-bottom: 1.5rem;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .header-icon-box {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.1));
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #10b981;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .title-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .page-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #f8fafc;
      margin: 0;
      letter-spacing: -0.02em;
    }

    .live-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.35);
      color: #34d399;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.05em;
    }

    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
      animation: pulseAnim 1.8s infinite;
    }

    @keyframes pulseAnim {
      0% { transform: scale(0.9); opacity: 0.8; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { transform: scale(1.1); opacity: 1; box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
      100% { transform: scale(0.9); opacity: 0.8; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }

    .page-subtitle {
      font-size: 0.875rem;
      color: #94a3b8;
      margin: 0.2rem 0 0 0;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .policy-badge-group {
      display: flex;
      gap: 0.5rem;
    }

    .policy-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.4rem 0.75rem;
      border-radius: 8px;
      font-size: 0.775rem;
      background: #1e293b;
      border: 1px solid #334155;
      color: #cbd5e1;
    }

    .policy-chip.on-time-window {
      border-color: rgba(16, 185, 129, 0.3);
      color: #6ee7b7;
    }

    .policy-chip.break-rule {
      border-color: rgba(245, 158, 11, 0.3);
      color: #fcd34d;
    }

    .btn-primary-clock {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 1.25rem;
      border-radius: 10px;
      background: linear-gradient(135deg, #059669, #0d9488);
      border: 1px solid rgba(52, 211, 153, 0.4);
      color: #ffffff;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(13, 148, 136, 0.3);
      transition: all 0.2s ease;
    }

    .btn-primary-clock:hover {
      background: linear-gradient(135deg, #10b981, #0f766e);
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(13, 148, 136, 0.4);
    }

    /* Tabs */
    .tab-navigation {
      display: flex;
      gap: 0.5rem;
      border-bottom: 1px solid #334155;
      margin-bottom: 1.5rem;
      padding-bottom: 0.25rem;
    }

    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 1.1rem;
      border-radius: 8px 8px 0 0;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: #94a3b8;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .tab-btn:hover {
      color: #f1f5f9;
      background: rgba(255, 255, 255, 0.03);
    }

    .tab-btn.active {
      color: #38bdf8;
      border-bottom-color: #38bdf8;
      background: rgba(56, 189, 248, 0.05);
    }

    .tab-counter {
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
      background: #334155;
      color: #e2e8f0;
      font-size: 0.72rem;
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .kpi-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 1.1rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      transition: transform 0.2s, border-color 0.2s;
    }

    .kpi-card:hover {
      transform: translateY(-2px);
      border-color: #475569;
    }

    .kpi-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .kpi-title {
      font-size: 0.775rem;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .kpi-icon {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .working-icon { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .idle-icon { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
    .break-icon { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
    .closed-icon { background: rgba(148, 163, 184, 0.15); color: #94a3b8; }
    .notstarted-icon { background: rgba(113, 113, 122, 0.15); color: #a1a1aa; }
    .late-icon { background: rgba(244, 63, 94, 0.15); color: #fb7185; }
    .fault-icon { background: rgba(239, 68, 68, 0.15); color: #f87171; }

    .kpi-value {
      font-size: 1.85rem;
      font-weight: 800;
      line-height: 1.2;
    }

    .kpi-footer {
      font-size: 0.72rem;
      color: #64748b;
    }

    /* Radar Toolbar */
    .radar-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }

    .filter-pill-group {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .filter-pill {
      padding: 0.4rem 0.8rem;
      border-radius: 9999px;
      background: #1e293b;
      border: 1px solid #334155;
      color: #94a3b8;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .filter-pill:hover {
      color: #f1f5f9;
      border-color: #64748b;
    }

    .filter-pill.active {
      background: #3b82f6;
      border-color: #60a5fa;
      color: #ffffff;
    }

    .search-and-refresh {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .search-input-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 0.45rem 0.85rem;
      color: #94a3b8;
    }

    .search-field {
      background: transparent;
      border: none;
      outline: none;
      color: #f8fafc;
      font-size: 0.825rem;
      width: 220px;
    }

    .btn-refresh {
      background: #1e293b;
      border: 1px solid #334155;
      color: #94a3b8;
      border-radius: 8px;
      padding: 0.5rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .btn-refresh:hover {
      color: #f8fafc;
      border-color: #64748b;
    }

    .spin {
      animation: spinAnim 1s linear infinite;
    }

    @keyframes spinAnim {
      100% { transform: rotate(360deg); }
    }

    /* Employee Cards Grid */
    .employee-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.1rem;
    }

    .employee-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 1.1rem;
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
      transition: all 0.2s;
    }

    .border-working { border-color: rgba(16, 185, 129, 0.4); box-shadow: 0 4px 16px rgba(16, 185, 129, 0.06); }
    .border-idle { border-color: rgba(245, 158, 11, 0.4); box-shadow: 0 4px 16px rgba(245, 158, 11, 0.06); }
    .border-break { border-color: rgba(245, 158, 11, 0.4); box-shadow: 0 4px 16px rgba(245, 158, 11, 0.06); }
    .border-closed { border-color: #334155; }
    .border-notstarted { border-color: #27272a; opacity: 0.85; }

    .emp-card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .emp-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .emp-avatar-box {
      position: relative;
    }

    .emp-avatar {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      color: #fff;
      font-weight: 700;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .avatar-status-dot {
      position: absolute;
      bottom: -2px;
      right: -2px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 2px solid #1e293b;
    }

    .dot-working { background: #10b981; }
    .dot-idle { background: #f59e0b; }
    .dot-break { background: #f59e0b; }
    .dot-closed { background: #64748b; }
    .dot-notstarted { background: #52525b; }

    .emp-name-row {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .emp-name {
      font-size: 0.95rem;
      font-weight: 600;
      color: #f8fafc;
      margin: 0;
    }

    .emp-code {
      font-size: 0.72rem;
      color: #94a3b8;
      background: #0f172a;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
      font-family: monospace;
    }

    .emp-role {
      font-size: 0.75rem;
      color: #94a3b8;
      margin: 0.15rem 0 0 0;
    }

    .state-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .badge-working { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); color: #34d399; }
    .badge-idle { background: rgba(245, 158, 11, 0.18); border: 1px solid rgba(245, 158, 11, 0.5); color: #fbbf24; }
    .badge-break { background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); color: #fbbf24; }
    .badge-closed { background: rgba(148, 163, 184, 0.12); border: 1px solid rgba(148, 163, 184, 0.3); color: #94a3b8; }
    .badge-notstarted { background: rgba(82, 82, 91, 0.15); border: 1px solid rgba(82, 82, 91, 0.3); color: #a1a1aa; }

    .idle-alert-banner {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: linear-gradient(90deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.12));
      border: 1px solid rgba(245, 158, 11, 0.4);
      border-radius: 10px;
      padding: 0.85rem 1.25rem;
      margin: 1rem 0;

      .idle-banner-icon {
        font-size: 1.5rem;
      }

      .idle-banner-text {
        flex: 1;
        font-size: 0.875rem;
        color: #fef3c7;

        strong {
          color: #fbbf24;
        }

        .idle-banner-hint {
          font-size: 0.775rem;
          color: #cbd5e1;
          margin-top: 0.2rem;
        }
      }

      .btn-resume-idle-now {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.5rem 1rem;
        border-radius: 8px;
        background: linear-gradient(135deg, #f59e0b, #d97706);
        border: 1px solid rgba(245, 158, 11, 0.6);
        color: #ffffff;
        font-weight: 700;
        font-size: 0.825rem;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          box-shadow: 0 0 12px rgba(245, 158, 11, 0.4);
        }
      }
    }

    .idle-countdown-hint {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.775rem;
      color: #94a3b8;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(51, 65, 85, 0.6);
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      margin: 0.75rem 0;

      .dot-guard-active {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #10b981;
        box-shadow: 0 0 6px #10b981;
      }

      strong {
        color: #38bdf8;
        font-family: monospace;
      }
    }

    .pulse-emerald {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
    }

    .pulse-amber {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #f59e0b;
      box-shadow: 0 0 8px #f59e0b;
    }

    .emp-card-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.6rem;
      background: #0f172a;
      border-radius: 8px;
      padding: 0.65rem 0.85rem;
    }

    .stat-block {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .stat-label {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.68rem;
      color: #94a3b8;
      text-transform: uppercase;
      font-weight: 600;
    }

    .stat-value {
      font-size: 1.05rem;
      font-weight: 700;
      color: #e2e8f0;
    }

    .limit-caption {
      font-size: 0.72rem;
      color: #64748b;
      font-weight: normal;
    }

    .emp-card-footer {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      border-top: 1px solid #334155;
      padding-top: 0.65rem;
    }

    .timestamps-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.72rem;
      color: #94a3b8;
    }

    .flags-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    .tag {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
    }

    .tag-ontime { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .tag-late { background: rgba(244, 63, 94, 0.15); color: #fb7185; }
    .tag-fault { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }
    .tag-clean { background: rgba(148, 163, 184, 0.12); color: #94a3b8; }

    /* Personal Hero Card */
    .personal-hero-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 1.75rem;
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    }

    @media (max-width: 900px) {
      .personal-hero-card {
        grid-template-columns: 1fr;
      }
    }

    .hero-left {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .profile-header {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .personal-avatar {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: linear-gradient(135deg, #10b981, #0284c7);
      color: #fff;
      font-size: 1.25rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .personal-name {
      font-size: 1.35rem;
      font-weight: 700;
      color: #f8fafc;
      margin: 0;
    }

    .personal-sub {
      font-size: 0.85rem;
      color: #94a3b8;
      margin: 0.2rem 0 0 0;
    }

    .personal-status-pill {
      margin-left: auto;
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      font-size: 0.775rem;
      font-weight: 700;
      text-transform: uppercase;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }

    .personal-timer-display {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 1.25rem;
    }

    @media (max-width: 600px) {
      .personal-timer-display {
        grid-template-columns: 1fr;
      }
    }

    .timer-box {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .timer-label {
      font-size: 0.7rem;
      font-weight: 700;
      color: #94a3b8;
      letter-spacing: 0.05em;
    }

    .timer-digits {
      font-size: 2.25rem;
      font-weight: 800;
      color: #10b981;
      font-family: monospace;
      letter-spacing: -0.02em;
    }

    .break-meter-box {
      justify-content: space-between;
    }

    .break-meter-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .break-fraction {
      font-size: 0.85rem;
      font-weight: 700;
      color: #fbbf24;
      font-family: monospace;
    }

    .break-progress-track {
      width: 100%;
      height: 10px;
      background: #1e293b;
      border-radius: 9999px;
      overflow: hidden;
      margin: 0.4rem 0;
    }

    .break-progress-fill {
      height: 100%;
      border-radius: 9999px;
      transition: width 0.3s ease;
    }

    .bar-normal { background: linear-gradient(90deg, #10b981, #06b6d4); }
    .bar-warning { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
    .bar-danger { background: linear-gradient(90deg, #ef4444, #dc2626); }

    .break-footer-note {
      font-size: 0.72rem;
      color: #94a3b8;
    }

    .checkpoints-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }

    @media (max-width: 600px) {
      .checkpoints-grid {
        grid-template-columns: 1fr;
      }
    }

    .checkpoint-item {
      background: #0f172a;
      border-radius: 8px;
      padding: 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .cp-title {
      font-size: 0.7rem;
      color: #94a3b8;
      text-transform: uppercase;
      font-weight: 600;
    }

    .cp-val {
      font-size: 1rem;
      font-weight: 700;
      color: #f1f5f9;
    }

    .cp-tag {
      font-size: 0.72rem;
      margin-top: 0.2rem;
    }

    /* Hero Action Panel */
    .hero-actions-panel {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      justify-content: center;
    }

    .action-panel-title {
      font-size: 1rem;
      font-weight: 700;
      color: #f8fafc;
      margin: 0;
    }

    .action-panel-sub {
      font-size: 0.78rem;
      color: #94a3b8;
      margin: 0 0 0.5rem 0;
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.75rem 1rem;
      border-radius: 10px;
      font-weight: 700;
      font-size: 0.875rem;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }

    .btn-start-work {
      background: linear-gradient(135deg, #10b981, #059669);
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.25);
    }

    .btn-start-work:hover:not(:disabled) {
      background: linear-gradient(135deg, #34d399, #10b981);
      transform: translateY(-1px);
    }

    .btn-break-work {
      background: linear-gradient(135deg, #d97706, #b45309);
      color: #ffffff;
    }

    .btn-break-work:hover:not(:disabled) {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      transform: translateY(-1px);
    }

    .btn-resume {
      background: linear-gradient(135deg, #0284c7, #0369a1);
    }

    .btn-end-work {
      background: linear-gradient(135deg, #dc2626, #b91c1c);
      color: #ffffff;
    }

    .btn-end-work:hover:not(:disabled) {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      transform: translateY(-1px);
    }

    .action-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      transform: none !important;
      box-shadow: none !important;
    }

    /* History & Report Tables */
    .history-table-card, .report-table-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 14px;
      padding: 1.25rem;
    }

    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .section-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: #f8fafc;
      margin: 0;
    }

    .table-responsive {
      overflow-x: auto;
    }

    .activity-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
      text-align: left;
    }

    .activity-table th {
      padding: 0.75rem 0.9rem;
      border-bottom: 1px solid #334155;
      color: #94a3b8;
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .activity-table td {
      padding: 0.85rem 0.9rem;
      border-bottom: 1px solid rgba(51, 65, 85, 0.6);
      color: #e2e8f0;
    }

    .activity-table tbody tr:hover {
      background: rgba(255, 255, 255, 0.02);
    }

    .emp-cell {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    /* Report Section */
    .reports-filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 1rem 1.25rem;
      margin-bottom: 1.25rem;
    }

    .filter-controls-group {
      display: flex;
      flex-wrap: wrap;
      gap: 1.25rem;
    }

    .filter-field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .filter-field label {
      font-size: 0.7rem;
      color: #94a3b8;
      text-transform: uppercase;
      font-weight: 600;
    }

    .report-select {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 6px;
      color: #f1f5f9;
      padding: 0.4rem 0.75rem;
      font-size: 0.825rem;
      outline: none;
    }

    .report-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-export {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: #0f172a;
      border: 1px solid #334155;
      color: #e2e8f0;
      padding: 0.5rem 0.85rem;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-export:hover {
      background: #1e293b;
      border-color: #64748b;
    }

    .report-summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .summary-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 1.1rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .sum-title {
      font-size: 0.75rem;
      color: #94a3b8;
      text-transform: uppercase;
      font-weight: 600;
    }

    .sum-value {
      font-size: 1.65rem;
      font-weight: 800;
      color: #f8fafc;
    }

    .sum-sub {
      font-size: 0.72rem;
      color: #64748b;
    }

    /* Modal Backdrop & Window */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }

    .modal-card {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 18px;
      width: 100%;
      max-width: 580px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      animation: modalSlide 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes modalSlide {
      from { transform: scale(0.95) translateY(10px); opacity: 0; }
      to { transform: scale(1) translateY(0); opacity: 1; }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .modal-title-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .clock-icon-badge {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(14, 165, 233, 0.2));
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34d399;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #f8fafc;
      margin: 0;
    }

    .modal-subtitle {
      font-size: 0.8rem;
      color: #94a3b8;
      margin: 0.2rem 0 0 0;
    }

    .btn-close-modal {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 0.4rem;
      border-radius: 6px;
      transition: all 0.2s;
    }

    .btn-close-modal:hover {
      background: #1e293b;
      color: #f8fafc;
    }

    .live-clock-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 1rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .clock-time-display {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }

    .digital-clock {
      font-size: 1.85rem;
      font-weight: 800;
      font-family: monospace;
      color: #38bdf8;
      letter-spacing: -0.02em;
    }

    .clock-tz {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .punctuality-banner {
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
      font-size: 0.78rem;
      line-height: 1.4;
    }

    .banner-ontime {
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #6ee7b7;
    }

    .banner-late {
      background: rgba(244, 63, 94, 0.12);
      border: 1px solid rgba(244, 63, 94, 0.3);
      color: #fda4af;
    }

    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .form-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #cbd5e1;
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon {
      position: absolute;
      left: 0.85rem;
      color: #64748b;
      pointer-events: none;
    }

    .form-input {
      width: 100%;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 0.65rem 0.85rem 0.65rem 2.5rem;
      color: #f8fafc;
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.2s;
    }

    .form-input:focus {
      border-color: #38bdf8;
      box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
    }

    .btn-toggle-eye {
      position: absolute;
      right: 0.75rem;
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 0.25rem;
    }

    .field-hint {
      font-size: 0.72rem;
      color: #64748b;
    }

    .action-error-banner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 0.85rem;
      border-radius: 8px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #fca5a5;
      font-size: 0.825rem;
    }

    /* The 3 Big Buttons */
    .clock-action-buttons-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      margin-top: 0.5rem;
    }

    @media (max-width: 520px) {
      .clock-action-buttons-grid {
        grid-template-columns: 1fr;
      }
    }

    .clock-big-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1.1rem 0.75rem;
      border-radius: 12px;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }

    .clock-big-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
      transform: none !important;
      box-shadow: none !important;
    }

    .btn-action-start {
      background: linear-gradient(135deg, #10b981, #047857);
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
    }

    .btn-action-start:hover:not(:disabled) {
      background: linear-gradient(135deg, #34d399, #059669);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
    }

    .btn-action-break {
      background: linear-gradient(135deg, #d97706, #92400e);
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(217, 119, 6, 0.3);
    }

    .btn-action-break:hover:not(:disabled) {
      background: linear-gradient(135deg, #f59e0b, #b45309);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(217, 119, 6, 0.4);
    }

    .btn-action-resume {
      background: linear-gradient(135deg, #0284c7, #075985);
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.3);
    }

    .btn-action-resume:hover:not(:disabled) {
      background: linear-gradient(135deg, #38bdf8, #0284c7);
      transform: translateY(-2px);
    }

    .btn-action-end {
      background: linear-gradient(135deg, #e11d48, #9f1239);
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(225, 29, 72, 0.3);
    }

    .btn-action-end:hover:not(:disabled) {
      background: linear-gradient(135deg, #f43f5e, #be123c);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(225, 29, 72, 0.4);
    }

    .btn-primary-text {
      font-size: 0.95rem;
      font-weight: 800;
      letter-spacing: 0.04em;
    }

    .btn-sub-text {
      font-size: 0.68rem;
      opacity: 0.85;
    }

    .modal-footer-notice {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.72rem;
      color: #64748b;
      border-top: 1px solid #1e293b;
      padding-top: 0.75rem;
    }

    /* Helpers */
    .text-emerald { color: #34d399; }
    .text-amber { color: #fbbf24; }
    .text-slate { color: #94a3b8; }
    .text-zinc { color: #a1a1aa; }
    .text-rose { color: #fb7185; }
    .text-red { color: #f87171; }
    .text-muted { color: #64748b; }
    .font-mono { font-family: monospace; }
    .font-bold { font-weight: 700; }
  `]
})
export class ActivityComponent implements OnInit, OnDestroy {
  public activityService = inject(ActivityService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  public activeTab: 'radar' | 'my-activity' | 'reports' = 'radar';
  public radarFilter: string = 'All';
  public searchQuery: string = '';
  public loadingLive: boolean = false;

  public liveData: LiveMonitorResponse | null = null;
  public myStatus: UserActivityStatusDto | null = null;
  public myHistory: LiveEmployeeActivityDto[] = [];
  public reportData: ActivityReportResponse | null = null;

  public reportLateFilter: string = 'all';
  public reportStateFilter: string = 'all';

  // Modal State
  public showModal: boolean = false;
  public employeeCodeInput: string = '';
  public passwordInput: string = '';
  public sessionNotesInput: string = '';
  public showPassword: boolean = false;
  public submittingAction: boolean = false;
  public actionError: string | null = null;
  public currentClockDisplay: string = '';

  public Math = Math;

  private subscriptions: Subscription = new Subscription();

  ngOnInit(): void {
    this.updateClock();

    // Clock display interval
    const clockSub = interval(1000).subscribe(() => {
      this.updateClock();
    });
    this.subscriptions.add(clockSub);

    // Live monitor periodic refresh (every 8s)
    const liveSub = interval(8000).subscribe(() => {
      if (this.activeTab === 'radar') {
        this.loadLiveData(true);
      }
    });
    this.subscriptions.add(liveSub);

    // Subscribe to personal status
    const statusSub = this.activityService.status$.subscribe(status => {
      this.myStatus = status;
      if (status && !this.employeeCodeInput && status.employeeNumber) {
        this.employeeCodeInput = status.employeeNumber;
      }
    });
    this.subscriptions.add(statusSub);

    // Initial Loads
    this.loadLiveData();
    this.loadMyStatus();
    this.loadMyHistory();
    this.loadReportData();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private updateClock(): void {
    const now = new Date();
    this.currentClockDisplay = now.toLocaleTimeString('en-US', { hour12: true });
  }

  public isCurrentlyLate(): boolean {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    return (h > 8) || (h === 8 && m > 10);
  }

  public getMinutesLateNow(): number {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const currentMin = (h * 60) + m;
    const cutoff = (8 * 60) + 10;
    return Math.max(1, currentMin - cutoff);
  }

  public loadLiveData(silent = false): void {
    if (!silent) this.loadingLive = true;
    this.activityService.getLiveMonitor().subscribe({
      next: res => {
        this.liveData = res.data || null;
        this.loadingLive = false;
      },
      error: () => {
        this.loadingLive = false;
      }
    });
  }

  public loadMyStatus(): void {
    this.activityService.loadMyStatus().subscribe();
  }

  public loadMyHistory(): void {
    this.activityService.getMyHistory(30).subscribe({
      next: res => {
        this.myHistory = res.data || [];
      }
    });
  }

  public loadReportData(): void {
    const filter: any = {};
    if (this.reportLateFilter === 'lateOnly') filter.lateOnly = true;
    if (this.reportLateFilter === 'faultsOnly') filter.faultsOnly = true;
    if (this.reportStateFilter !== 'all') filter.state = this.reportStateFilter;

    this.activityService.getActivityReport(filter).subscribe({
      next: res => {
        this.reportData = res.data || null;
      }
    });
  }

  public get filteredLiveEmployees(): LiveEmployeeActivityDto[] {
    if (!this.liveData?.employees) return [];
    let list = this.liveData.employees;

    if (this.radarFilter === 'Working') {
      list = list.filter(e => e.state === 'Working');
    } else if (this.radarFilter === 'Idle') {
      list = list.filter(e => e.state === 'Idle');
    } else if (this.radarFilter === 'OnBreak') {
      list = list.filter(e => e.state === 'OnBreak');
    } else if (this.radarFilter === 'Closed') {
      list = list.filter(e => e.state === 'Closed');
    } else if (this.radarFilter === 'NotStarted') {
      list = list.filter(e => e.state === 'NotStarted');
    } else if (this.radarFilter === 'Late') {
      list = list.filter(e => e.isLate);
    } else if (this.radarFilter === 'Faults') {
      list = list.filter(e => e.faultsCount > 0);
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(e => 
        e.employeeName.toLowerCase().includes(q) || 
        e.employeeNumber.toLowerCase().includes(q) ||
        e.departmentName.toLowerCase().includes(q)
      );
    }

    return list;
  }

  public openActionModal(preSelectedAction?: string): void {
    this.actionError = null;
    if (this.myStatus?.employeeNumber && !this.employeeCodeInput) {
      this.employeeCodeInput = this.myStatus.employeeNumber;
    }
    this.showModal = true;
  }

  public closeActionModal(): void {
    this.showModal = false;
    this.actionError = null;
  }

  public closeModalOnBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeActionModal();
    }
  }

  public submitClockAction(action: 'Start' | 'Break' | 'Resume' | 'End'): void {
    const code = this.employeeCodeInput.trim() || this.myStatus?.employeeNumber;
    if (!code) {
      this.actionError = 'Please enter your Employee Code (e.g. EMP-001).';
      return;
    }

    this.submittingAction = true;
    this.actionError = null;

    const now = new Date();
    this.activityService.executeAction({
      employeeCode: code,
      password: this.passwordInput.trim() || undefined,
      action: action,
      clientLocalHour: now.getHours(),
      clientLocalMinute: now.getMinutes(),
      notes: this.sessionNotesInput.trim() || undefined
    }).subscribe({
      next: res => {
        this.submittingAction = false;
        this.passwordInput = '';
        this.sessionNotesInput = '';
        this.showModal = false;

        this.toastService.success('Activity Logged', res.message || `${action} recorded successfully.`);
        this.loadLiveData(true);
        this.loadMyStatus();
        this.loadMyHistory();
        this.loadReportData();
      },
      error: err => {
        this.submittingAction = false;
        this.actionError = err?.error?.message || err?.message || 'Failed to authenticate and execute clock action.';
      }
    });
  }

  public executeQuickAction(action: 'Start' | 'Break' | 'Resume' | 'End'): void {
    const code = this.myStatus?.employeeNumber || this.employeeCodeInput.trim();
    if (!code) {
      this.openActionModal(action);
      return;
    }

    this.submittingAction = true;
    const now = new Date();
    this.activityService.executeAction({
      employeeCode: code,
      password: this.passwordInput.trim() || undefined,
      action: action,
      clientLocalHour: now.getHours(),
      clientLocalMinute: now.getMinutes()
    }).subscribe({
      next: res => {
        this.submittingAction = false;
        this.toastService.success('Activity Logged', res.message || `${action} recorded successfully.`);
        this.loadLiveData(true);
        this.loadMyStatus();
        this.loadMyHistory();
        this.loadReportData();
      },
      error: err => {
        this.submittingAction = false;
        this.actionError = err?.error?.message || err?.message || 'Authentication required to execute clock action.';
        this.openActionModal(action);
      }
    });
  }

  public exportReport(format: 'csv' | 'json'): void {
    if (!this.reportData?.records) return;

    if (format === 'json') {
      const jsonStr = JSON.stringify(this.reportData.records, null, 2);
      this.downloadFile(jsonStr, `Workforce_Activity_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
    } else {
      const headers = ['EmployeeCode', 'Name', 'Department', 'Date', 'State', 'OpenTime', 'CloseTime', 'WorkHours', 'BreakMinutes', 'IsLate', 'LateMinutes', 'Faults'];
      const rows = this.reportData.records.map(r => [
        `"${r.employeeNumber}"`,
        `"${r.employeeName}"`,
        `"${r.departmentName}"`,
        `"${this.formatDate(r.date)}"`,
        `"${r.state}"`,
        `"${this.formatTimeOnly(r.workStartedAtUtc)}"`,
        `"${this.formatTimeOnly(r.workEndedAtUtc)}"`,
        (r.totalWorkSeconds / 3600).toFixed(2),
        Math.floor(r.totalBreakSeconds / 60),
        r.isLate ? 'YES' : 'NO',
        r.lateMinutes,
        r.faultsCount
      ]);
      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\\n');
      this.downloadFile(csvContent, `Workforce_Activity_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
    }
  }

  private downloadFile(content: string, filename: string, type: string): void {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // Visual Class Helpers
  public getStateBadgeClass(state: ActivityState): string {
    switch (state) {
      case 'Working': return 'badge-working';
      case 'Idle': return 'badge-idle';
      case 'OnBreak': return 'badge-break';
      case 'Closed': return 'badge-closed';
      default: return 'badge-notstarted';
    }
  }

  public getDotClass(state: ActivityState): string {
    switch (state) {
      case 'Working': return 'dot-working';
      case 'Idle': return 'dot-idle';
      case 'OnBreak': return 'dot-break';
      case 'Closed': return 'dot-closed';
      default: return 'dot-notstarted';
    }
  }

  public getCardBorderClass(state: ActivityState): string {
    switch (state) {
      case 'Working': return 'border-working';
      case 'Idle': return 'border-idle';
      case 'OnBreak': return 'border-break';
      case 'Closed': return 'border-closed';
      default: return 'border-notstarted';
    }
  }

  public getBreakPercentage(breakSeconds: number): number {
    return Math.min(100, Math.round((breakSeconds / 3600) * 100));
  }

  public getBreakBarClass(breakSeconds: number): string {
    if (breakSeconds > 3600) return 'bar-danger';
    if (breakSeconds > 2700) return 'bar-warning';
    return 'bar-normal';
  }

  public getInitials(name?: string): string {
    if (!name) return '??';
    return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  }

  public formatDate(iso?: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  public formatTimeOnly(iso?: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
}
