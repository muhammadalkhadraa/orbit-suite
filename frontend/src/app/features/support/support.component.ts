import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { SupportTicket, TicketComment, TicketMetrics, TicketStatus, TicketPriority, TicketCategory, Customer, Employee } from '../../core/models/models';

@Component({
  selector: 'app-support',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="support-page">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <div class="badge badge-indigo" style="margin-bottom: 0.5rem;">Helpdesk & SLA Governance</div>
          <h1 class="font-heading-2">Customer Support & Incident Desk</h1>
          <p class="font-caption">Multi-tenant incident resolution, case communication threads, and SLA tracking</p>
        </div>
        <div class="header-actions">
          <button (click)="openCreateModal()" class="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>Create Support Ticket</span>
          </button>
        </div>
      </div>

      <!-- Confirmed Role Visibility Banner -->
      <div class="role-scope-banner glass-panel">
        <div class="scope-icon">🛡️</div>
        <div class="scope-details">
          <div class="scope-title">
            ACTIVE PERMISSION SCOPE: <span class="badge" [ngClass]="getRoleBadgeClass(currentRole)">{{ currentRole }}</span>
          </div>
          <p class="scope-explanation" [ngSwitch]="currentRole">
            <span *ngSwitchCase="'Owner'">
              <strong>Full Tenant Oversight:</strong> As Company Owner, you have complete cross-department visibility over all customer cases and SLA adherence within {{ (activeTenant$ | async)?.name }}.
            </span>
            <span *ngSwitchCase="'Admin'">
              <strong>Operational Oversight:</strong> As Administrator, you can view, assign, re-prioritize, and close tickets across all accounts and support queues.
            </span>
            <span *ngSwitchCase="'Manager'">
              <strong>Team Oversight:</strong> In accordance with confirmed specifications, you supervise support cases assigned to yourself and your direct reports (e.g. David Lee).
            </span>
            <span *ngSwitchCase="'Employee'">
              <strong>Personal Scope (Zero Leakage):</strong> Enforcing confirmed privacy rules, you solely view support tickets assigned to you or created by you.
            </span>
            <span *ngSwitchDefault>
              Role-scoped case management active.
            </span>
          </p>
        </div>
      </div>

      <!-- Metrics Row -->
      <div class="metrics-row">
        <div class="metric-card glass-panel">
          <div class="metric-header">
            <span class="metric-label">OPEN INCIDENTS</span>
            <span class="metric-icon">🔥</span>
          </div>
          <div class="metric-value font-heading-2 text-indigo">
            {{ ticketMetrics?.openTicketsCount || 0 }}
          </div>
          <span class="metric-sub text-muted">Awaiting triage & resolution</span>
        </div>

        <div class="metric-card glass-panel">
          <div class="metric-header">
            <span class="metric-label">PENDING CLIENT</span>
            <span class="metric-icon">⏳</span>
          </div>
          <div class="metric-value font-heading-2 text-cyan">
            {{ ticketMetrics?.pendingTicketsCount || 0 }}
          </div>
          <span class="metric-sub text-muted">Verification or info requested</span>
        </div>

        <div class="metric-card glass-panel">
          <div class="metric-header">
            <span class="metric-label">RESOLVED & CLOSED</span>
            <span class="metric-icon">✅</span>
          </div>
          <div class="metric-value font-heading-2 text-emerald">
            {{ (ticketMetrics?.resolvedTicketsCount || 0) + (ticketMetrics?.closedTicketsCount || 0) }}
          </div>
          <span class="metric-sub text-muted">Completed incidents</span>
        </div>

        <div class="metric-card glass-panel">
          <div class="metric-header">
            <span class="metric-label">CRITICAL / URGENT</span>
            <span class="metric-icon">🚨</span>
          </div>
          <div class="metric-value font-heading-2 text-rose">
            {{ ticketMetrics?.urgentTicketsCount || 0 }}
          </div>
          <span class="metric-sub text-muted">High-priority SLA items</span>
        </div>

        <div class="metric-card glass-panel">
          <div class="metric-header">
            <span class="metric-label">RESOLUTION RATE</span>
            <span class="metric-icon">📈</span>
          </div>
          <div class="metric-value font-heading-2 text-amber">
            {{ ticketMetrics?.resolutionRatePercentage || 0 }}%
          </div>
          <span class="metric-sub text-muted">Total cases: {{ ticketMetrics?.totalTicketsCount || 0 }}</span>
        </div>
      </div>

      <!-- Filter & Search Controls -->
      <div class="controls-bar glass-panel">
        <div class="search-box">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (input)="applyFilters()"
            placeholder="Search ticket #, subject, customer name..."
          />
        </div>

        <div class="filter-group">
          <select [(ngModel)]="selectedPriority" (change)="applyFilters()" class="filter-select">
            <option value="ALL">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select [(ngModel)]="selectedCategory" (change)="applyFilters()" class="filter-select">
            <option value="ALL">All Categories</option>
            <option value="Technical">Technical</option>
            <option value="Billing">Billing</option>
            <option value="Product">Product</option>
            <option value="Account">Account</option>
            <option value="General">General</option>
          </select>
        </div>

        <div class="status-tabs">
          <button
            (click)="selectStatusTab('ALL')"
            class="tab-btn"
            [class.active]="selectedTab === 'ALL'"
          >
            All ({{ tickets.length }})
          </button>
          <button
            (click)="selectStatusTab('Open')"
            class="tab-btn"
            [class.active]="selectedTab === 'Open'"
          >
            Open ({{ getCountByStatus('Open') }})
          </button>
          <button
            (click)="selectStatusTab('Pending')"
            class="tab-btn"
            [class.active]="selectedTab === 'Pending'"
          >
            Pending ({{ getCountByStatus('Pending') }})
          </button>
          <button
            (click)="selectStatusTab('Resolved')"
            class="tab-btn"
            [class.active]="selectedTab === 'Resolved'"
          >
            Resolved ({{ getCountByStatus('Resolved') }})
          </button>
          <button
            (click)="selectStatusTab('Closed')"
            class="tab-btn"
            [class.active]="selectedTab === 'Closed'"
          >
            Closed ({{ getCountByStatus('Closed') }})
          </button>
        </div>
      </div>

      <!-- Support Tickets Table -->
      <div class="table-container glass-panel">
        <div class="table-header-bar">
          <h2 class="font-heading-3">Support Queue</h2>
          <span class="record-count font-caption text-muted">
            Showing {{ filteredTickets.length }} ticket{{ filteredTickets.length === 1 ? '' : 's' }}
          </span>
        </div>

        <div *ngIf="filteredTickets.length === 0" class="empty-state">
          <div class="empty-icon">🎟️</div>
          <div class="empty-title">No support tickets found</div>
          <p class="empty-desc">
            No incidents match your active filter settings or role permissions.
          </p>
          <button (click)="openCreateModal()" class="btn-primary" style="margin-top: 1rem;">
            Create New Ticket
          </button>
        </div>

        <table *ngIf="filteredTickets.length > 0" class="data-table">
          <thead>
            <tr>
              <th>Ticket # & Subject</th>
              <th>Customer</th>
              <th>Category</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Assigned Agent</th>
              <th>Activity</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let t of filteredTickets" (click)="openDetailModal(t)" class="clickable-row">
              <td>
                <div class="ticket-cell">
                  <span class="ticket-number font-mono">{{ t.ticketNumber }}</span>
                  <div>
                    <div class="ticket-subject font-bold">{{ t.subject }}</div>
                    <div class="ticket-desc-snippet font-caption text-muted">{{ t.description }}</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="customer-cell font-body">
                  🏢 {{ t.customerName }}
                </div>
              </td>
              <td>
                <span class="category-tag">{{ t.category }}</span>
              </td>
              <td>
                <span class="badge" [ngClass]="getPriorityBadge(t.priority)">
                  {{ t.priority }}
                </span>
              </td>
              <td>
                <span class="badge" [ngClass]="getStatusBadge(t.status)">
                  {{ t.status }}
                </span>
              </td>
              <td>
                <div class="agent-cell font-caption">
                  <span *ngIf="t.assignedEmployeeName" class="agent-badge">
                    👤 {{ t.assignedEmployeeName }}
                  </span>
                  <span *ngIf="!t.assignedEmployeeName" class="text-muted">
                    Unassigned
                  </span>
                </div>
              </td>
              <td class="font-caption text-muted">
                <div *ngIf="t.commentsCount > 0" class="comments-count">
                  💬 {{ t.commentsCount }} note{{ t.commentsCount === 1 ? '' : 's' }}
                </div>
                <div>{{ t.createdAtUtc | date:'shortDate' }}</div>
              </td>
              <td style="text-align: right;" (click)="$event.stopPropagation()">
                <div class="action-buttons">
                  <button (click)="openDetailModal(t)" class="btn-sm btn-secondary">Inspect</button>
                  <button
                    *ngIf="canDelete()"
                    (click)="deleteTicket(t.id)"
                    class="btn-sm btn-danger"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ============================================== -->
      <!-- MODAL: TICKET DETAIL & DISCUSSION THREAD       -->
      <!-- ============================================== -->
      <div *ngIf="showDetailModal && selectedTicket" class="modal-overlay">
        <div class="modal-dialog glass-panel-elevated detail-dialog">
          <div class="modal-header">
            <div class="detail-header-left">
              <span class="ticket-number-pill font-mono">{{ selectedTicket.ticketNumber }}</span>
              <span class="badge" [ngClass]="getStatusBadge(selectedTicket.status)">{{ selectedTicket.status }}</span>
              <span class="badge" [ngClass]="getPriorityBadge(selectedTicket.priority)">{{ selectedTicket.priority }}</span>
              <span class="category-tag">{{ selectedTicket.category }}</span>
            </div>
            <button (click)="closeDetailModal()" class="modal-close-btn">&times;</button>
          </div>

          <div class="modal-body">
            <h2 class="font-heading-2 detail-title">{{ selectedTicket.subject }}</h2>
            <div class="detail-meta-row font-caption text-muted">
              <span>Client: <strong>{{ selectedTicket.customerName }}</strong></span>
              <span>Assigned Agent: <strong>{{ selectedTicket.assignedEmployeeName || 'Unassigned' }}</strong></span>
              <span>Logged: <strong>{{ selectedTicket.createdAtUtc | date:'medium' }}</strong></span>
            </div>

            <!-- Description Card -->
            <div class="description-card glass-panel">
              <div class="section-label font-caption text-muted">INCIDENT DESCRIPTION</div>
              <p class="font-body description-text">{{ selectedTicket.description }}</p>
            </div>

            <!-- Resolution Summary if Resolved -->
            <div *ngIf="selectedTicket.resolutionSummary" class="resolution-card glass-panel">
              <div class="section-label font-caption text-emerald">✓ RESOLUTION SUMMARY</div>
              <p class="font-body">{{ selectedTicket.resolutionSummary }}</p>
              <div *ngIf="selectedTicket.resolvedAtUtc" class="font-caption text-muted" style="margin-top: 0.25rem;">
                Resolved at: {{ selectedTicket.resolvedAtUtc | date:'medium' }}
              </div>
            </div>

            <!-- Status Transition Toolbar -->
            <div class="status-toolbar glass-panel">
              <span class="toolbar-label font-caption">Quick Status:</span>
              <button
                *ngIf="selectedTicket.status !== 'Open'"
                (click)="quickChangeStatus('Open')"
                class="btn-sm btn-secondary"
              >
                Reopen
              </button>
              <button
                *ngIf="selectedTicket.status !== 'Pending'"
                (click)="quickChangeStatus('Pending')"
                class="btn-sm btn-secondary"
              >
                Mark Pending
              </button>
              <button
                *ngIf="selectedTicket.status !== 'Resolved'"
                (click)="openResolvePrompt()"
                class="btn-sm btn-primary"
              >
                ✓ Mark Resolved
              </button>
              <button
                *ngIf="selectedTicket.status !== 'Closed'"
                (click)="quickChangeStatus('Closed')"
                class="btn-sm btn-secondary"
              >
                Close Case
              </button>
            </div>

            <!-- Inline Resolution Prompt -->
            <div *ngIf="showResolvePrompt" class="resolve-prompt-box glass-panel">
              <div class="font-bold font-caption" style="margin-bottom: 0.5rem;">Enter Resolution Details:</div>
              <textarea [(ngModel)]="resolveSummaryInput" rows="2" placeholder="Explain the root cause and applied fix..."></textarea>
              <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.5rem;">
                <button (click)="showResolvePrompt = false" class="btn-sm btn-secondary">Cancel</button>
                <button (click)="submitResolve()" class="btn-sm btn-primary">Confirm Resolved</button>
              </div>
            </div>

            <!-- Discussion & Notes Timeline -->
            <div class="timeline-section">
              <div class="timeline-header">
                <h3 class="font-heading-3">Case Notes & Timeline</h3>
                <span class="font-caption text-muted">{{ selectedTicket.comments.length }} message{{ selectedTicket.comments.length === 1 ? '' : 's' }}</span>
              </div>

              <div *ngIf="selectedTicket.comments.length === 0" class="timeline-empty font-caption text-muted">
                No notes or customer messages recorded on this ticket yet.
              </div>

              <div class="comments-list">
                <div
                  *ngFor="let comment of selectedTicket.comments"
                  class="comment-item glass-panel"
                  [class.internal-comment]="comment.isInternal"
                >
                  <div class="comment-header">
                    <div class="comment-author-group">
                      <span class="author-avatar">{{ getInitials(comment.authorName) }}</span>
                      <span class="author-name font-bold">{{ comment.authorName }}</span>
                      <span *ngIf="comment.isInternal" class="internal-tag">🔒 Internal Team Note</span>
                      <span *ngIf="!comment.isInternal" class="public-tag">💬 Client Communication</span>
                    </div>
                    <span class="comment-time font-caption text-muted">
                      {{ comment.createdAtUtc | date:'short' }}
                    </span>
                  </div>
                  <p class="comment-body font-body">{{ comment.commentText }}</p>
                </div>
              </div>

              <!-- Add Comment Input -->
              <div class="add-comment-box glass-panel">
                <textarea
                  [(ngModel)]="newCommentText"
                  rows="3"
                  placeholder="Type a case update, troubleshooting note, or client reply..."
                ></textarea>
                <div class="comment-footer">
                  <label class="internal-checkbox font-caption">
                    <input type="checkbox" [(ngModel)]="newCommentIsInternal" />
                    <span>Internal team note only (hidden from client)</span>
                  </label>
                  <button
                    (click)="submitComment()"
                    class="btn-primary btn-sm"
                    [disabled]="!newCommentText.trim()"
                  >
                    Post Note
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- MODAL: CREATE TICKET                           -->
      <!-- ============================================== -->
      <div *ngIf="showCreateModal" class="modal-overlay">
        <div class="modal-dialog glass-panel-elevated">
          <div class="modal-header">
            <h2 class="font-heading-3">Open New Support Ticket</h2>
            <button (click)="closeCreateModal()" class="modal-close-btn">&times;</button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label>Incident Subject *</label>
              <input type="text" [(ngModel)]="createSubject" placeholder="Brief summary of the issue" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Affected Client Account *</label>
                <select [(ngModel)]="createCustomerId">
                  <option value="">-- Select Customer Account --</option>
                  <option *ngFor="let c of customers" [value]="c.id">{{ c.companyName }}</option>
                </select>
              </div>

              <div class="form-group">
                <label>Assigned Support Agent</label>
                <select [(ngModel)]="createAssignedEmployeeId">
                  <option value="">-- Unassigned --</option>
                  <option *ngFor="let emp of employees" [value]="emp.id">{{ emp.fullName }} ({{ emp.jobTitle }})</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Category</label>
                <select [(ngModel)]="createCategory">
                  <option value="Technical">Technical</option>
                  <option value="Billing">Billing</option>
                  <option value="Product">Product</option>
                  <option value="Account">Account</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div class="form-group">
                <label>Priority</label>
                <select [(ngModel)]="createPriority">
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent (SLA Critical)</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label>Detailed Incident Description *</label>
              <textarea
                [(ngModel)]="createDescription"
                rows="4"
                placeholder="Steps to reproduce, system error codes, telemetry logs..."
              ></textarea>
            </div>
          </div>

          <div class="modal-footer">
            <button (click)="closeCreateModal()" class="btn-secondary">Cancel</button>
            <button
              (click)="submitCreateTicket()"
              class="btn-primary"
              [disabled]="!createSubject.trim() || !createCustomerId || !createDescription.trim()"
            >
              Open Ticket
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @use 'styles/variables' as *;
    @use 'styles/mixins' as *;

    .support-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .role-scope-banner {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      padding: 1.125rem 1.5rem;
      border-left: 4px solid $aurora-indigo;

      .scope-icon {
        font-size: 1.75rem;
      }

      .scope-title {
        font-size: 0.8125rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        margin-bottom: 0.25rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .scope-explanation {
        font-size: 0.875rem;
        color: $text-secondary;
        line-height: 1.4;
      }
    }

    .metrics-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
    }

    .metric-card {
      padding: 1.25rem;

      .metric-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.5rem;

        .metric-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: $text-muted;
          letter-spacing: 0.05em;
        }

        .metric-icon {
          font-size: 1.25rem;
        }
      }

      .metric-sub {
        display: block;
        font-size: 0.75rem;
        margin-top: 0.25rem;
      }
    }

    .controls-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
      padding: 0.875rem 1.25rem;

      .search-box {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex: 1;
        min-width: 240px;
        background: rgba(11, 15, 25, 0.6);
        border: 1px solid $border-glass;
        border-radius: $radius-md;
        padding: 0.5rem 0.875rem;

        .search-icon {
          color: $text-muted;
        }

        input {
          background: transparent;
          border: none;
          color: $text-primary;
          font-size: 0.875rem;
          width: 100%;
          outline: none;

          &::placeholder {
            color: $text-muted;
          }
        }
      }

      .filter-group {
        display: flex;
        gap: 0.5rem;
      }

      .filter-select {
        background: rgba(11, 15, 25, 0.7);
        border: 1px solid $border-glass;
        border-radius: $radius-md;
        color: $text-primary;
        padding: 0.5rem 0.75rem;
        font-size: 0.8125rem;
        outline: none;
      }

      .status-tabs {
        display: flex;
        gap: 0.375rem;
        flex-wrap: wrap;

        .tab-btn {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid $border-glass;
          color: $text-secondary;
          border-radius: $radius-md;
          padding: 0.375rem 0.75rem;
          font-size: 0.8125rem;
          cursor: pointer;
          transition: all 0.2s ease;

          &:hover {
            color: $text-primary;
            background: rgba(255, 255, 255, 0.06);
          }

          &.active {
            background: rgba(99, 102, 241, 0.2);
            border-color: $aurora-indigo;
            color: #ffffff;
            font-weight: 600;
          }
        }
      }
    }

    .table-container {
      padding: 1.5rem;

      .table-header-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.25rem;
      }
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;

      th {
        font-size: 0.75rem;
        font-weight: 600;
        color: $text-muted;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid $border-glass;
      }

      td {
        padding: 1rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        vertical-align: middle;
      }

      tbody tr.clickable-row {
        cursor: pointer;
        transition: background-color 0.15s ease;

        &:hover {
          background-color: rgba(99, 102, 241, 0.04);
        }
      }
    }

    .ticket-cell {
      display: flex;
      align-items: flex-start;
      gap: 0.875rem;

      .ticket-number {
        font-size: 0.75rem;
        font-weight: 700;
        background: rgba(99, 102, 241, 0.15);
        color: #c7d2fe;
        border: 1px solid rgba(99, 102, 241, 0.3);
        padding: 0.25rem 0.5rem;
        border-radius: $radius-sm;
        white-space: nowrap;
      }

      .ticket-subject {
        font-size: 0.9375rem;
        margin-bottom: 0.125rem;
      }

      .ticket-desc-snippet {
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
        max-width: 320px;
      }
    }

    .customer-cell {
      font-weight: 600;
    }

    .category-tag {
      display: inline-block;
      font-size: 0.75rem;
      color: $aurora-cyan;
      background: rgba(6, 182, 212, 0.1);
      border: 1px solid rgba(6, 182, 212, 0.25);
      padding: 0.2rem 0.5rem;
      border-radius: $radius-sm;
    }

    .agent-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      background: rgba(255, 255, 255, 0.04);
      padding: 0.25rem 0.5rem;
      border-radius: $radius-sm;
      border: 1px solid $border-glass;
    }

    .comments-count {
      color: $text-secondary;
      margin-bottom: 0.125rem;
    }

    .action-buttons {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }

    .btn-sm {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: $radius-md;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.2s ease;

      &.btn-secondary {
        background: rgba(255, 255, 255, 0.05);
        color: $text-primary;
        border-color: $border-glass;

        &:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      }

      &.btn-danger {
        background: rgba(244, 63, 94, 0.1);
        color: $aurora-rose;
        border-color: rgba(244, 63, 94, 0.2);

        &:hover {
          background: rgba(244, 63, 94, 0.2);
        }
      }
    }

    .empty-state {
      padding: 3rem 1.5rem;
      text-align: center;

      .empty-icon {
        font-size: 2.5rem;
        margin-bottom: 0.75rem;
      }

      .empty-title {
        font-size: 1.125rem;
        font-weight: 600;
        margin-bottom: 0.375rem;
      }

      .empty-desc {
        color: $text-secondary;
        font-size: 0.875rem;
        max-width: 400px;
        margin: 0 auto;
      }
    }

    /* MODAL STYLES */
    .modal-overlay {
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
      padding: 1rem;
    }

    .modal-dialog {
      width: 100%;
      max-width: 580px;
      padding: 1.75rem;
      max-height: 90vh;
      overflow-y: auto;

      &.detail-dialog {
        max-width: 780px;
      }

      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.25rem;
      }

      .modal-close-btn {
        background: none;
        border: none;
        color: $text-muted;
        font-size: 1.25rem;
        cursor: pointer;

        &:hover {
          color: #ffffff;
        }
      }
    }

    .detail-header-left {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      flex-wrap: wrap;

      .ticket-number-pill {
        font-size: 0.8125rem;
        font-weight: 700;
        background: rgba(99, 102, 241, 0.2);
        color: #c7d2fe;
        border: 1px solid rgba(99, 102, 241, 0.4);
        padding: 0.25rem 0.625rem;
        border-radius: $radius-sm;
      }
    }

    .detail-title {
      font-size: 1.25rem;
      margin-bottom: 0.5rem;
    }

    .detail-meta-row {
      display: flex;
      gap: 1.25rem;
      flex-wrap: wrap;
      margin-bottom: 1.25rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);

      strong {
        color: $text-primary;
      }
    }

    .description-card, .resolution-card {
      padding: 1rem 1.25rem;
      margin-bottom: 1rem;

      .section-label {
        font-weight: 700;
        letter-spacing: 0.05em;
        margin-bottom: 0.375rem;
      }

      .description-text {
        white-space: pre-wrap;
      }
    }

    .status-toolbar {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.75rem 1rem;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;

      .toolbar-label {
        font-weight: 700;
        color: $text-muted;
      }
    }

    .resolve-prompt-box {
      padding: 1rem;
      margin-bottom: 1.25rem;
      border: 1px solid rgba(16, 185, 129, 0.3);
      background: rgba(16, 185, 129, 0.05);

      textarea {
        width: 100%;
        background: rgba(11, 15, 25, 0.7);
        border: 1px solid $border-glass;
        border-radius: $radius-sm;
        color: $text-primary;
        padding: 0.5rem;
        outline: none;
      }
    }

    .timeline-section {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;

      .timeline-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .timeline-empty {
        padding: 1.5rem;
        text-align: center;
        border: 1px dashed rgba(255, 255, 255, 0.08);
        border-radius: $radius-md;
      }

      .comments-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .comment-item {
        padding: 1rem;
        border-radius: $radius-md;
        border: 1px solid rgba(255, 255, 255, 0.06);

        &.internal-comment {
          border-left: 3px solid $aurora-amber;
          background: rgba(245, 158, 11, 0.05);
        }

        .comment-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.5rem;

          .comment-author-group {
            display: flex;
            align-items: center;
            gap: 0.5rem;

            .author-avatar {
              width: 22px;
              height: 22px;
              border-radius: 50%;
              background: rgba(99, 102, 241, 0.25);
              color: #c7d2fe;
              font-size: 0.625rem;
              font-weight: 700;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .internal-tag {
              font-size: 0.6875rem;
              color: $aurora-amber;
              background: rgba(245, 158, 11, 0.15);
              padding: 0.125rem 0.375rem;
              border-radius: $radius-sm;
              font-weight: 600;
            }

            .public-tag {
              font-size: 0.6875rem;
              color: $aurora-cyan;
              background: rgba(6, 182, 212, 0.15);
              padding: 0.125rem 0.375rem;
              border-radius: $radius-sm;
              font-weight: 600;
            }
          }
        }

        .comment-body {
          font-size: 0.875rem;
          line-height: 1.4;
          white-space: pre-wrap;
        }
      }

      .add-comment-box {
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.625rem;

        textarea {
          width: 100%;
          background: rgba(11, 15, 25, 0.7);
          border: 1px solid $border-glass;
          border-radius: $radius-md;
          color: $text-primary;
          padding: 0.625rem;
          font-size: 0.875rem;
          outline: none;

          &::placeholder {
            color: $text-muted;
          }
        }

        .comment-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .internal-checkbox {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: $text-secondary;
          cursor: pointer;
        }
      }
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }
  `]
})
export class SupportComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);

  public activeTenant$ = this.authService.activeTenant$;

  public tickets: SupportTicket[] = [];
  public filteredTickets: SupportTicket[] = [];
  public ticketMetrics: TicketMetrics | null = null;
  public customers: Customer[] = [];
  public employees: Employee[] = [];

  public searchQuery = '';
  public selectedTab = 'ALL';
  public selectedPriority = 'ALL';
  public selectedCategory = 'ALL';

  // Detail Modal
  public showDetailModal = false;
  public selectedTicket: SupportTicket | null = null;
  public newCommentText = '';
  public newCommentIsInternal = false;
  public showResolvePrompt = false;
  public resolveSummaryInput = '';

  // Create Modal
  public showCreateModal = false;
  public createSubject = '';
  public createDescription = '';
  public createCustomerId = '';
  public createAssignedEmployeeId = '';
  public createCategory: TicketCategory = 'Technical';
  public createPriority: TicketPriority = 'Medium';

  public get currentRole(): string {
    return this.authService.currentRole || 'Employee';
  }

  public ngOnInit(): void {
    this.loadTickets();
    this.loadMetrics();
    this.apiService.getCustomers().subscribe(res => {
      if (res.data) this.customers = res.data.data;
    });
    this.apiService.getEmployees().subscribe(res => {
      if (res.data) this.employees = res.data.data;
    });
  }

  public loadTickets(): void {
    this.apiService.getTickets().subscribe(res => {
      if (res.data) {
        this.tickets = res.data.data;
        this.applyFilters();
      }
    });
  }

  public loadMetrics(): void {
    this.apiService.getTicketMetrics().subscribe(res => {
      if (res.data) {
        this.ticketMetrics = res.data;
      }
    });
  }

  public applyFilters(): void {
    let result = [...this.tickets];

    if (this.selectedTab !== 'ALL') {
      result = result.filter(t => t.status === this.selectedTab);
    }

    if (this.selectedPriority !== 'ALL') {
      result = result.filter(t => t.priority === this.selectedPriority);
    }

    if (this.selectedCategory !== 'ALL') {
      result = result.filter(t => t.category === this.selectedCategory);
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      result = result.filter(t =>
        t.ticketNumber.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.customerName.toLowerCase().includes(q)
      );
    }

    this.filteredTickets = result;
  }

  public selectStatusTab(tab: string): void {
    this.selectedTab = tab;
    this.applyFilters();
  }

  public getCountByStatus(status: TicketStatus): number {
    return this.tickets.filter(t => t.status === status).length;
  }

  public openDetailModal(ticket: SupportTicket): void {
    this.selectedTicket = ticket;
    this.newCommentText = '';
    this.newCommentIsInternal = false;
    this.showResolvePrompt = false;
    this.resolveSummaryInput = '';
    this.showDetailModal = true;
  }

  public closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedTicket = null;
  }

  public openCreateModal(): void {
    this.createSubject = '';
    this.createDescription = '';
    this.createCustomerId = this.customers.length > 0 ? this.customers[0].id : '';
    this.createAssignedEmployeeId = '';
    this.createCategory = 'Technical';
    this.createPriority = 'Medium';
    this.showCreateModal = true;
  }

  public closeCreateModal(): void {
    this.showCreateModal = false;
  }

  public submitCreateTicket(): void {
    if (!this.createSubject.trim() || !this.createCustomerId || !this.createDescription.trim()) return;

    this.apiService.createTicket({
      subject: this.createSubject.trim(),
      description: this.createDescription.trim(),
      customerId: this.createCustomerId,
      assignedEmployeeId: this.createAssignedEmployeeId || undefined,
      category: this.createCategory,
      priority: this.createPriority
    }).subscribe(() => {
      this.closeCreateModal();
      this.loadTickets();
      this.loadMetrics();
    });
  }

  public quickChangeStatus(status: TicketStatus, summary?: string): void {
    if (!this.selectedTicket) return;
    this.apiService.updateTicketStatus(this.selectedTicket.id, {
      status,
      resolutionSummary: summary
    }).subscribe(res => {
      if (res.data) {
        this.selectedTicket = res.data;
      }
      this.loadTickets();
      this.loadMetrics();
    });
  }

  public openResolvePrompt(): void {
    this.resolveSummaryInput = '';
    this.showResolvePrompt = true;
  }

  public submitResolve(): void {
    if (!this.selectedTicket) return;
    this.quickChangeStatus('Resolved', this.resolveSummaryInput.trim() || 'Issue resolved by support representative.');
    this.showResolvePrompt = false;
  }

  public submitComment(): void {
    if (!this.selectedTicket || !this.newCommentText.trim()) return;

    this.apiService.addTicketComment(this.selectedTicket.id, {
      commentText: this.newCommentText.trim(),
      isInternal: this.newCommentIsInternal
    }).subscribe(res => {
      if (res.data && this.selectedTicket) {
        this.selectedTicket.comments.push(res.data);
        this.selectedTicket.commentsCount = this.selectedTicket.comments.length;
      }
      this.newCommentText = '';
      this.newCommentIsInternal = false;
      this.loadTickets();
    });
  }

  public deleteTicket(id: string): void {
    if (!confirm('Are you sure you want to delete this support ticket?')) return;
    this.apiService.deleteTicket(id).subscribe(() => {
      if (this.selectedTicket?.id === id) {
        this.closeDetailModal();
      }
      this.loadTickets();
      this.loadMetrics();
    });
  }

  public canDelete(): boolean {
    return this.currentRole === 'Owner' || this.currentRole === 'Admin' || this.currentRole === 'Manager';
  }

  public getInitials(name: string): string {
    if (!name) return 'U';
    const words = name.trim().split(' ');
    if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

  public getPriorityBadge(priority: TicketPriority): string {
    switch (priority) {
      case 'Urgent': return 'badge-rose';
      case 'High': return 'badge-amber';
      case 'Medium': return 'badge-indigo';
      case 'Low': return 'badge-emerald';
      default: return 'badge-indigo';
    }
  }

  public getStatusBadge(status: TicketStatus): string {
    switch (status) {
      case 'Open': return 'badge-amber';
      case 'Pending': return 'badge-cyan';
      case 'Resolved': return 'badge-emerald';
      case 'Closed': return 'badge-violet';
      default: return 'badge-indigo';
    }
  }

  public getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'Owner': return 'badge-violet';
      case 'Admin': return 'badge-indigo';
      case 'Manager': return 'badge-cyan';
      case 'Employee': return 'badge-emerald';
      default: return 'badge-indigo';
    }
  }
}
