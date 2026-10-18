import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Customer, CustomerStatus, Employee, Deal, DealStage, DealMetrics } from '../../core/models/models';

@Component({
  selector: 'app-crm',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="crm-page">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <div class="badge badge-indigo" style="margin-bottom: 0.5rem;">CRM & Revenue Governance</div>
          <h1 class="font-heading-2">Customer & Opportunity Pipeline</h1>
          <p class="font-caption">Unified customer relationship intelligence, active pipeline tracking, and revenue forecasting</p>
        </div>

        <div class="header-actions">
          <!-- View Mode Switcher -->
          <div class="view-switcher glass-panel">
            <button
              (click)="activeView = 'PIPELINE'"
              class="switch-btn"
              [class.active]="activeView === 'PIPELINE'"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              <span>Deal Pipeline</span>
            </button>
            <button
              (click)="activeView = 'ACCOUNTS'"
              class="switch-btn"
              [class.active]="activeView === 'ACCOUNTS'"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>Accounts & Contacts</span>
            </button>
          </div>

          <button *ngIf="activeView === 'ACCOUNTS'" (click)="openCreateCustomerModal()" class="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>Add Customer</span>
          </button>

          <button *ngIf="activeView === 'PIPELINE'" (click)="openCreateDealModal()" class="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>Add Opportunity</span>
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
              <strong>Full Tenant Oversight:</strong> As Company Owner, you have complete cross-company visibility over all customer accounts, sales opportunities, and deal pipelines within {{ (activeTenant$ | async)?.name }}.
            </span>
            <span *ngSwitchCase="'Admin'">
              <strong>Administrative Oversight:</strong> As Administrator, you can view, create, reassign, and manage client accounts and deal pipelines across all sales territories.
            </span>
            <span *ngSwitchCase="'Manager'">
              <strong>Team Oversight:</strong> In accordance with confirmed specifications, you supervise accounts and deals belonging to yourself and your direct reports (e.g. David Lee).
            </span>
            <span *ngSwitchCase="'Employee'">
              <strong>Personal Scope (Zero Leakage):</strong> Enforcing confirmed sales privacy rules, you solely view customer accounts and opportunities assigned to you. Peer records are strictly isolated.
            </span>
            <span *ngSwitchDefault>
              Role-scoped client account access active.
            </span>
          </p>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- VIEW 1: DEAL PIPELINE (KANBAN & METRICS)       -->
      <!-- ============================================== -->
      <div *ngIf="activeView === 'PIPELINE'" class="pipeline-section">
        <!-- Pipeline Metrics Summary -->
        <div class="metrics-row">
          <div class="metric-card glass-panel">
            <div class="metric-header">
              <span class="metric-label">OPEN PIPELINE VALUE</span>
              <span class="metric-icon">💰</span>
            </div>
            <div class="metric-value font-heading-2 text-indigo">
              {{ formatCurrency(dealMetrics?.totalPipelineValue || 0) }}
            </div>
            <span class="metric-sub text-muted">{{ dealMetrics?.openDealsCount || 0 }} active opportunities</span>
          </div>

          <div class="metric-card glass-panel">
            <div class="metric-header">
              <span class="metric-label">WEIGHTED FORECAST</span>
              <span class="metric-icon">📊</span>
            </div>
            <div class="metric-value font-heading-2 text-cyan">
              {{ formatCurrency(dealMetrics?.weightedPipelineValue || 0) }}
            </div>
            <span class="metric-sub text-muted">Probability-adjusted revenue</span>
          </div>

          <div class="metric-card glass-panel">
            <div class="metric-header">
              <span class="metric-label">CLOSED WON REVENUE</span>
              <span class="metric-icon">🏆</span>
            </div>
            <div class="metric-value font-heading-2 text-emerald">
              {{ formatCurrency(dealMetrics?.wonValue || 0) }}
            </div>
            <span class="metric-sub text-muted">{{ dealMetrics?.wonDealsCount || 0 }} converted contracts</span>
          </div>

          <div class="metric-card glass-panel">
            <div class="metric-header">
              <span class="metric-label">WIN CONVERSION RATE</span>
              <span class="metric-icon">🎯</span>
            </div>
            <div class="metric-value font-heading-2 text-amber">
              {{ dealMetrics?.winRatePercentage || 0 }}%
            </div>
            <span class="metric-sub text-muted">{{ dealMetrics?.lostDealsCount || 0 }} closed lost deals</span>
          </div>
        </div>

        <!-- Pipeline Filter Bar -->
        <div class="controls-bar glass-panel">
          <div class="search-box">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              [(ngModel)]="dealSearchQuery"
              (input)="applyDealFilters()"
              placeholder="Search opportunity title, client name..."
            />
          </div>

          <div class="filter-controls">
            <select [(ngModel)]="dealSelectedEmployeeId" (change)="applyDealFilters()" class="filter-select">
              <option value="">All Sales Reps</option>
              <option *ngFor="let emp of employees" [value]="emp.id">{{ emp.fullName }}</option>
            </select>
          </div>
        </div>

        <!-- 6-Stage Kanban Board -->
        <div class="kanban-board">
          <div *ngFor="let stage of pipelineStages" class="kanban-lane glass-panel">
            <div class="lane-header" [ngClass]="getStageHeaderClass(stage.key)">
              <div class="lane-title-group">
                <span class="lane-name font-heading-3">{{ stage.label }}</span>
                <span class="lane-probability-badge">{{ stage.probability }}%</span>
              </div>
              <div class="lane-meta font-caption">
                <span class="lane-count badge">{{ getDealsInStage(stage.key).length }}</span>
                <span class="lane-sum font-caption">{{ formatCurrency(getStageTotalSum(stage.key)) }}</span>
              </div>
            </div>

            <div class="lane-cards">
              <div
                *ngFor="let deal of getDealsInStage(stage.key)"
                class="deal-card glass-panel-elevated"
              >
                <div class="deal-card-header">
                  <div class="deal-customer font-caption text-muted">
                    🏢 {{ deal.customerName }}
                  </div>
                  <div class="deal-actions">
                    <button (click)="openEditDealModal(deal)" title="Edit Deal" class="icon-btn">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                    </button>
                    <button *ngIf="canDelete()" (click)="deleteDeal(deal.id)" title="Delete Deal" class="icon-btn text-rose">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>

                <h3 class="deal-title font-body font-bold">{{ deal.title }}</h3>

                <div class="deal-amount font-heading-3 text-indigo">
                  {{ formatCurrency(deal.amount, deal.currency) }}
                </div>

                <!-- Probability Bar -->
                <div class="prob-container">
                  <div class="prob-labels font-caption">
                    <span>Confidence</span>
                    <span>{{ deal.probability }}%</span>
                  </div>
                  <div class="prob-bar-bg">
                    <div
                      class="prob-bar-fill"
                      [style.width.%]="deal.probability"
                      [ngClass]="getProbColorClass(deal.probability)"
                    ></div>
                  </div>
                </div>

                <div class="deal-meta-footer font-caption">
                  <div class="rep-info">
                    <span class="rep-avatar">{{ getInitials(deal.assignedEmployeeName || 'Rep') }}</span>
                    <span class="rep-name text-muted">{{ deal.assignedEmployeeName || 'Unassigned' }}</span>
                  </div>
                  <div *ngIf="deal.expectedCloseDateUtc" class="close-date text-muted">
                    📅 {{ deal.expectedCloseDateUtc | date:'shortDate' }}
                  </div>
                </div>

                <!-- Lost Reason Badge if applicable -->
                <div *ngIf="deal.stage === 'ClosedLost' && deal.lostReason" class="lost-reason-badge font-caption text-rose">
                  ⚠️ {{ deal.lostReason }}
                </div>

                <!-- Quick Stage Transition Buttons -->
                <div class="quick-transitions">
                  <button
                    *ngIf="getNextStage(deal.stage)"
                    (click)="advanceDealStage(deal)"
                    class="quick-btn advance-btn"
                    title="Advance to next pipeline stage"
                  >
                    <span>Advance</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </button>

                  <button
                    *ngIf="deal.stage !== 'ClosedWon' && deal.stage !== 'ClosedLost'"
                    (click)="quickMarkWon(deal)"
                    class="quick-btn won-btn"
                    title="Mark Won"
                  >
                    ✓ Won
                  </button>

                  <button
                    *ngIf="deal.stage !== 'ClosedLost'"
                    (click)="openMarkLostModal(deal)"
                    class="quick-btn lost-btn"
                    title="Mark Lost"
                  >
                    ✗ Lost
                  </button>
                </div>
              </div>

              <!-- Empty Stage Lane -->
              <div *ngIf="getDealsInStage(stage.key).length === 0" class="lane-empty font-caption text-muted">
                No active opportunities
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- VIEW 2: ACCOUNTS & CONTACTS DIRECTORY          -->
      <!-- ============================================== -->
      <div *ngIf="activeView === 'ACCOUNTS'" class="accounts-section">
        <!-- Metrics Row -->
        <div class="metrics-row">
          <div class="metric-card glass-panel">
            <div class="metric-header">
              <span class="metric-label">TOTAL ACCOUNTS</span>
              <span class="metric-icon">🏢</span>
            </div>
            <div class="metric-value font-heading-2">{{ customers.length }}</div>
            <span class="metric-sub text-muted">Visible in current scope</span>
          </div>

          <div class="metric-card glass-panel">
            <div class="metric-header">
              <span class="metric-label">ACTIVE CLIENTS</span>
              <span class="metric-icon">💎</span>
            </div>
            <div class="metric-value font-heading-2 text-emerald">
              {{ getCountByStatus('ActiveCustomer') }}
            </div>
            <span class="metric-sub text-muted">Active enterprise contracts</span>
          </div>

          <div class="metric-card glass-panel">
            <div class="metric-header">
              <span class="metric-label">QUALIFIED PROSPECTS</span>
              <span class="metric-icon">📈</span>
            </div>
            <div class="metric-value font-heading-2 text-indigo">
              {{ getCountByStatus('Prospect') }}
            </div>
            <span class="metric-sub text-muted">In active negotiation</span>
          </div>

          <div class="metric-card glass-panel">
            <div class="metric-header">
              <span class="metric-label">NEW LEADS</span>
              <span class="metric-icon">⚡</span>
            </div>
            <div class="metric-value font-heading-2 text-amber">
              {{ getCountByStatus('Lead') }}
            </div>
            <span class="metric-sub text-muted">Pending qualification</span>
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
              placeholder="Search by company name, contact person, or industry..."
            />
          </div>

          <div class="status-tabs">
            <button
              (click)="selectStatusTab('ALL')"
              class="tab-btn"
              [class.active]="selectedTab === 'ALL'"
            >
              All ({{ customers.length }})
            </button>
            <button
              (click)="selectStatusTab('ActiveCustomer')"
              class="tab-btn"
              [class.active]="selectedTab === 'ActiveCustomer'"
            >
              Active ({{ getCountByStatus('ActiveCustomer') }})
            </button>
            <button
              (click)="selectStatusTab('Prospect')"
              class="tab-btn"
              [class.active]="selectedTab === 'Prospect'"
            >
              Prospects ({{ getCountByStatus('Prospect') }})
            </button>
            <button
              (click)="selectStatusTab('Lead')"
              class="tab-btn"
              [class.active]="selectedTab === 'Lead'"
            >
              Leads ({{ getCountByStatus('Lead') }})
            </button>
            <button
              (click)="selectStatusTab('Inactive')"
              class="tab-btn"
              [class.active]="selectedTab === 'Inactive'"
            >
              Inactive ({{ getCountByStatus('Inactive') }})
            </button>
          </div>
        </div>

        <!-- Customer Directory Table -->
        <div class="table-container glass-panel">
          <div class="table-header-bar">
            <h2 class="font-heading-3">Customer Directory</h2>
            <span class="record-count font-caption text-muted">
              Showing {{ filteredCustomers.length }} record{{ filteredCustomers.length === 1 ? '' : 's' }}
            </span>
          </div>

          <div *ngIf="filteredCustomers.length === 0" class="empty-state">
            <div class="empty-icon">📂</div>
            <div class="empty-title">No customer records found</div>
            <p class="empty-desc">
              No accounts match the active filter criteria or your current role permission scope.
            </p>
            <button (click)="openCreateCustomerModal()" class="btn-primary" style="margin-top: 1rem;">
              Create First Account
            </button>
          </div>

          <table *ngIf="filteredCustomers.length > 0" class="data-table">
            <thead>
              <tr>
                <th>Company & Account</th>
                <th>Primary Contact</th>
                <th>Industry & Web</th>
                <th>Status</th>
                <th>Assigned Sales Rep</th>
                <th>Created</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let c of filteredCustomers">
                <td>
                  <div class="company-cell">
                    <div class="company-avatar">
                      {{ getInitials(c.companyName) }}
                    </div>
                    <div>
                      <div class="company-name font-bold">{{ c.companyName }}</div>
                      <div class="company-notes font-caption text-muted" *ngIf="c.notes">
                        {{ c.notes }}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="contact-cell">
                    <div class="contact-name">{{ c.contactPerson || '—' }}</div>
                    <div class="contact-email font-caption text-muted" *ngIf="c.email">{{ c.email }}</div>
                    <div class="contact-phone font-caption text-muted" *ngIf="c.phone">{{ c.phone }}</div>
                  </div>
                </td>
                <td>
                  <div>
                    <span class="industry-tag" *ngIf="c.industry">{{ c.industry }}</span>
                    <div *ngIf="c.website" class="font-caption text-muted">
                      <a [href]="c.website" target="_blank" rel="noopener" class="link-cyan">Visit Website ↗</a>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="badge" [ngClass]="getStatusBadge(c.status)">
                    {{ formatStatus(c.status) }}
                  </span>
                </td>
                <td>
                  <div class="rep-cell font-caption">
                    <span *ngIf="c.assignedEmployeeName" class="rep-badge">
                      👤 {{ c.assignedEmployeeName }}
                    </span>
                    <span *ngIf="!c.assignedEmployeeName" class="text-muted">
                      Unassigned
                    </span>
                  </div>
                </td>
                <td class="font-caption text-muted">
                  {{ c.createdAtUtc | date:'mediumDate' }}
                </td>
                <td style="text-align: right;">
                  <div class="action-buttons">
                    <button (click)="openEditCustomerModal(c)" class="btn-sm btn-secondary">Edit</button>
                    <button
                      *ngIf="canDelete()"
                      (click)="deleteCustomer(c.id)"
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
      </div>

      <!-- ============================================== -->
      <!-- MODAL: ADD / EDIT CUSTOMER                     -->
      <!-- ============================================== -->
      <div *ngIf="showCustomerModal" class="modal-overlay">
        <div class="modal-dialog glass-panel-elevated">
          <div class="modal-header">
            <h2 class="font-heading-3">{{ isEditingCustomer ? 'Edit Customer Account' : 'Register New Customer Account' }}</h2>
            <button (click)="closeCustomerModal()" class="modal-close-btn">&times;</button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label>Company Legal / Trade Name *</label>
              <input type="text" [(ngModel)]="formCompanyName" placeholder="e.g. Apex Dynamics Ltd" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Primary Contact Person</label>
                <input type="text" [(ngModel)]="formContactPerson" placeholder="Full name" />
              </div>
              <div class="form-group">
                <label>Contact Email</label>
                <input type="email" [(ngModel)]="formEmail" placeholder="contact@company.com" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Phone Number</label>
                <input type="text" [(ngModel)]="formPhone" placeholder="+1 (555) 000-0000" />
              </div>
              <div class="form-group">
                <label>Website URL</label>
                <input type="text" [(ngModel)]="formWebsite" placeholder="https://company.com" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Industry Vertical</label>
                <input type="text" [(ngModel)]="formIndustry" placeholder="e.g. Logistics, Aerospace" />
              </div>
              <div class="form-group">
                <label>Lifecycle Status</label>
                <select [(ngModel)]="formStatus">
                  <option value="Lead">Lead</option>
                  <option value="Prospect">Prospect</option>
                  <option value="ActiveCustomer">Active Customer</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label>Assigned Sales Representative</label>
              <select [(ngModel)]="formAssignedEmployeeId">
                <option value="">-- Unassigned --</option>
                <option *ngFor="let emp of employees" [value]="emp.id">
                  {{ emp.fullName }} ({{ emp.jobTitle }})
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>Account Notes / Relationship Summary</label>
              <textarea [(ngModel)]="formNotes" rows="3" placeholder="Contract terms, key interests, strategic context..."></textarea>
            </div>
          </div>

          <div class="modal-footer">
            <button (click)="closeCustomerModal()" class="btn-secondary">Cancel</button>
            <button (click)="submitCustomerForm()" class="btn-primary" [disabled]="!formCompanyName.trim()">
              {{ isEditingCustomer ? 'Save Changes' : 'Create Account' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- MODAL: ADD / EDIT OPPORTUNITY / DEAL           -->
      <!-- ============================================== -->
      <div *ngIf="showDealModal" class="modal-overlay">
        <div class="modal-dialog glass-panel-elevated">
          <div class="modal-header">
            <h2 class="font-heading-3">{{ isEditingDeal ? 'Edit Deal Opportunity' : 'Create New Deal Opportunity' }}</h2>
            <button (click)="closeDealModal()" class="modal-close-btn">&times;</button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label>Opportunity Title *</label>
              <input type="text" [(ngModel)]="dealFormTitle" placeholder="e.g. Autonomous Fleet Expansion Phase 2" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Associated Client Account *</label>
                <select [(ngModel)]="dealFormCustomerId">
                  <option value="">-- Select Customer Account --</option>
                  <option *ngFor="let c of customers" [value]="c.id">
                    {{ c.companyName }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>Assigned Sales Representative</label>
                <select [(ngModel)]="dealFormAssignedEmployeeId">
                  <option value="">-- Unassigned --</option>
                  <option *ngFor="let emp of employees" [value]="emp.id">
                    {{ emp.fullName }} ({{ emp.jobTitle }})
                  </option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Deal Value (Amount) *</label>
                <input type="number" [(ngModel)]="dealFormAmount" placeholder="50000" min="0" />
              </div>
              <div class="form-group">
                <label>Currency Code</label>
                <input type="text" [(ngModel)]="dealFormCurrency" placeholder="USD" maxlength="5" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Pipeline Stage</label>
                <select [(ngModel)]="dealFormStage" (change)="onDealStageChange()">
                  <option *ngFor="let stage of pipelineStages" [value]="stage.key">
                    {{ stage.label }} ({{ stage.probability }}%)
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>Confidence Probability (%)</label>
                <input type="number" [(ngModel)]="dealFormProbability" min="0" max="100" />
              </div>
            </div>

            <div class="form-group">
              <label>Target Estimated Close Date</label>
              <input type="date" [(ngModel)]="dealFormExpectedCloseDate" />
            </div>

            <div *ngIf="dealFormStage === 'ClosedLost'" class="form-group">
              <label class="text-rose font-bold">Lost Reason Explanation</label>
              <input type="text" [(ngModel)]="dealFormLostReason" placeholder="Competitor pricing, timing, lack of budget..." />
            </div>

            <div class="form-group">
              <label>Opportunity Notes / Deal Strategy</label>
              <textarea [(ngModel)]="dealFormNotes" rows="3" placeholder="Key decision makers, requirements, timeline..."></textarea>
            </div>
          </div>

          <div class="modal-footer">
            <button (click)="closeDealModal()" class="btn-secondary">Cancel</button>
            <button (click)="submitDealForm()" class="btn-primary" [disabled]="!dealFormTitle.trim() || !dealFormCustomerId">
              {{ isEditingDeal ? 'Save Deal Changes' : 'Create Opportunity' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- MODAL: QUICK MARK LOST                         -->
      <!-- ============================================== -->
      <div *ngIf="showLostModal" class="modal-overlay">
        <div class="modal-dialog glass-panel-elevated" style="max-width: 440px;">
          <div class="modal-header">
            <h2 class="font-heading-3 text-rose">Mark Deal as Closed Lost</h2>
            <button (click)="closeLostModal()" class="modal-close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <p class="font-body" style="margin-bottom: 1rem;">
              Provide a brief reason why <strong>{{ lostModalDeal?.title }}</strong> was lost to keep pipeline analytics accurate:
            </p>
            <div class="form-group">
              <label>Reason for Loss *</label>
              <input type="text" [(ngModel)]="lostReasonInput" placeholder="e.g. Budget reallocated to internal initiative" />
            </div>
          </div>
          <div class="modal-footer">
            <button (click)="closeLostModal()" class="btn-secondary">Cancel</button>
            <button (click)="confirmMarkLost()" class="btn-sm btn-danger">Confirm Lost</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @use 'styles/variables' as *;
    @use 'styles/mixins' as *;

    .crm-page {
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

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .view-switcher {
      display: flex;
      padding: 0.25rem;
      border-radius: $radius-lg;
      gap: 0.25rem;

      .switch-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.875rem;
        border-radius: $radius-md;
        font-size: 0.8125rem;
        font-weight: 600;
        background: transparent;
        border: none;
        color: $text-secondary;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          color: #ffffff;
        }

        &.active {
          background: rgba(99, 102, 241, 0.25);
          color: #ffffff;
          border: 1px solid rgba(99, 102, 241, 0.4);
          box-shadow: 0 0 12px rgba(99, 102, 241, 0.2);
        }
      }
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
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
        min-width: 250px;
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

      .filter-select {
        background: rgba(11, 15, 25, 0.7);
        border: 1px solid $border-glass;
        border-radius: $radius-md;
        color: $text-primary;
        padding: 0.5rem 0.875rem;
        font-size: 0.875rem;
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

    /* KANBAN BOARD STYLES */
    .kanban-board {
      display: grid;
      grid-template-columns: repeat(6, minmax(260px, 1fr));
      gap: 1rem;
      overflow-x: auto;
      padding-bottom: 1.5rem;

      @media (max-width: 1400px) {
        grid-template-columns: repeat(3, minmax(280px, 1fr));
      }

      @media (max-width: 900px) {
        grid-template-columns: 1fr;
      }
    }

    .kanban-lane {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
      padding: 1rem;
      border-radius: $radius-lg;
      min-height: 520px;
      background: rgba(15, 23, 42, 0.45);

      .lane-header {
        padding: 0.75rem 0.875rem;
        border-radius: $radius-md;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid $border-glass;

        .lane-title-group {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.375rem;

          .lane-name {
            font-size: 0.875rem;
            font-weight: 700;
            letter-spacing: 0.02em;
          }

          .lane-probability-badge {
            font-size: 0.75rem;
            color: $text-muted;
            background: rgba(255, 255, 255, 0.06);
            padding: 0.125rem 0.375rem;
            border-radius: $radius-sm;
          }
        }

        .lane-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: $text-secondary;

          .lane-count {
            background: rgba(255, 255, 255, 0.08);
            font-weight: 600;
          }

          .lane-sum {
            font-weight: 700;
            color: #ffffff;
          }
        }

        &.header-lead { border-left: 3px solid $aurora-amber; }
        &.header-qualified { border-left: 3px solid $aurora-cyan; }
        &.header-proposal { border-left: 3px solid $aurora-indigo; }
        &.header-negotiation { border-left: 3px solid $aurora-violet; }
        &.header-won { border-left: 3px solid $aurora-emerald; }
        &.header-lost { border-left: 3px solid $aurora-rose; }
      }

      .lane-cards {
        display: flex;
        flex-direction: column;
        gap: 0.875rem;
        flex: 1;
      }

      .lane-empty {
        padding: 2.5rem 1rem;
        text-align: center;
        border: 1px dashed rgba(255, 255, 255, 0.08);
        border-radius: $radius-md;
      }
    }

    .deal-card {
      padding: 1rem;
      border-radius: $radius-md;
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
      border: 1px solid rgba(255, 255, 255, 0.06);
      transition: all 0.2s ease;

      &:hover {
        border-color: rgba(99, 102, 241, 0.4);
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      }

      .deal-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .deal-actions {
        display: flex;
        gap: 0.25rem;

        .icon-btn {
          background: transparent;
          border: none;
          color: $text-muted;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: $radius-sm;

          &:hover {
            color: #ffffff;
            background: rgba(255, 255, 255, 0.08);
          }
        }
      }

      .deal-title {
        font-size: 0.9375rem;
        line-height: 1.3;
        margin: 0;
      }

      .deal-amount {
        font-size: 1.125rem;
        font-weight: 800;
        letter-spacing: -0.02em;
      }

      .prob-container {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;

        .prob-labels {
          display: flex;
          justify-content: space-between;
          color: $text-muted;
          font-size: 0.6875rem;
        }

        .prob-bar-bg {
          height: 4px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 2px;
          overflow: hidden;

          .prob-bar-fill {
            height: 100%;
            border-radius: 2px;
            transition: width 0.3s ease;

            &.prob-low { background: $aurora-amber; }
            &.prob-med { background: $aurora-cyan; }
            &.prob-high { background: $aurora-indigo; }
            &.prob-won { background: $aurora-emerald; }
            &.prob-lost { background: $aurora-rose; }
          }
        }
      }

      .deal-meta-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 0.25rem;

        .rep-info {
          display: flex;
          align-items: center;
          gap: 0.375rem;

          .rep-avatar {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: rgba(99, 102, 241, 0.2);
            color: $aurora-indigo;
            font-size: 0.625rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }
      }

      .lost-reason-badge {
        padding: 0.375rem 0.5rem;
        border-radius: $radius-sm;
        background: rgba(244, 63, 94, 0.1);
        border: 1px solid rgba(244, 63, 94, 0.25);
      }

      .quick-transitions {
        display: flex;
        gap: 0.375rem;
        margin-top: 0.375rem;
        padding-top: 0.5rem;
        border-top: 1px solid rgba(255, 255, 255, 0.05);

        .quick-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
          padding: 0.3125rem 0.5rem;
          border-radius: $radius-sm;
          font-size: 0.6875rem;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.15s ease;

          &.advance-btn {
            background: rgba(99, 102, 241, 0.15);
            color: #c7d2fe;
            border-color: rgba(99, 102, 241, 0.3);

            &:hover {
              background: rgba(99, 102, 241, 0.3);
              color: #ffffff;
            }
          }

          &.won-btn {
            background: rgba(16, 185, 129, 0.15);
            color: #a7f3d0;
            border-color: rgba(16, 185, 129, 0.3);

            &:hover {
              background: rgba(16, 185, 129, 0.3);
              color: #ffffff;
            }
          }

          &.lost-btn {
            background: rgba(244, 63, 94, 0.15);
            color: #fecdd3;
            border-color: rgba(244, 63, 94, 0.3);

            &:hover {
              background: rgba(244, 63, 94, 0.3);
              color: #ffffff;
            }
          }
        }
      }
    }

    /* DIRECTORY TABLE STYLES */
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

      tbody tr {
        transition: background-color 0.15s ease;

        &:hover {
          background-color: rgba(255, 255, 255, 0.02);
        }
      }
    }

    .company-cell {
      display: flex;
      align-items: center;
      gap: 0.875rem;

      .company-avatar {
        width: 38px;
        height: 38px;
        border-radius: $radius-md;
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2));
        border: 1px solid rgba(99, 102, 241, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 0.875rem;
        color: #c7d2fe;
      }

      .company-name {
        font-size: 0.9375rem;
      }
    }

    .contact-cell {
      .contact-name {
        font-weight: 600;
        font-size: 0.875rem;
      }
    }

    .industry-tag {
      display: inline-block;
      font-size: 0.75rem;
      color: $text-secondary;
      background: rgba(255, 255, 255, 0.04);
      padding: 0.2rem 0.5rem;
      border-radius: $radius-sm;
      margin-bottom: 0.25rem;
    }

    .link-cyan {
      color: $aurora-cyan;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }

    .rep-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      background: rgba(255, 255, 255, 0.04);
      padding: 0.25rem 0.5rem;
      border-radius: $radius-sm;
      border: 1px solid $border-glass;
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

      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.5rem;
      }

      .modal-close-btn {
        background: none;
        border: none;
        color: $text-muted;
        font-size: 1.125rem;
        cursor: pointer;

        &:hover {
          color: #ffffff;
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
export class CrmComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);

  public activeTenant$ = this.authService.activeTenant$;
  public activeView: 'PIPELINE' | 'ACCOUNTS' = 'PIPELINE';

  // Accounts State
  public customers: Customer[] = [];
  public filteredCustomers: Customer[] = [];
  public employees: Employee[] = [];

  public searchQuery = '';
  public selectedTab = 'ALL';

  public showCustomerModal = false;
  public isEditingCustomer = false;
  public editingCustomerId: string | null = null;

  public formCompanyName = '';
  public formContactPerson = '';
  public formEmail = '';
  public formPhone = '';
  public formWebsite = '';
  public formIndustry = '';
  public formStatus: CustomerStatus = 'Lead';
  public formAssignedEmployeeId = '';
  public formNotes = '';

  // Deals / Pipeline State
  public deals: Deal[] = [];
  public filteredDeals: Deal[] = [];
  public dealMetrics: DealMetrics | null = null;

  public dealSearchQuery = '';
  public dealSelectedEmployeeId = '';

  public showDealModal = false;
  public isEditingDeal = false;
  public editingDealId: string | null = null;

  public dealFormTitle = '';
  public dealFormCustomerId = '';
  public dealFormAssignedEmployeeId = '';
  public dealFormAmount = 25000;
  public dealFormCurrency = 'USD';
  public dealFormStage: DealStage = 'Lead';
  public dealFormProbability = 20;
  public dealFormExpectedCloseDate = '';
  public dealFormLostReason = '';
  public dealFormNotes = '';

  // Quick Lost Modal State
  public showLostModal = false;
  public lostModalDeal: Deal | null = null;
  public lostReasonInput = '';

  public readonly pipelineStages: { key: DealStage; label: string; probability: number }[] = [
    { key: 'Lead', label: '1. Lead', probability: 20 },
    { key: 'Qualified', label: '2. Qualified', probability: 40 },
    { key: 'Proposal', label: '3. Proposal', probability: 60 },
    { key: 'Negotiation', label: '4. Negotiation', probability: 80 },
    { key: 'ClosedWon', label: '5. Closed Won', probability: 100 },
    { key: 'ClosedLost', label: '6. Closed Lost', probability: 0 }
  ];

  public get currentRole(): string {
    return this.authService.currentRole || 'Employee';
  }

  public ngOnInit(): void {
    this.loadCustomers();
    this.loadDeals();
    this.loadDealMetrics();
    this.apiService.getEmployees().subscribe(res => {
      if (res.data) this.employees = res.data.data;
    });
  }

  // --- ACCOUNTS / CUSTOMERS ---
  public loadCustomers(): void {
    this.apiService.getCustomers().subscribe(res => {
      if (res.data) {
        this.customers = res.data.data;
        this.applyFilters();
      }
    });
  }

  public applyFilters(): void {
    let result = [...this.customers];

    if (this.selectedTab !== 'ALL') {
      result = result.filter(c => c.status === this.selectedTab);
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      result = result.filter(c =>
        c.companyName.toLowerCase().includes(q) ||
        (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
        (c.industry && c.industry.toLowerCase().includes(q))
      );
    }

    this.filteredCustomers = result;
  }

  public selectStatusTab(tab: string): void {
    this.selectedTab = tab;
    this.applyFilters();
  }

  public getCountByStatus(status: CustomerStatus): number {
    return this.customers.filter(c => c.status === status).length;
  }

  public openCreateCustomerModal(): void {
    this.isEditingCustomer = false;
    this.editingCustomerId = null;
    this.formCompanyName = '';
    this.formContactPerson = '';
    this.formEmail = '';
    this.formPhone = '';
    this.formWebsite = '';
    this.formIndustry = '';
    this.formStatus = 'Lead';
    this.formAssignedEmployeeId = '';
    this.formNotes = '';
    this.showCustomerModal = true;
  }

  public openEditCustomerModal(customer: Customer): void {
    this.isEditingCustomer = true;
    this.editingCustomerId = customer.id;
    this.formCompanyName = customer.companyName;
    this.formContactPerson = customer.contactPerson || '';
    this.formEmail = customer.email || '';
    this.formPhone = customer.phone || '';
    this.formWebsite = customer.website || '';
    this.formIndustry = customer.industry || '';
    this.formStatus = customer.status;
    this.formAssignedEmployeeId = customer.assignedEmployeeId || '';
    this.formNotes = customer.notes || '';
    this.showCustomerModal = true;
  }

  public closeCustomerModal(): void {
    this.showCustomerModal = false;
  }

  public submitCustomerForm(): void {
    if (!this.formCompanyName.trim()) return;

    if (this.isEditingCustomer && this.editingCustomerId) {
      this.apiService.updateCustomer(this.editingCustomerId, {
        companyName: this.formCompanyName,
        contactPerson: this.formContactPerson,
        email: this.formEmail,
        phone: this.formPhone,
        website: this.formWebsite,
        industry: this.formIndustry,
        status: this.formStatus,
        assignedEmployeeId: this.formAssignedEmployeeId || undefined,
        notes: this.formNotes
      }).subscribe(() => {
        this.closeCustomerModal();
        this.loadCustomers();
      });
    } else {
      this.apiService.createCustomer({
        companyName: this.formCompanyName,
        contactPerson: this.formContactPerson,
        email: this.formEmail,
        phone: this.formPhone,
        website: this.formWebsite,
        industry: this.formIndustry,
        status: this.formStatus,
        assignedEmployeeId: this.formAssignedEmployeeId || undefined,
        notes: this.formNotes
      }).subscribe(() => {
        this.closeCustomerModal();
        this.loadCustomers();
      });
    }
  }

  public deleteCustomer(id: string): void {
    if (!confirm('Are you sure you want to delete this customer account?')) return;
    this.apiService.deleteCustomer(id).subscribe(() => {
      this.loadCustomers();
    });
  }

  // --- DEALS / PIPELINE ---
  public loadDeals(): void {
    this.apiService.getDeals().subscribe(res => {
      if (res.data) {
        this.deals = res.data.data;
        this.applyDealFilters();
      }
    });
  }

  public loadDealMetrics(): void {
    this.apiService.getDealMetrics().subscribe(res => {
      if (res.data) {
        this.dealMetrics = res.data;
      }
    });
  }

  public applyDealFilters(): void {
    let result = [...this.deals];

    if (this.dealSelectedEmployeeId) {
      result = result.filter(d => d.assignedEmployeeId === this.dealSelectedEmployeeId);
    }

    if (this.dealSearchQuery.trim()) {
      const q = this.dealSearchQuery.trim().toLowerCase();
      result = result.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.customerName.toLowerCase().includes(q)
      );
    }

    this.filteredDeals = result;
  }

  public getDealsInStage(stage: DealStage): Deal[] {
    return this.filteredDeals.filter(d => d.stage === stage);
  }

  public getStageTotalSum(stage: DealStage): number {
    return this.getDealsInStage(stage).reduce((sum, d) => sum + (d.amount || 0), 0);
  }

  public openCreateDealModal(): void {
    this.isEditingDeal = false;
    this.editingDealId = null;
    this.dealFormTitle = '';
    this.dealFormCustomerId = this.customers.length > 0 ? this.customers[0].id : '';
    this.dealFormAssignedEmployeeId = '';
    this.dealFormAmount = 35000;
    this.dealFormCurrency = 'USD';
    this.dealFormStage = 'Lead';
    this.dealFormProbability = 20;
    this.dealFormExpectedCloseDate = '';
    this.dealFormLostReason = '';
    this.dealFormNotes = '';
    this.showDealModal = true;
  }

  public openEditDealModal(deal: Deal): void {
    this.isEditingDeal = true;
    this.editingDealId = deal.id;
    this.dealFormTitle = deal.title;
    this.dealFormCustomerId = deal.customerId;
    this.dealFormAssignedEmployeeId = deal.assignedEmployeeId || '';
    this.dealFormAmount = deal.amount;
    this.dealFormCurrency = deal.currency || 'USD';
    this.dealFormStage = deal.stage;
    this.dealFormProbability = deal.probability;
    this.dealFormExpectedCloseDate = deal.expectedCloseDateUtc ? deal.expectedCloseDateUtc.substring(0, 10) : '';
    this.dealFormLostReason = deal.lostReason || '';
    this.dealFormNotes = deal.notes || '';
    this.showDealModal = true;
  }

  public closeDealModal(): void {
    this.showDealModal = false;
  }

  public onDealStageChange(): void {
    switch (this.dealFormStage) {
      case 'Lead': this.dealFormProbability = 20; break;
      case 'Qualified': this.dealFormProbability = 40; break;
      case 'Proposal': this.dealFormProbability = 60; break;
      case 'Negotiation': this.dealFormProbability = 80; break;
      case 'ClosedWon': this.dealFormProbability = 100; break;
      case 'ClosedLost': this.dealFormProbability = 0; break;
    }
  }

  public submitDealForm(): void {
    if (!this.dealFormTitle.trim() || !this.dealFormCustomerId) return;

    if (this.isEditingDeal && this.editingDealId) {
      this.apiService.updateDeal(this.editingDealId, {
        title: this.dealFormTitle,
        customerId: this.dealFormCustomerId,
        assignedEmployeeId: this.dealFormAssignedEmployeeId || undefined,
        amount: this.dealFormAmount,
        currency: this.dealFormCurrency,
        stage: this.dealFormStage,
        probability: this.dealFormProbability,
        expectedCloseDateUtc: this.dealFormExpectedCloseDate || undefined,
        lostReason: this.dealFormStage === 'ClosedLost' ? this.dealFormLostReason : undefined,
        notes: this.dealFormNotes
      }).subscribe(() => {
        this.closeDealModal();
        this.loadDeals();
        this.loadDealMetrics();
      });
    } else {
      this.apiService.createDeal({
        title: this.dealFormTitle,
        customerId: this.dealFormCustomerId,
        assignedEmployeeId: this.dealFormAssignedEmployeeId || undefined,
        amount: this.dealFormAmount,
        currency: this.dealFormCurrency,
        stage: this.dealFormStage,
        probability: this.dealFormProbability,
        expectedCloseDateUtc: this.dealFormExpectedCloseDate || undefined,
        notes: this.dealFormNotes
      }).subscribe(() => {
        this.closeDealModal();
        this.loadDeals();
        this.loadDealMetrics();
      });
    }
  }

  public advanceDealStage(deal: Deal): void {
    const next = this.getNextStage(deal.stage);
    if (!next) return;
    this.apiService.updateDealStage(deal.id, next).subscribe(() => {
      this.loadDeals();
      this.loadDealMetrics();
    });
  }

  public quickMarkWon(deal: Deal): void {
    this.apiService.updateDealStage(deal.id, 'ClosedWon', 100).subscribe(() => {
      this.loadDeals();
      this.loadDealMetrics();
    });
  }

  public openMarkLostModal(deal: Deal): void {
    this.lostModalDeal = deal;
    this.lostReasonInput = '';
    this.showLostModal = true;
  }

  public closeLostModal(): void {
    this.showLostModal = false;
    this.lostModalDeal = null;
  }

  public confirmMarkLost(): void {
    if (!this.lostModalDeal) return;
    this.apiService.updateDealStage(
      this.lostModalDeal.id,
      'ClosedLost',
      0,
      this.lostReasonInput.trim() || 'Closed Lost'
    ).subscribe(() => {
      this.closeLostModal();
      this.loadDeals();
      this.loadDealMetrics();
    });
  }

  public deleteDeal(id: string): void {
    if (!confirm('Are you sure you want to delete this deal opportunity?')) return;
    this.apiService.deleteDeal(id).subscribe(() => {
      this.loadDeals();
      this.loadDealMetrics();
    });
  }

  public getNextStage(stage: DealStage): DealStage | null {
    switch (stage) {
      case 'Lead': return 'Qualified';
      case 'Qualified': return 'Proposal';
      case 'Proposal': return 'Negotiation';
      case 'Negotiation': return 'ClosedWon';
      default: return null;
    }
  }

  public canDelete(): boolean {
    return this.currentRole === 'Owner' || this.currentRole === 'Admin' || this.currentRole === 'Manager';
  }

  public getInitials(name: string): string {
    if (!name) return 'C';
    const words = name.trim().split(' ');
    if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

  public formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  }

  public formatStatus(status: CustomerStatus): string {
    switch (status) {
      case 'ActiveCustomer': return 'Active Client';
      case 'Prospect': return 'Prospect';
      case 'Lead': return 'Lead';
      case 'Inactive': return 'Inactive';
      default: return status;
    }
  }

  public getStatusBadge(status: CustomerStatus): string {
    switch (status) {
      case 'ActiveCustomer': return 'badge-emerald';
      case 'Prospect': return 'badge-indigo';
      case 'Lead': return 'badge-amber';
      case 'Inactive': return 'badge-rose';
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

  public getStageHeaderClass(stage: DealStage): string {
    switch (stage) {
      case 'Lead': return 'header-lead';
      case 'Qualified': return 'header-qualified';
      case 'Proposal': return 'header-proposal';
      case 'Negotiation': return 'header-negotiation';
      case 'ClosedWon': return 'header-won';
      case 'ClosedLost': return 'header-lost';
    }
  }

  public getProbColorClass(prob: number): string {
    if (prob === 100) return 'prob-won';
    if (prob === 0) return 'prob-lost';
    if (prob <= 30) return 'prob-low';
    if (prob <= 50) return 'prob-med';
    return 'prob-high';
  }
}
