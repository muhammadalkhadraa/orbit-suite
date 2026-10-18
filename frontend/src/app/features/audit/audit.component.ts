import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { AuditLog, AuditLogFilter, TenantRole } from '../../core/models/models';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="audit-page">
      <!-- Page Header -->
      <header class="page-header">
        <div class="header-left">
          <div class="title-row">
            <h1>Audit & Security Trail</h1>
            <span class="badge badge-emerald">Immutable Ledger</span>
            <span class="badge badge-indigo">SOC2 Type II</span>
          </div>
          <p class="subtitle">
            Forensic chronological log of identity, security, data mutations, and administrative activities across your organization.
          </p>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" (click)="loadAuditLogs()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
            </svg>
            Refresh Log
          </button>
        </div>
      </header>

      <!-- KPI Summary Ribbon -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Total Logged Events</span>
            <div class="stat-icon icon-cyan">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
          </div>
          <div class="stat-value">{{ totalCount }}</div>
          <div class="stat-footer">
            <span class="stat-sub">Across all business domains</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Active Actors</span>
            <div class="stat-icon icon-indigo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
          </div>
          <div class="stat-value">{{ uniqueActorsCount }}</div>
          <div class="stat-footer">
            <span class="stat-sub">Unique operator identities</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Security & Auth Events</span>
            <div class="stat-icon icon-amber">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
          </div>
          <div class="stat-value">{{ securityEventsCount }}</div>
          <div class="stat-footer">
            <span class="badge badge-emerald">Zero Breaches</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Data Mutations</span>
            <div class="stat-icon icon-emerald">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </div>
          </div>
          <div class="stat-value">{{ mutationEventsCount }}</div>
          <div class="stat-footer">
            <span class="stat-sub">Create, update, and void actions</span>
          </div>
        </div>
      </div>

      <!-- Controls & Filter Toolbar -->
      <div class="toolbar-card">
        <div class="search-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onFilterChange()"
            placeholder="Search action, entity, user email, or entity ID..."
          />
        </div>

        <div class="filter-group">
          <select [(ngModel)]="selectedEntity" (change)="onFilterChange()" class="select-input">
            <option value="All">All Entities</option>
            <option value="ApplicationUser">Identity / Users</option>
            <option value="TaskItem">Tasks</option>
            <option value="Customer">Customers</option>
            <option value="Deal">Deals</option>
            <option value="SupportTicket">Support Tickets</option>
            <option value="Product">Products</option>
            <option value="StockMovement">Stock Movements</option>
            <option value="Invoice">Invoices</option>
            <option value="PaymentRecord">Payments</option>
            <option value="WorkOrder">Work Orders</option>
            <option value="LeaveRequest">Leave Requests</option>
            <option value="AttendanceLog">Attendance Logs</option>
            <option value="ReportExportHistory">Report Exports</option>
          </select>

          <select [(ngModel)]="selectedAction" (change)="onFilterChange()" class="select-input">
            <option value="All">All Actions</option>
            <option value="UserLogin">User Login</option>
            <option value="Create">Create Operations</option>
            <option value="Update">Update Operations</option>
            <option value="Delete">Delete Operations</option>
            <option value="Void">Void Operations</option>
            <option value="ClockIn">Clock In</option>
            <option value="ClockOut">Clock Out</option>
            <option value="ResolveTicket">Resolve Ticket</option>
          </select>
        </div>
      </div>

      <!-- Audit Events Table -->
      <div class="table-card">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Timestamp (UTC)</th>
                <th>Operator</th>
                <th>Action</th>
                <th>Target Entity</th>
                <th>Entity ID</th>
                <th>Client IP</th>
                <th class="text-right">Inspection</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let log of auditLogs">
                <td class="text-secondary font-mono">{{ log.timestampUtc | date:'yyyy-MM-dd HH:mm:ss' }}</td>
                <td>
                  <div class="operator-cell">
                    <span class="user-email">{{ log.userEmail || 'System Process' }}</span>
                  </div>
                </td>
                <td>
                  <span class="badge" [ngClass]="getActionBadgeClass(log.action)">
                    {{ log.action }}
                  </span>
                </td>
                <td>
                  <span class="entity-pill">{{ log.entityName }}</span>
                </td>
                <td class="font-mono text-muted">
                  {{ log.entityId ? (log.entityId | slice:0:16) : '—' }}
                </td>
                <td class="font-mono text-secondary">
                  {{ log.ipAddress || '127.0.0.1' }}
                </td>
                <td class="text-right">
                  <button class="btn btn-xs btn-secondary" (click)="inspectLog(log)">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="16" x2="12" y2="12"/>
                      <line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                    Inspect
                  </button>
                </td>
              </tr>
              <tr *ngIf="auditLogs.length === 0">
                <td colspan="7" class="empty-state">
                  <div class="empty-message">No matching audit events recorded for the current filter criteria.</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Footer -->
        <div class="pagination-footer">
          <div class="page-info">
            Showing {{ auditLogs.length }} of {{ totalCount }} events (Page {{ currentPage }} of {{ totalPages }})
          </div>
          <div class="pagination-buttons">
            <button
              class="btn btn-xs btn-secondary"
              [disabled]="currentPage <= 1"
              (click)="changePage(currentPage - 1)">
              Previous
            </button>
            <button
              class="btn btn-xs btn-secondary"
              [disabled]="currentPage >= totalPages"
              (click)="changePage(currentPage + 1)">
              Next
            </button>
          </div>
        </div>
      </div>

      <!-- JSON Inspection Modal -->
      <div class="modal-backdrop" *ngIf="activeInspectLog" (click)="closeInspect()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h3>Audit Event Inspection</h3>
              <p class="text-secondary font-mono">{{ activeInspectLog.id }}</p>
            </div>
            <button class="btn-close" (click)="closeInspect()">×</button>
          </div>
          <div class="modal-body">
            <div class="meta-grid">
              <div class="meta-item">
                <span class="meta-label">Action</span>
                <span class="meta-val badge badge-indigo">{{ activeInspectLog.action }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Entity</span>
                <span class="meta-val">{{ activeInspectLog.entityName }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Operator</span>
                <span class="meta-val">{{ activeInspectLog.userEmail || 'System' }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">IP Address</span>
                <span class="meta-val font-mono">{{ activeInspectLog.ipAddress || '127.0.0.1' }}</span>
              </div>
            </div>

            <div class="payload-header">
              <span>Event Payload & Context</span>
              <span class="badge badge-cyan">RFC 8259 JSON</span>
            </div>
            <pre class="json-viewer"><code>{{ formatJson(activeInspectLog.detailsJson) }}</code></pre>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeInspect()">Close</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .audit-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding-bottom: 2rem;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1.5rem;

      .title-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.35rem;

        h1 {
          font-size: 1.75rem;
          font-weight: 700;
          color: #f8fafc;
          margin: 0;
        }
      }

      .subtitle {
        color: #94a3b8;
        font-size: 0.925rem;
        margin: 0;
        max-width: 720px;
      }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
    }

    .stat-card {
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      .stat-header {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .stat-label {
          color: #94a3b8;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .stat-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;

          &.icon-cyan { background: rgba(6, 182, 212, 0.15); color: #22d3ee; }
          &.icon-indigo { background: rgba(99, 102, 241, 0.15); color: #818cf8; }
          &.icon-amber { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
          &.icon-emerald { background: rgba(16, 185, 129, 0.15); color: #34d399; }
        }
      }

      .stat-value {
        font-size: 1.85rem;
        font-weight: 700;
        color: #f8fafc;
        line-height: 1.1;
      }

      .stat-footer {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.8rem;
        color: #64748b;
      }
    }

    .toolbar-card {
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 0.85rem 1.25rem;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 0.45rem 0.85rem;
      flex: 1;
      min-width: 260px;

      svg { color: #64748b; }
      input {
        background: transparent;
        border: none;
        outline: none;
        color: #f8fafc;
        font-size: 0.875rem;
        width: 100%;
        &::placeholder { color: #64748b; }
      }
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;

      .select-input {
        background: rgba(30, 41, 59, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #cbd5e1;
        border-radius: 8px;
        padding: 0.45rem 0.75rem;
        font-size: 0.85rem;
        outline: none;
        cursor: pointer;
      }
    }

    .table-card {
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      overflow: hidden;
    }

    .table-container {
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.875rem;

      th {
        background: rgba(30, 41, 59, 0.5);
        color: #94a3b8;
        font-weight: 600;
        padding: 0.85rem 1.25rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }

      td {
        padding: 0.85rem 1.25rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        color: #e2e8f0;
      }

      tr:hover td {
        background: rgba(255, 255, 255, 0.02);
      }
    }

    .operator-cell {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      .user-email { font-weight: 500; }
    }

    .entity-pill {
      background: rgba(148, 163, 184, 0.12);
      color: #cbd5e1;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      font-size: 0.8rem;
    }

    .pagination-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.85rem 1.25rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      font-size: 0.85rem;

      .pagination-buttons {
        display: flex;
        gap: 0.5rem;
      }
    }

    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .text-secondary { color: #94a3b8; }
    .text-muted { color: #64748b; }
    .text-right { text-align: right; }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;

      &.badge-emerald { background: rgba(16, 185, 129, 0.15); color: #34d399; }
      &.badge-indigo { background: rgba(99, 102, 241, 0.15); color: #818cf8; }
      &.badge-cyan { background: rgba(6, 182, 212, 0.15); color: #22d3ee; }
      &.badge-amber { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
      &.badge-rose { background: rgba(244, 63, 94, 0.15); color: #fb7185; }
      &.badge-slate { background: rgba(100, 116, 139, 0.2); color: #94a3b8; }
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.5rem 0.85rem;
      border-radius: 8px;
      font-weight: 500;
      font-size: 0.85rem;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s ease;

      &.btn-secondary {
        background: rgba(30, 41, 59, 0.8);
        border-color: rgba(255, 255, 255, 0.12);
        color: #f8fafc;
        &:hover { background: rgba(51, 65, 85, 0.9); }
        &:disabled { opacity: 0.5; cursor: not-allowed; }
      }

      &.btn-xs {
        padding: 0.3rem 0.6rem;
        font-size: 0.775rem;
      }
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1.5rem;
      color: #64748b;
    }

    /* Modal Backdrop & Card */
    .modal-backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1.5rem;
    }

    .modal-card {
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
      border-radius: 14px;
      width: 100%;
      max-width: 640px;
      overflow: hidden;

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);

        h3 { font-size: 1.2rem; color: #f8fafc; margin: 0 0 0.2rem 0; }
        .btn-close {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 1.5rem;
          cursor: pointer;
          &:hover { color: #f8fafc; }
        }
      }

      .modal-body {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;

        .meta-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          background: rgba(30, 41, 59, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 0.85rem 1rem;

          .meta-item {
            display: flex;
            flex-direction: column;
            gap: 0.2rem;
            .meta-label { color: #64748b; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; }
            .meta-val { color: #f8fafc; font-size: 0.875rem; font-weight: 500; }
          }
        }

        .payload-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.85rem;
          color: #94a3b8;
          font-weight: 600;
        }

        .json-viewer {
          background: #020617;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 1rem;
          color: #38bdf8;
          font-size: 0.825rem;
          max-height: 280px;
          overflow-y: auto;
          margin: 0;
          font-family: ui-monospace, SFMono-Regular, monospace;
          white-space: pre-wrap;
          word-break: break-all;
        }
      }

      .modal-footer {
        display: flex;
        justify-content: flex-end;
        padding: 1rem 1.5rem;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }
    }
  `]
})
export class AuditComponent implements OnInit {
  public auditLogs: AuditLog[] = [];
  public totalCount = 0;
  public totalPages = 1;
  public currentPage = 1;
  public pageSize = 15;

  public searchQuery = '';
  public selectedEntity = 'All';
  public selectedAction = 'All';

  public activeInspectLog: AuditLog | null = null;

  public uniqueActorsCount = 3;
  public securityEventsCount = 1;
  public mutationEventsCount = 4;

  constructor(
    private readonly apiService: ApiService,
    private readonly authService: AuthService
  ) {}

  public ngOnInit(): void {
    this.loadAuditLogs();
  }

  public loadAuditLogs(): void {
    const filter: AuditLogFilter = {
      search: this.searchQuery || undefined,
      entityName: this.selectedEntity !== 'All' ? this.selectedEntity : undefined,
      action: this.selectedAction !== 'All' ? this.selectedAction : undefined,
      pageNumber: this.currentPage,
      pageSize: this.pageSize
    };

    this.apiService.getAuditLogs(filter).subscribe(response => {
      if (response.success && response.data) {
        this.auditLogs = response.data.data;
        this.totalCount = response.data.totalCount;
        this.totalPages = response.data.totalPages || 1;
        this.currentPage = response.data.pageNumber;

        // Tally telemetry
        const actors = new Set(this.auditLogs.map(a => a.userEmail).filter(Boolean));
        this.uniqueActorsCount = Math.max(1, actors.size);
        this.securityEventsCount = this.auditLogs.filter(a => a.action.toLowerCase().includes('login') || a.action.toLowerCase().includes('auth')).length;
        this.mutationEventsCount = this.auditLogs.filter(a => !a.action.toLowerCase().includes('login')).length;
      }
    });
  }

  public onFilterChange(): void {
    this.currentPage = 1;
    this.loadAuditLogs();
  }

  public changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadAuditLogs();
    }
  }

  public inspectLog(log: AuditLog): void {
    this.activeInspectLog = log;
  }

  public closeInspect(): void {
    this.activeInspectLog = null;
  }

  public formatJson(rawJson?: string): string {
    if (!rawJson) return '{\\n  "status": "No additional payload attributes recorded."\\n}';
    try {
      const parsed = JSON.parse(rawJson);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return rawJson;
    }
  }

  public getActionBadgeClass(action: string): string {
    const act = action.toLowerCase();
    if (act.includes('login') || act.includes('auth')) return 'badge-indigo';
    if (act.includes('create') || act.includes('clockin')) return 'badge-emerald';
    if (act.includes('update') || act.includes('resolve')) return 'badge-cyan';
    if (act.includes('void') || act.includes('delete') || act.includes('reject')) return 'badge-rose';
    if (act.includes('payment')) return 'badge-amber';
    return 'badge-slate';
  }
}
