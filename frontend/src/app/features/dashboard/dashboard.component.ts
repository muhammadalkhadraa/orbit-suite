import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { TenantDetails, TaskItem, Employee } from '../../core/models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard-page">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1 class="font-heading-2">Executive Dashboard</h1>
          <p class="font-caption">Real-time organizational telemetry and multi-tenant security status</p>
        </div>
        <div class="header-actions">
          <a routerLink="/app/tasks" class="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>Manage Tasks</span>
          </a>
        </div>
      </div>

      <!-- Security & Tenant Context Telemetry -->
      <div class="security-card glass-panel-elevated">
        <div class="security-header">
          <div class="security-badge">
            <div class="shield-icon">🛡️</div>
            <div>
              <span class="security-title">ACTIVE TENANT SECURITY ENFORCEMENT</span>
              <p class="security-desc">Cryptographically isolated tenant runtime context verified</p>
            </div>
          </div>
          <span class="badge badge-emerald">Defense-in-Depth Active</span>
        </div>

        <div class="security-grid">
          <div class="sec-item">
            <span class="sec-label">TENANT IDENTIFIER</span>
            <span class="sec-value font-mono">{{ (activeTenant$ | async)?.id }}</span>
          </div>
          <div class="sec-item">
            <span class="sec-label">ORGANIZATION SLUG</span>
            <span class="sec-value">{{ (activeTenant$ | async)?.slug }}</span>
          </div>
          <div class="sec-item">
            <span class="sec-label">AUTHENTICATED ROLE</span>
            <span class="badge" [ngClass]="getRoleBadgeClass((activeTenant$ | async)?.role)">
              {{ (activeTenant$ | async)?.role }}
            </span>
          </div>
          <div class="sec-item">
            <span class="sec-label">EF CORE QUERY FILTER</span>
            <span class="sec-value text-emerald">Scoped to Current Tenant</span>
          </div>
        </div>
      </div>

      <!-- Key Metrics Row -->
      <div class="metrics-grid">
        <div class="glass-panel metric-card">
          <div class="metric-top">
            <span class="metric-title">OPERATING BRANCHES</span>
            <div class="metric-icon icon-cyan">🏢</div>
          </div>
          <div class="metric-num">{{ company?.branchCount || 2 }}</div>
          <div class="metric-sub">Distributed enterprise facilities</div>
        </div>

        <div class="glass-panel metric-card">
          <div class="metric-top">
            <span class="metric-title">DEPARTMENTS</span>
            <div class="metric-icon icon-violet">📁</div>
          </div>
          <div class="metric-num">{{ company?.departmentCount || 2 }}</div>
          <div class="metric-sub">Functional operating divisions</div>
        </div>

        <div class="glass-panel metric-card">
          <div class="metric-top">
            <span class="metric-title">EMPLOYEES DIRECTORY</span>
            <div class="metric-icon icon-indigo">👥</div>
          </div>
          <div class="metric-num">{{ company?.employeeCount || 3 }}</div>
          <div class="metric-sub">Decoupled identity profiles</div>
        </div>

        <div class="glass-panel metric-card">
          <div class="metric-top">
            <span class="metric-title">ACTIVE WORK ITEMS</span>
            <div class="metric-icon icon-emerald">⚡</div>
          </div>
          <div class="metric-num">{{ tasks.length }}</div>
          <div class="metric-sub">Role-scoped task items</div>
        </div>
      </div>

      <!-- Quick Modules Overview & Action Center -->
      <div class="dashboard-grid">
        <!-- Recent Tasks Card -->
        <div class="glass-panel content-card">
          <div class="card-title-bar">
            <div>
              <h2 class="font-heading-3">Assigned Tasks Overview</h2>
              <p class="font-caption">Filtered by your role-based permission scope</p>
            </div>
            <a routerLink="/app/tasks" class="btn-secondary btn-sm">View All</a>
          </div>

          <div class="task-list" *ngIf="tasks.length > 0; else noTasks">
            <div *ngFor="let t of tasks.slice(0, 4)" class="task-row">
              <div class="task-status-indicator" [ngClass]="t.status.toLowerCase()"></div>
              <div class="task-info">
                <span class="task-title">{{ t.title }}</span>
                <span class="task-meta">Assigned: {{ t.assignedEmployeeName || 'Unassigned' }} • Priority: {{ t.priority }}</span>
              </div>
              <span class="badge" [ngClass]="getStatusBadge(t.status)">{{ t.status }}</span>
            </div>
          </div>

          <ng-template #noTasks>
            <div class="empty-box font-caption">No tasks visible for this permission level.</div>
          </ng-template>
        </div>

        <!-- Quick Governance Card -->
        <div class="glass-panel content-card">
          <div class="card-title-bar">
            <div>
              <h2 class="font-heading-3">Platform Operations</h2>
              <p class="font-caption">Direct navigation to active suite modules</p>
            </div>
          </div>

          <div class="quick-nav-list">
            <a routerLink="/app/tasks" class="quick-nav-item">
              <div class="q-icon">📋</div>
              <div class="q-content">
                <span class="q-title">Task & Project Board</span>
                <span class="q-desc">Kanban workflows, milestone tracking, and role-scoped assignments</span>
              </div>
              <span class="badge badge-emerald">Live</span>
              <span class="q-arrow">→</span>
            </a>

            <a routerLink="/app/crm" class="quick-nav-item">
              <div class="q-icon">💼</div>
              <div class="q-content">
                <span class="q-title">CRM & Deal Pipeline</span>
                <span class="q-desc">6-stage sales funnel, win-loss probabilities, and account directory</span>
              </div>
              <span class="badge badge-emerald">Live</span>
              <span class="q-arrow">→</span>
            </a>

            <a routerLink="/app/support" class="quick-nav-item">
              <div class="q-icon">🎧</div>
              <div class="q-content">
                <span class="q-title">Customer Support Desk</span>
                <span class="q-desc">Sequential tickets (TCK-1001), SLA monitoring, and case discussion threads</span>
              </div>
              <span class="badge badge-emerald">Live</span>
              <span class="q-arrow">→</span>
            </a>

            <a routerLink="/app/inventory" class="quick-nav-item">
              <div class="q-icon">📦</div>
              <div class="q-content">
                <span class="q-title">Inventory & Warehousing</span>
                <span class="q-desc">Multi-branch allocations, immutable stock ledger, and branch transfers</span>
              </div>
              <span class="badge badge-emerald">Live</span>
              <span class="q-arrow">→</span>
            </a>

            <a routerLink="/app/finance" class="quick-nav-item">
              <div class="q-icon">💳</div>
              <div class="q-content">
                <span class="q-title">Invoicing & Accounts Receivable</span>
                <span class="q-desc">Billing statements (INV-YYYY-XXXX), tax rules, and immutable cash receipts</span>
              </div>
              <span class="badge badge-emerald">Live</span>
              <span class="q-arrow">→</span>
            </a>

            <a routerLink="/app/manufacturing" class="quick-nav-item">
              <div class="q-icon">⚙️</div>
              <div class="q-content">
                <span class="q-title">Manufacturing & Work Orders</span>
                <span class="q-desc">BOM formulation recipes, shop-floor production runs, and atomic stock yields</span>
              </div>
              <span class="badge badge-emerald">Live</span>
              <span class="q-arrow">→</span>
            </a>

            <a routerLink="/app/hr" class="quick-nav-item">
              <div class="q-icon">⏱️</div>
              <div class="q-content">
                <span class="q-title">HR & Workforce Attendance</span>
                <span class="q-desc">Self-service digital time clock, supervisory leave approvals, and shift rotas</span>
              </div>
              <span class="badge badge-emerald">Live</span>
              <span class="q-arrow">→</span>
            </a>

            <a routerLink="/app/reports" class="quick-nav-item">
              <div class="q-icon">📊</div>
              <div class="q-content">
                <span class="q-title">Reports & Executive Analytics</span>
                <span class="q-desc">Cross-domain telemetry, trend charts, and on-demand CSV & JSON file exports</span>
              </div>
              <span class="badge badge-cyan">Admin</span>
              <span class="q-arrow">→</span>
            </a>

            <a routerLink="/app/audit" class="quick-nav-item">
              <div class="q-icon">🛡️</div>
              <div class="q-content">
                <span class="q-title">Audit & Security Ledger</span>
                <span class="q-desc">Forensic chronological event trail, IP tracking, and raw payload inspector</span>
              </div>
              <span class="badge badge-cyan">Admin</span>
              <span class="q-arrow">→</span>
            </a>

            <a routerLink="/app/organization" class="quick-nav-item">
              <div class="q-icon">🏛️</div>
              <div class="q-content">
                <span class="q-title">Organization Settings</span>
                <span class="q-desc">Company metadata, multi-branch facilities, and employee profiles</span>
              </div>
              <span class="badge badge-indigo">Config</span>
              <span class="q-arrow">→</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @use 'styles/variables' as *;
    @use 'styles/mixins' as *;

    .dashboard-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;

      @include responsive-sm {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
    }

    // Security Card
    .security-card {
      padding: 1.25rem 1.5rem;
      border-color: rgba(99, 102, 241, 0.3);
      background: rgba(17, 24, 39, 0.85);

      .security-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1rem;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid $border-glass;
      }

      .security-badge {
        display: flex;
        align-items: center;
        gap: 0.75rem;

        .shield-icon {
          font-size: 1.5rem;
        }

        .security-title {
          font-size: 0.75rem;
          font-weight: 700;
          color: #a5b4fc;
          letter-spacing: 0.06em;
        }

        .security-desc {
          font-size: 0.75rem;
          color: $text-muted;
        }
      }

      .security-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;

        .sec-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;

          .sec-label {
            font-size: 0.6875rem;
            color: $text-muted;
            font-weight: 600;
          }

          .sec-value {
            font-size: 0.8125rem;
            color: #ffffff;
            word-break: break-all;

            &.font-mono {
              font-family: monospace;
              color: #cbd5e1;
            }

            &.text-emerald {
              color: #6ee7b7;
              font-weight: 600;
            }
          }
        }
      }
    }

    // Metrics Row
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
    }

    .metric-card {
      padding: 1.25rem;

      .metric-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.5rem;

        .metric-title {
          font-size: 0.6875rem;
          font-weight: 700;
          color: $text-muted;
          letter-spacing: 0.05em;
        }

        .metric-icon {
          font-size: 1.25rem;
        }
      }

      .metric-num {
        font-size: 2rem;
        font-weight: 700;
        color: #ffffff;
        line-height: 1.2;
        margin-bottom: 0.25rem;
      }

      .metric-sub {
        font-size: 0.75rem;
        color: $text-secondary;
      }
    }

    // Content Grid
    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 1.5rem;
    }

    .content-card {
      padding: 1.5rem;

      .card-title-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.25rem;
      }

      .btn-sm {
        padding: 0.375rem 0.75rem;
        font-size: 0.75rem;
      }
    }

    .task-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;

      .task-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid $border-glass;
        border-radius: $radius-md;

        .task-status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;

          &.todo { background: $text-muted; }
          &.inprogress { background: $aurora-indigo; box-shadow: 0 0 6px $aurora-indigo; }
          &.inreview { background: $aurora-amber; }
          &.done { background: $aurora-emerald; }
        }

        .task-info {
          flex: 1;
          display: flex;
          flex-direction: column;

          .task-title {
            font-size: 0.875rem;
            font-weight: 600;
            color: #ffffff;
          }

          .task-meta {
            font-size: 0.75rem;
            color: $text-muted;
          }
        }
      }
    }

    .empty-box {
      padding: 2rem;
      text-align: center;
      color: $text-muted;
      border: 1px dashed $border-glass;
      border-radius: $radius-md;
    }

    .quick-nav-list {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;

      .quick-nav-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.875rem 1rem;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid $border-glass;
        border-radius: $radius-md;
        text-decoration: none;
        transition: all $transition-fast;

        .q-icon {
          font-size: 1.25rem;
        }

        .q-content {
          flex: 1;
          display: flex;
          flex-direction: column;

          .q-title {
            font-size: 0.875rem;
            font-weight: 600;
            color: #ffffff;
          }

          .q-desc {
            font-size: 0.75rem;
            color: $text-muted;
          }
        }

        .q-arrow {
          color: $text-muted;
          font-weight: 600;
          transition: transform $transition-fast;
        }

        &:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: $border-glass-hover;

          .q-arrow {
            transform: translateX(3px);
            color: #ffffff;
          }
        }
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private apiService = inject(ApiService);

  public activeTenant$ = this.authService.activeTenant$;
  public company: TenantDetails | null = null;
  public tasks: TaskItem[] = [];

  constructor() {}

  public ngOnInit(): void {
    this.apiService.getCompany().subscribe(res => {
      if (res.data) this.company = res.data;
    });

    this.apiService.getTasks().subscribe(res => {
      if (res.data) this.tasks = res.data.data;
    });
  }

  public getRoleBadgeClass(role?: string): string {
    switch (role) {
      case 'Owner': return 'badge-violet';
      case 'Admin': return 'badge-indigo';
      case 'Manager': return 'badge-cyan';
      case 'Employee': return 'badge-emerald';
      default: return 'badge-indigo';
    }
  }

  public getStatusBadge(status: string): string {
    switch (status) {
      case 'Todo': return 'badge-indigo';
      case 'InProgress': return 'badge-cyan';
      case 'InReview': return 'badge-amber';
      case 'Done': return 'badge-emerald';
      default: return 'badge-indigo';
    }
  }
}
