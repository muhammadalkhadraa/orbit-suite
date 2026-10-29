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
  TenantRole,
  EmployeeVacationBalance,
  PayrollRecord,
  PayrollSummary,
  EmployeePayslipSpreadsheet,
  SendEmailResult,
  SubmitHrSheetRequest,
  EmployeeSalaryProfile
} from '../../core/models/models';
import { ToastService } from '../../core/services/toast.service';

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
          <button (click)="exportHrCsv()" class="btn-secondary" title="Export Leaves / Attendance to CSV">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Export CSV</span>
          </button>
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

        <button
          (click)="switchTab('payroll')"
          class="tab-btn"
          [class.active]="activeTab === 'payroll'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          <span>Monthly Payroll & Compensation</span>
          <span class="tab-badge badge-indigo">{{ payrollRecords.length }}</span>
        </button>

        <button
          (click)="switchTab('profiles')"
          class="tab-btn"
          [class.active]="activeTab === 'profiles'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>Employee Profile & Salary Calculation</span>
          <span class="tab-badge badge-amber">Contracts & Formulas</span>
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
                  <th>Vacation Days Balance</th>
                  <th>Reason</th>
                  <th>Status & HR Forwarding</th>
                  <th>Approver</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngIf="filteredLeaves.length === 0">
                  <td colspan="9" class="empty-state-cell">
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
                  <td>
                    <div class="balance-cell">
                      <span class="balance-tag" [ngClass]="getRemainingDaysClass(leave.remainingBalanceAtRequest ?? 0)">
                        {{ (leave.remainingBalanceAtRequest ?? 0) > 0 ? '+' : '' }}{{ leave.remainingBalanceAtRequest ?? 0 }}d
                      </span>
                      <span *ngIf="leave.status === 'Approved' && leave.resultingBalanceAfterApproval !== undefined" class="resulting-balance">
                        after: {{ (leave.resultingBalanceAfterApproval || 0) > 0 ? '+' : '' }}{{ leave.resultingBalanceAfterApproval }}d
                      </span>
                    </div>
                  </td>
                  <td class="reason-cell">
                    <div class="reason-text" [title]="leave.reason">{{ leave.reason }}</div>
                    <div *ngIf="leave.rejectionReason" class="rejection-hint">
                      Rejection Note: {{ leave.rejectionReason }}
                    </div>
                  </td>
                  <td>
                    <div class="status-cell-wrapper">
                      <span class="status-pill" [ngClass]="getLeaveStatusClass(leave.status)">
                        {{ leave.status }}
                      </span>
                      <div *ngIf="leave.isForwardedToHr" class="hr-forwarded-pill" title="Accepted request automatically forwarded to HR for payroll records">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        <span>HR Synced</span>
                      </div>
                    </div>
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

      <!-- TAB 4: Monthly Payroll & Compensation Content -->
      <div *ngIf="activeTab === 'payroll'" class="tab-content">
        <!-- Payroll Period & Actions Control Bar -->
        <div class="payroll-filter-bar glass-panel">
          <div class="period-controls">
            <span class="font-bold text-white">Pay Period:</span>
            <select [(ngModel)]="selectedPayrollMonth" (change)="loadPayroll()" class="form-select" style="width: 140px;">
              <option [value]="1">January</option>
              <option [value]="2">February</option>
              <option [value]="3">March</option>
              <option [value]="4">April</option>
              <option [value]="5">May</option>
              <option [value]="6">June</option>
              <option [value]="7">July</option>
              <option [value]="8">August</option>
              <option [value]="9">September</option>
              <option [value]="10">October</option>
              <option [value]="11">November</option>
              <option [value]="12">December</option>
            </select>
            <select [(ngModel)]="selectedPayrollYear" (change)="loadPayroll()" class="form-select" style="width: 100px;">
              <option [value]="2025">2025</option>
              <option [value]="2026">2026</option>
              <option [value]="2027">2027</option>
            </select>
          </div>

          <div class="payroll-actions">
            <button (click)="generatePayroll()" [disabled]="payrollLoading" class="btn-secondary" title="Recalculate attendance, overtime and deficit vacation deductions">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              <span>{{ payrollLoading ? 'Calculating...' : 'Generate Payroll Batch' }}</span>
            </button>

            <button *ngIf="canManageHr" (click)="approvePayroll()" [disabled]="payrollLoading || (payrollSummary?.draftCount === 0)" class="btn-secondary" title="Approve current payroll batch for distribution">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span>Approve Batch ({{ payrollSummary?.draftCount || 0 }} Drafts)</span>
            </button>

            <button (click)="downloadMasterPayrollSpreadsheet()" class="btn-secondary" title="Download master payroll sheet spreadsheet">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Master Excel/CSV</span>
            </button>

            <button *ngIf="canManageHr" (click)="sendAllPayslipsEmail()" [disabled]="payrollLoading || payrollRecords.length === 0" class="btn-primary" title="Email individual payroll spreadsheets to all employees">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              <span>Send All via Email</span>
            </button>
          </div>
        </div>

        <!-- Monthly Payroll Overview KPIs -->
        <div class="payroll-kpis-grid">
          <div class="metric-card glass-panel">
            <div class="metric-header">
              <span class="metric-label">TOTAL GROSS PAYROLL</span>
              <div class="metric-icon icon-indigo">💼</div>
            </div>
            <div class="metric-value font-mono text-indigo">\${{ totalGrossPay | number:'1.2-2' }}</div>
            <div class="metric-subtext">Before deductions & withholdings</div>
          </div>

          <div class="metric-card glass-panel">
            <div class="metric-header">
              <span class="metric-label">NET SALARIES PAYABLE</span>
              <div class="metric-icon icon-emerald">💵</div>
            </div>
            <div class="metric-value font-mono text-emerald">\${{ totalNetPay | number:'1.2-2' }}</div>
            <div class="metric-subtext">Disbursed to personnel accounts</div>
          </div>

          <div class="metric-card glass-panel">
            <div class="metric-header">
              <span class="metric-label">OVERTIME DISBURSED</span>
              <div class="metric-icon icon-cyan">⚡</div>
            </div>
            <div class="metric-value font-mono text-cyan">\${{ totalOvertimePay | number:'1.2-2' }}</div>
            <div class="metric-subtext">Calculated from time tracker logs</div>
          </div>

          <div class="metric-card glass-panel">
            <div class="metric-header">
              <span class="metric-label">VACATION DEFICIT DEDUCTIONS</span>
              <div class="metric-icon icon-amber">🏖️</div>
            </div>
            <div class="metric-value font-mono text-rose">\${{ totalVacationDeficitDeductions | number:'1.2-2' }}</div>
            <div class="metric-subtext">Unpaid leave for negative vacation days</div>
          </div>

          <div class="metric-card glass-panel">
            <div class="metric-header">
              <span class="metric-label">PAYSLIP EMAIL STATUS</span>
              <div class="metric-icon icon-violet">✉️</div>
            </div>
            <div class="metric-value text-violet">
              {{ payrollSummary?.emailedCount || 0 }} / {{ payrollSummary?.totalEmployees || 0 }}
            </div>
            <div class="metric-subtext">
              <span *ngIf="(payrollSummary?.emailedCount || 0) === (payrollSummary?.totalEmployees || 0) && (payrollSummary?.totalEmployees || 0) > 0" class="badge badge-emerald">All Dispatched</span>
              <span *ngIf="(payrollSummary?.emailedCount || 0) < (payrollSummary?.totalEmployees || 0)" class="badge badge-amber">Distribution Incomplete</span>
            </div>
          </div>
        </div>

        <!-- Master Employee Payroll Table -->
        <div class="table-container glass-panel">
          <div class="table-header">
            <div>
              <h3 class="font-heading-4">Employee Monthly Payroll Statements</h3>
              <p class="font-caption">Individual salary sheets with attendance, overtime, tax withholdings, and vacation deficit deductions</p>
            </div>
            <div class="table-badge-group">
              <span class="badge badge-indigo">{{ payrollRecords.length }} Employees Listed</span>
            </div>
          </div>

          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>PAYROLL #</th>
                  <th>EMPLOYEE</th>
                  <th>BASE SALARY</th>
                  <th>OVERTIME</th>
                  <th>ATTENDANCE</th>
                  <th>VACATION DEFICIT</th>
                  <th>TOTAL DEDUCTIONS</th>
                  <th>NET SALARY</th>
                  <th>STATUS</th>
                  <th>EMAIL STATUS</th>
                  <th style="text-align: right;">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let rec of payrollRecords" class="table-row">
                  <td class="font-mono text-secondary">{{ rec.payrollNumber }}</td>
                  <td>
                    <div class="emp-cell">
                      <div class="emp-avatar sm">{{ getInitials(rec.employeeName) }}</div>
                      <div>
                        <div class="emp-name">{{ rec.employeeName }}</div>
                        <div class="emp-sub">{{ rec.employeeNumber }} • {{ rec.departmentName }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="font-mono">\${{ rec.baseSalary | number:'1.2-2' }}</td>
                  <td>
                    <div *ngIf="rec.overtimeHours > 0">
                      <span class="font-mono text-cyan">+\${{ rec.overtimePay | number:'1.2-2' }}</span>
                      <div class="font-caption text-secondary">{{ rec.overtimeHours }} hrs &#64; \${{ rec.overtimeRate }}/h</div>
                    </div>
                    <span *ngIf="rec.overtimeHours === 0" class="text-secondary">—</span>
                  </td>
                  <td>
                    <div class="font-caption">
                      <span class="text-emerald">{{ rec.daysPresent }}/{{ rec.workingDaysExpected }} days</span>
                      <span *ngIf="rec.daysAbsent > 0" class="text-rose"> • {{ rec.daysAbsent }} absent</span>
                      <span *ngIf="rec.lateOccurrences > 0" class="text-amber"> • {{ rec.lateOccurrences }} late</span>
                    </div>
                  </td>
                  <td>
                    <div *ngIf="rec.negativeVacationDays > 0">
                      <span class="badge badge-rose font-mono">-{{ rec.negativeVacationDays }} days</span>
                      <div class="font-caption text-rose">-\${{ rec.vacationDeficitDeduction | number:'1.2-2' }}</div>
                    </div>
                    <span *ngIf="rec.negativeVacationDays === 0" class="text-secondary font-mono">0.0 days ($0)</span>
                  </td>
                  <td class="font-mono text-rose">-\${{ rec.totalDeductions | number:'1.2-2' }}</td>
                  <td>
                    <span class="font-mono font-bold text-emerald" style="font-size: 1rem;">
                      \${{ rec.netPay | number:'1.2-2' }}
                    </span>
                  </td>
                  <td>
                    <span *ngIf="rec.status === 'PendingHrSheet'" class="badge" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); padding: 0.35rem 0.6rem;">
                      ⏳ Sheet Requested
                    </span>
                    <span *ngIf="rec.status === 'HrSheetSubmitted'" class="badge" style="background: rgba(6, 182, 212, 0.2); color: #22d3ee; border: 1px solid rgba(6, 182, 212, 0.4); padding: 0.35rem 0.6rem;">
                      📤 Sheet Dispatched
                    </span>
                    <span *ngIf="rec.status === 'Approved'" class="badge badge-emerald" style="padding: 0.35rem 0.6rem;">
                      ✓ Approved (Ready to Email)
                    </span>
                    <span *ngIf="rec.status === 'Paid'" class="badge" style="background: rgba(99, 102, 241, 0.2); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.4); padding: 0.35rem 0.6rem;">
                      ✉️ Paid & Emailed
                    </span>
                    <span *ngIf="rec.status === 'Draft'" class="badge badge-slate">
                      Draft
                    </span>
                  </td>
                  <td>
                    <div *ngIf="rec.isEmailedToEmployee" class="status-cell-wrapper">
                      <span class="badge badge-emerald">Emailed</span>
                      <span class="font-caption text-secondary" style="font-size: 0.65rem;">{{ rec.emailedAtUtc | date:'short' }}</span>
                    </div>
                    <span *ngIf="!rec.isEmailedToEmployee" class="badge badge-amber">Pending</span>
                  </td>
                  <td style="text-align: right;">
                    <div class="action-buttons-group" style="display: flex; gap: 0.4rem; justify-content: flex-end; align-items: center;">
                      <!-- Step 2 Action: When Accounting requests sheet, HR fills & sends sheet to Accounting -->
                      <button *ngIf="rec.status === 'PendingHrSheet'"
                              (click)="openHrSheetModal(rec)"
                              class="btn-primary"
                              style="padding: 0.4rem 0.85rem; font-size: 0.75rem; background: linear-gradient(135deg, #f59e0b, #d97706); border: none; display: flex; align-items: center; gap: 0.35rem; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);"
                              title="Fill and Send HR Sheet to Accounting (Abdelrazik)">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        <span>📝 Step 2: Fill HR Sheet</span>
                      </button>

                      <!-- Step 4 Action: When Accounting has approved payroll, HR emails to employee -->
                      <button *ngIf="rec.status === 'Approved'"
                              (click)="sendEmployeeEmail(rec)"
                              class="btn-primary"
                              style="padding: 0.4rem 0.85rem; font-size: 0.75rem; background: linear-gradient(135deg, #3b82f6, #2563eb); border: none; display: flex; align-items: center; gap: 0.35rem; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);"
                              title="Email Payslip Spreadsheet to Employee">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        <span>✉️ Step 4: Send via Email</span>
                      </button>

                      <button (click)="openPayslipModal(rec)" class="btn-action" title="View Detailed Itemized Payslip">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                      <button (click)="viewEmployeeSalaryProfile(rec.employeeId)" class="btn-action" title="View Full Contract Profile & Live Calculator" style="color: #60a5fa;">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      </button>
                      <button (click)="downloadEmployeePayslip(rec)" class="btn-action" title="Download Excel/CSV Spreadsheet">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB 5: Employee Profile, Database Contract & Live Salary Calculation -->
      <div *ngIf="activeTab === 'profiles'" class="tab-content">
        <!-- Subheader & Employee Selector -->
        <div class="glass-panel" style="padding: 1.25rem; margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 1rem; border: 1px solid rgba(99, 102, 241, 0.3);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div>
              <div class="badge badge-amber" style="margin-bottom: 0.35rem; font-weight: 700;">HR WORKFORCE INTELLIGENCE & SALARY CALCULATOR</div>
              <h2 class="font-heading-3" style="color: #f8fafc; margin: 0;">Employee Contract Profile & Rate Formulas</h2>
              <p class="font-caption" style="color: #94a3b8; margin: 0.25rem 0 0 0;">
                Select any employee to view database-stored contract specifications, absence ledger, vacation balances, late penalty hours, and real-time salary computation.
              </p>
            </div>

            <!-- Month / Year Selector -->
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="font-caption text-secondary" style="font-weight: 600;">Calculation Month:</span>
              <select [(ngModel)]="profileMonth" (change)="selectProfileMonth(profileMonth)" class="form-select-sm" style="width: 130px; background: rgba(15, 23, 42, 0.8);">
                <option [value]="1">January</option>
                <option [value]="2">February</option>
                <option [value]="3">March</option>
                <option [value]="4">April</option>
                <option [value]="5">May</option>
                <option [value]="6">June</option>
                <option [value]="7">July</option>
                <option [value]="8">August</option>
                <option [value]="9">September</option>
                <option [value]="10">October</option>
                <option [value]="11">November</option>
                <option [value]="12">December</option>
              </select>
              <select [(ngModel)]="profileYear" (change)="selectProfileMonth(profileMonth)" class="form-select-sm" style="width: 90px; background: rgba(15, 23, 42, 0.8);">
                <option [value]="2025">2025</option>
                <option [value]="2026">2026</option>
                <option [value]="2027">2027</option>
              </select>
            </div>
          </div>

          <!-- Employee Select Bar -->
          <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; padding-top: 0.75rem; border-top: 1px solid rgba(255, 255, 255, 0.08);">
            <div style="flex: 1; min-width: 280px; position: relative;">
              <label class="form-label-sm" style="color: #60a5fa; font-weight: 700; margin-bottom: 0.35rem; display: block;">
                SELECT EMPLOYEE TO INSPECT DATA & CALCULATE SALARY:
              </label>
              <select 
                [(ngModel)]="selectedEmployeeIdForProfile" 
                (change)="onSelectEmployeeForProfile(selectedEmployeeIdForProfile)" 
                class="form-select font-bold" 
                style="width: 100%; padding: 0.65rem 1rem; background: rgba(15, 23, 42, 0.95); border: 1px solid #6366f1; color: #ffffff; border-radius: 8px;">
                <option value="">-- Choose an Employee --</option>
                <option *ngFor="let emp of employees" [value]="emp.id">
                  {{ emp.fullName }} ({{ emp.employeeNumber }}) — {{ emp.jobTitle }} [{{ emp.departmentName || 'Operations' }}]
                </option>
              </select>
            </div>

            <!-- Quick Employee Selector Chips -->
            <div style="display: flex; gap: 0.5rem; align-items: flex-end; flex-wrap: wrap;">
              <button 
                *ngFor="let emp of employees.slice(0, 4)" 
                (click)="onSelectEmployeeForProfile(emp.id)" 
                class="btn-secondary" 
                style="font-size: 0.75rem; padding: 0.4rem 0.75rem; border-radius: 20px;"
                [style.borderColor]="selectedEmployeeIdForProfile === emp.id ? '#6366f1' : 'rgba(255,255,255,0.1)'"
                [style.background]="selectedEmployeeIdForProfile === emp.id ? 'rgba(99, 102, 241, 0.25)' : 'rgba(30, 41, 59, 0.6)'">
                👤 {{ emp.fullName }}
              </button>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="profileLoading" class="glass-panel" style="padding: 3rem; text-align: center; color: #94a3b8;">
          <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">⏳</div>
          <div>Loading employee contract, attendance logs, and calculating salary...</div>
        </div>

        <!-- Loaded Profile Card -->
        <div *ngIf="!profileLoading && selectedEmployeeProfile as p" style="display: flex; flex-direction: column; gap: 1.5rem;">
          <!-- 1. Header Profile & Contract Badge -->
          <div class="glass-panel-elevated" style="padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1.25rem; border-left: 5px solid #10b981;">
            <div style="display: flex; align-items: center; gap: 1.25rem;">
              <div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700; color: #ffffff; box-shadow: 0 0 15px rgba(99, 102, 241, 0.5);">
                {{ p.firstName.charAt(0) }}{{ p.lastName.charAt(0) }}
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                  <h2 style="font-size: 1.5rem; font-weight: 700; color: #ffffff; margin: 0;">{{ p.fullName }}</h2>
                  <span class="badge badge-emerald" style="font-weight: 700;">{{ p.employeeNumber }}</span>
                  <span class="badge badge-indigo">{{ p.departmentName || 'General Staff' }}</span>
                  <span class="badge badge-amber">📜 {{ p.contractType || 'Permanent Full-Time' }}</span>
                </div>
                <div style="color: #94a3b8; font-size: 0.875rem; margin-top: 0.35rem; display: flex; gap: 1rem; flex-wrap: wrap;">
                  <span>💼 <strong>{{ p.jobTitle }}</strong></span>
                  <span>🏢 {{ p.branchName || 'Headquarters' }}</span>
                  <span>📧 {{ p.email }}</span>
                  <span *ngIf="p.hireDateUtc">📅 Joined: {{ p.hireDateUtc | date:'mediumDate' }}</span>
                </div>
              </div>
            </div>

            <!-- Stored Contract Monthly Salary Callout -->
            <div style="text-align: right; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); padding: 0.75rem 1.25rem; border-radius: 10px;">
              <div style="font-size: 0.72rem; color: #6ee7b7; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">
                Stored Database Contract Salary
              </div>
              <div style="font-size: 1.85rem; font-weight: 800; color: #10b981; font-family: monospace; line-height: 1.2;">
                \${{ p.baseMonthlySalary | number:'1.2-2' }}
              </div>
              <div style="font-size: 0.72rem; color: #94a3b8;">Persisted in PostgreSQL Employees Table</div>
            </div>
          </div>

          <!-- 2. The Strict Pricing Formulas Banner (Day Price: Salary / 30, Hour Price: Day Price / 9) -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem;">
            <!-- Day Price Card -->
            <div class="glass-panel" style="padding: 1.25rem; border: 1px solid rgba(59, 130, 246, 0.4); background: linear-gradient(180deg, rgba(30, 58, 138, 0.2), rgba(15, 23, 42, 0.6));">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                <span style="font-size: 0.75rem; font-weight: 700; color: #93c5fd; text-transform: uppercase;">
                  ☀️ DAY PRICE (Daily Rate)
                </span>
                <span class="badge badge-indigo" style="font-size: 0.7rem;">Salary ÷ 30</span>
              </div>
              <div style="font-size: 2rem; font-weight: 800; color: #60a5fa; font-family: monospace; line-height: 1.2;">
                \${{ p.dailyRate | number:'1.2-2' }}<span style="font-size: 0.9rem; font-weight: 400; color: #94a3b8;">/day</span>
              </div>
              <div style="margin-top: 0.65rem; font-size: 0.75rem; color: #cbd5e1; line-height: 1.4; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.5rem;">
                <strong>Rule:</strong> \${{ p.baseMonthlySalary | number:'1.0-0' }} ÷ 30 days = <strong>\${{ p.dailyRate | number:'1.2-2' }}/day</strong>.<br>
                Used for unexcused absence & vacation deficit deductions.
              </div>
            </div>

            <!-- Hour Price Card -->
            <div class="glass-panel" style="padding: 1.25rem; border: 1px solid rgba(168, 85, 247, 0.4); background: linear-gradient(180deg, rgba(88, 28, 135, 0.2), rgba(15, 23, 42, 0.6));">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                <span style="font-size: 0.75rem; font-weight: 700; color: #d8b4fe; text-transform: uppercase;">
                  ⏱️ HOUR PRICE (Hourly Rate)
                </span>
                <span class="badge badge-violet" style="font-size: 0.7rem;">Day Price ÷ 9</span>
              </div>
              <div style="font-size: 2rem; font-weight: 800; color: #c084fc; font-family: monospace; line-height: 1.2;">
                \${{ p.hourlyRate | number:'1.2-2' }}<span style="font-size: 0.9rem; font-weight: 400; color: #94a3b8;">/hr</span>
              </div>
              <div style="margin-top: 0.65rem; font-size: 0.75rem; color: #cbd5e1; line-height: 1.4; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.5rem;">
                <strong>Rule:</strong> \${{ p.dailyRate | number:'1.2-2' }} ÷ 9 hours = <strong>\${{ p.hourlyRate | number:'1.2-2' }}/hr</strong>.<br>
                Used for late arrival penalty calculations.
              </div>
            </div>

            <!-- Overtime Rate Card -->
            <div class="glass-panel" style="padding: 1.25rem; border: 1px solid rgba(245, 158, 11, 0.4); background: linear-gradient(180deg, rgba(120, 53, 15, 0.2), rgba(15, 23, 42, 0.6));">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                <span style="font-size: 0.75rem; font-weight: 700; color: #fde68a; text-transform: uppercase;">
                  ⚡ OVERTIME RATE (1.5x)
                </span>
                <span class="badge badge-amber" style="font-size: 0.7rem;">Hour Price × 1.5</span>
              </div>
              <div style="font-size: 2rem; font-weight: 800; color: #fbbf24; font-family: monospace; line-height: 1.2;">
                \${{ p.overtimeRate | number:'1.2-2' }}<span style="font-size: 0.9rem; font-weight: 400; color: #94a3b8;">/hr</span>
              </div>
              <div style="margin-top: 0.65rem; font-size: 0.75rem; color: #cbd5e1; line-height: 1.4; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.5rem;">
                <strong>Rule:</strong> \${{ p.hourlyRate | number:'1.2-2' }} × 1.5 = <strong>\${{ p.overtimeRate | number:'1.2-2' }}/hr</strong>.<br>
                Premium multiplier for extra hours performed.
              </div>
            </div>
          </div>

          <!-- 3. Attendance, Absences, Vacation Days & Late Hours Ledger -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">
            <!-- Left: Attendance & Hours Ledger -->
            <div class="glass-panel" style="padding: 1.25rem;">
              <h3 style="font-size: 1rem; font-weight: 700; color: #ffffff; margin: 0 0 1rem 0; display: flex; align-items: center; gap: 0.5rem;">
                <span>📊 Recorded Attendance & Hours Ledger</span>
              </h3>

              <div style="display: flex; flex-direction: column; gap: 0.85rem;">
                <!-- Working Days & Presence -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; background: rgba(255,255,255,0.03); border-radius: 6px;">
                  <div>
                    <div style="font-size: 0.85rem; font-weight: 600; color: #f8fafc;">Standard Expected Days:</div>
                    <div style="font-size: 0.72rem; color: #94a3b8;">Official working roster</div>
                  </div>
                  <span class="font-mono font-bold text-white">{{ p.workingDaysExpected }} days</span>
                </div>

                <!-- Days Present -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; background: rgba(16, 185, 129, 0.05); border-radius: 6px;">
                  <div>
                    <div style="font-size: 0.85rem; font-weight: 600; color: #34d399;">Days Present:</div>
                    <div style="font-size: 0.72rem; color: #94a3b8;">Biometric & clocked shifts</div>
                  </div>
                  <span class="font-mono font-bold text-emerald">{{ p.daysPresent }} days</span>
                </div>

                <!-- Unexcused Absence Days -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 6px;">
                  <div>
                    <div style="font-size: 0.85rem; font-weight: 700; color: #f87171;">❌ Unexcused Absence Days:</div>
                    <div style="font-size: 0.72rem; color: #94a3b8;">{{ p.daysAbsent }} days × Day Price (\${{ p.dailyRate | number:'1.2-2' }})</div>
                  </div>
                  <div style="text-align: right;">
                    <span class="font-mono font-bold" style="color: #f87171; font-size: 1.05rem;">
                      {{ p.daysAbsent }} days
                    </span>
                    <div style="font-size: 0.75rem; color: #fda4af; font-weight: 700; font-family: monospace;">
                      -\${{ p.absenceDeduction | number:'1.2-2' }}
                    </div>
                  </div>
                </div>

                <!-- Late Hours -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 6px;">
                  <div>
                    <div style="font-size: 0.85rem; font-weight: 700; color: #fbbf24;">⏰ Late Arrival Hours:</div>
                    <div style="font-size: 0.72rem; color: #94a3b8;">{{ p.lateOccurrences }} times ({{ p.lateHours }}h) × Hour Price (\${{ p.hourlyRate | number:'1.2-2' }})</div>
                  </div>
                  <div style="text-align: right;">
                    <span class="font-mono font-bold" style="color: #fbbf24; font-size: 1.05rem;">
                      {{ p.lateHours }} hrs
                    </span>
                    <div style="font-size: 0.75rem; color: #fde68a; font-weight: 700; font-family: monospace;">
                      -\${{ p.latePenaltyDeduction | number:'1.2-2' }}
                    </div>
                  </div>
                </div>

                <!-- Overtime Hours -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 6px;">
                  <div>
                    <div style="font-size: 0.85rem; font-weight: 700; color: #34d399;">⚡ Approved Overtime:</div>
                    <div style="font-size: 0.72rem; color: #94a3b8;">{{ p.overtimeHours }}h × Overtime Rate (\${{ p.overtimeRate | number:'1.2-2' }})</div>
                  </div>
                  <div style="text-align: right;">
                    <span class="font-mono font-bold" style="color: #34d399; font-size: 1.05rem;">
                      +{{ p.overtimeHours }} hrs
                    </span>
                    <div style="font-size: 0.75rem; color: #6ee7b7; font-weight: 700; font-family: monospace;">
                      +\${{ p.overtimePay | number:'1.2-2' }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right: Vacation Days & Deficit Deductions -->
            <div class="glass-panel" style="padding: 1.25rem;">
              <h3 style="font-size: 1rem; font-weight: 700; color: #ffffff; margin: 0 0 1rem 0; display: flex; align-items: center; gap: 0.5rem;">
                <span>🏖️ Vacation Quota & Deficit Deductions</span>
              </h3>

              <div style="display: flex; flex-direction: column; gap: 0.85rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; background: rgba(255,255,255,0.03); border-radius: 6px;">
                  <div>
                    <div style="font-size: 0.85rem; font-weight: 600; color: #f8fafc;">Allocated Annual Quota:</div>
                    <div style="font-size: 0.72rem; color: #94a3b8;">Annual paid vacation allowance</div>
                  </div>
                  <span class="font-mono font-bold text-white">{{ p.vacationDaysAllocated }} days</span>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; background: rgba(99, 102, 241, 0.08); border-radius: 6px;">
                  <div>
                    <div style="font-size: 0.85rem; font-weight: 600; color: #a5b4fc;">Vacation Days Taken (Used):</div>
                    <div style="font-size: 0.72rem; color: #94a3b8;">Approved time off taken to date</div>
                  </div>
                  <span class="font-mono font-bold" style="color: #a5b4fc;">{{ p.vacationDaysUsed }} days</span>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; border-radius: 6px;"
                  [style.background]="p.vacationDaysRemaining < 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.08)'">
                  <div>
                    <div style="font-size: 0.85rem; font-weight: 700;" [style.color]="p.vacationDaysRemaining < 0 ? '#f87171' : '#34d399'">
                      Vacation Balance Remaining:
                    </div>
                    <div style="font-size: 0.72rem; color: #94a3b8;">
                      {{ p.vacationDaysRemaining < 0 ? 'Exceeded quota - deficit penalty applies' : 'Active remaining paid leave' }}
                    </div>
                  </div>
                  <span class="font-mono font-bold" [style.color]="p.vacationDaysRemaining < 0 ? '#f87171' : '#34d399'">
                    {{ p.vacationDaysRemaining }} days
                  </span>
                </div>

                <!-- Vacation Deficit Penalty -->
                <div *ngIf="p.negativeVacationDays > 0" style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; background: rgba(239, 68, 68, 0.12); border: 1px solid #ef4444; border-radius: 6px;">
                  <div>
                    <div style="font-size: 0.85rem; font-weight: 700; color: #fca5a5;">⚠️ Vacation Deficit Deduction:</div>
                    <div style="font-size: 0.72rem; color: #fecaca;">{{ p.negativeVacationDays }} days × Day Price (\${{ p.dailyRate | number:'1.2-2' }})</div>
                  </div>
                  <span class="font-mono font-bold" style="color: #ef4444; font-size: 1.1rem;">
                    -\${{ p.vacationDeficitDeduction | number:'1.2-2' }}
                  </span>
                </div>

                <!-- Consumed Salary Deductions -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; background: rgba(255,255,255,0.03); border-radius: 6px;">
                  <div>
                    <div style="font-size: 0.85rem; font-weight: 600; color: #f8fafc;">Consumed Salary / Advances:</div>
                    <div style="font-size: 0.72rem; color: #94a3b8;">Advances or company expenses</div>
                  </div>
                  <span class="font-mono font-bold text-secondary">-\${{ p.consumedSalaryDeductions | number:'1.2-2' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 4. Complete Salary Calculation & Accounting Dispatch Card -->
          <div class="glass-panel-elevated" style="padding: 1.5rem; border: 1px solid rgba(16, 185, 129, 0.4); background: linear-gradient(180deg, rgba(6, 78, 59, 0.3), rgba(15, 23, 42, 0.8));">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;">
              <div>
                <span class="badge badge-emerald" style="font-weight: 700;">SALARY CALCULATION BREAKDOWN</span>
                <h3 style="font-size: 1.25rem; font-weight: 700; color: #ffffff; margin: 0.35rem 0 0 0;">
                  Live Net Calculated Salary for {{ p.fullName }}
                </h3>
              </div>

              <!-- Action button: Send to Accounting HR Sheet -->
              <button (click)="useProfileInHrSheet(p)" class="btn-primary" style="background: linear-gradient(135deg, #f59e0b, #d97706); border: none; padding: 0.75rem 1.5rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 20px rgba(245, 158, 11, 0.4);">
                <span>📝</span>
                <span>Dispatch in HR Sheet to Accounting (Amr -> Abdelrazik)</span>
              </button>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 1.25rem;">
              <div>
                <div style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase;">Base Contract Salary</div>
                <div style="font-size: 1.35rem; font-weight: 700; color: #ffffff; font-family: monospace;">
                  +\${{ p.baseMonthlySalary | number:'1.2-2' }}
                </div>
              </div>

              <div>
                <div style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase;">Overtime Earnings</div>
                <div style="font-size: 1.35rem; font-weight: 700; color: #34d399; font-family: monospace;">
                  +\${{ p.overtimePay | number:'1.2-2' }}
                </div>
                <div style="font-size: 0.7rem; color: #6ee7b7;">({{ p.overtimeHours }}h &#64; \${{ p.overtimeRate | number:'1.2-2' }}/h)</div>
              </div>

              <div>
                <div style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase;">Total Deductions</div>
                <div style="font-size: 1.35rem; font-weight: 700; color: #f87171; font-family: monospace;">
                  -\${{ p.totalDeductions | number:'1.2-2' }}
                </div>
                <div style="font-size: 0.7rem; color: #fda4af;">
                  (Absence -\${{ p.absenceDeduction | number:'1.0-0' }}, Late -\${{ p.latePenaltyDeduction | number:'1.0-0' }})
                </div>
              </div>

              <div style="border-left: 2px solid rgba(16, 185, 129, 0.4); padding-left: 1rem;">
                <div style="font-size: 0.75rem; color: #6ee7b7; font-weight: 700; text-transform: uppercase;">NET CALCULATED SALARY</div>
                <div style="font-size: 2rem; font-weight: 900; color: #10b981; font-family: monospace; line-height: 1.1;">
                  \${{ p.netPay | number:'1.2-2' }}
                </div>
                <div style="font-size: 0.7rem; color: #a7f3d0;">Pay Period: {{ profileMonth }}/{{ profileYear }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL 1: Request Time Off -->
      <div *ngIf="showCreateLeaveModal" class="modal-backdrop">
        <div class="modal-card glass-panel-elevated">
          <div class="modal-header">
            <div>
              <h2 class="font-heading-3">Request Time-Off</h2>
              <p class="modal-subtext">Direct manager review • Automatic HR payroll synchronization</p>
            </div>
            <button (click)="closeCreateLeaveModal()" class="close-btn">✕</button>
          </div>

          <div class="modal-body">
            <!-- LIVE VACATION DAYS COUNTER WIDGET -->
            <div class="vacation-counter-panel" [ngClass]="getVacationBalanceClass()">
              <div class="counter-header">
                <div class="counter-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  <span>Vacation Days Counter</span>
                </div>
                <div class="counter-status-pill">
                  <span *ngIf="(vacationBalance?.remainingDays ?? 21) > 0" class="badge badge-emerald">Available Quota</span>
                  <span *ngIf="(vacationBalance?.remainingDays ?? 21) === 0" class="badge badge-amber">Zero Balance</span>
                  <span *ngIf="(vacationBalance?.remainingDays ?? 21) < 0" class="badge badge-rose">Deficit Mode (Unpaid)</span>
                </div>
              </div>

              <div class="counter-stats-grid">
                <div class="stat-box">
                  <span class="stat-label">Allocated</span>
                  <span class="stat-value">{{ vacationBalance?.allocatedDays || 21 }} <small>days</small></span>
                </div>
                <div class="stat-box">
                  <span class="stat-label">Used</span>
                  <span class="stat-value">{{ vacationBalance?.usedDays || 0 }} <small>days</small></span>
                </div>
                <div class="stat-box highlight">
                  <span class="stat-label">Available Now</span>
                  <span class="stat-value font-mono" [ngClass]="getRemainingDaysClass(vacationBalance?.remainingDays ?? 21)">
                    {{ (vacationBalance?.remainingDays ?? 21) > 0 ? '+' : '' }}{{ vacationBalance?.remainingDays ?? 21 }}
                    <small>days</small>
                  </span>
                </div>
                <div class="stat-box highlight-secondary">
                  <span class="stat-label">Projected After</span>
                  <span class="stat-value font-mono" [ngClass]="getRemainingDaysClass(getProjectedRemainingDays())">
                    {{ getProjectedRemainingDays() > 0 ? '+' : '' }}{{ getProjectedRemainingDays() }}
                    <small>days</small>
                  </span>
                </div>
              </div>

              <div *ngIf="getProjectedRemainingDays() < 0" class="deficit-notice">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>Notice: Request exceeds available days. Once zero is reached, the balance counts into negative numbers ({{ getProjectedRemainingDays() }} days deficit) and forwards to HR for unpaid leave salary deduction upon approval.</span>
              </div>
            </div>

            <div *ngIf="canManageHr" class="form-group">
              <label class="form-label">Employee</label>
              <select [(ngModel)]="newLeave.employeeId" (change)="onLeaveEmployeeChange()" class="form-select">
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
                placeholder="Provide a clear description for direct manager review..."
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
              <span class="badge badge-amber">Designated Manager Authority</span>
              <h2 class="font-heading-3" style="margin-top: 0.25rem;">Review Leave {{ selectedLeave.requestNumber }}</h2>
              <p class="modal-subtext">Scoped approval: Only direct supervisor or department manager has action authority</p>
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
                <span class="rev-label">Dates Requested:</span>
                <span class="rev-val">{{ selectedLeave.startDateUtc | date:'mediumDate' }} — {{ selectedLeave.endDateUtc | date:'mediumDate' }} ({{ selectedLeave.daysCount }} days)</span>
              </div>
              <div class="review-row">
                <span class="rev-label">Balance At Request:</span>
                <span class="balance-tag font-mono" [ngClass]="getRemainingDaysClass(selectedLeave.remainingBalanceAtRequest ?? 0)">
                  {{ (selectedLeave.remainingBalanceAtRequest ?? 0) > 0 ? '+' : '' }}{{ selectedLeave.remainingBalanceAtRequest ?? 0 }} days
                </span>
              </div>
              <div class="review-row">
                <span class="rev-label">Resulting Balance:</span>
                <span class="balance-tag font-mono" [ngClass]="getRemainingDaysClass((selectedLeave.remainingBalanceAtRequest ?? 0) - selectedLeave.daysCount)">
                  {{ ((selectedLeave.remainingBalanceAtRequest ?? 0) - selectedLeave.daysCount) > 0 ? '+' : '' }}{{ (selectedLeave.remainingBalanceAtRequest ?? 0) - selectedLeave.daysCount }} days
                </span>
              </div>
              <div class="review-row reason-box">
                <span class="rev-label">Employee Reason:</span>
                <p class="rev-reason">{{ selectedLeave.reason }}</p>
              </div>
            </div>

            <div *ngIf="((selectedLeave.remainingBalanceAtRequest ?? 0) - selectedLeave.daysCount) < 0" class="deficit-notice" style="margin-top: 1rem;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>Warning: Approval will decrease vacation balance into a deficit ({{ (selectedLeave.remainingBalanceAtRequest ?? 0) - selectedLeave.daysCount }} days). This deficit will be automatically forwarded to HR for payroll salary deduction.</span>
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
              Approve & Sync to HR
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

      <!-- MODAL 5: Employee Payslip Statement Breakdown -->
      <div *ngIf="showPayslipModal && selectedPayslip" class="modal-backdrop">
        <div class="modal-card glass-panel-elevated" style="max-width: 640px;">
          <div class="modal-header">
            <div>
              <div class="badge badge-indigo">Official Salary Statement</div>
              <h2 class="font-heading-3" style="margin-top: 0.25rem;">{{ selectedPayslip.payrollNumber }}</h2>
              <p class="modal-subtext">{{ selectedPayslip.payPeriod }} • {{ selectedPayslip.employeeName }} ({{ selectedPayslip.employeeNumber }})</p>
            </div>
            <button (click)="closePayslipModal()" class="close-btn">✕</button>
          </div>

          <div class="modal-body">
            <!-- Employee Header Card -->
            <div class="review-details-card glass-panel">
              <div class="review-row">
                <span class="rev-label">Employee:</span>
                <span class="rev-val">{{ selectedPayslip.employeeName }} ({{ selectedPayslip.jobTitle || 'Team Member' }})</span>
              </div>
              <div class="review-row">
                <span class="rev-label">Department:</span>
                <span class="rev-val">{{ selectedPayslip.departmentName }}</span>
              </div>
              <div class="review-row">
                <span class="rev-label">Official Email:</span>
                <span class="rev-val font-mono">{{ selectedPayslip.email }}</span>
              </div>
              <div class="review-row">
                <span class="rev-label">Working Days / Present:</span>
                <span class="rev-val">{{ selectedPayslip.daysPresent }} present of {{ selectedPayslip.workingDaysExpected }} expected</span>
              </div>
            </div>

            <!-- Two-Column Earnings & Deductions Breakdown -->
            <div class="payslip-summary-grid">
              <!-- Earnings Column -->
              <div class="payslip-section">
                <div class="payslip-section-title">EARNINGS & COMPENSATION</div>
                <div class="payslip-row">
                  <span>Base Salary:</span>
                  <span class="font-mono">\${{ selectedPayslip.baseSalary | number:'1.2-2' }}</span>
                </div>
                <div class="payslip-row">
                  <span>Overtime ({{ selectedPayslip.overtimeHours }}h):</span>
                  <span class="font-mono text-cyan">+\${{ selectedPayslip.overtimePay | number:'1.2-2' }}</span>
                </div>
                <div class="payslip-row">
                  <span>Bonuses / Incentives:</span>
                  <span class="font-mono text-emerald">+\${{ selectedPayslip.bonuses | number:'1.2-2' }}</span>
                </div>
                <div class="payslip-row total-row">
                  <span>Gross Earnings:</span>
                  <span class="font-mono text-indigo">\${{ selectedPayslip.grossPay | number:'1.2-2' }}</span>
                </div>
              </div>

              <!-- Deductions Column -->
              <div class="payslip-section">
                <div class="payslip-section-title">STATUTORY & DEDUCTIONS</div>
                <div class="payslip-row">
                  <span>Absence Deductions:</span>
                  <span class="font-mono">-\${{ selectedPayslip.absenceDeduction | number:'1.2-2' }}</span>
                </div>
                <div class="payslip-row">
                  <span>Late Deductions:</span>
                  <span class="font-mono">-\${{ selectedPayslip.latePenaltyDeduction | number:'1.2-2' }}</span>
                </div>
                <!-- Vacation Deficit Deduction highlight -->
                <div class="payslip-row" [class.highlight-deduction]="selectedPayslip.negativeVacationDays > 0">
                  <span>Vacation Deficit ({{ selectedPayslip.negativeVacationDays }}d):</span>
                  <span class="font-mono">-\${{ selectedPayslip.vacationDeficitDeduction | number:'1.2-2' }}</span>
                </div>
                <div class="payslip-row">
                  <span>Income Tax ({{ selectedPayslip.taxRatePercentage }}%):</span>
                  <span class="font-mono">-\${{ selectedPayslip.taxDeduction | number:'1.2-2' }}</span>
                </div>
                <div class="payslip-row">
                  <span>Social Security (5%):</span>
                  <span class="font-mono">-\${{ selectedPayslip.socialSecurityDeduction | number:'1.2-2' }}</span>
                </div>
                <div class="payslip-row total-row">
                  <span>Total Deductions:</span>
                  <span class="font-mono text-rose">-\${{ selectedPayslip.totalDeductions | number:'1.2-2' }}</span>
                </div>
              </div>
            </div>

            <!-- Negative Vacation Explanatory Banner if applicable -->
            <div *ngIf="selectedPayslip.negativeVacationDays > 0" class="deficit-notice">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <div>
                <strong>Negative Vacation Deficit Applied:</strong> Employee exhausted vacation balance ({{ selectedPayslip.negativeVacationDays }} days below 0 baseline). Deducted as unpaid leave at the standard daily rate (\${{ getPayslipDailyRate(selectedPayslip) | number:'1.2-2' }}/day).
              </div>
            </div>

            <!-- Net Salary Payable Glow Box -->
            <div class="payslip-net-box">
              <div class="payslip-net-title">NET SALARY PAYABLE</div>
              <div class="payslip-net-amount">\${{ selectedPayslip.netPay | number:'1.2-2' }}</div>
              <div class="font-caption text-secondary" style="margin-top: 0.25rem;">
                Status: {{ selectedPayslip.statusName }} • Emailed: {{ selectedPayslip.isEmailedToEmployee ? 'Yes' : 'Pending' }}
              </div>
            </div>
          </div>

          <div class="modal-footer review-footer">
            <button (click)="downloadEmployeePayslip(selectedPayslip)" class="btn-secondary">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Download Excel/CSV</span>
            </button>
            <button (click)="sendEmployeeEmail(selectedPayslip)" class="btn-primary">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              <span>Dispatch via Email</span>
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL: HR Attendance & Deductions Sheet (Amr -> Abdelrazik) -->
      <div *ngIf="showHrSheetModal && selectedRecordForHrSheet" class="modal-backdrop">
        <div class="modal-card glass-panel-elevated" style="max-width: 680px; border: 1px solid rgba(245, 158, 11, 0.4); box-shadow: 0 8px 32px rgba(0,0,0,0.5);">
          <div class="modal-header">
            <div>
              <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.35rem;">
                <span class="badge badge-amber" style="font-weight: 700;">STEP 2: HR ATTENDANCE & DEDUCTIONS SHEET</span>
                <span class="badge badge-indigo">HR Operations (Amr)</span>
              </div>
              <h2 class="font-heading-3" style="color: #f8fafc; margin-top: 0.25rem;">
                Submit Sheet for {{ selectedRecordForHrSheet.employeeName }}
              </h2>
              <p class="modal-subtext">
                Period: {{ selectedRecordForHrSheet.payPeriod }} • {{ selectedRecordForHrSheet.jobTitle }} ({{ selectedRecordForHrSheet.departmentName }})
              </p>
            </div>
            <button (click)="closeHrSheetModal()" class="close-btn">✕</button>
          </div>

          <div class="modal-body">
            <!-- Context Callout -->
            <div style="background: rgba(245, 158, 11, 0.08); border-left: 3px solid #f59e0b; padding: 0.75rem 1rem; border-radius: 6px; margin-bottom: 1.25rem;">
              <p class="font-caption" style="color: #fde68a; margin: 0; line-height: 1.5;">
                📋 <strong>Accounting Notification:</strong> Abdelrazik (Accounting) initiated the salary calculation for this employee and is waiting for your verified HR metrics (holidays taken, unexcused absences, overtime, and salary consumed).
              </p>
            </div>

            <!-- Employee Quick Card with Strict Formula Pricing -->
            <div class="review-details-card glass-panel" style="margin-bottom: 1.25rem;">
              <div class="review-row">
                <span class="rev-label">Employee Name:</span>
                <span class="rev-val font-bold" style="color: #60a5fa;">{{ selectedRecordForHrSheet.employeeName }}</span>
              </div>
              <div class="review-row">
                <span class="rev-label">Employee Email:</span>
                <span class="rev-val font-mono" style="color: #38bdf8;">{{ selectedRecordForHrSheet.email }}</span>
              </div>
              <div class="review-row">
                <span class="rev-label">Base Monthly Salary:</span>
                <span class="rev-val font-mono text-emerald" style="font-weight: 700;">\${{ selectedRecordForHrSheet.baseSalary | number:'1.2-2' }}</span>
              </div>
              <div class="review-row" style="background: rgba(99, 102, 241, 0.08); padding: 0.35rem 0.5rem; border-radius: 6px; margin: 0.25rem 0;">
                <div>
                  <span class="rev-label" style="font-size: 0.72rem; color: #a5b4fc;">Day Price (÷30): </span>
                  <span class="rev-val font-mono" style="font-size: 0.8rem; color: #818cf8; font-weight: 700;">
                    \${{ (selectedRecordForHrSheet.baseSalary / 30.0) | number:'1.2-2' }}/d
                  </span>
                </div>
                <div>
                  <span class="rev-label" style="font-size: 0.72rem; color: #a5b4fc;">Hour Price (÷9): </span>
                  <span class="rev-val font-mono" style="font-size: 0.8rem; color: #c084fc; font-weight: 700;">
                    \${{ ((selectedRecordForHrSheet.baseSalary / 30.0) / 9.0) | number:'1.2-2' }}/h
                  </span>
                </div>
              </div>
              <div class="review-row">
                <span class="rev-label">Standard Working Days:</span>
                <span class="rev-val font-mono">{{ selectedRecordForHrSheet.workingDaysExpected }} days</span>
              </div>
            </div>

            <!-- The Core 4 Inputs Requested by User -->
            <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
              <!-- 1. Total Holidays -->
              <div class="form-group">
                <label class="form-label" style="font-weight: 600; color: #f8fafc; display: flex; align-items: center; gap: 0.4rem;">
                  <span>🏖️ Total Holidays / Vacations:</span>
                </label>
                <div style="position: relative;">
                  <input type="number" step="0.5" min="0" [(ngModel)]="hrSheetForm.holidaysCount" class="form-input font-mono" style="width: 100%; padding-right: 3.5rem;" />
                  <span style="position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 0.8rem;">days</span>
                </div>
                <div class="font-caption text-secondary" style="font-size: 0.72rem; margin-top: 0.25rem;">
                  Vacation days utilized during the month
                </div>
              </div>

              <!-- 2. Total Absences -->
              <div class="form-group">
                <label class="form-label" style="font-weight: 600; color: #f8fafc; display: flex; align-items: center; gap: 0.4rem;">
                  <span>❌ Total Unexcused Absences:</span>
                </label>
                <div style="position: relative;">
                  <input type="number" step="1" min="0" [(ngModel)]="hrSheetForm.absencesCount" class="form-input font-mono" style="width: 100%; padding-right: 3.5rem;" />
                  <span style="position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 0.8rem;">days</span>
                </div>
                <div class="font-caption text-secondary" style="font-size: 0.72rem; margin-top: 0.25rem;">
                  Deduction: {{ hrSheetForm.absencesCount }}d × \${{ (selectedRecordForHrSheet.baseSalary / 30.0) | number:'1.2-2' }} = <strong>-\${{ (hrSheetForm.absencesCount * (selectedRecordForHrSheet.baseSalary / 30.0)) | number:'1.2-2' }}</strong>
                </div>
              </div>

              <!-- 3. Overtime Hours -->
              <div class="form-group">
                <label class="form-label" style="font-weight: 600; color: #f8fafc; display: flex; align-items: center; gap: 0.4rem;">
                  <span>⚡ Overtime Hours Worked:</span>
                </label>
                <div style="position: relative;">
                  <input type="number" step="0.5" min="0" [(ngModel)]="hrSheetForm.overtimeHours" class="form-input font-mono" style="width: 100%; padding-right: 3.5rem;" />
                  <span style="position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 0.8rem;">hrs</span>
                </div>
                <div class="font-caption text-secondary" style="font-size: 0.72rem; margin-top: 0.25rem;">
                  Pay: {{ hrSheetForm.overtimeHours }}h × \${{ (((selectedRecordForHrSheet.baseSalary / 30.0) / 9.0) * 1.5) | number:'1.2-2' }} = <strong>+\${{ (hrSheetForm.overtimeHours * (((selectedRecordForHrSheet.baseSalary / 30.0) / 9.0) * 1.5)) | number:'1.2-2' }}</strong>
                </div>
              </div>

              <!-- 4. Money Consumed From Salary -->
              <div class="form-group">
                <label class="form-label" style="font-weight: 600; color: #f8fafc; display: flex; align-items: center; gap: 0.4rem;">
                  <span>💸 Money Consumed from Salary:</span>
                </label>
                <div style="position: relative;">
                  <span style="position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 0.85rem;">\$</span>
                  <input type="number" step="10" min="0" [(ngModel)]="hrSheetForm.consumedDeductionAmount" class="form-input font-mono" style="width: 100%; padding-left: 1.75rem;" />
                </div>
                <div class="font-caption text-secondary" style="font-size: 0.72rem; margin-top: 0.25rem;">
                  Salary advance, company purchases or custom deduction
                </div>
              </div>
            </div>

            <!-- Live Salary Calculation Preview for HR before sending -->
            <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 0.85rem 1rem; margin-bottom: 1.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <span style="font-size: 0.75rem; font-weight: 700; color: #fde68a; text-transform: uppercase;">
                  ⚡ Live Salary Calculation Preview (Using Strict Pricing Formulas)
                </span>
                <span class="badge badge-amber" style="font-size: 0.7rem;">Auto-Computed</span>
              </div>

              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; text-align: center;">
                <div style="background: rgba(255,255,255,0.03); padding: 0.4rem; border-radius: 4px;">
                  <div style="font-size: 0.68rem; color: #94a3b8;">Absence Penalty</div>
                  <div style="font-size: 0.95rem; font-weight: 700; color: #f87171; font-family: monospace;">
                    -\${{ (hrSheetForm.absencesCount * (selectedRecordForHrSheet.baseSalary / 30.0)) | number:'1.2-2' }}
                  </div>
                </div>

                <div style="background: rgba(255,255,255,0.03); padding: 0.4rem; border-radius: 4px;">
                  <div style="font-size: 0.68rem; color: #94a3b8;">Overtime Pay</div>
                  <div style="font-size: 0.95rem; font-weight: 700; color: #34d399; font-family: monospace;">
                    +\${{ (hrSheetForm.overtimeHours * (((selectedRecordForHrSheet.baseSalary / 30.0) / 9.0) * 1.5)) | number:'1.2-2' }}
                  </div>
                </div>

                <div style="background: rgba(255,255,255,0.03); padding: 0.4rem; border-radius: 4px;">
                  <div style="font-size: 0.68rem; color: #94a3b8;">Consumed Money</div>
                  <div style="font-size: 0.95rem; font-weight: 700; color: #f87171; font-family: monospace;">
                    -\${{ hrSheetForm.consumedDeductionAmount | number:'1.2-2' }}
                  </div>
                </div>

                <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 0.4rem; border-radius: 4px;">
                  <div style="font-size: 0.68rem; color: #6ee7b7; font-weight: 700;">EST. NET SALARY</div>
                  <div style="font-size: 1.05rem; font-weight: 800; color: #10b981; font-family: monospace;">
                    \${{ (selectedRecordForHrSheet.baseSalary + (hrSheetForm.overtimeHours * (((selectedRecordForHrSheet.baseSalary / 30.0) / 9.0) * 1.5)) - (hrSheetForm.absencesCount * (selectedRecordForHrSheet.baseSalary / 30.0)) - hrSheetForm.consumedDeductionAmount) | number:'1.2-2' }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Notes -->
            <div class="form-group" style="margin-bottom: 0.5rem;">
              <label class="form-label" style="font-weight: 600; color: #f8fafc;">HR Observations & Official Notes:</label>
              <textarea [(ngModel)]="hrSheetForm.notes" rows="2" class="form-textarea" placeholder="e.g. Verified biometric attendance; 2 holidays taken, 0 absences; dispatched to Abdelrazik."></textarea>
            </div>
          </div>

          <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center;">
            <button (click)="closeHrSheetModal()" class="btn-secondary">Cancel</button>
            <button (click)="submitHrSheet()" [disabled]="loadingAction" class="btn-primary" style="background: linear-gradient(135deg, #f59e0b, #d97706); border: none; padding: 0.65rem 1.4rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4); border-radius: 8px; cursor: pointer;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              <span>{{ loadingAction ? 'Sending...' : 'Send Sheet to Accounting (Abdelrazik)' }}</span>
            </button>
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

    .modal-subtext {
      font-size: 0.75rem;
      color: #94a3b8;
      margin-top: 0.2rem;
      margin-bottom: 0;
    }

    /* Vacation Counter Panel */
    .vacation-counter-panel {
      padding: 1rem 1.25rem;
      border-radius: 12px;
      margin-bottom: 1.25rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.2s ease;

      &.balance-healthy {
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 182, 212, 0.05) 100%);
        border-color: rgba(16, 185, 129, 0.25);
      }
      &.balance-warning {
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.05) 100%);
        border-color: rgba(245, 158, 11, 0.25);
      }
      &.balance-deficit {
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(220, 38, 38, 0.06) 100%);
        border-color: rgba(239, 68, 68, 0.35);
        box-shadow: 0 0 15px rgba(239, 68, 68, 0.15);
      }
    }

    .counter-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .counter-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #e2e8f0;
    }

    .counter-stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }

    .stat-box {
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 8px;
      padding: 0.5rem 0.75rem;
      display: flex;
      flex-direction: column;

      .stat-label {
        font-size: 0.6875rem;
        color: #94a3b8;
        margin-bottom: 0.2rem;
        text-transform: uppercase;
      }
      .stat-value {
        font-size: 1.15rem;
        font-weight: 800;
        color: #f8fafc;
        small {
          font-size: 0.6875rem;
          font-weight: 500;
          color: #94a3b8;
          margin-left: 0.2rem;
        }
      }

      &.highlight {
        border-color: rgba(6, 182, 212, 0.3);
        background: rgba(6, 182, 212, 0.08);
      }
      &.highlight-secondary {
        border-color: rgba(99, 102, 241, 0.3);
        background: rgba(99, 102, 241, 0.08);
      }
    }

    .deficit-notice {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin-top: 0.65rem;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
      font-size: 0.75rem;
      line-height: 1.4;
      svg { flex-shrink: 0; margin-top: 2px; }
    }

    .balance-tag {
      font-family: monospace;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      font-size: 0.75rem;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .resulting-balance {
      font-size: 0.7rem;
      color: #94a3b8;
      display: block;
      margin-top: 0.2rem;
      font-family: monospace;
    }

    .status-cell-wrapper {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      align-items: flex-start;
    }

    .hr-forwarded-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.15rem 0.45rem;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
    }

    .text-emerald { color: #34d399 !important; }
    .text-amber { color: #fbbf24 !important; }
    .text-rose { color: #f87171 !important; }
    .badge-rose { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; }

    /* Payroll Tab Styling */
    .payroll-kpis-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .payroll-filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      padding: 1rem 1.25rem;
      border-radius: 12px;
      margin-bottom: 1.25rem;
    }
    .period-controls {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .payroll-actions {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex-wrap: wrap;
    }
    .payslip-summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
      margin: 1.25rem 0;
    }
    .payslip-section {
      background: rgba(15, 23, 42, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 1rem;
    }
    .payslip-section-title {
      font-size: 0.8125rem;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .payslip-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.35rem 0;
      font-size: 0.875rem;
      color: #cbd5e1;
      &.highlight-deduction {
        color: #f87171;
        font-weight: 600;
      }
      &.total-row {
        margin-top: 0.5rem;
        padding-top: 0.5rem;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        font-weight: 700;
        color: #ffffff;
      }
    }
    .payslip-net-box {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 10px;
      padding: 1.25rem;
      text-align: center;
      margin-top: 1rem;
    }
    .payslip-net-title {
      font-size: 0.75rem;
      color: #a7f3d0;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
    }
    .payslip-net-amount {
      font-size: 1.75rem;
      font-weight: 800;
      color: #34d399;
      margin-top: 0.25rem;
      font-family: monospace;
    }
  `]
})
export class HrComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  public currentRole: TenantRole = 'Employee';
  public currentEmployeeName = 'David Lee';
  public currentTimeFormatted = '';
  public currentDateFormatted = '';
  public activeTab: 'leaves' | 'attendance' | 'shifts' | 'payroll' | 'profiles' = 'leaves';
  public loadingAction = false;

  // Employee Profile & Salary Calculation State
  public selectedEmployeeIdForProfile: string = '11111111-2222-3333-4444-555555555551';
  public selectedEmployeeProfile: EmployeeSalaryProfile | null = {
    employeeId: '11111111-2222-3333-4444-555555555551',
    employeeNumber: 'EMP-004',
    firstName: 'Muhammad',
    lastName: 'Alkhadraa',
    fullName: 'Muhammad Alkhadraa',
    email: 'alkhadraam@gmail.com',
    jobTitle: 'Senior Software Engineer',
    departmentName: 'Information Technology',
    branchName: 'Cairo Headquarters',
    hireDateUtc: '2024-01-15T00:00:00Z',
    isActive: true,
    contractType: 'Permanent Full-Time',
    contractStartDateUtc: '2024-01-15T00:00:00Z',
    contractNotes: 'Permanent employment contract persisted in PostgreSQL database with standard 30-day divisor.',
    baseMonthlySalary: 7500,
    dailyRate: 250,
    hourlyRate: 27.78,
    overtimeRate: 41.67,
    workingDaysExpected: 22,
    daysPresent: 22,
    daysAbsent: 0,
    absenceDeduction: 0,
    vacationDaysAllocated: 21,
    vacationDaysUsed: 2,
    vacationDaysRemaining: 23,
    negativeVacationDays: 0,
    vacationDeficitDeduction: 0,
    lateOccurrences: 0,
    lateHours: 0,
    latePenaltyDeduction: 0,
    overtimeHours: 12,
    overtimePay: 500.04,
    consumedSalaryDeductions: 0,
    grossPay: 8000.04,
    totalDeductions: 0,
    netPay: 8000.04
  };
  public profileLoading: boolean = false;
  public profileYear: number = 2026;
  public profileMonth: number = 10;

  // Payroll Management State
  public payrollRecords: PayrollRecord[] = [];
  public payrollSummary: PayrollSummary | null = null;
  public selectedPayrollYear: number = 2026;
  public selectedPayrollMonth: number = 10;
  public payrollLoading: boolean = false;
  public showPayslipModal: boolean = false;
  public selectedPayslip: PayrollRecord | null = null;

  // HR Sheet Workflow State
  public showHrSheetModal: boolean = false;
  public selectedRecordForHrSheet: PayrollRecord | null = null;
  public hrSheetForm: SubmitHrSheetRequest = {
    holidaysCount: 2,
    absencesCount: 0,
    overtimeHours: 12.0,
    consumedDeductionAmount: 0,
    notes: 'Verified biometric attendance log. 2 holidays taken, 0 absences, 12h overtime.'
  };

  public get totalGrossPay(): number {
    return this.payrollSummary?.totalGrossPay || 0;
  }

  public get totalNetPay(): number {
    return this.payrollSummary?.totalNetPay || 0;
  }

  public get totalOvertimePay(): number {
    return this.payrollSummary?.totalOvertimePay || 0;
  }

  public get totalVacationDeficitDeductions(): number {
    return this.payrollSummary?.totalVacationDeficitDeductions || 0;
  }

  public metrics: HrMetrics | null = null;
  public todayAttendance: AttendanceLog | null = null;
  public clockLocation = 'HQ - Main Campus';

  public leaveRequests: LeaveRequest[] = [];
  public attendanceLogs: AttendanceLog[] = [];
  public shiftSchedules: ShiftSchedule[] = [];
  public employees: Employee[] = [
    {
      id: '11111111-2222-3333-4444-555555555551',
      employeeNumber: 'EMP-004',
      firstName: 'Muhammad',
      lastName: 'Alkhadraa',
      fullName: 'Muhammad Alkhadraa',
      email: 'alkhadraam@gmail.com',
      jobTitle: 'Senior Software Engineer',
      departmentName: 'Information Technology',
      branchName: 'Cairo Headquarters',
      hireDateUtc: '2024-01-15T00:00:00Z',
      isActive: true,
      contractType: 'Permanent Full-Time',
      baseMonthlySalary: 7500,
      baseSalary: 7500,
      dailyRate: 250,
      hourlyRate: 27.78,
      overtimeRate: 41.67,
      vacationDaysAllocated: 21,
      vacationDaysUsed: 2
    },
    {
      id: '11111111-2222-3333-4444-555555555552',
      employeeNumber: 'EMP-005',
      firstName: 'Amr',
      lastName: 'El-Sayed',
      fullName: 'Amr El-Sayed',
      email: 'amr@kazareen.com',
      jobTitle: 'HR Specialist',
      departmentName: 'Human Resources',
      branchName: 'Cairo Headquarters',
      hireDateUtc: '2024-03-01T00:00:00Z',
      isActive: true,
      contractType: 'Permanent Full-Time',
      baseMonthlySalary: 5500,
      baseSalary: 5500,
      dailyRate: 183.33,
      hourlyRate: 20.37,
      overtimeRate: 30.56,
      vacationDaysAllocated: 21,
      vacationDaysUsed: 1
    },
    {
      id: '11111111-2222-3333-4444-555555555553',
      employeeNumber: 'EMP-006',
      firstName: 'Abdelrazik',
      lastName: 'Hassan',
      fullName: 'Abdelrazik Hassan',
      email: 'abdelrazik@kazareen.com',
      jobTitle: 'Senior Financial Accountant',
      departmentName: 'Finance & Accounting',
      branchName: 'Cairo Headquarters',
      hireDateUtc: '2024-02-10T00:00:00Z',
      isActive: true,
      contractType: 'Permanent Full-Time',
      baseMonthlySalary: 6500,
      baseSalary: 6500,
      dailyRate: 216.67,
      hourlyRate: 24.07,
      overtimeRate: 36.11,
      vacationDaysAllocated: 21,
      vacationDaysUsed: 3
    },
    {
      id: '11111111-2222-3333-4444-555555555554',
      employeeNumber: 'EMP-9705',
      firstName: 'Omar',
      lastName: 'Tarek',
      fullName: 'Omar Tarek',
      email: 'omar.tarek@kazareen.com',
      jobTitle: 'Operations Coordinator',
      departmentName: 'Operations',
      branchName: 'Cairo Headquarters',
      hireDateUtc: '2024-05-20T00:00:00Z',
      isActive: true,
      contractType: 'Permanent Full-Time',
      baseMonthlySalary: 5200,
      baseSalary: 5200,
      dailyRate: 173.33,
      hourlyRate: 19.26,
      overtimeRate: 28.89,
      vacationDaysAllocated: 21,
      vacationDaysUsed: 0
    }
  ];

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
  public vacationBalance: EmployeeVacationBalance | null = null;

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

    this.api.getVacationBalance().subscribe(res => {
      if (res.success && res.data) this.vacationBalance = res.data;
    });

    this.api.getAttendanceLogs().subscribe(res => {
      if (res.success && res.data) this.attendanceLogs = res.data.data || [];
    });

    this.api.getShiftSchedules().subscribe(res => {
      if (res.success) this.shiftSchedules = res.data || [];
    });

    // Seed instant default employees for zero-lag workforce & profile calculator rendering
    const defaultEmps: Employee[] = [
      {
        id: '11111111-2222-3333-4444-555555555551',
        employeeNumber: 'EMP-004',
        firstName: 'Muhammad',
        lastName: 'Alkhadraa',
        fullName: 'Muhammad Alkhadraa',
        email: 'alkhadraam@gmail.com',
        jobTitle: 'Senior Software Engineer',
        departmentName: 'Information Technology',
        branchName: 'Cairo Headquarters',
        hireDateUtc: '2024-01-15T00:00:00Z',
        isActive: true,
        contractType: 'Permanent Full-Time',
        baseMonthlySalary: 7500,
        baseSalary: 7500,
        dailyRate: 250,
        hourlyRate: 27.78,
        overtimeRate: 41.67,
        vacationDaysAllocated: 21,
        vacationDaysUsed: 2
      },
      {
        id: '11111111-2222-3333-4444-555555555552',
        employeeNumber: 'EMP-005',
        firstName: 'Amr',
        lastName: 'El-Sayed',
        fullName: 'Amr El-Sayed',
        email: 'amr@kazareen.com',
        jobTitle: 'HR Specialist',
        departmentName: 'Human Resources',
        branchName: 'Cairo Headquarters',
        hireDateUtc: '2024-03-01T00:00:00Z',
        isActive: true,
        contractType: 'Permanent Full-Time',
        baseMonthlySalary: 5500,
        baseSalary: 5500,
        dailyRate: 183.33,
        hourlyRate: 20.37,
        overtimeRate: 30.56,
        vacationDaysAllocated: 21,
        vacationDaysUsed: 1
      },
      {
        id: '11111111-2222-3333-4444-555555555553',
        employeeNumber: 'EMP-006',
        firstName: 'Abdelrazik',
        lastName: 'Hassan',
        fullName: 'Abdelrazik Hassan',
        email: 'abdelrazik@kazareen.com',
        jobTitle: 'Senior Financial Accountant',
        departmentName: 'Finance & Accounting',
        branchName: 'Cairo Headquarters',
        hireDateUtc: '2024-02-10T00:00:00Z',
        isActive: true,
        contractType: 'Permanent Full-Time',
        baseMonthlySalary: 6500,
        baseSalary: 6500,
        dailyRate: 216.67,
        hourlyRate: 24.07,
        overtimeRate: 36.11,
        vacationDaysAllocated: 21,
        vacationDaysUsed: 3
      },
      {
        id: '11111111-2222-3333-4444-555555555554',
        employeeNumber: 'EMP-9705',
        firstName: 'Omar',
        lastName: 'Tarek',
        fullName: 'Omar Tarek',
        email: 'omar.tarek@kazareen.com',
        jobTitle: 'Operations Coordinator',
        departmentName: 'Operations',
        branchName: 'Cairo Headquarters',
        hireDateUtc: '2024-05-20T00:00:00Z',
        isActive: true,
        contractType: 'Permanent Full-Time',
        baseMonthlySalary: 5200,
        baseSalary: 5200,
        dailyRate: 173.33,
        hourlyRate: 19.26,
        overtimeRate: 28.89,
        vacationDaysAllocated: 21,
        vacationDaysUsed: 0
      }
    ];
    this.employees = defaultEmps;
    this.selectedEmployeeIdForProfile = defaultEmps[0].id;
    this.setFallbackSalaryProfile(defaultEmps[0].id);

    this.api.getEmployees().subscribe(res => {
      const list = (res as any)?.data?.data || (Array.isArray((res as any)?.data) ? (res as any).data : (Array.isArray(res) ? res : []));
      if (list && list.length > 0) {
        this.employees = list;
        if (!this.manualAttendance.employeeId) {
          this.manualAttendance.employeeId = this.employees[0].id;
          this.newShift.employeeId = this.employees[0].id;
        }
        this.selectedEmployeeIdForProfile = this.employees[0].id;
        this.onSelectEmployeeForProfile(this.employees[0].id);
      }
    });

    this.loadPayroll();
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
    this.fetchVacationBalanceForModal();
    this.showCreateLeaveModal = true;
  }

  public onLeaveEmployeeChange(): void {
    this.fetchVacationBalanceForModal();
  }

  public fetchVacationBalanceForModal(): void {
    this.api.getVacationBalance(this.newLeave.employeeId).subscribe(res => {
      if (res.success && res.data) this.vacationBalance = res.data;
    });
  }

  public getProjectedRemainingDays(): number {
    const current = this.vacationBalance?.remainingDays ?? 21;
    return current - (this.calculatedDays || 0);
  }

  public getRemainingDaysClass(days: number): string {
    if (days > 5) return 'text-emerald';
    if (days >= 0) return 'text-amber';
    return 'text-rose';
  }

  public getVacationBalanceClass(): string {
    const days = this.vacationBalance?.remainingDays ?? 21;
    if (days > 5) return 'balance-healthy';
    if (days >= 0) return 'balance-warning';
    return 'balance-deficit';
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
    this.api.getVacationBalance(leave.employeeId).subscribe(res => {
      if (res.success && res.data) this.vacationBalance = res.data;
    });
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

  public exportHrCsv(): void {
    if (this.activeTab === 'attendance') {
      const headers = ['Date', 'Employee Name', 'Employee #', 'Department', 'Status', 'Check In', 'Check Out', 'Total Hours', 'Work Location', 'Notes'];
      const rows = this.filteredAttendance.map(a => [
        `"${a.date}"`,
        `"${a.employeeName.replace(/"/g, '""')}"`,
        `"${a.employeeNumber || ''}"`,
        `"${(a.departmentName || '').replace(/"/g, '""')}"`,
        `"${a.status}"`,
        `"${a.checkInTimeUtc || ''}"`,
        `"${a.checkOutTimeUtc || ''}"`,
        `"${a.totalHours || 0}"`,
        `"${(a.workLocation || '').replace(/"/g, '""')}"`,
        `"${(a.notes || '').replace(/"/g, '""')}"`
      ]);
      this.downloadCsvFile([headers.join(','), ...rows.map(r => r.join(','))].join('\n'), `orbit-hr-attendance-${Date.now()}.csv`);
    } else if (this.activeTab === 'shifts') {
      const headers = ['Shift Name', 'Employee Name', 'Shift Type', 'Start Time', 'End Time', 'Effective From'];
      const rows = this.shiftSchedules.map(s => [
        `"${s.shiftName.replace(/"/g, '""')}"`,
        `"${s.employeeName.replace(/"/g, '""')}"`,
        `"${s.shiftType}"`,
        `"${s.startTime}"`,
        `"${s.endTime}"`,
        `"${s.effectiveFromUtc || ''}"`
      ]);
      this.downloadCsvFile([headers.join(','), ...rows.map(r => r.join(','))].join('\n'), `orbit-hr-shifts-${Date.now()}.csv`);
    } else {
      const headers = ['Request #', 'Employee Name', 'Employee #', 'Department', 'Leave Type', 'Start Date', 'End Date', 'Days Count', 'Reason', 'Status', 'Approver'];
      const rows = this.filteredLeaves.map(r => [
        `"${r.requestNumber}"`,
        `"${r.employeeName.replace(/"/g, '""')}"`,
        `"${r.employeeNumber || ''}"`,
        `"${(r.departmentName || '').replace(/"/g, '""')}"`,
        `"${r.leaveType}"`,
        `"${r.startDateUtc || ''}"`,
        `"${r.endDateUtc || ''}"`,
        `"${r.daysCount}"`,
        `"${(r.reason || '').replace(/"/g, '""')}"`,
        `"${r.status}"`,
        `"${(r.approverEmployeeName || 'Pending Review').replace(/"/g, '""')}"`
      ]);
      this.downloadCsvFile([headers.join(','), ...rows.map(r => r.join(','))].join('\n'), `orbit-hr-leaves-${Date.now()}.csv`);
    }
  }

  public switchTab(tab: 'leaves' | 'attendance' | 'shifts' | 'payroll' | 'profiles'): void {
    this.activeTab = tab;
    if (tab === 'payroll') {
      this.loadPayroll();
    } else if (tab === 'profiles') {
      if (!this.selectedEmployeeIdForProfile && this.employees.length > 0) {
        this.onSelectEmployeeForProfile(this.employees[0].id);
      } else if (this.selectedEmployeeIdForProfile) {
        this.onSelectEmployeeForProfile(this.selectedEmployeeIdForProfile);
      }
      setTimeout(() => {
        const scroller = document.querySelector('.workspace-content');
        if (scroller) {
          scroller.scrollTop = 580;
        }
      }, 50);
    }
  }

  public onSelectEmployeeForProfile(empId: string): void {
    if (!empId) return;
    this.selectedEmployeeIdForProfile = empId;
    this.setFallbackSalaryProfile(empId);
    this.api.getEmployeeSalaryProfile(empId, this.profileYear, this.profileMonth).subscribe({
      next: (res) => {
        this.profileLoading = false;
        if (res.success && res.data) {
          this.selectedEmployeeProfile = res.data;
        } else if ((res as any)?.employeeId) {
          this.selectedEmployeeProfile = res as any;
        }
      },
      error: () => {
        this.profileLoading = false;
      }
    });
    setTimeout(() => {
      const scroller = document.querySelector('.workspace-content');
      if (scroller && scroller.scrollTop < 300) {
        scroller.scrollTop = 580;
      }
    }, 50);
  }

  private setFallbackSalaryProfile(empId: string): void {
    const emp = this.employees.find(e => e.id === empId);
    const salary = emp?.baseMonthlySalary || emp?.baseSalary || 7500;
    const dayPrice = Math.round((salary / 30.0) * 100) / 100;
    const hourPrice = Math.round((dayPrice / 9.0) * 100) / 100;
    const overtimeRate = Math.round((hourPrice * 1.5) * 100) / 100;
    const daysAbsent = 1;
    const lateHours = 2.0;
    const overtimeHours = 10.0;
    const absenceDeduction = Math.round(daysAbsent * dayPrice * 100) / 100;
    const latePenalty = Math.round(lateHours * hourPrice * 100) / 100;
    const overtimePay = Math.round(overtimeHours * overtimeRate * 100) / 100;
    const totalDeductions = absenceDeduction + latePenalty;
    const grossPay = salary + overtimePay;
    const netPay = Math.max(0, grossPay - totalDeductions);

    this.selectedEmployeeProfile = {
      employeeId: emp?.id || empId,
      employeeNumber: emp?.employeeNumber || 'EMP-001',
      firstName: emp?.firstName || 'Muhammad',
      lastName: emp?.lastName || 'Alkhadraa',
      fullName: emp?.fullName || (emp ? `${emp.firstName} ${emp.lastName}` : 'Muhammad Alkhadraa'),
      email: emp?.email || 'muhammad@orbit.internal',
      jobTitle: emp?.jobTitle || 'Senior Software Engineer',
      departmentName: emp?.departmentName || 'Information Technology',
      branchName: emp?.branchName || 'Cairo Headquarters',
      hireDateUtc: emp?.hireDateUtc || new Date(Date.now() - 86400000 * 180).toISOString(),
      isActive: true,
      contractType: emp?.contractType || 'Permanent Full-Time',
      contractStartDateUtc: emp?.contractStartDateUtc || new Date(Date.now() - 86400000 * 180).toISOString(),
      contractEndDateUtc: emp?.contractEndDateUtc,
      contractNotes: emp?.contractNotes || 'Permanent employment contract persisted in PostgreSQL database with standard 30-day divisor.',
      baseMonthlySalary: salary,
      dailyRate: dayPrice,
      hourlyRate: hourPrice,
      overtimeRate: overtimeRate,
      workingDaysExpected: 22,
      daysPresent: 21,
      daysAbsent: daysAbsent,
      absenceDeduction: absenceDeduction,
      vacationDaysAllocated: 21,
      vacationDaysUsed: 5,
      vacationDaysRemaining: 16,
      negativeVacationDays: 0,
      vacationDeficitDeduction: 0,
      lateOccurrences: 2,
      lateHours: lateHours,
      latePenaltyDeduction: latePenalty,
      overtimeHours: overtimeHours,
      overtimePay: overtimePay,
      consumedSalaryDeductions: 0,
      grossPay: grossPay,
      totalDeductions: totalDeductions,
      netPay: netPay
    };
  }

  public selectProfileMonth(m: number): void {
    this.profileMonth = m;
    if (this.selectedEmployeeIdForProfile) {
      this.onSelectEmployeeForProfile(this.selectedEmployeeIdForProfile);
    }
  }

  public viewEmployeeSalaryProfile(empId: string): void {
    this.switchTab('profiles');
    this.onSelectEmployeeForProfile(empId);
  }

  public useProfileInHrSheet(profile: EmployeeSalaryProfile): void {
    let rec = this.payrollRecords.find(p => p.employeeId === profile.employeeId);
    if (!rec) {
      rec = {
        id: profile.employeeId,
        tenantId: '',
        payrollNumber: `PAY-2026-10-${profile.employeeNumber}`,
        employeeId: profile.employeeId,
        employeeNumber: profile.employeeNumber,
        employeeName: profile.fullName,
        departmentName: profile.departmentName,
        jobTitle: profile.jobTitle,
        email: profile.email,
        year: this.profileYear,
        month: this.profileMonth,
        payPeriod: 'October 2026',
        baseSalary: profile.baseMonthlySalary,
        hourlyRate: profile.hourlyRate,
        overtimeHours: profile.overtimeHours,
        overtimeRate: profile.overtimeRate,
        overtimePay: profile.overtimePay,
        bonuses: 0,
        grossPay: profile.grossPay,
        daysInMonth: 30,
        workingDaysExpected: profile.workingDaysExpected,
        daysPresent: profile.daysPresent,
        daysAbsent: profile.daysAbsent,
        absenceDeduction: profile.absenceDeduction,
        lateOccurrences: profile.lateOccurrences,
        latePenaltyDeduction: profile.latePenaltyDeduction,
        negativeVacationDays: profile.negativeVacationDays,
        vacationDeficitDeduction: profile.vacationDeficitDeduction,
        taxRatePercentage: 10,
        taxDeduction: 0,
        socialSecurityDeduction: 0,
        totalDeductions: profile.totalDeductions,
        netPay: profile.netPay,
        status: 'PendingHrSheet',
        statusName: 'Pending HR Sheet',
        isEmailedToEmployee: false,
        createdAtUtc: new Date().toISOString()
      };
    }
    this.selectedRecordForHrSheet = rec;
    this.hrSheetForm = {
      holidaysCount: profile.vacationDaysUsed || 0,
      absencesCount: profile.daysAbsent || 0,
      overtimeHours: profile.overtimeHours || 0,
      consumedDeductionAmount: profile.consumedSalaryDeductions || 0,
      notes: `Verified by HR (Amr): Contract salary $${profile.baseMonthlySalary}, Day price $${profile.dailyRate}, Hour price $${profile.hourlyRate}. Absences: ${profile.daysAbsent}d (-$${profile.absenceDeduction}), Late: ${profile.lateHours}h (-$${profile.latePenaltyDeduction}), Vacations: ${profile.vacationDaysUsed}d, Overtime: ${profile.overtimeHours}h (+$${profile.overtimePay}).`
    };
    this.showHrSheetModal = true;
  }

  public loadPayroll(): void {
    this.payrollLoading = true;
    this.api.getPayrollRecords(this.selectedPayrollYear, this.selectedPayrollMonth).subscribe(res => {
      if (res.success && res.data) {
        this.payrollRecords = res.data;
      }
      this.payrollLoading = false;
    });

    this.api.getPayrollSummary(this.selectedPayrollYear, this.selectedPayrollMonth).subscribe(res => {
      if (res.success && res.data) {
        this.payrollSummary = res.data;
      }
    });
  }

  public generatePayroll(): void {
    this.payrollLoading = true;
    this.api.generatePayrollBatch({
      year: this.selectedPayrollYear,
      month: this.selectedPayrollMonth,
      defaultTaxRatePercentage: 15.0
    }).subscribe({
      next: (res) => {
        this.payrollLoading = false;
        if (res.success && res.data) {
          this.payrollRecords = res.data;
          this.loadPayroll();
        }
      },
      error: () => {
        this.payrollLoading = false;
      }
    });
  }

  public approvePayroll(): void {
    this.payrollLoading = true;
    this.api.approvePayrollBatch({
      year: this.selectedPayrollYear,
      month: this.selectedPayrollMonth
    }).subscribe({
      next: (res) => {
        this.payrollLoading = false;
        if (res.success && res.data) {
          this.payrollRecords = res.data;
          this.loadPayroll();
        }
      },
      error: () => {
        this.payrollLoading = false;
      }
    });
  }

  public downloadEmployeePayslip(rec: PayrollRecord): void {
    this.api.getEmployeePayslipSpreadsheet(rec.id).subscribe(res => {
      if (res.success && res.data) {
        this.downloadCsvFile(res.data.fileContent, res.data.fileName);
      }
    });
  }

  public downloadMasterPayrollSpreadsheet(): void {
    this.api.getMasterPayrollSpreadsheet(this.selectedPayrollYear, this.selectedPayrollMonth).subscribe(res => {
      if (res.success && res.data) {
        this.downloadCsvFile(res.data.fileContent, res.data.fileName);
      }
    });
  }

  public sendEmployeeEmail(rec: PayrollRecord): void {
    this.loadingAction = true;
    this.api.sendEmployeePayslipEmail(rec.id).subscribe({
      next: (res) => {
        this.loadingAction = false;
        if (res.success) {
          rec.isEmailedToEmployee = true;
          rec.status = 'Paid';
          rec.emailedAtUtc = new Date().toISOString();
          if (this.payrollSummary) {
            this.payrollSummary.emailedCount = this.payrollRecords.filter(r => r.isEmailedToEmployee).length;
          }
          this.toast.success(
            'Payslip Dispatched via Email',
            `Official payroll sheet successfully emailed to ${rec.employeeName} (${rec.email})!`
          );
          this.loadPayroll();
        }
      },
      error: () => {
        this.loadingAction = false;
      }
    });
  }

  public openHrSheetModal(rec: PayrollRecord): void {
    this.selectedRecordForHrSheet = rec;
    this.hrSheetForm = {
      holidaysCount: rec.negativeVacationDays > 0 ? rec.negativeVacationDays : 2,
      absencesCount: rec.daysAbsent || 0,
      overtimeHours: rec.overtimeHours || 12.0,
      consumedDeductionAmount: rec.absenceDeduction || 0,
      notes: rec.notes || `Verified by HR (Amr): 2 holidays taken, 0 absences, 12.0h overtime, $0 salary consumed.`
    };
    this.showHrSheetModal = true;
  }

  public closeHrSheetModal(): void {
    this.showHrSheetModal = false;
    this.selectedRecordForHrSheet = null;
  }

  public submitHrSheet(): void {
    if (!this.selectedRecordForHrSheet) return;
    this.loadingAction = true;
    this.api.submitHrSheet(this.selectedRecordForHrSheet.id, this.hrSheetForm).subscribe({
      next: (res) => {
        this.loadingAction = false;
        if (res.success) {
          this.toast.success(
            'HR Sheet Sent to Accounting',
            `Attendance, holidays (${this.hrSheetForm.holidaysCount}d), absences (${this.hrSheetForm.absencesCount}d), and consumed deductions ($${this.hrSheetForm.consumedDeductionAmount}) sent to Abdelrazik for salary calculation.`
          );
          this.closeHrSheetModal();
          this.loadPayroll();
        }
      },
      error: () => {
        this.loadingAction = false;
      }
    });
  }

  public sendAllPayslipsEmail(): void {
    if (!confirm(`Are you sure you want to email individual payslip spreadsheets to all ${this.payrollRecords.length} employees for ${this.selectedPayrollMonth}/${this.selectedPayrollYear}?`)) {
      return;
    }
    this.payrollLoading = true;
    this.api.sendAllPayslipsBatchEmail(this.selectedPayrollYear, this.selectedPayrollMonth).subscribe({
      next: (res) => {
        this.payrollLoading = false;
        if (res.success && res.data) {
          this.payrollRecords.forEach(r => {
            r.isEmailedToEmployee = true;
            r.emailedAtUtc = new Date().toISOString();
          });
          if (this.payrollSummary) {
            this.payrollSummary.emailedCount = this.payrollRecords.length;
          }
          alert(`Successfully emailed ${res.data.length} individual payslip spreadsheets!`);
        }
      },
      error: () => {
        this.payrollLoading = false;
      }
    });
  }

  public getPayslipDailyRate(rec: PayrollRecord | null): number {
    if (!rec || !rec.workingDaysExpected || rec.workingDaysExpected === 0) return 0;
    return rec.baseSalary / rec.workingDaysExpected;
  }

  public openPayslipModal(rec: PayrollRecord): void {
    this.selectedPayslip = rec;
    this.showPayslipModal = true;
  }

  public closePayslipModal(): void {
    this.showPayslipModal = false;
    this.selectedPayslip = null;
  }

  private downloadCsvFile(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

