import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import {
  LeaveRequest,
  AttendanceLog,
  ShiftSchedule,
  HrMetrics,
  LeaveType,
  LeaveStatus,
  AttendanceStatus,
  ShiftType,
  CreateLeaveRequestRequest,
  ActionLeaveRequestRequest,
  CheckInRequest,
  CheckOutRequest,
  RecordAttendanceRequest,
  CreateShiftScheduleRequest,
  Employee,
  TenantRole
} from '../../core/models/models';

@Component({
  selector: 'app-hr',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="hr-page">
      <!-- Header Section -->
      <div class="page-header">
        <div>
          <div class="badge badge-indigo" style="margin-bottom: 0.5rem;">Workforce & People Operations</div>
          <h1 class="font-heading-2">HR, Attendance & Leave Management</h1>
          <p class="font-caption">Self-service digital time clock, tiered leave approval workflows, daily attendance rosters, and shift scheduling</p>
        </div>
        <div class="header-actions">
          <button (click)="openCreateLeaveModal()" class="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/></svg>
            <span>Request Time Off</span>
          </button>
          <button *ngIf="canManageHr" (click)="openRecordAttendanceModal()" class="btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>Manual Attendance</span>
          </button>
          <button *ngIf="canManageHr" (click)="openCreateShiftModal()" class="btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
            <span>Add Shift</span>
          </button>
        </div>
      </div>

      <!-- Confirmed Role Visibility Scope Banner -->
      <div class="role-scope-banner glass-panel">
        <div class="scope-icon">🛡️</div>
        <div class="scope-details">
          <div class="scope-title">
            ACTIVE PERMISSION SCOPE: <span class="badge" [ngClass]="getRoleBadgeClass(currentRole)">{{ currentRole }}</span>
          </div>
          <p class="scope-explanation" [ngSwitch]="currentRole">
            <span *ngSwitchCase="'Owner'">
              <strong>Full Company HR Authority:</strong> You possess executive governance over all employee leaves, company-wide attendance rosters, shift assignments, and policy approvals.
            </span>
            <span *ngSwitchCase="'Admin'">
              <strong>Operational HR Management:</strong> You can review, approve, override attendance records, and configure shift schedules across all departments.
            </span>
            <span *ngSwitchCase="'Manager'">
              <strong>Supervisory Scope:</strong> In accordance with confirmed reporting models, you oversee time tracking and approve leave requests for yourself and your direct reports.
            </span>
            <span *ngSwitchCase="'Employee'">
              <strong>Personal Self-Service Scope:</strong> You can clock in/out, view personal attendance logs, and submit time-off requests with complete peer data privacy.
            </span>
            <span *ngSwitchDefault>
              Standard workforce governance active.
            </span>
          </p>
        </div>
      </div>

      <!-- Self-Service Digital Time Clock Card -->
      <div class="time-clock-card glass-panel-elevated">
        <div class="clock-display-zone">
          <div class="clock-time-badge">
            <span class="live-pulse"></span>
            <span class="clock-digits">{{ currentTimeFormatted }}</span>
            <span class="clock-date">{{ currentDateFormatted }}</span>
          </div>
          <div class="clock-meta">
            <div class="clock-greeting">Welcome, {{ currentEmployeeName }}</div>
            <div class="clock-subtext">
              Status for Today:
              <span *ngIf="!todayAttendance?.checkInTimeUtc" class="status-pill status-unclocked">Not Clocked In</span>
              <span *ngIf="todayAttendance?.checkInTimeUtc && !todayAttendance?.checkOutTimeUtc" class="status-pill status-present">
                Active Shift (Clocked in {{ formatTime(todayAttendance?.checkInTimeUtc) }})
              </span>
              <span *ngIf="todayAttendance?.checkOutTimeUtc" class="status-pill status-completed">
                Shift Completed ({{ todayAttendance?.totalHours || 0 }} hrs)
              </span>
            </div>
          </div>
        </div>

        <div class="clock-actions-zone">
          <div class="location-picker">
            <label class="form-label-sm">Work Location</label>
            <select [(ngModel)]="clockLocation" [disabled]="!!todayAttendance?.checkInTimeUtc" class="form-select-sm">
              <option value="HQ - Main Campus">HQ - Main Campus</option>
              <option value="Remote / Home Office">Remote / Home Office</option>
              <option value="Austin Manufacturing Plant">Austin Manufacturing Plant</option>
              <option value="Field Logistics Hub">Field Logistics Hub</option>
            </select>
          </div>

          <div class="clock-buttons">
            <button
              *ngIf="!todayAttendance?.checkInTimeUtc"
              (click)="handleCheckIn()"
              [disabled]="loadingAction"
              class="btn-clock-in">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>Clock In Now</span>
            </button>

            <button
              *ngIf="todayAttendance?.checkInTimeUtc && !todayAttendance?.checkOutTimeUtc"
              (click)="handleCheckOut()"
              [disabled]="loadingAction"
              class="btn-clock-out">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              <span>Clock Out</span>
            </button>

            <div *ngIf="todayAttendance?.checkOutTimeUtc" class="completed-shift-badge">
              <span class="check-icon">✓</span>
              <span>Day's Log Recorded</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Real-Time Workforce Metrics Row -->
      <div class="metrics-grid">
        <div class="metric-card glass-panel">
          <div class="metric-header">
            <span class="metric-label">TOTAL WORKFORCE</span>
            <div class="metric-icon icon-indigo">👥</div>
          </div>
          <div class="metric-value">{{ metrics?.totalEmployees || 0 }}</div>
          <div class="metric-subtext">Active personnel profiles</div>
        </div>

        <div class="metric-card glass-panel">
          <div class="metric-header">
            <span class="metric-label">PRESENT TODAY</span>
            <div class="metric-icon icon-emerald">⚡</div>
          </div>
          <div class="metric-value text-emerald">
            {{ metrics?.presentToday || 0 }}
            <span class="metric-rate-badge">{{ metrics?.attendanceRatePercent || 0 }}%</span>
          </div>
          <div class="attendance-progress-bar">
            <div class="attendance-fill" [style.width.%]="metrics?.attendanceRatePercent || 0"></div>
          </div>
        </div>

        <div class="metric-card glass-panel">
          <div class="metric-header">
            <span class="metric-label">ON LEAVE TODAY</span>
            <div class="metric-icon icon-cyan">🏖️</div>
          </div>
          <div class="metric-value text-cyan">{{ metrics?.onLeaveToday || 0 }}</div>
          <div class="metric-subtext">Approved active PTO</div>
        </div>

        <div class="metric-card glass-panel">
          <div class="metric-header">
            <span class="metric-label">PENDING APPROVALS</span>
            <div class="metric-icon icon-amber">⏳</div>
          </div>
          <div class="metric-value text-amber">{{ metrics?.pendingLeaveRequests || 0 }}</div>
          <div class="metric-subtext">
            <span *ngIf="(metrics?.pendingLeaveRequests || 0) > 0" class="badge badge-amber">Action Needed</span>
            <span *ngIf="(metrics?.pendingLeaveRequests || 0) === 0">Queue clear</span>
          </div>
        </div>

        <div class="metric-card glass-panel">
          <div class="metric-header">
            <span class="metric-label">APPROVED LEAVE (MTD)</span>
            <div class="metric-icon icon-violet">📅</div>
          </div>
          <div class="metric-value">{{ metrics?.approvedLeaveDaysThisMonth || 0 }} <span class="metric-unit">days</span></div>
          <div class="metric-subtext">Current month total</div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="tabs-nav glass-panel">
        <button
          (click)="activeTab = 'leaves'"
          class="tab-btn"
          [class.active]="activeTab === 'leaves'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>Time-Off & Leave Requests</span>
          <span class="tab-badge badge-indigo">{{ leaveRequests.length }}</span>
        </button>

        <button
          (click)="activeTab = 'attendance'"
          class="tab-btn"
          [class.active]="activeTab === 'attendance'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>Daily Attendance Roster</span>
          <span class="tab-badge badge-emerald">{{ attendanceLogs.length }}</span>
        </button>

        <button
          (click)="activeTab = 'shifts'"
          class="tab-btn"
          [class.active]="activeTab === 'shifts'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span>Shift Schedules & Rotas</span>
          <span class="tab-badge badge-cyan">{{ shiftSchedules.length }}</span>
        </button>
      </div>

      <!-- TAB 1: Leave Requests Content -->
      <div *ngIf="activeTab === 'leaves'" class="tab-content">
        <!-- Controls & Filter Bar -->
        <div class="filter-bar glass-panel">
          <div class="filter-pills">
            <button
              (click)="setLeaveStatusFilter('ALL')"
              class="filter-pill"
              [class.active]="selectedLeaveStatus === 'ALL'">
              All Requests ({{ leaveRequests.length }})
            </button>
            <button
              (click)="setLeaveStatusFilter('Pending')"
              class="filter-pill"
              [class.active]="selectedLeaveStatus === 'Pending'">
              Pending Approvals ({{ countLeavesByStatus('Pending') }})
            </button>
            <button
              (click)="setLeaveStatusFilter('Approved')"
              class="filter-pill"
              [class.active]="selectedLeaveStatus === 'Approved'">
              Approved ({{ countLeavesByStatus('Approved') }})
            </button>
            <button
              (click)="setLeaveStatusFilter('Rejected')"
              class="filter-pill"
              [class.active]="selectedLeaveStatus === 'Rejected'">
              Rejected ({{ countLeavesByStatus('Rejected') }})
            </button>
          </div>

          <div class="search-box">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              [(ngModel)]="searchLeaveText"
              placeholder="Search by request # or employee..."
              class="search-input" />
          </div>
        </div>

        <!-- Leave Requests Table -->
        <div class="table-card glass-panel-elevated">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Dates & Duration</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Approver</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngIf="filteredLeaves.length === 0">
                  <td colspan="8" class="empty-state-cell">
                    <div class="empty-state">
                      <div class="empty-icon">🏖️</div>
                      <div class="empty-title">No leave requests found</div>
                      <div class="empty-desc">Submit a time-off request using the button above.</div>
                    </div>
                  </td>
                </tr>

                <tr *ngFor="let leave of filteredLeaves" class="table-row">
                  <td class="code-cell font-mono">
                    <span class="request-number">{{ leave.requestNumber }}</span>
                  </td>
                  <td>
                    <div class="emp-profile">
                      <div class="emp-avatar">{{ getInitials(leave.employeeName) }}</div>
                      <div>
                        <div class="emp-name">{{ leave.employeeName }}</div>
                        <div class="emp-dept">{{ leave.departmentName }} • {{ leave.employeeNumber }}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="badge" [ngClass]="getLeaveTypeBadge(leave.leaveType)">
                      {{ leave.leaveType }}
                    </span>
                  </td>
                  <td>
                    <div class="date-range">
                      <span>{{ leave.startDateUtc | date:'MMM dd, yyyy' }} — {{ leave.endDateUtc | date:'MMM dd, yyyy' }}</span>
                      <span class="duration-tag">{{ leave.daysCount }} {{ leave.daysCount === 1 ? 'day' : 'days' }}</span>
                    </div>
                  </td>
                  <td class="reason-cell">
                    <div class="reason-text" [title]="leave.reason">{{ leave.reason }}</div>
                    <div *ngIf="leave.rejectionReason" class="rejection-hint">
                      Rejection Note: {{ leave.rejectionReason }}
                    </div>
                  </td>
                  <td>
                    <span class="status-pill" [ngClass]="getLeaveStatusClass(leave.status)">
                      {{ leave.status }}
                    </span>
                  </td>
                  <td>
                    <div *ngIf="leave.approverEmployeeName" class="approver-info">
                      <span class="approver-name">{{ leave.approverEmployeeName }}</span>
                      <span class="actioned-date">{{ leave.actionedAtUtc | date:'shortDate' }}</span>
                    </div>
                    <span *ngIf="!leave.approverEmployeeName" class="text-muted">—</span>
                  </td>
                  <td style="text-align: right;">
                    <div class="action-buttons-group">
                      <button
                        *ngIf="leave.status === 'Pending' && canManageHr"
                        (click)="openReviewModal(leave)"
                        class="btn-action-primary"
                        title="Review and action request">
                        Review
                      </button>

                      <button
                        *ngIf="leave.status === 'Pending' && !canManageHr"
                        (click)="cancelLeave(leave.id)"
                        class="btn-action-cancel"
                        title="Cancel request">
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB 2: Daily Attendance Roster Content -->
      <div *ngIf="activeTab === 'attendance'" class="tab-content">
        <!-- Attendance Filters -->
        <div class="filter-bar glass-panel">
          <div class="filter-pills">
            <button
              (click)="setAttendanceStatusFilter('ALL')"
              class="filter-pill"
              [class.active]="selectedAttendanceStatus === 'ALL'">
              All ({{ attendanceLogs.length }})
            </button>
            <button
              (click)="setAttendanceStatusFilter('Present')"
              class="filter-pill"
              [class.active]="selectedAttendanceStatus === 'Present'">
              Present ({{ countAttendanceByStatus('Present') }})
            </button>
            <button
              (click)="setAttendanceStatusFilter('Late')"
              class="filter-pill"
              [class.active]="selectedAttendanceStatus === 'Late'">
              Late ({{ countAttendanceByStatus('Late') }})
            </button>
            <button
              (click)="setAttendanceStatusFilter('Absent')"
              class="filter-pill"
              [class.active]="selectedAttendanceStatus === 'Absent'">
              Absent ({{ countAttendanceByStatus('Absent') }})
            </button>
          </div>

          <div class="search-box">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              [(ngModel)]="searchAttendanceText"
              placeholder="Search attendance by employee..."
              class="search-input" />
          </div>
        </div>

        <!-- Attendance Roster Table -->
        <div class="table-card glass-panel-elevated">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Check-In Time</th>
                  <th>Check-Out Time</th>
                  <th>Total Duration</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngIf="filteredAttendance.length === 0">
                  <td colspan="8" class="empty-state-cell">
                    <div class="empty-state">
                      <div class="empty-icon">⏱️</div>
                      <div class="empty-title">No attendance records found</div>
                      <div class="empty-desc">Clock in above or record manual attendance.</div>
                    </div>
                  </td>
                </tr>

                <tr *ngFor="let log of filteredAttendance" class="table-row">
                  <td>
                    <div class="emp-profile">
                      <div class="emp-avatar">{{ getInitials(log.employeeName) }}</div>
                      <div>
                        <div class="emp-name">{{ log.employeeName }}</div>
                        <div class="emp-dept">{{ log.departmentName }} • {{ log.employeeNumber }}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="font-mono text-secondary">{{ log.date | date:'MMM dd, yyyy' }}</span>
                  </td>
                  <td>
                    <span *ngIf="log.checkInTimeUtc" class="time-stamp in-time">
                      🟢 {{ formatTime(log.checkInTimeUtc) }}
                    </span>
                    <span *ngIf="!log.checkInTimeUtc" class="text-muted">—</span>
                  </td>
                  <td>
                    <span *ngIf="log.checkOutTimeUtc" class="time-stamp out-time">
                      🔴 {{ formatTime(log.checkOutTimeUtc) }}
                    </span>
                    <span *ngIf="!log.checkOutTimeUtc && log.checkInTimeUtc" class="badge badge-emerald">
                      Active
                    </span>
                    <span *ngIf="!log.checkInTimeUtc" class="text-muted">—</span>
                  </td>
                  <td>
                    <div *ngIf="log.totalHours" class="duration-indicator">
                      <div class="duration-bar">
                        <div class="duration-fill" [style.width.%]="mathMin(100, (log.totalHours / 8) * 100)"></div>
                      </div>
                      <span class="duration-number font-mono">{{ log.totalHours }}h</span>
                    </div>
                    <span *ngIf="!log.totalHours" class="text-muted">—</span>
                  </td>
                  <td>
                    <span class="status-pill" [ngClass]="getAttendanceStatusClass(log.status)">
                      {{ log.status }}
                    </span>
                  </td>
                  <td>
                    <span class="badge badge-indigo">{{ log.workLocation }}</span>
                  </td>
                  <td class="notes-cell">
                    <span class="text-secondary">{{ log.notes || '—' }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB 3: Shift Schedules Content -->
      <div *ngIf="activeTab === 'shifts'" class="tab-content">
        <div class="shifts-grid">
          <div *ngFor="let shift of shiftSchedules" class="shift-card glass-panel-elevated">
            <div class="shift-card-header">
              <div>
                <span class="badge badge-cyan">{{ shift.shiftType }}</span>
                <h3 class="shift-title">{{ shift.shiftName }}</h3>
              </div>
              <div class="shift-status">
                <span class="status-indicator" [class.active]="shift.isActive"></span>
                <span class="status-text">{{ shift.isActive ? 'Active Plan' : 'Inactive' }}</span>
              </div>
            </div>

            <div class="shift-employee-badge">
              <div class="emp-avatar sm">{{ getInitials(shift.employeeName) }}</div>
              <div>
                <div class="emp-name sm">{{ shift.employeeName }}</div>
                <div class="emp-dept sm">{{ shift.employeeNumber }}</div>
              </div>
            </div>

            <div class="shift-timings">
              <div class="timing-block">
                <span class="timing-label">START TIME</span>
                <span class="timing-val font-mono">{{ shift.startTime }}</span>
              </div>
              <div class="timing-arrow">➔</div>
              <div class="timing-block">
                <span class="timing-label">END TIME</span>
                <span class="timing-val font-mono">{{ shift.endTime }}</span>
              </div>
            </div>

            <div class="shift-footer">
              <span class="effective-date">Effective from: {{ shift.effectiveFromUtc | date:'mediumDate' }}</span>
              <button *ngIf="canManageHr" (click)="deleteShift(shift.id)" class="btn-delete-shift" title="Delete shift">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL 1: Request Time Off -->
      <div *ngIf="showCreateLeaveModal" class="modal-backdrop">
        <div class="modal-card glass-panel-elevated">
          <div class="modal-header">
            <h2 class="font-heading-3">Request Time-Off</h2>
            <button (click)="closeCreateLeaveModal()" class="close-btn">✕</button>
          </div>

          <div class="modal-body">
            <div *ngIf="canManageHr" class="form-group">
              <label class="form-label">Employee</label>
              <select [(ngModel)]="newLeave.employeeId" class="form-select">
                <option *ngFor="let emp of employees" [value]="emp.id">{{ emp.fullName }} ({{ emp.employeeNumber }})</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Leave Type</label>
              <select [(ngModel)]="newLeave.leaveType" class="form-select">
                <option value="Annual">Annual Paid Leave</option>
                <option value="Sick">Sick / Medical Leave</option>
                <option value="Unpaid">Unpaid Leave</option>
                <option value="MaternityPaternity">Parental / Maternity Leave</option>
                <option value="Bereavement">Bereavement Leave</option>
                <option value="Compensatory">Compensatory Time-Off</option>
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Start Date</label>
                <input type="date" [(ngModel)]="newLeave.startDateUtc" (change)="calculateDays()" class="form-input" />
              </div>

              <div class="form-group">
                <label class="form-label">End Date</label>
                <input type="date" [(ngModel)]="newLeave.endDateUtc" (change)="calculateDays()" class="form-input" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Estimated Duration</label>
              <div class="days-preview-badge">
                <span>{{ calculatedDays }} {{ calculatedDays === 1 ? 'business day' : 'business days' }}</span>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Reason / Notes</label>
              <textarea
                [(ngModel)]="newLeave.reason"
                rows="3"
                placeholder="Provide a clear description for manager review..."
                class="form-textarea"></textarea>
            </div>
          </div>

          <div class="modal-footer">
            <button (click)="closeCreateLeaveModal()" class="btn-secondary">Cancel</button>
            <button (click)="submitLeaveRequest()" [disabled]="!newLeave.reason || loadingAction" class="btn-primary">
              <span>Submit Leave Request</span>
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL 2: Review Leave Request Modal (Manager / Admin) -->
      <div *ngIf="showReviewModal && selectedLeave" class="modal-backdrop">
        <div class="modal-card glass-panel-elevated">
          <div class="modal-header">
            <div>
              <span class="badge badge-amber">Supervisory Review</span>
              <h2 class="font-heading-3" style="margin-top: 0.25rem;">Review Leave {{ selectedLeave.requestNumber }}</h2>
            </div>
            <button (click)="closeReviewModal()" class="close-btn">✕</button>
          </div>

          <div class="modal-body">
            <div class="review-details-card glass-panel">
              <div class="review-row">
                <span class="rev-label">Employee:</span>
                <span class="rev-val">{{ selectedLeave.employeeName }} ({{ selectedLeave.employeeNumber }})</span>
              </div>
              <div class="review-row">
                <span class="rev-label">Department:</span>
                <span class="rev-val">{{ selectedLeave.departmentName }}</span>
              </div>
              <div class="review-row">
                <span class="rev-label">Leave Type:</span>
                <span class="badge" [ngClass]="getLeaveTypeBadge(selectedLeave.leaveType)">{{ selectedLeave.leaveType }}</span>
              </div>
              <div class="review-row">
                <span class="rev-label">Dates:</span>
                <span class="rev-val">{{ selectedLeave.startDateUtc | date:'mediumDate' }} — {{ selectedLeave.endDateUtc | date:'mediumDate' }} ({{ selectedLeave.daysCount }} days)</span>
              </div>
              <div class="review-row reason-box">
                <span class="rev-label">Employee Reason:</span>
                <p class="rev-reason">{{ selectedLeave.reason }}</p>
              </div>
            </div>

            <div class="form-group" style="margin-top: 1rem;">
              <label class="form-label">Rejection Rationale (Required only if rejecting)</label>
              <textarea
                [(ngModel)]="reviewRejectionReason"
                rows="2"
                placeholder="State reason for rejecting request..."
                class="form-textarea"></textarea>
            </div>
          </div>

          <div class="modal-footer review-footer">
            <button (click)="handleActionLeave('Rejected')" [disabled]="loadingAction" class="btn-reject">
              Reject Request
            </button>
            <button (click)="handleActionLeave('Approved')" [disabled]="loadingAction" class="btn-approve">
              Approve Time-Off
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL 3: Manual Attendance Log -->
      <div *ngIf="showRecordAttendanceModal" class="modal-backdrop">
        <div class="modal-card glass-panel-elevated">
          <div class="modal-header">
            <h2 class="font-heading-3">Manual Attendance Entry</h2>
            <button (click)="closeRecordAttendanceModal()" class="close-btn">✕</button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Employee</label>
              <select [(ngModel)]="manualAttendance.employeeId" class="form-select">
                <option *ngFor="let emp of employees" [value]="emp.id">{{ emp.fullName }} ({{ emp.employeeNumber }})</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Date</label>
              <input type="date" [(ngModel)]="manualAttendance.date" class="form-input" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Check-In Time</label>
                <input type="time" [(ngModel)]="manualAttendanceInTime" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">Check-Out Time</label>
                <input type="time" [(ngModel)]="manualAttendanceOutTime" class="form-input" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Status</label>
              <select [(ngModel)]="manualAttendance.status" class="form-select">
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="HalfDay">Half Day</option>
                <option value="Absent">Absent</option>
                <option value="OnLeave">On Leave</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Work Location</label>
              <input type="text" [(ngModel)]="manualAttendance.workLocation" placeholder="e.g. HQ - Main Campus" class="form-input" />
            </div>

            <div class="form-group">
              <label class="form-label">Notes / Rationale</label>
              <textarea [(ngModel)]="manualAttendance.notes" rows="2" class="form-textarea"></textarea>
            </div>
          </div>

          <div class="modal-footer">
            <button (click)="closeRecordAttendanceModal()" class="btn-secondary">Cancel</button>
            <button (click)="saveManualAttendance()" [disabled]="loadingAction" class="btn-primary">Save Entry</button>
          </div>
        </div>
      </div>

      <!-- MODAL 4: Create Shift Schedule -->
      <div *ngIf="showShiftModal" class="modal-backdrop">
        <div class="modal-card glass-panel-elevated">
          <div class="modal-header">
            <h2 class="font-heading-3">Assign Shift Schedule</h2>
            <button (click)="closeShiftModal()" class="close-btn">✕</button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Employee</label>
              <select [(ngModel)]="newShift.employeeId" class="form-select">
                <option *ngFor="let emp of employees" [value]="emp.id">{{ emp.fullName }} ({{ emp.employeeNumber }})</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Shift Name</label>
              <input type="text" [(ngModel)]="newShift.shiftName" placeholder="e.g. Morning Logistics Shift" class="form-input" />
            </div>

            <div class="form-group">
              <label class="form-label">Shift Classification</label>
              <select [(ngModel)]="newShift.shiftType" class="form-select">
                <option value="StandardDay">Standard Day</option>
                <option value="MorningShift">Morning Shift</option>
                <option value="EveningShift">Evening Shift</option>
                <option value="NightShift">Night Shift</option>
                <option value="Flexible">Flexible Core Hours</option>
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Start Time</label>
                <input type="time" [(ngModel)]="shiftStartTime" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">End Time</label>
                <input type="time" [(ngModel)]="shiftEndTime" class="form-input" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Effective From</label>
              <input type="date" [(ngModel)]="newShift.effectiveFromUtc" class="form-input" />
            </div>

            <div class="form-group">
              <label class="form-label">Notes</label>
              <textarea [(ngModel)]="newShift.notes" rows="2" class="form-textarea"></textarea>
            </div>
          </div>

          <div class="modal-footer">
            <button (click)="closeShiftModal()" class="btn-secondary">Cancel</button>
            <button (click)="saveShiftSchedule()" [disabled]="!newShift.shiftName || loadingAction" class="btn-primary">Save Shift</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @use 'styles/variables' as *;
    @use 'styles/mixins' as *;

    .hr-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    /* Role Scope Banner */
    .role-scope-banner {
      display: flex;
      gap: 1rem;
      align-items: center;
      padding: 1rem 1.25rem;
      border-left: 4px solid #6366f1;
      background: rgba(30, 41, 59, 0.4);
    }

    .scope-icon {
      font-size: 1.75rem;
    }

    .scope-title {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
    }

    .scope-explanation {
      font-size: 0.875rem;
      color: #cbd5e1;
      margin: 0;
    }

    /* Self-Service Digital Time Clock Card */
    .time-clock-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1.5rem;
      padding: 1.5rem;
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%);
      border: 1px solid rgba(99, 102, 241, 0.25);
      border-radius: 12px;
      position: relative;
      overflow: hidden;

      &::after {
        content: '';
        position: absolute;
        top: -50%;
        right: -20%;
        width: 300px;
        height: 300px;
        background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
        pointer-events: none;
      }
    }

    .clock-display-zone {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .clock-time-badge {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      background: rgba(15, 23, 42, 0.8);
      padding: 0.75rem 1.25rem;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      position: relative;
    }

    .live-pulse {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { opacity: 0.4; }
      50% { opacity: 1; }
      100% { opacity: 0.4; }
    }

    .clock-digits {
      font-size: 1.75rem;
      font-weight: 800;
      font-family: monospace;
      color: #ffffff;
      letter-spacing: 0.05em;
    }

    .clock-date {
      font-size: 0.75rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .clock-greeting {
      font-size: 1.125rem;
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 0.25rem;
    }

    .clock-subtext {
      font-size: 0.875rem;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .clock-actions-zone {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      flex-wrap: wrap;
    }

    .location-picker {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .form-label-sm {
      font-size: 0.6875rem;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .form-select-sm {
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #ffffff;
      border-radius: 6px;
      padding: 0.4rem 0.75rem;
      font-size: 0.8125rem;
      outline: none;
    }

    .btn-clock-in {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff;
      font-weight: 700;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
      transition: all 0.2s ease;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(16, 185, 129, 0.45);
      }
    }

    .btn-clock-out {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: #ffffff;
      font-weight: 700;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(239, 68, 68, 0.35);
      transition: all 0.2s ease;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(239, 68, 68, 0.45);
      }
    }

    .completed-shift-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.875rem;
    }

    /* KPI Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .metric-card {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .metric-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .metric-label {
      font-size: 0.6875rem;
      font-weight: 700;
      color: #94a3b8;
      letter-spacing: 0.05em;
    }

    .metric-icon {
      font-size: 1.125rem;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;

      &.icon-indigo { background: rgba(99, 102, 241, 0.15); }
      &.icon-emerald { background: rgba(16, 185, 129, 0.15); }
      &.icon-cyan { background: rgba(6, 182, 212, 0.15); }
      &.icon-amber { background: rgba(245, 158, 11, 0.15); }
      &.icon-violet { background: rgba(139, 92, 246, 0.15); }
    }

    .metric-value {
      font-size: 1.75rem;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.2;
      display: flex;
      align-items: baseline;
      gap: 0.5rem;

      &.text-emerald { color: #10b981; }
      &.text-cyan { color: #06b6d4; }
      &.text-amber { color: #f59e0b; }
    }

    .metric-rate-badge {
      font-size: 0.75rem;
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      font-weight: 600;
    }

    .metric-unit {
      font-size: 0.875rem;
      font-weight: 500;
      color: #94a3b8;
    }

    .metric-subtext {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .attendance-progress-bar {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 999px;
      overflow: hidden;
      margin-top: 0.25rem;
    }

    .attendance-fill {
      height: 100%;
      background: linear-gradient(90deg, #10b981, #06b6d4);
      border-radius: 999px;
      transition: width 0.3s ease;
    }

    /* Tabs Bar */
    .tabs-nav {
      display: flex;
      gap: 0.5rem;
      padding: 0.5rem;
      flex-wrap: wrap;
    }

    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 0.875rem;
      font-weight: 600;
      padding: 0.625rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.05);
      }

      &.active {
        color: #ffffff;
        background: rgba(99, 102, 241, 0.2);
        box-shadow: 0 0 12px rgba(99, 102, 241, 0.3);
      }
    }

    .tab-badge {
      font-size: 0.6875rem;
      padding: 0.1rem 0.4rem;
      border-radius: 999px;
    }

    /* Filter Bar */
    .filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .filter-pills {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .filter-pill {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #ffffff;
      }

      &.active {
        background: rgba(99, 102, 241, 0.25);
        color: #a5b4fc;
        border-color: rgba(99, 102, 241, 0.5);
      }
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      padding: 0.35rem 0.75rem;
      color: #94a3b8;
    }

    .search-input {
      background: transparent;
      border: none;
      outline: none;
      color: #ffffff;
      font-size: 0.8125rem;
      width: 200px;
    }

    /* Table Card */
    .table-card {
      padding: 0;
      overflow: hidden;
      border-radius: 10px;
    }

    .table-responsive {
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8125rem;

      th {
        text-align: left;
        padding: 0.75rem 1rem;
        background: rgba(255, 255, 255, 0.03);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        color: #94a3b8;
        font-weight: 600;
        text-transform: uppercase;
        font-size: 0.6875rem;
        letter-spacing: 0.05em;
      }

      td {
        padding: 0.875rem 1rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        vertical-align: middle;
      }

      .table-row {
        transition: background 0.15s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.02);
        }
      }
    }

    .request-number {
      font-weight: 700;
      color: #a5b4fc;
    }

    .emp-profile {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .emp-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.75rem;
      color: #ffffff;
      flex-shrink: 0;

      &.sm {
        width: 26px;
        height: 26px;
        font-size: 0.6875rem;
      }
    }

    .emp-name {
      font-weight: 600;
      color: #ffffff;

      &.sm { font-size: 0.8125rem; }
    }

    .emp-dept {
      font-size: 0.6875rem;
      color: #94a3b8;

      &.sm { font-size: 0.625rem; }
    }

    .date-range {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      color: #cbd5e1;
    }

    .duration-tag {
      font-size: 0.6875rem;
      color: #a5b4fc;
      font-weight: 600;
    }

    .reason-cell {
      max-width: 220px;
    }

    .reason-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #94a3b8;
    }

    .rejection-hint {
      font-size: 0.6875rem;
      color: #f87171;
      margin-top: 0.2rem;
    }

    .status-pill {
      display: inline-block;
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;

      &.status-pending { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); }
      &.status-approved { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); }
      &.status-rejected { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }
      &.status-cancelled { background: rgba(100, 116, 139, 0.2); color: #94a3b8; border: 1px solid rgba(100, 116, 139, 0.4); }
      &.status-present { background: rgba(16, 185, 129, 0.2); color: #34d399; }
      &.status-late { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
      &.status-absent { background: rgba(239, 68, 68, 0.2); color: #f87171; }
      &.status-completed { background: rgba(99, 102, 241, 0.2); color: #a5b4fc; }
      &.status-unclocked { background: rgba(100, 116, 139, 0.2); color: #94a3b8; }
    }

    .approver-info {
      display: flex;
      flex-direction: column;
    }

    .approver-name {
      color: #ffffff;
      font-weight: 500;
    }

    .actioned-date {
      font-size: 0.6875rem;
      color: #94a3b8;
    }

    .action-buttons-group {
      display: flex;
      gap: 0.4rem;
      justify-content: flex-end;
    }

    .btn-action-primary {
      background: rgba(99, 102, 241, 0.2);
      border: 1px solid rgba(99, 102, 241, 0.4);
      color: #a5b4fc;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      cursor: pointer;

      &:hover {
        background: rgba(99, 102, 241, 0.35);
        color: #ffffff;
      }
    }

    .btn-action-cancel {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      cursor: pointer;

      &:hover {
        background: rgba(239, 68, 68, 0.3);
      }
    }

    .time-stamp {
      font-family: monospace;
      font-size: 0.8125rem;

      &.in-time { color: #34d399; }
      &.out-time { color: #f87171; }
    }

    .duration-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .duration-bar {
      width: 60px;
      height: 6px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 999px;
      overflow: hidden;
    }

    .duration-fill {
      height: 100%;
      background: #10b981;
      border-radius: 999px;
    }

    .duration-number {
      font-size: 0.75rem;
      color: #cbd5e1;
    }

    .notes-cell {
      max-width: 180px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .empty-state-cell {
      padding: 3rem 1rem !important;
      text-align: center;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .empty-icon {
      font-size: 2.25rem;
    }

    .empty-title {
      font-size: 1rem;
      font-weight: 700;
      color: #ffffff;
    }

    .empty-desc {
      font-size: 0.8125rem;
      color: #94a3b8;
    }

    /* Shifts Grid */
    .shifts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.25rem;
    }

    .shift-card {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      border-radius: 12px;
    }

    .shift-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .shift-title {
      font-size: 1rem;
      font-weight: 700;
      color: #ffffff;
      margin-top: 0.35rem;
    }

    .shift-status {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #64748b;

      &.active {
        background: #10b981;
        box-shadow: 0 0 8px #10b981;
      }
    }

    .status-text {
      font-size: 0.6875rem;
      color: #94a3b8;
      font-weight: 600;
    }

    .shift-employee-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.03);
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
    }

    .shift-timings {
      display: flex;
      align-items: center;
      justify-content: space-around;
      background: rgba(15, 23, 42, 0.6);
      padding: 0.875rem;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .timing-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.2rem;
    }

    .timing-label {
      font-size: 0.625rem;
      color: #94a3b8;
      font-weight: 700;
      letter-spacing: 0.05em;
    }

    .timing-val {
      font-size: 1.125rem;
      font-weight: 700;
      color: #ffffff;
    }

    .timing-arrow {
      color: #6366f1;
      font-size: 1.125rem;
    }

    .shift-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding-top: 0.75rem;
    }

    .effective-date {
      font-size: 0.6875rem;
      color: #94a3b8;
    }

    .btn-delete-shift {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 4px;

      &:hover {
        color: #ef4444;
        background: rgba(239, 68, 68, 0.1);
      }
    }

    /* Modal Backdrop & Cards */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1.5rem;
    }

    .modal-card {
      width: 100%;
      max-width: 520px;
      border-radius: 14px;
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 1.25rem;
      cursor: pointer;

      &:hover { color: #ffffff; }
    }

    .modal-body {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .form-input, .form-select, .form-textarea {
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: #ffffff;
      padding: 0.6rem 0.875rem;
      font-size: 0.875rem;
      outline: none;

      &:focus {
        border-color: #6366f1;
        box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25);
      }
    }

    .days-preview-badge {
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.3);
      padding: 0.6rem 1rem;
      border-radius: 8px;
      color: #a5b4fc;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .review-details-card {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      border-radius: 8px;
    }

    .review-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.8125rem;

      &.reason-box {
        flex-direction: column;
        gap: 0.35rem;
        margin-top: 0.5rem;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        padding-top: 0.5rem;
      }
    }

    .rev-label {
      color: #94a3b8;
      font-weight: 600;
    }

    .rev-val {
      color: #ffffff;
      font-weight: 500;
    }

    .rev-reason {
      color: #cbd5e1;
      font-style: italic;
      margin: 0;
      line-height: 1.4;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }

    .review-footer {
      justify-content: space-between;
    }

    .btn-approve {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff;
      font-weight: 700;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      border: none;
      cursor: pointer;

      &:hover { opacity: 0.9; }
    }

    .btn-reject {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
      font-weight: 700;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      cursor: pointer;

      &:hover { background: rgba(239, 68, 68, 0.3); }
    }
  `]
})
export class HrComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  public currentRole: TenantRole = 'Employee';
  public currentEmployeeName = 'David Lee';
  public currentTimeFormatted = '';
  public currentDateFormatted = '';
  public activeTab: 'leaves' | 'attendance' | 'shifts' = 'leaves';
  public loadingAction = false;

  public metrics: HrMetrics | null = null;
  public todayAttendance: AttendanceLog | null = null;
  public clockLocation = 'HQ - Main Campus';

  public leaveRequests: LeaveRequest[] = [];
  public attendanceLogs: AttendanceLog[] = [];
  public shiftSchedules: ShiftSchedule[] = [];
  public employees: Employee[] = [];

  public selectedLeaveStatus = 'ALL';
  public searchLeaveText = '';
  public selectedAttendanceStatus = 'ALL';
  public searchAttendanceText = '';

  // Modals
  public showCreateLeaveModal = false;
  public showReviewModal = false;
  public showRecordAttendanceModal = false;
  public showShiftModal = false;

  public selectedLeave: LeaveRequest | null = null;
  public reviewRejectionReason = '';

  // Create Leave state
  public newLeave: CreateLeaveRequestRequest = {
    leaveType: 'Annual',
    startDateUtc: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    endDateUtc: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    reason: ''
  };
  public calculatedDays = 3;

  // Manual Attendance state
  public manualAttendance: RecordAttendanceRequest = {
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    status: 'Present',
    workLocation: 'HQ - Main Campus',
    notes: ''
  };
  public manualAttendanceInTime = '09:00';
  public manualAttendanceOutTime = '17:30';

  // Shift Schedule state
  public newShift: CreateShiftScheduleRequest = {
    employeeId: '',
    shiftName: '',
    shiftType: 'StandardDay',
    startTime: '09:00:00',
    endTime: '17:30:00',
    effectiveFromUtc: new Date().toISOString().split('T')[0],
    notes: ''
  };
  public shiftStartTime = '09:00';
  public shiftEndTime = '17:30';

  public ngOnInit(): void {
    this.auth.activeTenant$.subscribe(tenant => {
      this.currentRole = tenant?.role || 'Employee';
      if (this.currentRole === 'Owner') this.currentEmployeeName = 'Alex Morgan';
      else if (this.currentRole === 'Manager') this.currentEmployeeName = 'Sarah Jenkins';
      else this.currentEmployeeName = 'David Lee';
    });

    this.startClock();
    this.loadAllData();
  }

  public get canManageHr(): boolean {
    return this.currentRole === 'Owner' || this.currentRole === 'Admin' || this.currentRole === 'Manager';
  }

  private startClock(): void {
    const update = () => {
      const now = new Date();
      this.currentTimeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      this.currentDateFormatted = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    };
    update();
    setInterval(update, 1000);
  }

  public loadAllData(): void {
    this.api.getHrMetrics().subscribe(res => {
      if (res.success) this.metrics = res.data;
    });

    this.api.getTodayAttendance().subscribe(res => {
      if (res.success) this.todayAttendance = res.data;
    });

    this.api.getLeaveRequests().subscribe(res => {
      if (res.success && res.data) this.leaveRequests = res.data.data || [];
    });

    this.api.getAttendanceLogs().subscribe(res => {
      if (res.success && res.data) this.attendanceLogs = res.data.data || [];
    });

    this.api.getShiftSchedules().subscribe(res => {
      if (res.success) this.shiftSchedules = res.data || [];
    });

    this.api.getEmployees().subscribe(res => {
      if (res.success && res.data) {
        this.employees = res.data.data || [];
        if (this.employees.length > 0 && !this.manualAttendance.employeeId) {
          this.manualAttendance.employeeId = this.employees[0].id;
          this.newShift.employeeId = this.employees[0].id;
        }
      }
    });
  }

  public handleCheckIn(): void {
    this.loadingAction = true;
    const req: CheckInRequest = { workLocation: this.clockLocation };
    this.api.checkIn(req).subscribe({
      next: (res) => {
        this.loadingAction = false;
        if (res.success) {
          this.todayAttendance = res.data;
          this.loadAllData();
        }
      },
      error: () => { this.loadingAction = false; }
    });
  }

  public handleCheckOut(): void {
    this.loadingAction = true;
    const req: CheckOutRequest = {};
    this.api.checkOut(req).subscribe({
      next: (res) => {
        this.loadingAction = false;
        if (res.success) {
          this.todayAttendance = res.data;
          this.loadAllData();
        }
      },
      error: () => { this.loadingAction = false; }
    });
  }

  // Filter Getters
  public get filteredLeaves(): LeaveRequest[] {
    return this.leaveRequests.filter(r => {
      const matchStatus = this.selectedLeaveStatus === 'ALL' || r.status === this.selectedLeaveStatus;
      const s = this.searchLeaveText.toLowerCase().trim();
      const matchSearch = !s ||
        r.requestNumber.toLowerCase().includes(s) ||
        r.employeeName.toLowerCase().includes(s) ||
        r.leaveType.toLowerCase().includes(s);
      return matchStatus && matchSearch;
    });
  }

  public get filteredAttendance(): AttendanceLog[] {
    return this.attendanceLogs.filter(a => {
      const matchStatus = this.selectedAttendanceStatus === 'ALL' || a.status === this.selectedAttendanceStatus;
      const s = this.searchAttendanceText.toLowerCase().trim();
      const matchSearch = !s ||
        a.employeeName.toLowerCase().includes(s) ||
        a.workLocation.toLowerCase().includes(s);
      return matchStatus && matchSearch;
    });
  }

  public setLeaveStatusFilter(status: string): void {
    this.selectedLeaveStatus = status;
  }

  public setAttendanceStatusFilter(status: string): void {
    this.selectedAttendanceStatus = status;
  }

  public countLeavesByStatus(status: LeaveStatus): number {
    return this.leaveRequests.filter(r => r.status === status).length;
  }

  public countAttendanceByStatus(status: AttendanceStatus): number {
    return this.attendanceLogs.filter(a => a.status === status).length;
  }

  // Modal Handlers
  public openCreateLeaveModal(): void {
    this.newLeave = {
      employeeId: this.employees[0]?.id,
      leaveType: 'Annual',
      startDateUtc: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      endDateUtc: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      reason: ''
    };
    this.calculateDays();
    this.showCreateLeaveModal = true;
  }

  public closeCreateLeaveModal(): void {
    this.showCreateLeaveModal = false;
  }

  public calculateDays(): void {
    if (this.newLeave.startDateUtc && this.newLeave.endDateUtc) {
      const start = new Date(this.newLeave.startDateUtc).getTime();
      const end = new Date(this.newLeave.endDateUtc).getTime();
      const diff = Math.max(0, (end - start) / (1000 * 60 * 60 * 24)) + 1;
      this.calculatedDays = diff;
      this.newLeave.daysCount = diff;
    }
  }

  public submitLeaveRequest(): void {
    this.loadingAction = true;
    this.api.submitLeaveRequest(this.newLeave).subscribe({
      next: (res) => {
        this.loadingAction = false;
        if (res.success) {
          this.closeCreateLeaveModal();
          this.loadAllData();
        }
      },
      error: () => { this.loadingAction = false; }
    });
  }

  public openReviewModal(leave: LeaveRequest): void {
    this.selectedLeave = leave;
    this.reviewRejectionReason = '';
    this.showReviewModal = true;
  }

  public closeReviewModal(): void {
    this.showReviewModal = false;
    this.selectedLeave = null;
  }

  public handleActionLeave(status: LeaveStatus): void {
    if (!this.selectedLeave) return;
    this.loadingAction = true;
    const req: ActionLeaveRequestRequest = {
      status,
      rejectionReason: status === 'Rejected' ? this.reviewRejectionReason : undefined
    };

    this.api.actionLeaveRequest(this.selectedLeave.id, req).subscribe({
      next: (res) => {
        this.loadingAction = false;
        if (res.success) {
          this.closeReviewModal();
          this.loadAllData();
        }
      },
      error: () => { this.loadingAction = false; }
    });
  }

  public cancelLeave(id: string): void {
    if (!confirm('Are you sure you want to cancel this leave request?')) return;
    this.api.cancelLeaveRequest(id).subscribe(res => {
      if (res.success) this.loadAllData();
    });
  }

  public openRecordAttendanceModal(): void {
    this.manualAttendance = {
      employeeId: this.employees[0]?.id || '',
      date: new Date().toISOString().split('T')[0],
      status: 'Present',
      workLocation: 'HQ - Main Campus',
      notes: ''
    };
    this.manualAttendanceInTime = '09:00';
    this.manualAttendanceOutTime = '17:30';
    this.showRecordAttendanceModal = true;
  }

  public closeRecordAttendanceModal(): void {
    this.showRecordAttendanceModal = false;
  }

  public saveManualAttendance(): void {
    this.loadingAction = true;
    const req: RecordAttendanceRequest = {
      ...this.manualAttendance,
      checkInTimeUtc: `${this.manualAttendance.date}T${this.manualAttendanceInTime}:00Z`,
      checkOutTimeUtc: `${this.manualAttendance.date}T${this.manualAttendanceOutTime}:00Z`
    };

    this.api.recordAttendance(req).subscribe({
      next: (res) => {
        this.loadingAction = false;
        if (res.success) {
          this.closeRecordAttendanceModal();
          this.loadAllData();
        }
      },
      error: () => { this.loadingAction = false; }
    });
  }

  public openCreateShiftModal(): void {
    this.newShift = {
      employeeId: this.employees[0]?.id || '',
      shiftName: '',
      shiftType: 'StandardDay',
      startTime: '09:00:00',
      endTime: '17:30:00',
      effectiveFromUtc: new Date().toISOString().split('T')[0],
      notes: ''
    };
    this.shiftStartTime = '09:00';
    this.shiftEndTime = '17:30';
    this.showShiftModal = true;
  }

  public closeShiftModal(): void {
    this.showShiftModal = false;
  }

  public saveShiftSchedule(): void {
    this.loadingAction = true;
    this.newShift.startTime = `${this.shiftStartTime}:00`;
    this.newShift.endTime = `${this.shiftEndTime}:00`;

    this.api.createShiftSchedule(this.newShift).subscribe({
      next: (res) => {
        this.loadingAction = false;
        if (res.success) {
          this.closeShiftModal();
          this.loadAllData();
        }
      },
      error: () => { this.loadingAction = false; }
    });
  }

  public deleteShift(id: string): void {
    if (!confirm('Are you sure you want to remove this shift schedule?')) return;
    this.api.deleteShiftSchedule(id).subscribe(res => {
      if (res.success) this.loadAllData();
    });
  }

  // Helpers
  public formatTime(isoStr?: string): string {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  public getInitials(name?: string): string {
    if (!name) return 'EM';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  public mathMin(a: number, b: number): number {
    return Math.min(a, b);
  }

  public getRoleBadgeClass(role: TenantRole): string {
    switch (role) {
      case 'Owner': return 'badge-amber';
      case 'Admin': return 'badge-indigo';
      case 'Manager': return 'badge-cyan';
      default: return 'badge-emerald';
    }
  }

  public getLeaveTypeBadge(type: LeaveType): string {
    switch (type) {
      case 'Annual': return 'badge-indigo';
      case 'Sick': return 'badge-amber';
      case 'Unpaid': return 'badge-cyan';
      case 'MaternityPaternity': return 'badge-emerald';
      case 'Compensatory': return 'badge-violet';
      default: return 'badge-indigo';
    }
  }

  public getLeaveStatusClass(status: LeaveStatus): string {
    switch (status) {
      case 'Pending': return 'status-pending';
      case 'Approved': return 'status-approved';
      case 'Rejected': return 'status-rejected';
      case 'Cancelled': return 'status-cancelled';
      default: return 'status-pending';
    }
  }

  public getAttendanceStatusClass(status: AttendanceStatus): string {
    switch (status) {
      case 'Present': return 'status-present';
      case 'Late': return 'status-late';
      case 'HalfDay': return 'status-late';
      case 'Absent': return 'status-absent';
      case 'OnLeave': return 'status-completed';
      default: return 'status-present';
    }
  }
}
