import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import {
  ComplianceCertificate,
  CreateCertificateRequest,
  AuditMeeting,
  CreateAuditMeetingRequest,
  ComplianceDashboard,
  CertificateStatus,
  AuditMeetingType,
  AuditMeetingStatus,
  Employee,
  Department
} from '../../core/models/models';

@Component({
  selector: 'app-compliance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="compliance-page">
      <!-- Page Header -->
      <header class="page-header glass-panel">
        <div class="header-left">
          <div class="header-icon-box">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <div>
            <h1 class="font-heading-2">Compliance & Audit Governance</h1>
            <p class="header-subtext">
              Regulatory certifications, ISO standards, health & safety audits, and scheduled inspection meetings across all operations.
            </p>
          </div>
        </div>

        <div class="header-actions">
          <button (click)="openCreateAuditModal()" class="btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>Schedule Audit</span>
          </button>

          <button (click)="openCreateCertModal()" class="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span>Add Certificate</span>
          </button>
        </div>
      </header>

      <!-- KPI Executive Cards -->
      <section class="kpi-grid">
        <div class="kpi-card glass-panel">
          <div class="kpi-header">
            <span class="kpi-title">Active Certifications</span>
            <div class="kpi-icon-pill icon-emerald">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
          </div>
          <div class="kpi-value font-mono text-emerald">{{ dashboard?.activeCertificates || 0 }}</div>
          <div class="kpi-footer">
            <span class="kpi-sub">Out of {{ dashboard?.totalCertificates || 0 }} tracked standards</span>
          </div>
        </div>

        <div class="kpi-card glass-panel">
          <div class="kpi-header">
            <span class="kpi-title">Expiring Soon (&lt;30d)</span>
            <div class="kpi-icon-pill icon-amber">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
          </div>
          <div class="kpi-value font-mono text-amber">{{ dashboard?.expiringSoonCertificates || 0 }}</div>
          <div class="kpi-footer">
            <span class="badge badge-amber" *ngIf="(dashboard?.expiringSoonCertificates || 0) > 0">Renewal Due</span>
            <span class="kpi-sub" *ngIf="(dashboard?.expiringSoonCertificates || 0) === 0">No urgent renewals</span>
          </div>
        </div>

        <div class="kpi-card glass-panel">
          <div class="kpi-header">
            <span class="kpi-title">Expired Certificates</span>
            <div class="kpi-icon-pill icon-rose">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
          </div>
          <div class="kpi-value font-mono text-rose">{{ dashboard?.expiredCertificates || 0 }}</div>
          <div class="kpi-footer">
            <span class="badge badge-rose" *ngIf="(dashboard?.expiredCertificates || 0) > 0">Action Required</span>
            <span class="kpi-sub" *ngIf="(dashboard?.expiredCertificates || 0) === 0">Zero non-compliant</span>
          </div>
        </div>

        <div class="kpi-card glass-panel">
          <div class="kpi-header">
            <span class="kpi-title">Scheduled Audits</span>
            <div class="kpi-icon-pill icon-cyan">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </div>
          </div>
          <div class="kpi-value font-mono text-cyan">{{ dashboard?.scheduledAuditsCount || 0 }}</div>
          <div class="kpi-footer">
            <span class="kpi-sub">{{ dashboard?.actionRequiredAuditsCount || 0 }} require corrective action</span>
          </div>
        </div>
      </section>

      <!-- Tab Switcher -->
      <div class="tab-bar">
        <button
          (click)="activeTab = 'certificates'"
          class="tab-btn"
          [class.active]="activeTab === 'certificates'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          <span>Certifications & Standards ({{ certificates.length }})</span>
        </button>

        <button
          (click)="activeTab = 'audits'"
          class="tab-btn"
          [class.active]="activeTab === 'audits'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
          <span>Audit Meetings & Inspections ({{ auditMeetings.length }})</span>
        </button>
      </div>

      <!-- TAB 1: CERTIFICATES -->
      <section *ngIf="activeTab === 'certificates'" class="tab-content">
        <!-- Filter Bar -->
        <div class="filter-bar glass-panel">
          <div class="filter-pills">
            <button
              (click)="selectedCertStatus = 'ALL'"
              class="filter-pill"
              [class.active]="selectedCertStatus === 'ALL'">
              All ({{ certificates.length }})
            </button>
            <button
              (click)="selectedCertStatus = 'Active'"
              class="filter-pill"
              [class.active]="selectedCertStatus === 'Active'">
              Active ({{ countCertsByStatus('Active') }})
            </button>
            <button
              (click)="selectedCertStatus = 'ExpiringSoon'"
              class="filter-pill"
              [class.active]="selectedCertStatus === 'ExpiringSoon'">
              Expiring Soon ({{ countCertsByStatus('ExpiringSoon') }})
            </button>
            <button
              (click)="selectedCertStatus = 'Expired'"
              class="filter-pill"
              [class.active]="selectedCertStatus === 'Expired'">
              Expired ({{ countCertsByStatus('Expired') }})
            </button>
          </div>

          <div class="search-box">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              [(ngModel)]="searchCertText"
              placeholder="Search by code, certificate name, or body..."
              class="search-input" />
          </div>
        </div>

        <!-- Certificates Table -->
        <div class="table-card glass-panel-elevated">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Standard Code</th>
                  <th>Certificate Name</th>
                  <th>Issuing Authority</th>
                  <th>Validity Window</th>
                  <th>Countdown Radar</th>
                  <th>Status</th>
                  <th>Responsible Officer</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngIf="filteredCertificates.length === 0">
                  <td colspan="8" class="empty-state-cell">
                    <div class="empty-state">
                      <div class="empty-icon">📜</div>
                      <div class="empty-title">No certificates match query</div>
                      <div class="empty-desc">Register a standard using the "Add Certificate" button above.</div>
                    </div>
                  </td>
                </tr>

                <tr *ngFor="let cert of filteredCertificates" class="table-row">
                  <td class="font-mono">
                    <div class="code-badge">{{ cert.standardCode }}</div>
                    <span class="cert-num">{{ cert.certificateNumber }}</span>
                  </td>
                  <td>
                    <div class="cert-title-cell">
                      <span class="cert-name">{{ cert.name }}</span>
                      <p *ngIf="cert.scopeDescription" class="cert-scope" [title]="cert.scopeDescription">{{ cert.scopeDescription }}</p>
                    </div>
                  </td>
                  <td>
                    <span class="issuing-body">{{ cert.issuingBody }}</span>
                  </td>
                  <td>
                    <div class="date-range">
                      <span>{{ cert.issueDateUtc | date:'mediumDate' }}</span>
                      <span class="date-sep">→</span>
                      <span>{{ cert.expiryDateUtc | date:'mediumDate' }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="radar-cell">
                      <span
                        class="countdown-tag font-mono"
                        [ngClass]="getCountdownClass(cert.daysUntilExpiry)">
                        {{ cert.daysUntilExpiry > 0 ? cert.daysUntilExpiry + ' days remaining' : (cert.daysUntilExpiry === 0 ? 'Expires today' : MathAbs(cert.daysUntilExpiry) + ' days overdue') }}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span class="status-pill" [ngClass]="getCertStatusClass(cert.status)">
                      {{ cert.statusName || cert.status }}
                    </span>
                  </td>
                  <td>
                    <div class="emp-profile">
                      <div class="emp-avatar">{{ getInitials(cert.responsibleEmployeeName) }}</div>
                      <span class="emp-name">{{ cert.responsibleEmployeeName || 'Compliance Officer' }}</span>
                    </div>
                  </td>
                  <td style="text-align: right;">
                    <div class="action-buttons-group">
                      <button (click)="openEditCertModal(cert)" class="btn-action-edit" title="Edit Certificate">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button (click)="deleteCert(cert.id)" class="btn-action-delete" title="Delete Certificate">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- TAB 2: AUDIT MEETINGS -->
      <section *ngIf="activeTab === 'audits'" class="tab-content">
        <!-- Audit Meeting Cards Grid -->
        <div class="audits-grid">
          <div *ngIf="auditMeetings.length === 0" class="empty-state-cell glass-panel">
            <div class="empty-state">
              <div class="empty-icon">📅</div>
              <div class="empty-title">No audit meetings scheduled</div>
              <div class="empty-desc">Click "Schedule Audit" to create an internal or external compliance review.</div>
            </div>
          </div>

          <div *ngFor="let audit of auditMeetings" class="audit-card glass-panel-elevated">
            <div class="audit-header">
              <div class="audit-badge-row">
                <span class="audit-num font-mono">{{ audit.meetingNumber }}</span>
                <span class="audit-type-badge" [ngClass]="getAuditTypeClass(audit.auditType)">
                  {{ audit.auditTypeName || audit.auditType }}
                </span>
              </div>
              <span class="status-pill" [ngClass]="getAuditStatusClass(audit.status)">
                {{ audit.statusName || audit.status }}
              </span>
            </div>

            <h3 class="audit-title font-heading-3">{{ audit.title }}</h3>

            <div class="audit-metadata">
              <div class="meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span>{{ audit.scheduledDateUtc | date:'medium' }}</span>
              </div>
              <div class="meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>{{ audit.location }}</span>
              </div>
              <div class="meta-item" *ngIf="audit.auditedDepartmentName">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
                <span>{{ audit.auditedDepartmentName }}</span>
              </div>
              <div class="meta-item" *ngIf="audit.leadAuditorName">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span>Lead: {{ audit.leadAuditorName }}</span>
              </div>
            </div>

            <div class="checklist-box" *ngIf="audit.checklistSummary">
              <span class="box-label">AUDIT CHECKLIST & PROTOCOLS:</span>
              <p class="box-text">{{ audit.checklistSummary }}</p>
            </div>

            <div class="findings-box" *ngIf="audit.findings">
              <div class="findings-header">
                <span class="box-label">FINDINGS & OBSERVATIONS:</span>
                <span *ngIf="audit.nonConformancesCount > 0" class="badge badge-rose">
                  {{ audit.nonConformancesCount }} Non-Conformances
                </span>
              </div>
              <p class="box-text text-amber">{{ audit.findings }}</p>
            </div>

            <div class="corrective-box" *ngIf="audit.correctiveActionPlan">
              <span class="box-label">CORRECTIVE ACTION PLAN (CAP):</span>
              <p class="box-text text-emerald">{{ audit.correctiveActionPlan }}</p>
            </div>

            <div class="audit-card-footer">
              <button (click)="openEditAuditModal(audit)" class="btn-action-primary">
                Update Findings & Status
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- MODAL 1: Create / Edit Certificate -->
      <div *ngIf="showCertModal" class="modal-backdrop">
        <div class="modal-card glass-panel-elevated">
          <div class="modal-header">
            <div>
              <h2 class="font-heading-3">{{ isEditingCert ? 'Edit Certificate' : 'Register New Certificate' }}</h2>
              <p class="modal-subtext">Maintain official records for ISO, HACCP, OSHA, or quality standards</p>
            </div>
            <button (click)="closeCertModal()" class="close-btn">✕</button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Certificate / Standard Name</label>
              <input
                type="text"
                [(ngModel)]="certForm.name"
                placeholder="e.g. Quality Management Systems Standard"
                class="form-input" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Standard Code</label>
                <input
                  type="text"
                  [(ngModel)]="certForm.standardCode"
                  placeholder="e.g. ISO 9001:2015"
                  class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">Certificate #</label>
                <input
                  type="text"
                  [(ngModel)]="certForm.certificateNumber"
                  placeholder="e.g. CERT-ISO9001-2024-001"
                  class="form-input" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Issuing Body / Registrar</label>
                <input
                  type="text"
                  [(ngModel)]="certForm.issuingBody"
                  placeholder="e.g. BSI Group Global, TÜV SÜD"
                  class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">Responsible Officer</label>
                <select [(ngModel)]="certForm.responsibleEmployeeId" class="form-select">
                  <option value="">Unassigned</option>
                  <option *ngFor="let emp of employees" [value]="emp.id">{{ emp.fullName }} ({{ emp.jobTitle }})</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Issue Date</label>
                <input type="date" [(ngModel)]="certForm.issueDateUtc" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">Expiry Date</label>
                <input type="date" [(ngModel)]="certForm.expiryDateUtc" class="form-input" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Scope Description</label>
              <textarea
                [(ngModel)]="certForm.scopeDescription"
                rows="2"
                placeholder="Describe facilities, processes, products covered by this certificate..."
                class="form-textarea"></textarea>
            </div>
          </div>

          <div class="modal-footer">
            <button (click)="closeCertModal()" class="btn-secondary">Cancel</button>
            <button
              (click)="saveCertificate()"
              [disabled]="!certForm.name || !certForm.standardCode || !certForm.expiryDateUtc || loadingAction"
              class="btn-primary">
              <span>{{ isEditingCert ? 'Update Certificate' : 'Save Certificate' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL 2: Schedule / Update Audit Meeting -->
      <div *ngIf="showAuditModal" class="modal-backdrop">
        <div class="modal-card glass-panel-elevated">
          <div class="modal-header">
            <div>
              <h2 class="font-heading-3">{{ isEditingAudit ? 'Update Audit Findings' : 'Schedule Audit Meeting' }}</h2>
              <p class="modal-subtext">Internal review or external registrar surveillance session</p>
            </div>
            <button (click)="closeAuditModal()" class="close-btn">✕</button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Audit Title</label>
              <input
                type="text"
                [(ngModel)]="auditForm.title"
                placeholder="e.g. Q4 Information Security Surveillance Audit"
                class="form-input" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Audit Classification</label>
                <select [(ngModel)]="auditForm.auditType" class="form-select">
                  <option value="Internal">Internal Audit</option>
                  <option value="External">External Registrar Audit</option>
                  <option value="Surveillance">Surveillance Assessment</option>
                  <option value="Regulatory">Government Regulatory Inspection</option>
                </select>
              </div>

              <div class="form-group" *ngIf="isEditingAudit">
                <label class="form-label">Status</label>
                <select [(ngModel)]="auditEditStatus" class="form-select">
                  <option value="Scheduled">Scheduled</option>
                  <option value="InProgress">In Progress</option>
                  <option value="ActionRequired">Action Required (Non-Conformances)</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Scheduled Date & Time</label>
                <input type="datetime-local" [(ngModel)]="auditScheduledDateTime" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">Location / Room / Virtual Link</label>
                <input
                  type="text"
                  [(ngModel)]="auditForm.location"
                  placeholder="e.g. Conference Room Alpha & Remote Secure Link"
                  class="form-input" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Audited Department</label>
                <select [(ngModel)]="auditForm.auditedDepartmentId" class="form-select">
                  <option value="">Company-Wide</option>
                  <option *ngFor="let d of departments" [value]="d.id">{{ d.name }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Lead Auditor</label>
                <select [(ngModel)]="auditForm.leadAuditorEmployeeId" class="form-select">
                  <option value="">External / Unassigned</option>
                  <option *ngFor="let emp of employees" [value]="emp.id">{{ emp.fullName }} ({{ emp.jobTitle }})</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Checklist Protocols / Scope</label>
              <textarea
                [(ngModel)]="auditForm.checklistSummary"
                rows="2"
                placeholder="Summary of clauses, checklists, and procedures to inspect..."
                class="form-textarea"></textarea>
            </div>

            <div *ngIf="isEditingAudit" class="findings-edit-section">
              <div class="form-group">
                <label class="form-label">Auditor Findings & Observations</label>
                <textarea
                  [(ngModel)]="auditEditFindings"
                  rows="2"
                  placeholder="Detail any observations, minor notes, or major non-conformances..."
                  class="form-textarea"></textarea>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Non-Conformances Count</label>
                  <input type="number" min="0" [(ngModel)]="auditEditNonConformances" class="form-input" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Corrective Action Plan (CAP)</label>
                <textarea
                  [(ngModel)]="auditEditCAP"
                  rows="2"
                  placeholder="Corrective actions agreed with department manager..."
                  class="form-textarea"></textarea>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button (click)="closeAuditModal()" class="btn-secondary">Cancel</button>
            <button
              (click)="saveAuditMeeting()"
              [disabled]="!auditForm.title || !auditForm.location || loadingAction"
              class="btn-primary">
              <span>{{ isEditingAudit ? 'Update Audit Findings' : 'Schedule Audit' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .compliance-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 2rem;
      border-radius: 16px;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .header-icon-box {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%);
      border: 1px solid rgba(6, 182, 212, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #38bdf8;
    }

    .header-subtext {
      font-size: 0.875rem;
      color: #94a3b8;
      margin-top: 0.25rem;
      margin-bottom: 0;
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
    }

    .kpi-card {
      padding: 1.25rem 1.5rem;
      border-radius: 14px;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .kpi-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .kpi-title {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .kpi-icon-pill {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;

      &.icon-emerald { background: rgba(16, 185, 129, 0.15); color: #34d399; }
      &.icon-amber { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
      &.icon-rose { background: rgba(239, 68, 68, 0.15); color: #f87171; }
      &.icon-cyan { background: rgba(6, 182, 212, 0.15); color: #38bdf8; }
    }

    .kpi-value {
      font-size: 2.25rem;
      font-weight: 800;
      line-height: 1;
    }

    .kpi-footer {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.25rem;
    }

    .kpi-sub {
      font-size: 0.75rem;
      color: #64748b;
    }

    /* Tab Switcher */
    .tab-bar {
      display: flex;
      gap: 0.75rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 0.5rem;
    }

    .tab-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 1.25rem;
      border-radius: 10px;
      font-weight: 600;
      font-size: 0.875rem;
      background: transparent;
      border: 1px solid transparent;
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover { color: #ffffff; background: rgba(255, 255, 255, 0.04); }
      &.active {
        color: #ffffff;
        background: rgba(6, 182, 212, 0.12);
        border-color: rgba(6, 182, 212, 0.35);
      }
    }

    /* Filter Bar */
    .filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1.25rem;
      border-radius: 12px;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }

    .filter-pills {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .filter-pill {
      padding: 0.4rem 0.85rem;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover { color: #ffffff; border-color: rgba(255, 255, 255, 0.2); }
      &.active {
        background: rgba(99, 102, 241, 0.2);
        border-color: rgba(99, 102, 241, 0.4);
        color: #818cf8;
      }
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 0.4rem 0.85rem;
      color: #94a3b8;
      min-width: 280px;

      .search-input {
        background: transparent;
        border: none;
        color: #ffffff;
        font-size: 0.8125rem;
        outline: none;
        width: 100%;
        &::placeholder { color: #64748b; }
      }
    }

    /* Table Styles */
    .table-card {
      border-radius: 16px;
      overflow: hidden;
    }

    .table-responsive {
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.875rem;

      th {
        padding: 0.875rem 1.25rem;
        color: #64748b;
        font-weight: 700;
        text-transform: uppercase;
        font-size: 0.6875rem;
        letter-spacing: 0.05em;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }

      td {
        padding: 1rem 1.25rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        color: #e2e8f0;
      }

      tr.table-row:hover {
        background: rgba(255, 255, 255, 0.02);
      }
    }

    .code-badge {
      display: inline-block;
      font-weight: 700;
      color: #38bdf8;
      font-size: 0.8125rem;
    }

    .cert-num {
      display: block;
      font-size: 0.6875rem;
      color: #64748b;
      margin-top: 0.15rem;
    }

    .cert-title-cell {
      max-width: 280px;
    }

    .cert-name {
      font-weight: 600;
      color: #ffffff;
      display: block;
    }

    .cert-scope {
      font-size: 0.75rem;
      color: #94a3b8;
      margin: 0.2rem 0 0 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .issuing-body {
      font-weight: 500;
      color: #cbd5e1;
    }

    .date-range {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.75rem;
      color: #cbd5e1;
      .date-sep { color: #64748b; }
    }

    .countdown-tag {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.55rem;
      border-radius: 6px;
      display: inline-block;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);

      &.radar-healthy { color: #34d399; border-color: rgba(16, 185, 129, 0.3); }
      &.radar-warning { color: #fbbf24; border-color: rgba(245, 158, 11, 0.3); background: rgba(245, 158, 11, 0.1); }
      &.radar-expired { color: #f87171; border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.1); }
    }

    .status-pill {
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      display: inline-block;

      &.status-active { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; }
      &.status-expiring { background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); color: #fbbf24; }
      &.status-expired { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; }
      &.status-scheduled { background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); color: #818cf8; }
      &.status-progress { background: rgba(6, 182, 212, 0.15); border: 1px solid rgba(6, 182, 212, 0.3); color: #38bdf8; }
      &.status-action { background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); color: #fbbf24; }
      &.status-completed { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; }
    }

    .emp-profile {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .emp-avatar {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      color: #ffffff;
      font-size: 0.65rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .action-buttons-group {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }

    .btn-action-edit, .btn-action-delete {
      width: 30px;
      height: 30px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover { color: #ffffff; background: rgba(255, 255, 255, 0.1); }
    }
    .btn-action-delete:hover { color: #f87171; border-color: rgba(239, 68, 68, 0.4); }

    /* Audits Grid */
    .audits-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 1.25rem;
    }

    .audit-card {
      padding: 1.5rem;
      border-radius: 14px;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .audit-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .audit-badge-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .audit-num {
      font-size: 0.75rem;
      color: #38bdf8;
      font-weight: 700;
    }

    .audit-type-badge {
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      border-radius: 6px;
      &.type-internal { background: rgba(99, 102, 241, 0.15); color: #818cf8; }
      &.type-external { background: rgba(16, 185, 129, 0.15); color: #34d399; }
      &.type-regulatory { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
      &.type-surveillance { background: rgba(6, 182, 212, 0.15); color: #38bdf8; }
    }

    .audit-title {
      font-size: 1.1rem;
      margin: 0;
      color: #ffffff;
      line-height: 1.3;
    }

    .audit-metadata {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      svg { color: #64748b; flex-shrink: 0; }
    }

    .checklist-box, .findings-box, .corrective-box {
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 8px;
      padding: 0.65rem 0.85rem;
    }

    .box-label {
      display: block;
      font-size: 0.625rem;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.05em;
      margin-bottom: 0.25rem;
    }

    .box-text {
      font-size: 0.75rem;
      margin: 0;
      line-height: 1.4;
      color: #cbd5e1;
    }

    .findings-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.25rem;
    }

    .audit-card-footer {
      margin-top: auto;
      padding-top: 0.5rem;
    }

    .btn-action-primary {
      width: 100%;
      padding: 0.55rem;
      background: rgba(6, 182, 212, 0.15);
      border: 1px solid rgba(6, 182, 212, 0.3);
      color: #38bdf8;
      border-radius: 8px;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover { background: rgba(6, 182, 212, 0.25); color: #ffffff; }
    }

    /* Modal Framework */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(3, 7, 18, 0.75);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }

    .modal-card {
      width: 100%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
      border-radius: 18px;
      padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .modal-subtext {
      font-size: 0.8125rem;
      color: #94a3b8;
      margin: 0.25rem 0 0 0;
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
      letter-spacing: 0.04em;
    }

    .form-input, .form-select, .form-textarea {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 0.6rem 0.85rem;
      color: #ffffff;
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.15s ease;

      &:focus { border-color: #38bdf8; }
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }

    .btn-primary {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);
      color: #ffffff;
      border: none;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      transition: opacity 0.15s ease;

      &:hover:not(:disabled) { opacity: 0.9; }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    .btn-secondary {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #ffffff;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover { background: rgba(255, 255, 255, 0.1); }
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1.5rem;
      .empty-icon { font-size: 2rem; margin-bottom: 0.5rem; }
      .empty-title { font-weight: 700; color: #ffffff; margin-bottom: 0.25rem; }
      .empty-desc { font-size: 0.8125rem; color: #64748b; }
    }

    .text-emerald { color: #34d399 !important; }
    .text-amber { color: #fbbf24 !important; }
    .text-rose { color: #f87171 !important; }
    .text-cyan { color: #38bdf8 !important; }
    .badge-amber { background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); color: #fbbf24; }
    .badge-rose { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; }
  `]
})
export class ComplianceComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  public dashboard: ComplianceDashboard | null = null;
  public certificates: ComplianceCertificate[] = [];
  public auditMeetings: AuditMeeting[] = [];
  public employees: Employee[] = [];
  public departments: Department[] = [];

  public activeTab: 'certificates' | 'audits' = 'certificates';
  public selectedCertStatus = 'ALL';
  public searchCertText = '';
  public loadingAction = false;

  // Modals state
  public showCertModal = false;
  public isEditingCert = false;
  public editingCertId: string | null = null;
  public certForm: CreateCertificateRequest = {
    name: '',
    standardCode: '',
    certificateNumber: '',
    issuingBody: '',
    issueDateUtc: new Date().toISOString().split('T')[0],
    expiryDateUtc: new Date(Date.now() + 86400000 * 365).toISOString().split('T')[0],
    scopeDescription: '',
    responsibleEmployeeId: ''
  };

  public showAuditModal = false;
  public isEditingAudit = false;
  public editingAuditId: string | null = null;
  public auditScheduledDateTime = '';
  public auditForm: CreateAuditMeetingRequest = {
    title: '',
    auditType: 'Internal',
    scheduledDateUtc: new Date().toISOString(),
    location: '',
    leadAuditorEmployeeId: '',
    auditedDepartmentId: '',
    checklistSummary: ''
  };
  public auditEditStatus: AuditMeetingStatus = 'Scheduled';
  public auditEditFindings = '';
  public auditEditNonConformances = 0;
  public auditEditCAP = '';

  public ngOnInit(): void {
    this.loadAllData();
  }

  public loadAllData(): void {
    this.api.getComplianceDashboard().subscribe(res => {
      if (res.success && res.data) this.dashboard = res.data;
    });

    this.api.getCertificates().subscribe(res => {
      if (res.success && res.data) this.certificates = res.data;
    });

    this.api.getAuditMeetings().subscribe(res => {
      if (res.success && res.data) this.auditMeetings = res.data;
    });

    this.api.getEmployees().subscribe(res => {
      if (res.success && res.data) this.employees = res.data.data || [];
    });

    this.api.getDepartments().subscribe(res => {
      if (res.success && res.data) this.departments = res.data;
    });
  }

  // Filter getters
  public get filteredCertificates(): ComplianceCertificate[] {
    return this.certificates.filter(c => {
      const matchStatus = this.selectedCertStatus === 'ALL' || c.status === this.selectedCertStatus;
      const s = this.searchCertText.toLowerCase().trim();
      const matchSearch = !s ||
        c.standardCode.toLowerCase().includes(s) ||
        c.name.toLowerCase().includes(s) ||
        c.issuingBody.toLowerCase().includes(s) ||
        c.certificateNumber.toLowerCase().includes(s);
      return matchStatus && matchSearch;
    });
  }

  public countCertsByStatus(status: CertificateStatus): number {
    return this.certificates.filter(c => c.status === status).length;
  }

  // Modal actions
  public openCreateCertModal(): void {
    this.isEditingCert = false;
    this.editingCertId = null;
    this.certForm = {
      name: '',
      standardCode: '',
      certificateNumber: `CERT-${new Date().getFullYear()}-${String(this.certificates.length + 1).padStart(3, '0')}`,
      issuingBody: '',
      issueDateUtc: new Date().toISOString().split('T')[0],
      expiryDateUtc: new Date(Date.now() + 86400000 * 365).toISOString().split('T')[0],
      scopeDescription: '',
      responsibleEmployeeId: this.employees[0]?.id || ''
    };
    this.showCertModal = true;
  }

  public openEditCertModal(cert: ComplianceCertificate): void {
    this.isEditingCert = true;
    this.editingCertId = cert.id;
    this.certForm = {
      name: cert.name,
      standardCode: cert.standardCode,
      certificateNumber: cert.certificateNumber,
      issuingBody: cert.issuingBody,
      issueDateUtc: cert.issueDateUtc.split('T')[0],
      expiryDateUtc: cert.expiryDateUtc.split('T')[0],
      scopeDescription: cert.scopeDescription || '',
      responsibleEmployeeId: cert.responsibleEmployeeId || ''
    };
    this.showCertModal = true;
  }

  public closeCertModal(): void {
    this.showCertModal = false;
  }

  public saveCertificate(): void {
    this.loadingAction = true;
    if (this.isEditingCert && this.editingCertId) {
      this.api.updateCertificate(this.editingCertId, this.certForm).subscribe({
        next: (res) => {
          this.loadingAction = false;
          if (res.success) {
            this.closeCertModal();
            this.loadAllData();
          }
        },
        error: () => { this.loadingAction = false; }
      });
    } else {
      this.api.createCertificate(this.certForm).subscribe({
        next: (res) => {
          this.loadingAction = false;
          if (res.success) {
            this.closeCertModal();
            this.loadAllData();
          }
        },
        error: () => { this.loadingAction = false; }
      });
    }
  }

  public deleteCert(id: string): void {
    if (!confirm('Are you sure you want to delete this compliance certificate?')) return;
    this.api.deleteCertificate(id).subscribe(res => {
      if (res.success) this.loadAllData();
    });
  }

  public openCreateAuditModal(): void {
    this.isEditingAudit = false;
    this.editingAuditId = null;
    const nextWeek = new Date(Date.now() + 86400000 * 7);
    this.auditScheduledDateTime = nextWeek.toISOString().slice(0, 16);
    this.auditForm = {
      title: '',
      auditType: 'Internal',
      scheduledDateUtc: nextWeek.toISOString(),
      location: 'Central Conference Room Alpha',
      leadAuditorEmployeeId: this.employees[0]?.id || '',
      auditedDepartmentId: this.departments[0]?.id || '',
      checklistSummary: ''
    };
    this.showAuditModal = true;
  }

  public openEditAuditModal(audit: AuditMeeting): void {
    this.isEditingAudit = true;
    this.editingAuditId = audit.id;
    this.auditScheduledDateTime = new Date(audit.scheduledDateUtc).toISOString().slice(0, 16);
    this.auditForm = {
      title: audit.title,
      auditType: audit.auditType,
      scheduledDateUtc: audit.scheduledDateUtc,
      location: audit.location,
      leadAuditorEmployeeId: audit.leadAuditorEmployeeId || '',
      auditedDepartmentId: audit.auditedDepartmentId || '',
      checklistSummary: audit.checklistSummary || ''
    };
    this.auditEditStatus = audit.status;
    this.auditEditFindings = audit.findings || '';
    this.auditEditNonConformances = audit.nonConformancesCount || 0;
    this.auditEditCAP = audit.correctiveActionPlan || '';
    this.showAuditModal = true;
  }

  public closeAuditModal(): void {
    this.showAuditModal = false;
  }

  public saveAuditMeeting(): void {
    this.loadingAction = true;
    this.auditForm.scheduledDateUtc = new Date(this.auditScheduledDateTime).toISOString();

    if (this.isEditingAudit && this.editingAuditId) {
      const updateReq: Partial<AuditMeeting> = {
        title: this.auditForm.title,
        auditType: this.auditForm.auditType,
        scheduledDateUtc: this.auditForm.scheduledDateUtc,
        location: this.auditForm.location,
        leadAuditorEmployeeId: this.auditForm.leadAuditorEmployeeId,
        auditedDepartmentId: this.auditForm.auditedDepartmentId,
        checklistSummary: this.auditForm.checklistSummary,
        status: this.auditEditStatus,
        findings: this.auditEditFindings,
        nonConformancesCount: this.auditEditNonConformances,
        correctiveActionPlan: this.auditEditCAP,
        completedAtUtc: this.auditEditStatus === 'Completed' ? new Date().toISOString() : undefined
      };

      this.api.updateAuditMeeting(this.editingAuditId, updateReq).subscribe({
        next: (res) => {
          this.loadingAction = false;
          if (res.success) {
            this.closeAuditModal();
            this.loadAllData();
          }
        },
        error: () => { this.loadingAction = false; }
      });
    } else {
      this.api.createAuditMeeting(this.auditForm).subscribe({
        next: (res) => {
          this.loadingAction = false;
          if (res.success) {
            this.closeAuditModal();
            this.loadAllData();
          }
        },
        error: () => { this.loadingAction = false; }
      });
    }
  }

  // Helpers
  public MathAbs(val: number): number {
    return Math.abs(val);
  }

  public getCountdownClass(days: number): string {
    if (days < 0) return 'radar-expired';
    if (days <= 30) return 'radar-warning';
    return 'radar-healthy';
  }

  public getCertStatusClass(status: CertificateStatus): string {
    switch (status) {
      case 'Active': return 'status-active';
      case 'ExpiringSoon': return 'status-expiring';
      case 'Expired': return 'status-expired';
      default: return 'status-active';
    }
  }

  public getAuditTypeClass(type: AuditMeetingType): string {
    switch (type) {
      case 'Internal': return 'type-internal';
      case 'External': return 'type-external';
      case 'Regulatory': return 'type-regulatory';
      case 'Surveillance': return 'type-surveillance';
      default: return 'type-internal';
    }
  }

  public getAuditStatusClass(status: AuditMeetingStatus): string {
    switch (status) {
      case 'Scheduled': return 'status-scheduled';
      case 'InProgress': return 'status-progress';
      case 'ActionRequired': return 'status-action';
      case 'Completed': return 'status-completed';
      default: return 'status-scheduled';
    }
  }

  public getInitials(name?: string): string {
    if (!name) return 'CO';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
}
