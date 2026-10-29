import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import {
  Invoice,
  InvoiceItem,
  PaymentRecord,
  FinancialMetrics,
  InvoiceStatus,
  PaymentMethod,
  CreateInvoiceRequest,
  CreateInvoiceItemRequest,
  UpdateInvoiceRequest,
  RecordPaymentRequest,
  Customer,
  Product,
  Deal,
  TenantRole,
  PayrollRecord,
  PayrollSummary,
  GeneratePayrollBatchRequest,
  ApprovePayrollBatchRequest,
  EmployeePayslipSpreadsheet,
  Employee,
  InitiatePayrollRequest
} from '../../core/models/models';

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="finance-page">
      <!-- Header Section -->
      <div class="page-header">
        <div>
          <div class="badge badge-emerald" style="margin-bottom: 0.5rem;">Billing & Accounts Receivable (Phase 9)</div>
          <h1 class="font-heading-2">Invoicing & Financial Accounting</h1>
          <p class="font-caption">Multi-currency customer billing, automated tax calculations, payment collection ledger, and accounts receivable tracking</p>
        </div>
        <div class="header-actions">
          <button (click)="exportFinanceCsv()" class="btn-secondary" title="Export Invoices / Payments to CSV">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Export CSV</span>
          </button>
          <button *ngIf="canManageInvoices" (click)="openCreateModal()" class="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>Create New Invoice</span>
          </button>
        </div>
      </div>

      <!-- Confirmed Role Permission Banner -->
      <div class="role-scope-banner glass-panel">
        <div class="scope-icon">💳</div>
        <div class="scope-details">
          <div class="scope-title">
            ACTIVE PERMISSION SCOPE: <span class="badge" [ngClass]="getRoleBadgeClass(currentRole)">{{ currentRole }}</span>
          </div>
          <p class="scope-explanation" [ngSwitch]="currentRole">
            <span *ngSwitchCase="'Owner'">
              <strong>Executive Financial Oversight:</strong> Full authority over company-wide revenue invoicing, receivables tracking, write-offs, payment reconciliations, and tax compliance.
            </span>
            <span *ngSwitchCase="'Admin'">
              <strong>Financial Administrator:</strong> Authorized to create, issue, void, and delete draft invoices, configure tax parameters, and record customer payments across all accounts.
            </span>
            <span *ngSwitchCase="'Manager'">
              <strong>Billing Manager:</strong> Authorized to draft client invoices, issue billing records, log customer payments, and view cash collection analytics.
            </span>
            <span *ngSwitchCase="'Employee'">
              <strong>Read-Only Accounts Access:</strong> Visibility into client invoice statuses and payment records without authority to modify billing totals or record cash transactions.
            </span>
            <span *ngSwitchDefault>
              Billing and accounts receivable active.
            </span>
          </p>
        </div>
      </div>

      <!-- KPI Metrics Row -->
      <div class="metrics-row">
        <div class="metric-card glass-panel">
          <div class="metric-header">
            <span class="metric-label">TOTAL INVOICED</span>
            <span class="metric-icon">📑</span>
          </div>
          <div class="metric-value font-heading-2 text-indigo">
            \${{ (metrics?.totalInvoicedAmount || 0) | number:'1.2-2' }}
          </div>
          <span class="metric-sub text-muted">{{ metrics?.totalInvoicesCount || 0 }} total invoices on record</span>
        </div>

        <div class="metric-card glass-panel">
          <div class="metric-header">
            <span class="metric-label">COLLECTED REVENUE</span>
            <span class="metric-icon">💵</span>
          </div>
          <div class="metric-value font-heading-2 text-emerald">
            \${{ (metrics?.totalCollectedAmount || 0) | number:'1.2-2' }}
          </div>
          <span class="metric-sub text-emerald">
            {{ metrics?.collectionRatePercentage || 0 }}% collection efficiency
          </span>
        </div>

        <div class="metric-card glass-panel">
          <div class="metric-header">
            <span class="metric-label">OUTSTANDING RECEIVABLES</span>
            <span class="metric-icon">⏳</span>
          </div>
          <div class="metric-value font-heading-2 text-cyan">
            \${{ (metrics?.totalOutstandingAmount || 0) | number:'1.2-2' }}
          </div>
          <span class="metric-sub text-muted">Awaiting customer remittance</span>
        </div>

        <div class="metric-card glass-panel">
          <div class="metric-header">
            <span class="metric-label">OVERDUE AR</span>
            <span class="metric-icon">🚨</span>
          </div>
          <div class="metric-value font-heading-2 text-rose">
            \${{ (metrics?.totalOverdueAmount || 0) | number:'1.2-2' }}
          </div>
          <span class="metric-sub text-rose" *ngIf="(metrics?.totalOverdueAmount || 0) > 0">
            Past due date - action required
          </span>
          <span class="metric-sub text-muted" *ngIf="(metrics?.totalOverdueAmount || 0) === 0">
            Zero overdue receivables
          </span>
        </div>
      </div>

      <!-- Tabs Navigation -->
      <div class="tabs-container">
        <button
          class="tab-btn"
          [class.active]="activeTab === 'invoices'"
          (click)="activeTab = 'invoices'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          <span>Customer Invoices ({{ invoices.length }})</span>
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab === 'payments'"
          (click)="activeTab = 'payments'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          <span>Payment Receipts Ledger</span>
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab === 'payroll'"
          (click)="activeTab = 'payroll'; loadPayroll()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          <span>Monthly Payroll & Salaries ({{ payrollRecords.length }})</span>
        </button>
      </div>

      <!-- TAB 1: INVOICES -->
      <div *ngIf="activeTab === 'invoices'" class="tab-content">
        <!-- Filters Bar -->
        <div class="filters-bar glass-panel">
          <div class="search-input-wrapper">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="applyFilters()"
              placeholder="Search by invoice #, customer name, notes..."
              class="search-input" />
          </div>

          <div class="filter-group">
            <select [(ngModel)]="statusFilter" (ngModelChange)="applyFilters()" class="select-filter">
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Issued">Issued</option>
              <option value="PartiallyPaid">Partially Paid</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
              <option value="Void">Void</option>
            </select>

            <select [(ngModel)]="customerFilter" (ngModelChange)="applyFilters()" class="select-filter">
              <option value="">All Customers</option>
              <option *ngFor="let c of customers" [value]="c.id">{{ c.companyName }}</option>
            </select>
          </div>
        </div>

        <!-- Invoices Table -->
        <div class="table-container glass-panel">
          <table class="data-table">
            <thead>
              <tr>
                <th>INVOICE #</th>
                <th>CLIENT / ACCOUNT</th>
                <th>ISSUE & DUE DATE</th>
                <th>TOTAL AMOUNT</th>
                <th>PAID & BALANCE</th>
                <th>STATUS</th>
                <th style="text-align: right;">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let inv of filteredInvoices">
                <td>
                  <span class="inv-badge">{{ inv.invoiceNumber }}</span>
                  <div *ngIf="inv.dealTitle" class="deal-tag text-muted">
                    Deal: {{ inv.dealTitle }}
                  </div>
                </td>
                <td>
                  <div class="customer-info">
                    <div class="font-body-bold">{{ inv.customerName }}</div>
                    <div class="text-muted" style="font-size: 0.8rem;">{{ inv.customerEmail || 'No email specified' }}</div>
                  </div>
                </td>
                <td>
                  <div class="date-cell">
                    <div>Issued: <span class="text-muted">{{ inv.issueDateUtc | date:'yyyy-MM-dd' }}</span></div>
                    <div>Due: <span [class.text-rose]="inv.isOverdue">{{ inv.dueDateUtc | date:'yyyy-MM-dd' }}</span></div>
                  </div>
                </td>
                <td>
                  <div class="total-cell font-heading-3">
                    \${{ inv.totalAmount | number:'1.2-2' }}
                  </div>
                  <div class="sub-tax text-muted" style="font-size: 0.75rem;">
                    Sub: \${{ inv.subtotal | number:'1.0-0' }} | Tax: \${{ inv.taxAmount | number:'1.0-0' }}
                  </div>
                </td>
                <td>
                  <div class="balance-cell">
                    <div class="balance-labels">
                      <span class="text-emerald">Paid: \${{ inv.amountPaid | number:'1.2-2' }}</span>
                      <span [ngClass]="inv.balanceDue > 0 ? 'text-amber' : 'text-muted'">
                        Due: \${{ inv.balanceDue | number:'1.2-2' }}
                      </span>
                    </div>
                    <div class="balance-bar-bg">
                      <div class="balance-bar-fill" [style.width.%]="getPaymentProgress(inv)"></div>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="badge" [ngClass]="getInvoiceBadgeClass(inv)">
                    {{ inv.isOverdue ? 'Overdue' : inv.status }}
                  </span>
                </td>
                <td style="text-align: right;">
                  <div class="action-buttons">
                    <button (click)="viewInvoiceDetails(inv)" title="View Invoice" class="btn-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button
                      *ngIf="canManageInvoices && inv.status === 'Draft'"
                      (click)="issueInvoice(inv)"
                      title="Issue to Client"
                      class="btn-icon btn-action-emerald">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                    </button>
                    <button
                      *ngIf="canManageInvoices && (inv.status === 'Issued' || inv.status === 'PartiallyPaid' || inv.isOverdue)"
                      (click)="openRecordPaymentModal(inv)"
                      title="Record Payment"
                      class="btn-icon btn-action-cyan">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredInvoices.length === 0">
                <td colspan="7" class="empty-state">
                  <div class="empty-icon">🧾</div>
                  <div class="font-heading-3">No Invoices Found</div>
                  <p class="text-muted">Adjust search or filter parameters to locate billing records.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 2: PAYMENTS LEDGER -->
      <div *ngIf="activeTab === 'payments'" class="tab-content">
        <div class="table-container glass-panel">
          <table class="data-table">
            <thead>
              <tr>
                <th>RECEIPT #</th>
                <th>INVOICE #</th>
                <th>CUSTOMER</th>
                <th>AMOUNT RECEIVED</th>
                <th>PAYMENT METHOD</th>
                <th>DATE RECEIVED</th>
                <th>TRANSACTION REF</th>
                <th>RECORDED BY</th>
              </tr>
            </thead>
            <tbody>
              <ng-container *ngFor="let inv of invoices">
                <tr *ngFor="let p of inv.payments">
                  <td>
                    <span class="pay-badge">{{ p.paymentNumber }}</span>
                  </td>
                  <td>
                    <span class="inv-badge" style="font-size: 0.75rem;">{{ inv.invoiceNumber }}</span>
                  </td>
                  <td class="font-body-bold">
                    {{ inv.customerName }}
                  </td>
                  <td>
                    <span class="font-heading-3 text-emerald">\${{ p.amount | number:'1.2-2' }}</span>
                  </td>
                  <td>
                    <span class="method-tag">{{ p.method }}</span>
                  </td>
                  <td class="text-muted">
                    {{ p.paymentDateUtc | date:'yyyy-MM-dd HH:mm' }}
                  </td>
                  <td>
                    <span class="ref-badge">{{ p.referenceNumber || '—' }}</span>
                  </td>
                  <td class="text-muted">
                    {{ p.recordedByEmployeeName || 'Finance Officer' }}
                  </td>
                </tr>
              </ng-container>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 3: MONTHLY PAYROLL (ACCOUNTING DESK) -->
      <div *ngIf="activeTab === 'payroll'" class="tab-content">
        <!-- Accounting Payroll Control Banner -->
        <div class="payroll-desk-banner glass-panel" style="padding: 1.25rem 1.5rem; margin-bottom: 1.5rem; border-left: 4px solid #10b981; background: rgba(16, 185, 129, 0.05);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div>
              <div class="badge badge-emerald" style="margin-bottom: 0.35rem;">Accounting Payroll Desk • Abdelrazik Hassan</div>
              <h3 class="font-heading-3" style="color: #f8fafc; margin-bottom: 0.25rem;">Corporate Salary Calculation & Ledger Approval</h3>
              <p class="font-caption" style="color: #94a3b8; max-width: 750px;">
                Calculate monthly payroll batches, base salaries, overtime rates, attendance deductions, and negative vacation deficits. Once approved by Accounting, sheets are synchronized with HR (Amr) for review and payslip email delivery.
              </p>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <select [(ngModel)]="selectedPayrollMonth" (change)="loadPayroll()" class="select-filter font-mono">
                <option [value]="10">October</option>
                <option [value]="11">November</option>
                <option [value]="12">December</option>
              </select>
              <select [(ngModel)]="selectedPayrollYear" (change)="loadPayroll()" class="select-filter font-mono">
                <option [value]="2026">2026</option>
              </select>
              <button (click)="generatePayrollBatch()" [disabled]="payrollLoading" class="btn-primary" title="Calculate salaries for all personnel including Muhammad">
                <span>⚡ Calculate Payroll Batch</span>
              </button>
              <button (click)="approvePayrollBatch()" [disabled]="payrollLoading" class="btn-secondary" style="border-color: #10b981; color: #10b981;" title="Approve batch for HR distribution">
                <span>✓ Approve for HR</span>
              </button>
              <button (click)="downloadMasterSpreadsheet()" class="btn-secondary" title="Download Master Company Ledger as CSV/Excel">
                <span>📥 Master Excel</span>
              </button>
            </div>
          </div>
        </div>

        <!-- STEP 1: Choose Employee for Salary Calculation (Accounting - Abdelrazik) -->
        <div class="glass-panel" style="padding: 1.25rem 1.5rem; margin-bottom: 1.5rem; border: 1px solid rgba(59, 130, 246, 0.35); background: rgba(59, 130, 246, 0.05); border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
                <span class="badge badge-indigo" style="font-weight: 700; letter-spacing: 0.03em;">STEP 1: INITIATE SALARY CALCULATION</span>
                <span class="badge badge-emerald">Accounting (Abdelrazik)</span>
              </div>
              <h4 class="font-heading-4" style="color: #f8fafc; margin-bottom: 0.2rem;">Select Employee & Request HR Attendance / Deduction Sheet</h4>
              <p class="font-caption" style="color: #94a3b8; margin: 0; max-width: 700px;">
                Choose which employee's salary to calculate. This sends a request to HR (Amr) to submit the verified sheet with total holidays, absences, overtime hours, and money consumed.
              </p>
            </div>
            <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <label class="font-caption text-secondary" style="font-weight: 600; white-space: nowrap;">Target Employee:</label>
                <select [(ngModel)]="selectedEmployeeIdForPayroll" class="select-filter font-mono" style="min-width: 250px; background: #0f172a; color: #f8fafc; border: 1px solid #334155; padding: 0.5rem 0.75rem; border-radius: 8px;">
                  <option value="">-- Choose Employee --</option>
                  <option *ngFor="let emp of employees" [value]="emp.id">
                    {{ emp.fullName }} ({{ emp.jobTitle }} • {{ emp.departmentName }})
                  </option>
                </select>
              </div>
              <button (click)="initiatePayrollForSelected()" [disabled]="payrollLoading || !selectedEmployeeIdForPayroll" class="btn-primary" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); border: none; padding: 0.6rem 1.25rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35); border-radius: 8px; cursor: pointer;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
                <span>Request HR Attendance Sheet</span>
              </button>
            </div>
          </div>
        </div>

        <!-- KPI Summary Ribbon -->
        <div class="metrics-grid" style="margin-bottom: 1.5rem;">
          <div class="metric-card glass-panel">
            <div class="metric-header">
              <span class="metric-label">TOTAL GROSS EXPENSE</span>
              <span class="metric-icon">💼</span>
            </div>
            <div class="metric-value font-heading-2 text-indigo">\${{ totalGrossPay | number:'1.2-2' }}</div>
            <span class="metric-sub text-muted">Base salaries + overtime</span>
          </div>

          <div class="metric-card glass-panel">
            <div class="metric-header">
              <span class="metric-label">NET SALARIES DISBURSABLE</span>
              <span class="metric-icon">💵</span>
            </div>
            <div class="metric-value font-heading-2 text-emerald">\${{ totalNetPay | number:'1.2-2' }}</div>
            <span class="metric-sub text-muted">Net after withholdings</span>
          </div>

          <div class="metric-card glass-panel">
            <div class="metric-header">
              <span class="metric-label">OVERTIME DISBURSED</span>
              <span class="metric-icon">⚡</span>
            </div>
            <div class="metric-value font-heading-2 text-cyan">\${{ totalOvertimePay | number:'1.2-2' }}</div>
            <span class="metric-sub text-muted">From attendance tracker</span>
          </div>

          <div class="metric-card glass-panel">
            <div class="metric-header">
              <span class="metric-label">VACATION DEFICIT DEDUCTIONS</span>
              <span class="metric-icon">🏖️</span>
            </div>
            <div class="metric-value font-heading-2 text-rose">\${{ totalVacationDeficitDeductions | number:'1.2-2' }}</div>
            <span class="metric-sub text-muted">Unpaid leave below 0 balance</span>
          </div>
        </div>

        <!-- Master Itemized Payroll Table -->
        <div class="table-container glass-panel">
          <div style="padding: 1rem 1.25rem; border-bottom: 1px solid rgba(255, 255, 255, 0.08); display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h4 class="font-heading-4">Calculated Salary Sheets & Personnel Compensation</h4>
              <p class="font-caption text-secondary">October 2026 Monthly Statement • Prepared by Accounting Desk (Abdelrazik)</p>
            </div>
            <span class="badge badge-emerald">{{ payrollRecords.length }} Personnel Reconciled</span>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th>PAYROLL #</th>
                <th>EMPLOYEE</th>
                <th>DEPARTMENT</th>
                <th>BASE SALARY</th>
                <th>OVERTIME</th>
                <th>DEDUCTIONS</th>
                <th>NET SALARY</th>
                <th>WORKFLOW STATUS</th>
                <th>HR EMAIL SYNC</th>
                <th style="text-align: right;">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let rec of payrollRecords" class="table-row">
                <td class="font-mono text-secondary">{{ rec.payrollNumber }}</td>
                <td>
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div style="width: 32px; height: 32px; border-radius: 50%; background: #3b82f6; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 0.75rem;">
                      {{ rec.employeeName.charAt(0) }}
                    </div>
                    <div>
                      <div class="font-body-bold">{{ rec.employeeName }}</div>
                      <div class="font-caption text-secondary">{{ rec.email }}</div>
                      <div *ngIf="rec.notes" class="font-caption" style="color: #38bdf8; font-size: 0.72rem; margin-top: 0.2rem; max-width: 300px;">
                        📝 {{ rec.notes }}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="badge badge-cyan">{{ rec.departmentName }}</span>
                </td>
                <td class="font-mono">\${{ rec.baseSalary | number:'1.2-2' }}</td>
                <td>
                  <div *ngIf="rec.overtimeHours > 0">
                    <span class="font-mono text-cyan">+\${{ rec.overtimePay | number:'1.2-2' }}</span>
                    <div class="font-caption text-secondary">{{ rec.overtimeHours }}h &#64; \${{ rec.overtimeRate }}/h</div>
                  </div>
                  <span *ngIf="rec.overtimeHours === 0" class="text-secondary">—</span>
                </td>
                <td class="font-mono text-rose">
                  -\${{ rec.totalDeductions | number:'1.2-2' }}
                  <div *ngIf="rec.absenceDeduction > 0" class="font-caption" style="color: #f43f5e; font-size: 0.7rem;">
                    Consumed: \${{ rec.absenceDeduction | number:'1.2-2' }}
                  </div>
                </td>
                <td>
                  <span class="font-mono font-bold text-emerald" style="font-size: 1rem;">
                    \${{ rec.netPay | number:'1.2-2' }}
                  </span>
                </td>
                <td>
                  <span *ngIf="rec.status === 'PendingHrSheet'" class="badge" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); padding: 0.35rem 0.6rem;">
                    ⏳ Awaiting HR Sheet
                  </span>
                  <span *ngIf="rec.status === 'HrSheetSubmitted'" class="badge" style="background: rgba(6, 182, 212, 0.2); color: #22d3ee; border: 1px solid rgba(6, 182, 212, 0.4); padding: 0.35rem 0.6rem;">
                    📥 HR Sheet Received
                  </span>
                  <span *ngIf="rec.status === 'Approved'" class="badge badge-emerald" style="padding: 0.35rem 0.6rem;">
                    ✓ Approved • Sent to HR
                  </span>
                  <span *ngIf="rec.status === 'Paid'" class="badge" style="background: rgba(99, 102, 241, 0.2); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.4); padding: 0.35rem 0.6rem;">
                    ✉️ Paid & Emailed
                  </span>
                  <span *ngIf="rec.status === 'Draft'" class="badge badge-slate">
                    Draft
                  </span>
                </td>
                <td>
                  <span *ngIf="rec.isEmailedToEmployee" class="badge badge-emerald" title="Dispatched by HR">
                    ✉️ Emailed
                  </span>
                  <span *ngIf="!rec.isEmailedToEmployee && rec.status === 'Approved'" class="badge badge-cyan" title="Awaiting HR Email Dispatch">
                    📤 Pending HR Email
                  </span>
                  <span *ngIf="!rec.isEmailedToEmployee && rec.status !== 'Approved'" class="badge badge-amber" title="Awaiting HR Review">
                    ⏳ In Calculation
                  </span>
                </td>
                <td style="text-align: right;">
                  <div style="display: flex; gap: 0.4rem; justify-content: flex-end; align-items: center;">
                    <!-- Step 3 Action: When HR sheet is submitted, Abdelrazik makes payroll & sends to HR -->
                    <button *ngIf="rec.status === 'HrSheetSubmitted'"
                            (click)="finalizePayrollRecordToHr(rec)"
                            class="btn-primary"
                            style="padding: 0.4rem 0.85rem; font-size: 0.75rem; background: linear-gradient(135deg, #10b981, #059669); border: none; display: flex; align-items: center; gap: 0.35rem; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);"
                            title="Calculate Net Salary from HR Sheet and Send to HR">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                      <span>⚡ Step 3: Make Payroll & Send to HR</span>
                    </button>

                    <button (click)="downloadIndividualPayslip(rec)" class="btn-icon btn-action-emerald" title="Download Excel/CSV Payslip">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- MODAL: CREATE INVOICE -->
      <div *ngIf="showCreateModal" class="modal-backdrop">
        <div class="modal-card glass-panel" style="max-width: 750px;">
          <div class="modal-header">
            <div class="badge badge-indigo">Invoice Creation</div>
            <h2 class="font-heading-2">Draft Client Invoice</h2>
            <p class="font-caption">Build customer billing statement with automatic SKU itemization and tax calculation</p>
          </div>

          <form (ngSubmit)="submitCreateInvoice()" class="modal-form">
            <div class="form-row-2">
              <div class="form-group">
                <label>Customer Account *</label>
                <select [(ngModel)]="newInvoice.customerId" name="customerId" required class="form-input">
                  <option value="">Select Customer...</option>
                  <option *ngFor="let c of customers" [value]="c.id">{{ c.companyName }}</option>
                </select>
              </div>

              <div class="form-group">
                <label>Linked Deal / Opportunity (Optional)</label>
                <select [(ngModel)]="newInvoice.dealId" name="dealId" class="form-input">
                  <option [ngValue]="undefined">None (Standalone Invoice)</option>
                  <option *ngFor="let d of deals" [value]="d.id">{{ d.title }} (\${{ d.amount }})</option>
                </select>
              </div>
            </div>

            <div class="form-row-3">
              <div class="form-group">
                <label>Due Date *</label>
                <input
                  type="date"
                  [(ngModel)]="newInvoiceDueDate"
                  name="dueDate"
                  required
                  class="form-input" />
              </div>

              <div class="form-group">
                <label>Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  [(ngModel)]="newInvoice.taxRate"
                  name="taxRate"
                  class="form-input" />
              </div>

              <div class="form-group">
                <label>Discount Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  [(ngModel)]="newInvoice.discountAmount"
                  name="discountAmount"
                  class="form-input" />
              </div>
            </div>

            <!-- Dynamic Line Items Builder -->
            <div class="form-divider">
              <span>LINE ITEMS & CATALOG SELECTION</span>
            </div>

            <div class="line-items-builder">
              <div *ngFor="let item of newInvoiceItems; let i = index" class="line-item-row">
                <div class="item-product-select">
                  <select (change)="onProductSelect(i, $event)" class="form-input" style="font-size: 0.8rem;">
                    <option value="">Choose Catalog SKU...</option>
                    <option *ngFor="let p of products" [value]="p.id">
                      {{ p.sku }} — {{ p.name }} (\${{ p.unitPrice }})
                    </option>
                  </select>
                </div>

                <div class="item-desc">
                  <input
                    type="text"
                    [(ngModel)]="item.description"
                    [name]="'desc_' + i"
                    required
                    placeholder="Item description..."
                    class="form-input" />
                </div>

                <div class="item-qty">
                  <input
                    type="number"
                    min="1"
                    [(ngModel)]="item.quantity"
                    [name]="'qty_' + i"
                    required
                    placeholder="Qty"
                    class="form-input" />
                </div>

                <div class="item-price">
                  <input
                    type="number"
                    step="0.01"
                    [(ngModel)]="item.unitPrice"
                    [name]="'price_' + i"
                    required
                    placeholder="Price"
                    class="form-input" />
                </div>

                <div class="item-total font-body-bold">
                  \${{ (item.quantity * item.unitPrice) | number:'1.2-2' }}
                </div>

                <button
                  type="button"
                  *ngIf="newInvoiceItems.length > 1"
                  (click)="removeLineItem(i)"
                  class="btn-icon text-rose"
                  title="Remove Item">
                  ✕
                </button>
              </div>

              <button type="button" (click)="addLineItem()" class="btn-secondary" style="font-size: 0.8rem; padding: 0.4rem 0.75rem; width: fit-content;">
                + Add Another Line Item
              </button>
            </div>

            <!-- Live Calculation Summary -->
            <div class="calc-summary glass-panel">
              <div class="calc-line">
                <span class="text-muted">Subtotal:</span>
                <span>\${{ calculateDraftSubtotal() | number:'1.2-2' }}</span>
              </div>
              <div class="calc-line" *ngIf="newInvoice.discountAmount > 0">
                <span class="text-muted">Discount:</span>
                <span class="text-rose">-\${{ newInvoice.discountAmount | number:'1.2-2' }}</span>
              </div>
              <div class="calc-line">
                <span class="text-muted">Estimated Tax ({{ newInvoice.taxRate }}%):</span>
                <span>\${{ calculateDraftTax() | number:'1.2-2' }}</span>
              </div>
              <div class="calc-line total font-heading-3 text-emerald">
                <span>Grand Total:</span>
                <span>\${{ calculateDraftTotal() | number:'1.2-2' }}</span>
              </div>
            </div>

            <div class="form-group">
              <label>Client Notes & Special Instructions</label>
              <textarea
                [(ngModel)]="newInvoice.notes"
                name="notes"
                rows="2"
                placeholder="Payment terms, wire instructions, project milestones..."
                class="form-input"></textarea>
            </div>

            <div class="modal-actions">
              <button type="button" (click)="showCreateModal = false" class="btn-ghost">Cancel</button>
              <button type="submit" [disabled]="isSubmitting" class="btn-primary">
                {{ isSubmitting ? 'Saving Draft...' : 'Save Draft Invoice' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL: RECORD PAYMENT -->
      <div *ngIf="showPaymentModal && activePaymentInvoice" class="modal-backdrop">
        <div class="modal-card glass-panel" style="max-width: 500px;">
          <div class="modal-header">
            <div class="badge badge-cyan">Cash Inflow</div>
            <h2 class="font-heading-2">Record Customer Payment</h2>
            <p class="font-caption">Invoice: {{ activePaymentInvoice.invoiceNumber }} — {{ activePaymentInvoice.customerName }}</p>
          </div>

          <div class="payment-balance-summary glass-panel">
            <div>
              <span class="text-muted">Total Invoice:</span>
              <strong style="margin-left: 0.5rem;">\${{ activePaymentInvoice.totalAmount | number:'1.2-2' }}</strong>
            </div>
            <div>
              <span class="text-muted">Remaining Due:</span>
              <strong class="text-amber" style="margin-left: 0.5rem;">\${{ activePaymentInvoice.balanceDue | number:'1.2-2' }}</strong>
            </div>
          </div>

          <form (ngSubmit)="submitRecordPayment()" class="modal-form">
            <div class="form-group">
              <label>Payment Amount ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                [max]="activePaymentInvoice.balanceDue"
                [(ngModel)]="paymentRequest.amount"
                name="amount"
                required
                class="form-input font-heading-3 text-emerald" />
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label>Payment Method *</label>
                <select [(ngModel)]="paymentRequest.method" name="method" required class="form-input">
                  <option value="BankTransfer">Bank Transfer (Wire/ACH)</option>
                  <option value="CreditCard">Credit Card</option>
                  <option value="Check">Corporate Check</option>
                  <option value="Electronic">Online Gateway</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              <div class="form-group">
                <label>Reference # / Wire ID</label>
                <input
                  type="text"
                  [(ngModel)]="paymentRequest.referenceNumber"
                  name="refNum"
                  placeholder="e.g. WIRE-89214"
                  class="form-input mono" />
              </div>
            </div>

            <div class="form-group">
              <label>Payment Notes</label>
              <input
                type="text"
                [(ngModel)]="paymentRequest.notes"
                name="notes"
                placeholder="Optional confirmation memo..."
                class="form-input" />
            </div>

            <div class="modal-actions">
              <button type="button" (click)="showPaymentModal = false" class="btn-ghost">Cancel</button>
              <button type="submit" [disabled]="isSubmitting" class="btn-primary">
                {{ isSubmitting ? 'Recording...' : 'Record Payment' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL: INVOICE PREVIEW / DETAIL -->
      <div *ngIf="showPreviewModal && previewInvoice" class="modal-backdrop">
        <div class="modal-card glass-panel invoice-sheet" style="max-width: 800px;">
          <!-- Invoice Document Header -->
          <div class="sheet-header">
            <div>
              <div class="sheet-logo">ORBIT BUSINESS SUITE</div>
              <div class="text-muted" style="font-size: 0.8rem;">Cloud ERP & Enterprise Architecture</div>
            </div>
            <div style="text-align: right;">
              <span class="inv-number font-heading-2 text-indigo">{{ previewInvoice.invoiceNumber }}</span>
              <div style="margin-top: 0.25rem;">
                <span class="badge" [ngClass]="getInvoiceBadgeClass(previewInvoice)">
                  {{ previewInvoice.isOverdue ? 'Overdue' : previewInvoice.status }}
                </span>
              </div>
            </div>
          </div>

          <div class="sheet-meta-grid">
            <div>
              <div class="text-muted" style="font-size: 0.75rem;">BILLED TO:</div>
              <div class="font-body-bold" style="font-size: 1.1rem; margin-top: 0.25rem;">{{ previewInvoice.customerName }}</div>
              <div class="text-muted">{{ previewInvoice.customerEmail }}</div>
            </div>
            <div style="text-align: right;">
              <div><span class="text-muted">Issue Date:</span> {{ previewInvoice.issueDateUtc | date:'mediumDate' }}</div>
              <div><span class="text-muted">Payment Due:</span> {{ previewInvoice.dueDateUtc | date:'mediumDate' }}</div>
              <div *ngIf="previewInvoice.paidAtUtc"><span class="text-emerald">Paid In Full:</span> {{ previewInvoice.paidAtUtc | date:'mediumDate' }}</div>
            </div>
          </div>

          <!-- Items Table -->
          <table class="sheet-table">
            <thead>
              <tr>
                <th>DESCRIPTION</th>
                <th>QTY</th>
                <th>UNIT PRICE</th>
                <th style="text-align: right;">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of previewInvoice.items">
                <td>
                  <span *ngIf="item.productSku" class="sku-badge" style="font-size: 0.7rem; margin-right: 0.5rem;">{{ item.productSku }}</span>
                  <span>{{ item.description }}</span>
                </td>
                <td>{{ item.quantity }}</td>
                <td>\${{ item.unitPrice | number:'1.2-2' }}</td>
                <td style="text-align: right;" class="font-body-bold">\${{ item.totalAmount | number:'1.2-2' }}</td>
              </tr>
            </tbody>
          </table>

          <!-- Totals Calculation -->
          <div class="sheet-totals">
            <div class="total-line">
              <span class="text-muted">Subtotal:</span>
              <span>\${{ previewInvoice.subtotal | number:'1.2-2' }}</span>
            </div>
            <div class="total-line" *ngIf="previewInvoice.discountAmount > 0">
              <span class="text-muted">Discount:</span>
              <span class="text-rose">-\${{ previewInvoice.discountAmount | number:'1.2-2' }}</span>
            </div>
            <div class="total-line">
              <span class="text-muted">Tax ({{ previewInvoice.taxRate }}%):</span>
              <span>\${{ previewInvoice.taxAmount | number:'1.2-2' }}</span>
            </div>
            <div class="total-line grand-total font-heading-3">
              <span>Total Invoiced:</span>
              <span class="text-indigo">\${{ previewInvoice.totalAmount | number:'1.2-2' }}</span>
            </div>
            <div class="total-line" *ngIf="previewInvoice.amountPaid > 0">
              <span class="text-muted">Amount Paid:</span>
              <span class="text-emerald">-\${{ previewInvoice.amountPaid | number:'1.2-2' }}</span>
            </div>
            <div class="total-line grand-total font-heading-2" style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.5rem;">
              <span>Balance Due:</span>
              <span [class.text-emerald]="previewInvoice.balanceDue === 0" [class.text-amber]="previewInvoice.balanceDue > 0">
                \${{ previewInvoice.balanceDue | number:'1.2-2' }}
              </span>
            </div>
          </div>

          <!-- Notes -->
          <div *ngIf="previewInvoice.notes" class="sheet-notes">
            <span class="font-body-bold">Payment Instructions / Notes:</span>
            <p class="text-muted" style="margin: 0.25rem 0 0 0;">{{ previewInvoice.notes }}</p>
          </div>

          <div class="modal-actions" style="margin-top: 2rem;">
            <button type="button" (click)="showPreviewModal = false" class="btn-ghost">Close</button>
            <button type="button" (click)="printInvoice()" class="btn-secondary" title="Print Invoice or Export to PDF">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              <span>Print / PDF</span>
            </button>
            <button
              *ngIf="canManageInvoices && previewInvoice.status === 'Draft'"
              type="button"
              (click)="issueInvoice(previewInvoice)"
              class="btn-primary">
              Issue Invoice
            </button>
            <button
              *ngIf="canManageInvoices && (previewInvoice.status === 'Issued' || previewInvoice.status === 'PartiallyPaid' || previewInvoice.isOverdue)"
              type="button"
              (click)="openRecordPaymentModal(previewInvoice)"
              class="btn-primary">
              Record Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .finance-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding-bottom: 3rem;
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
      align-items: center;
    }

    /* Role Banner */
    .role-scope-banner {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      padding: 1rem 1.5rem;
      background: rgba(15, 23, 42, 0.65);
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: 12px;
      backdrop-filter: blur(12px);
    }

    .scope-icon {
      font-size: 2rem;
    }

    .scope-title {
      font-size: 0.85rem;
      font-weight: 700;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .scope-explanation {
      margin: 0.35rem 0 0 0;
      font-size: 0.9rem;
      color: #cbd5e1;
      line-height: 1.4;
    }

    /* Metrics Row */
    .metrics-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
    }

    .metric-card {
      padding: 1.25rem;
      border-radius: 12px;
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .metric-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #94a3b8;
    }

    .metric-value {
      font-size: 1.75rem;
      font-weight: 800;
    }

    .metric-sub {
      font-size: 0.8rem;
    }

    /* Tabs */
    .tabs-container {
      display: flex;
      gap: 0.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 0.5rem;
    }

    .tab-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      background: transparent;
      border: 1px solid transparent;
      color: #94a3b8;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .tab-btn:hover {
      color: #f8fafc;
      background: rgba(255, 255, 255, 0.04);
    }

    .tab-btn.active {
      color: #10b981;
      background: rgba(16, 185, 129, 0.1);
      border-color: rgba(16, 185, 129, 0.3);
    }

    /* Filters Bar */
    .filters-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      padding: 0.75rem 1rem;
      border-radius: 10px;
      margin-bottom: 1rem;
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .search-input-wrapper {
      position: relative;
      flex: 1;
      min-width: 250px;
    }

    .search-icon {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      color: #64748b;
    }

    .search-input {
      width: 100%;
      padding: 0.5rem 0.75rem 0.5rem 2.25rem;
      border-radius: 6px;
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #f8fafc;
      font-size: 0.9rem;
      outline: none;
    }

    .search-input:focus {
      border-color: #10b981;
    }

    .filter-group {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .select-filter {
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
      font-size: 0.85rem;
      outline: none;
    }

    /* Tables */
    .table-container {
      border-radius: 12px;
      overflow-x: auto;
      background: rgba(15, 23, 42, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.875rem;
    }

    .data-table th {
      padding: 0.85rem 1rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #94a3b8;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(15, 23, 42, 0.7);
    }

    .data-table td {
      padding: 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      vertical-align: middle;
    }

    .data-table tbody tr:hover {
      background: rgba(255, 255, 255, 0.02);
    }

    .inv-badge {
      font-family: monospace;
      font-size: 0.85rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
      border: 1px solid rgba(99, 102, 241, 0.25);
      display: inline-block;
    }

    .pay-badge {
      font-family: monospace;
      font-size: 0.8rem;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.25);
      display: inline-block;
    }

    .sku-badge {
      font-family: monospace;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.25);
    }

    .method-tag {
      font-size: 0.8rem;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.05);
      color: #cbd5e1;
    }

    .deal-tag {
      font-size: 0.75rem;
      margin-top: 0.25rem;
    }

    .date-cell {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      font-size: 0.8rem;
    }

    .balance-cell {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 140px;
    }

    .balance-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .balance-bar-bg {
      height: 4px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.1);
      overflow: hidden;
    }

    .balance-bar-fill {
      height: 100%;
      background: #10b981;
      border-radius: 2px;
      transition: width 0.3s ease;
    }

    .action-buttons {
      display: flex;
      gap: 0.35rem;
      justify-content: flex-end;
    }

    .btn-icon {
      padding: 0.4rem;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .btn-icon:hover {
      background: rgba(255, 255, 255, 0.15);
      color: #f8fafc;
    }

    .btn-action-emerald:hover {
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
      border-color: rgba(16, 185, 129, 0.4);
    }

    .btn-action-cyan:hover {
      background: rgba(56, 189, 248, 0.2);
      color: #38bdf8;
      border-color: rgba(56, 189, 248, 0.4);
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
    }

    .empty-icon {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }

    /* Modal Backdrop */
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
      padding: 1rem;
    }

    .modal-card {
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      padding: 2rem;
      border-radius: 16px;
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }

    .modal-header {
      margin-bottom: 1.5rem;
    }

    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .form-group label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #94a3b8;
    }

    .form-input {
      padding: 0.65rem 0.85rem;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #f8fafc;
      font-size: 0.9rem;
      outline: none;
    }

    .form-input:focus {
      border-color: #10b981;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
    }

    .form-row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-row-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
    }

    .form-divider {
      display: flex;
      align-items: center;
      font-size: 0.75rem;
      font-weight: 700;
      color: #64748b;
      margin: 0.5rem 0;
      letter-spacing: 0.05em;
    }

    /* Line Items Builder */
    .line-items-builder {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .line-item-row {
      display: grid;
      grid-template-columns: 180px 1fr 70px 100px 90px 30px;
      gap: 0.5rem;
      align-items: center;
    }

    .calc-summary {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      padding: 1rem;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.25);
    }

    .calc-line {
      display: flex;
      justify-content: space-between;
      font-size: 0.9rem;
    }

    .calc-line.total {
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 0.5rem;
      margin-top: 0.25rem;
    }

    .payment-balance-summary {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.2);
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }

    /* Invoice Sheet Preview */
    .invoice-sheet {
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .sheet-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .sheet-logo {
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: #f8fafc;
    }

    .sheet-meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
      font-size: 0.9rem;
    }

    .sheet-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1.5rem;
      font-size: 0.875rem;
    }

    .sheet-table th {
      padding: 0.65rem 0.75rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      font-size: 0.75rem;
      text-align: left;
    }

    .sheet-table td {
      padding: 0.75rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }

    .sheet-totals {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      align-items: flex-end;
      margin-bottom: 1.5rem;
    }

    .total-line {
      display: flex;
      justify-content: space-between;
      width: 250px;
      font-size: 0.9rem;
    }

    .sheet-notes {
      padding: 0.75rem 1rem;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.25);
      font-size: 0.85rem;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    /* Common Buttons */
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      background: linear-gradient(135deg, #10b981 0%, #6366f1 100%);
      color: #ffffff;
      font-weight: 600;
      font-size: 0.9rem;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
      transition: all 0.2s ease;
    }

    .btn-primary:hover:not(:disabled) {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #f8fafc;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    .btn-ghost {
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
    }

    .btn-ghost:hover {
      color: #f8fafc;
      background: rgba(255, 255, 255, 0.05);
    }

    .text-emerald { color: #10b981; }
    .text-indigo { color: #818cf8; }
    .text-cyan { color: #38bdf8; }
    .text-amber { color: #fbbf24; }
    .text-rose { color: #f43f5e; }
    .text-muted { color: #94a3b8; }

    /* Professional Print / PDF Export Styling */
    @media print {
      body * {
        visibility: hidden !important;
      }
      .modal-backdrop,
      .modal-card.invoice-sheet,
      .modal-card.invoice-sheet * {
        visibility: visible !important;
      }
      .modal-backdrop {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        height: auto !important;
        background: #ffffff !important;
        backdrop-filter: none !important;
        padding: 0 !important;
        margin: 0 !important;
        display: block !important;
      }
      .modal-card.invoice-sheet {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        box-shadow: none !important;
        border: none !important;
        background: #ffffff !important;
        color: #0f172a !important;
        padding: 2rem !important;
        border-radius: 0 !important;
      }
      .sheet-header .sheet-logo {
        color: #0f172a !important;
        font-size: 1.5rem !important;
        font-weight: 800 !important;
      }
      .sheet-header .inv-number {
        color: #0f172a !important;
      }
      .text-muted {
        color: #475569 !important;
      }
      .sheet-table {
        width: 100% !important;
        border-collapse: collapse !important;
        margin: 1.5rem 0 !important;
      }
      .sheet-table th {
        background: #f1f5f9 !important;
        color: #1e293b !important;
        border-bottom: 2px solid #cbd5e1 !important;
        padding: 0.75rem !important;
      }
      .sheet-table td {
        border-bottom: 1px solid #e2e8f0 !important;
        color: #0f172a !important;
        padding: 0.75rem !important;
      }
      .sheet-totals .total-line {
        color: #0f172a !important;
      }
      .sheet-totals .text-indigo,
      .sheet-totals .text-emerald,
      .sheet-totals .text-amber {
        color: #0f172a !important;
        font-weight: bold !important;
      }
      .sheet-notes {
        background: #f8fafc !important;
        border: 1px solid #e2e8f0 !important;
        color: #334155 !important;
      }
      .modal-actions,
      .btn-ghost,
      .btn-primary,
      .btn-secondary {
        display: none !important;
      }
    }
  `]
})
export class FinanceComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  public activeTenant$ = this.auth.activeTenant$;
  public currentRole: TenantRole = 'Owner';

  public activeTab: 'invoices' | 'payments' | 'payroll' = 'invoices';

  public payrollRecords: PayrollRecord[] = [];
  public payrollSummary: PayrollSummary | null = null;
  public selectedPayrollYear = 2026;
  public selectedPayrollMonth = 10;
  public payrollLoading = false;
  public employees: Employee[] = [];
  public selectedEmployeeIdForPayroll: string = '';

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

  public invoices: Invoice[] = [];
  public filteredInvoices: Invoice[] = [];
  public customers: Customer[] = [];
  public products: Product[] = [];
  public deals: Deal[] = [];
  public metrics: FinancialMetrics | null = null;

  // Filters
  public searchQuery = '';
  public statusFilter = '';
  public customerFilter = '';

  // Modals state
  public showCreateModal = false;
  public showPaymentModal = false;
  public showPreviewModal = false;
  public isSubmitting = false;

  public newInvoice: CreateInvoiceRequest = {
    customerId: '',
    currency: 'USD',
    taxRate: 10,
    discountAmount: 0,
    items: []
  };
  public newInvoiceDueDate = '';
  public newInvoiceItems: CreateInvoiceItemRequest[] = [
    { description: '', quantity: 1, unitPrice: 0 }
  ];

  public activePaymentInvoice: Invoice | null = null;
  public paymentRequest: RecordPaymentRequest = {
    amount: 0,
    method: 'BankTransfer'
  };

  public previewInvoice: Invoice | null = null;

  public get canManageInvoices(): boolean {
    return this.currentRole === 'Owner' || this.currentRole === 'Admin' || this.currentRole === 'Manager';
  }

  public ngOnInit(): void {
    this.activeTenant$.subscribe(t => {
      if (t) {
        this.currentRole = t.role;
      }
    });

    this.loadInvoices();
    this.loadMetrics();
    this.loadCustomers();
    this.loadProducts();
    this.loadDeals();
    this.loadPayroll();
    this.loadEmployees();
  }

  public loadInvoices(): void {
    this.api.getInvoices().subscribe(res => {
      if (res.success && res.data) {
        this.invoices = res.data.data;
        this.applyFilters();
      }
    });
  }

  public loadMetrics(): void {
    this.api.getFinancialMetrics().subscribe(res => {
      if (res.success && res.data) {
        this.metrics = res.data;
      }
    });
  }

  public loadCustomers(): void {
    this.api.getCustomers().subscribe(res => {
      if (res.success && res.data) {
        this.customers = res.data.data;
      }
    });
  }

  public loadProducts(): void {
    this.api.getProducts().subscribe(res => {
      if (res.success && res.data) {
        this.products = res.data.data;
      }
    });
  }

  public loadDeals(): void {
    this.api.getDeals().subscribe(res => {
      if (res.success && res.data) {
        this.deals = res.data.data;
      }
    });
  }

  public applyFilters(): void {
    let list = [...this.invoices];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(i =>
        i.invoiceNumber.toLowerCase().includes(q) ||
        i.customerName.toLowerCase().includes(q) ||
        (i.notes && i.notes.toLowerCase().includes(q))
      );
    }

    if (this.statusFilter) {
      if (this.statusFilter === 'Overdue') {
        list = list.filter(i => i.isOverdue);
      } else {
        list = list.filter(i => i.status === this.statusFilter);
      }
    }

    if (this.customerFilter) {
      list = list.filter(i => i.customerId === this.customerFilter);
    }

    this.filteredInvoices = list;
  }

  // Create Invoice helpers
  public openCreateModal(): void {
    this.newInvoice = {
      customerId: this.customers.length > 0 ? this.customers[0].id : '',
      currency: 'USD',
      taxRate: 10,
      discountAmount: 0,
      notes: 'Payment terms: Net 30 days.',
      termsAndConditions: 'Late payments subject to monthly financing charges.',
      items: []
    };
    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 30);
    this.newInvoiceDueDate = defaultDue.toISOString().split('T')[0];

    this.newInvoiceItems = [
      {
        productId: this.products.length > 0 ? this.products[0].id : undefined,
        description: this.products.length > 0 ? this.products[0].name : 'Professional Consulting',
        quantity: 1,
        unitPrice: this.products.length > 0 ? this.products[0].unitPrice : 150
      }
    ];

    this.showCreateModal = true;
  }

  public addLineItem(): void {
    this.newInvoiceItems.push({
      description: '',
      quantity: 1,
      unitPrice: 0
    });
  }

  public removeLineItem(index: number): void {
    this.newInvoiceItems.splice(index, 1);
  }

  public onProductSelect(index: number, event: any): void {
    const prodId = event.target.value;
    const prod = this.products.find(p => p.id === prodId);
    if (prod) {
      this.newInvoiceItems[index].productId = prod.id;
      this.newInvoiceItems[index].description = prod.name;
      this.newInvoiceItems[index].unitPrice = prod.unitPrice;
    }
  }

  public calculateDraftSubtotal(): number {
    return this.newInvoiceItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  }

  public calculateDraftTax(): number {
    const sub = this.calculateDraftSubtotal();
    const taxable = Math.max(0, sub - (this.newInvoice.discountAmount || 0));
    return Math.round(taxable * (this.newInvoice.taxRate / 100) * 100) / 100;
  }

  public calculateDraftTotal(): number {
    const sub = this.calculateDraftSubtotal();
    const taxable = Math.max(0, sub - (this.newInvoice.discountAmount || 0));
    return taxable + this.calculateDraftTax();
  }

  public submitCreateInvoice(): void {
    if (!this.newInvoice.customerId || this.newInvoiceItems.length === 0) return;
    this.isSubmitting = true;

    this.newInvoice.dueDateUtc = new Date(this.newInvoiceDueDate).toISOString();
    this.newInvoice.items = this.newInvoiceItems;

    this.api.createInvoice(this.newInvoice).subscribe({
      next: res => {
        this.isSubmitting = false;
        if (res.success) {
          this.showCreateModal = false;
          this.loadInvoices();
          this.loadMetrics();
        }
      },
      error: () => {
        this.isSubmitting = false;
      }
    });
  }

  public issueInvoice(inv: Invoice): void {
    this.api.issueInvoice(inv.id).subscribe(res => {
      if (res.success) {
        if (this.showPreviewModal && this.previewInvoice && this.previewInvoice.id === inv.id) {
          this.previewInvoice.status = 'Issued';
          this.previewInvoice.statusName = 'Issued';
        }
        this.loadInvoices();
        this.loadMetrics();
      }
    });
  }

  public openRecordPaymentModal(inv: Invoice): void {
    this.activePaymentInvoice = inv;
    this.paymentRequest = {
      amount: inv.balanceDue,
      method: 'BankTransfer',
      notes: `Payment for ${inv.invoiceNumber}`
    };
    this.showPaymentModal = true;
  }

  public submitRecordPayment(): void {
    if (!this.activePaymentInvoice || this.paymentRequest.amount <= 0) return;
    this.isSubmitting = true;

    this.api.recordPayment(this.activePaymentInvoice.id, this.paymentRequest).subscribe({
      next: res => {
        this.isSubmitting = false;
        if (res.success) {
          this.showPaymentModal = false;
          const preview = this.previewInvoice;
          if (this.showPreviewModal && preview && this.activePaymentInvoice && preview.id === this.activePaymentInvoice.id) {
            preview.amountPaid += this.paymentRequest.amount;
            preview.balanceDue = Math.max(0, preview.totalAmount - preview.amountPaid);
            if (preview.balanceDue === 0) {
              preview.status = 'Paid';
              preview.statusName = 'Paid';
            } else {
              preview.status = 'PartiallyPaid';
              preview.statusName = 'PartiallyPaid';
            }
          }
          this.loadInvoices();
          this.loadMetrics();
        }
      },
      error: () => {
        this.isSubmitting = false;
      }
    });
  }

  public viewInvoiceDetails(inv: Invoice): void {
    this.previewInvoice = inv;
    this.showPreviewModal = true;
  }

  public getPaymentProgress(inv: Invoice): number {
    if (inv.totalAmount <= 0) return 0;
    return Math.min(100, Math.round((inv.amountPaid / inv.totalAmount) * 100));
  }

  public getRoleBadgeClass(role: TenantRole): string {
    switch (role) {
      case 'Owner': return 'badge-amber';
      case 'Admin': return 'badge-indigo';
      case 'Manager': return 'badge-cyan';
      default: return 'badge-emerald';
    }
  }

  public getInvoiceBadgeClass(inv: Invoice): string {
    if (inv.isOverdue) return 'badge-rose';
    switch (inv.status) {
      case 'Paid': return 'badge-emerald';
      case 'PartiallyPaid': return 'badge-amber';
      case 'Issued': return 'badge-cyan';
      case 'Draft': return 'badge-indigo';
      case 'Void': return 'badge-rose';
      default: return 'badge-indigo';
    }
  }

  public exportFinanceCsv(): void {
    if (this.activeTab === 'payments') {
      const headers = ['Receipt #', 'Invoice #', 'Customer Name', 'Amount Received', 'Payment Method', 'Date Received', 'Transaction Ref', 'Recorded By'];
      const rows: string[][] = [];
      this.invoices.forEach(inv => {
        (inv.payments || []).forEach(p => {
          rows.push([
            `"${p.paymentNumber}"`,
            `"${inv.invoiceNumber}"`,
            `"${inv.customerName.replace(/"/g, '""')}"`,
            `"${p.amount}"`,
            `"${p.method}"`,
            `"${p.paymentDateUtc || ''}"`,
            `"${(p.referenceNumber || '').replace(/"/g, '""')}"`,
            `"${(p.recordedByEmployeeName || 'Finance Officer').replace(/"/g, '""')}"`
          ]);
        });
      });
      this.downloadCsvFile([headers.join(','), ...rows.map(r => r.join(','))].join('\n'), `orbit-finance-payments-${Date.now()}.csv`);
    } else {
      const headers = ['Invoice #', 'Customer Name', 'Customer Email', 'Deal Title', 'Issue Date', 'Due Date', 'Subtotal', 'Tax Amount', 'Total Amount', 'Amount Paid', 'Balance Due', 'Status', 'Is Overdue'];
      const rows = this.filteredInvoices.map(inv => [
        `"${inv.invoiceNumber}"`,
        `"${inv.customerName.replace(/"/g, '""')}"`,
        `"${(inv.customerEmail || '').replace(/"/g, '""')}"`,
        `"${(inv.dealTitle || '').replace(/"/g, '""')}"`,
        `"${inv.issueDateUtc || ''}"`,
        `"${inv.dueDateUtc || ''}"`,
        `"${inv.subtotal}"`,
        `"${inv.taxAmount}"`,
        `"${inv.totalAmount}"`,
        `"${inv.amountPaid}"`,
        `"${inv.balanceDue}"`,
        `"${inv.status}"`,
        `"${inv.isOverdue ? 'YES' : 'NO'}"`
      ]);
      this.downloadCsvFile([headers.join(','), ...rows.map(r => r.join(','))].join('\n'), `orbit-finance-invoices-${Date.now()}.csv`);
    }
  }

  public printInvoice(): void {
    window.print();
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

  public generatePayrollBatch(): void {
    this.payrollLoading = true;
    this.api.generatePayrollBatch({
      year: this.selectedPayrollYear,
      month: this.selectedPayrollMonth
    }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.payrollRecords = res.data;
          this.loadPayroll();
          this.toast.success(
            'Payroll Calculated',
            `October 2026 payroll batch for ${this.payrollRecords.length} employees calculated. Ready for approval and HR review.`
          );
        }
        this.payrollLoading = false;
      },
      error: () => {
        this.payrollLoading = false;
      }
    });
  }

  public approvePayrollBatch(): void {
    this.payrollLoading = true;
    this.api.approvePayrollBatch({
      year: this.selectedPayrollYear,
      month: this.selectedPayrollMonth
    }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.payrollRecords = res.data;
          this.loadPayroll();
          this.toast.success(
            'Payroll Batch Approved',
            'Payroll approved by Accounting and synchronized to HR (Amr) for review and payslip distribution.'
          );
        }
        this.payrollLoading = false;
      },
      error: () => {
        this.payrollLoading = false;
      }
    });
  }

  public loadEmployees(): void {
    this.api.getEmployees().subscribe(res => {
      if (res.success && res.data) {
        this.employees = res.data.data || [];
        if (this.employees.length > 0 && !this.selectedEmployeeIdForPayroll) {
          this.selectedEmployeeIdForPayroll = this.employees[0].id;
        }
      }
    });
  }

  public initiatePayrollForSelected(): void {
    if (!this.selectedEmployeeIdForPayroll) {
      this.toast.error('Selection Required', 'Please select an employee first.');
      return;
    }

    const emp = this.employees.find(e => e.id === this.selectedEmployeeIdForPayroll);
    const empName = emp ? emp.fullName : 'the employee';

    this.payrollLoading = true;
    this.api.initiatePayroll({
      employeeId: this.selectedEmployeeIdForPayroll,
      year: this.selectedPayrollYear,
      month: this.selectedPayrollMonth
    }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.toast.success(
            'Calculation Initiated',
            `Salary calculation initiated for ${empName}. HR (Amr) has been notified to send the Attendance & Deductions Sheet.`
          );
          this.loadPayroll();
        }
        this.payrollLoading = false;
      },
      error: () => {
        this.payrollLoading = false;
      }
    });
  }

  public finalizePayrollRecordToHr(rec: PayrollRecord): void {
    this.payrollLoading = true;
    this.api.finalizePayrollToHr(rec.id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.toast.success(
            'Payroll Calculated & Sent to HR',
            `Net salary calculated ($${res.data.netPay.toFixed(2)}) based on HR sheet and sent to HR (Amr) for review and email dispatch.`
          );
          this.loadPayroll();
        }
        this.payrollLoading = false;
      },
      error: () => {
        this.payrollLoading = false;
      }
    });
  }

  public downloadMasterSpreadsheet(): void {
    this.api.getMasterPayrollSpreadsheet(this.selectedPayrollYear, this.selectedPayrollMonth).subscribe(res => {
      if (res.success && res.data) {
        this.downloadCsvFile(res.data.fileContent, res.data.fileName);
        this.toast.success('Download Complete', `Exported ${res.data.fileName}`);
      }
    });
  }

  public downloadIndividualPayslip(rec: PayrollRecord): void {
    this.api.getEmployeePayslipSpreadsheet(rec.id).subscribe(res => {
      if (res.success && res.data) {
        this.downloadCsvFile(res.data.fileContent, res.data.fileName);
        this.toast.success('Payslip Exported', `Downloaded spreadsheet for ${rec.employeeName}`);
      }
    });
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

