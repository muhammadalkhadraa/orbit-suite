import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import {
  ExecutiveDashboard,
  ReportExportRequest,
  ReportExport,
  ReportExportHistory,
  ReportType,
  ExportFormat,
  TenantRole
} from '../../core/models/models';

type DomainTab = 'overview' | 'financial' | 'sales' | 'inventory' | 'manufacturing' | 'workforce' | 'exports';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="reports-page">
      <!-- Header Section -->
      <div class="page-header">
        <div>
          <div class="badge badge-emerald" style="margin-bottom: 0.5rem;">Executive Intelligence (Phase 13)</div>
          <h1 class="font-heading-2">Reports & Executive Analytics</h1>
          <p class="font-caption">Unified cross-domain telemetry spanning Financial Billing, CRM Pipeline, Multi-Location Inventory, Manufacturing Yield, Support SLAs, and Workforce Operations</p>
        </div>
        <div class="header-actions">
          <button (click)="loadDashboard()" [disabled]="isLoading" class="btn-ghost" title="Refresh Telemetry">
            <svg [class.spin]="isLoading" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
            <span>{{ isLoading ? 'Refreshing...' : 'Refresh Data' }}</span>
          </button>
          <button (click)="activeTab = 'exports'" class="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Export Center</span>
          </button>
        </div>
      </div>

      <!-- Confirmed Role Permission Banner -->
      <div class="role-scope-banner glass-panel">
        <div class="scope-icon">📊</div>
        <div class="scope-details">
          <div class="scope-title">
            EXECUTIVE TELEMETRY SCOPE: <span class="badge" [ngClass]="getRoleBadgeClass(currentRole)">{{ currentRole }}</span>
          </div>
          <p class="scope-explanation" [ngSwitch]="currentRole">
            <span *ngSwitchCase="'Owner'">
              <strong>C-Suite Holistic View:</strong> Unrestricted visibility across corporate cash flow, global accounts receivable, sales forecasting, plant manufacturing yields, and enterprise payroll.
            </span>
            <span *ngSwitchCase="'Admin'">
              <strong>Administrative Intelligence:</strong> Full cross-domain reporting access, automated audit ledger generation, and raw data extraction authority in CSV and JSON formats.
            </span>
            <span *ngSwitchCase="'Manager'">
              <strong>Departmental Analytics:</strong> Operational visibility into sales funnels, support resolution SLAs, inventory stock valuations, and departmental roster attendance.
            </span>
            <span *ngSwitchCase="'Employee'">
              <strong>Team Telemetry:</strong> High-level operational metrics and personal team performance benchmarks with role-governed export capabilities.
            </span>
            <span *ngSwitchDefault>
              Live executive analytics active.
            </span>
          </p>
        </div>
      </div>

      <!-- Domain Navigation Tabs -->
      <div class="tabs-container">
        <button
          class="tab-btn"
          [class.active]="activeTab === 'overview'"
          (click)="activeTab = 'overview'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          <span>Executive Overview</span>
        </button>

        <button
          class="tab-btn"
          [class.active]="activeTab === 'financial'"
          (click)="activeTab = 'financial'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          <span>Financials & AR</span>
        </button>

        <button
          class="tab-btn"
          [class.active]="activeTab === 'sales'"
          (click)="activeTab = 'sales'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
          <span>Sales & Deals</span>
        </button>

        <button
          class="tab-btn"
          [class.active]="activeTab === 'inventory'"
          (click)="activeTab = 'inventory'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          <span>Inventory & Supply</span>
        </button>

        <button
          class="tab-btn"
          [class.active]="activeTab === 'manufacturing'"
          (click)="activeTab = 'manufacturing'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span>Manufacturing</span>
        </button>

        <button
          class="tab-btn"
          [class.active]="activeTab === 'workforce'"
          (click)="activeTab = 'workforce'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
          <span>HR & Workforce</span>
        </button>

        <button
          class="tab-btn export-tab"
          [class.active]="activeTab === 'exports'"
          (click)="activeTab = 'exports'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>Data Exporter</span>
        </button>
      </div>

      <!-- TAB 1: EXECUTIVE OVERVIEW -->
      <div *ngIf="activeTab === 'overview'" class="tab-content">
        <!-- 6-Domain Cross-Functional KPI Matrix -->
        <div class="metrics-grid">
          <!-- 1. Financial Performance -->
          <div class="kpi-card glass-panel" (click)="activeTab = 'financial'">
            <div class="kpi-header">
              <span class="kpi-domain text-emerald">FINANCIAL REVENUE</span>
              <span class="kpi-icon">💰</span>
            </div>
            <div class="kpi-value text-emerald font-heading-2">
              \${{ (dashboard?.financial?.totalInvoiced || 0) | number:'1.2-2' }}
            </div>
            <div class="kpi-sub">
              <span>Collected: <strong class="text-white">\${{ (dashboard?.financial?.totalCollected || 0) | number:'1.0-0' }}</strong></span>
              <span class="kpi-badge badge-emerald">{{ dashboard?.financial?.collectionRate || 0 }}% rate</span>
            </div>
            <div class="kpi-bar-bg">
              <div class="kpi-bar-fill emerald" [style.width.%]="dashboard?.financial?.collectionRate || 0"></div>
            </div>
          </div>

          <!-- 2. Sales Pipeline -->
          <div class="kpi-card glass-panel" (click)="activeTab = 'sales'">
            <div class="kpi-header">
              <span class="kpi-domain text-indigo">SALES PIPELINE</span>
              <span class="kpi-icon">🎯</span>
            </div>
            <div class="kpi-value text-indigo font-heading-2">
              \${{ (dashboard?.sales?.totalPipelineValue || 0) | number:'1.0-0' }}
            </div>
            <div class="kpi-sub">
              <span>Weighted: <strong class="text-white">\${{ (dashboard?.sales?.weightedPipelineValue || 0) | number:'1.0-0' }}</strong></span>
              <span class="kpi-badge badge-indigo">{{ dashboard?.sales?.winRatePercent || 0 }}% win</span>
            </div>
            <div class="kpi-bar-bg">
              <div class="kpi-bar-fill indigo" [style.width.%]="dashboard?.sales?.winRatePercent || 0"></div>
            </div>
          </div>

          <!-- 3. Customer Support SLAs -->
          <div class="kpi-card glass-panel">
            <div class="kpi-header">
              <span class="kpi-domain text-amber">CUSTOMER SUPPORT</span>
              <span class="kpi-icon">🎧</span>
            </div>
            <div class="kpi-value text-amber font-heading-2">
              {{ dashboard?.support?.totalTickets || 0 }} <span class="unit">tickets</span>
            </div>
            <div class="kpi-sub">
              <span>Open: <strong class="text-white">{{ dashboard?.support?.openTickets || 0 }}</strong> | Urgent: <strong class="text-rose">{{ dashboard?.support?.urgentTickets || 0 }}</strong></span>
              <span class="kpi-badge badge-amber">{{ dashboard?.support?.resolutionRatePercent || 0 }}% res</span>
            </div>
            <div class="kpi-bar-bg">
              <div class="kpi-bar-fill amber" [style.width.%]="dashboard?.support?.resolutionRatePercent || 0"></div>
            </div>
          </div>

          <!-- 4. Inventory Valuation -->
          <div class="kpi-card glass-panel" (click)="activeTab = 'inventory'">
            <div class="kpi-header">
              <span class="kpi-domain text-cyan">INVENTORY ASSETS</span>
              <span class="kpi-icon">📦</span>
            </div>
            <div class="kpi-value text-cyan font-heading-2">
              \${{ (dashboard?.inventory?.totalValuation || 0) | number:'1.0-0' }}
            </div>
            <div class="kpi-sub">
              <span>Units: <strong class="text-white">{{ dashboard?.inventory?.totalUnitsOnHand || 0 }}</strong> across {{ dashboard?.inventory?.totalSkus || 0 }} SKUs</span>
              <span class="kpi-badge badge-rose" *ngIf="(dashboard?.inventory?.lowStockCount || 0) > 0">
                {{ dashboard?.inventory?.lowStockCount }} low
              </span>
            </div>
            <div class="kpi-bar-bg">
              <div class="kpi-bar-fill cyan" [style.width.%]="85"></div>
            </div>
          </div>

          <!-- 5. Manufacturing Yield -->
          <div class="kpi-card glass-panel" (click)="activeTab = 'manufacturing'">
            <div class="kpi-header">
              <span class="kpi-domain text-violet">MANUFACTURING</span>
              <span class="kpi-icon">⚙️</span>
            </div>
            <div class="kpi-value text-violet font-heading-2">
              {{ dashboard?.manufacturing?.totalUnitsProduced || 0 }} / {{ dashboard?.manufacturing?.totalUnitsTarget || 0 }}
            </div>
            <div class="kpi-sub">
              <span>Active Orders: <strong class="text-white">{{ dashboard?.manufacturing?.activeWorkOrders || 0 }}</strong></span>
              <span class="kpi-badge badge-violet">{{ dashboard?.manufacturing?.productionYieldRatePercent || 0 }}% yield</span>
            </div>
            <div class="kpi-bar-bg">
              <div class="kpi-bar-fill violet" [style.width.%]="dashboard?.manufacturing?.productionYieldRatePercent || 0"></div>
            </div>
          </div>

          <!-- 6. Workforce Attendance -->
          <div class="kpi-card glass-panel" (click)="activeTab = 'workforce'">
            <div class="kpi-header">
              <span class="kpi-domain text-emerald">WORKFORCE ROSTER</span>
              <span class="kpi-icon">👥</span>
            </div>
            <div class="kpi-value text-emerald font-heading-2">
              {{ dashboard?.workforce?.attendanceRatePercent || 0 }}%
            </div>
            <div class="kpi-sub">
              <span>Present: <strong class="text-white">{{ dashboard?.workforce?.presentToday || 0 }}/{{ dashboard?.workforce?.totalEmployees || 0 }}</strong></span>
              <span class="kpi-badge badge-emerald" *ngIf="(dashboard?.workforce?.pendingLeaveRequests || 0) > 0">
                {{ dashboard?.workforce?.pendingLeaveRequests }} pending leave
              </span>
            </div>
            <div class="kpi-bar-bg">
              <div class="kpi-bar-fill emerald" [style.width.%]="dashboard?.workforce?.attendanceRatePercent || 0"></div>
            </div>
          </div>
        </div>

        <!-- Visual Analytics Row: Revenue Trend & Sales Funnel -->
        <div class="charts-row">
          <!-- Monthly Revenue Trend Chart -->
          <div class="chart-card glass-panel">
            <div class="card-header-clean">
              <div>
                <h3 class="font-heading-3">Revenue & Cash Inflow Trend</h3>
                <p class="font-caption text-muted">6-month comparison of billed invoices versus collected cash</p>
              </div>
              <div class="legend-pills">
                <span class="legend-pill"><span class="dot invoiced"></span> Invoiced</span>
                <span class="legend-pill"><span class="dot collected"></span> Collected</span>
              </div>
            </div>

            <div class="bar-chart-container">
              <div *ngFor="let item of dashboard?.revenueTrend" class="chart-col">
                <div class="bars-pair">
                  <div class="bar bar-invoiced" [style.height.%]="getBarHeight(item.invoiced, maxRevenue)" [title]="'Invoiced: $' + item.invoiced"></div>
                  <div class="bar bar-collected" [style.height.%]="getBarHeight(item.collected, maxRevenue)" [title]="'Collected: $' + item.collected"></div>
                </div>
                <div class="col-label">{{ item.month }}</div>
                <div class="col-values">
                  <span class="val-inv">\${{ (item.invoiced / 1000) | number:'1.0-0' }}k</span>
                  <span class="val-col">\${{ (item.collected / 1000) | number:'1.0-0' }}k</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Sales Pipeline Funnel -->
          <div class="chart-card glass-panel">
            <div class="card-header-clean">
              <div>
                <h3 class="font-heading-3">Sales Pipeline Velocity Funnel</h3>
                <p class="font-caption text-muted">Opportunities weighted distribution through closing stages</p>
              </div>
              <span class="badge badge-indigo">{{ dashboard?.sales?.activeDealsCount || 0 }} Open Deals</span>
            </div>

            <div class="funnel-container">
              <div *ngFor="let f of dashboard?.pipelineFunnel" class="funnel-stage">
                <div class="funnel-stage-header">
                  <span class="stage-name">{{ f.stage }}</span>
                  <span class="stage-stats">{{ f.count }} deal(s) • \${{ f.totalAmount | number:'1.0-0' }}</span>
                </div>
                <div class="funnel-bar-bg">
                  <div class="funnel-bar-fill" [style.width.%]="getFunnelWidth(f.totalAmount)"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Secondary Breakdown Row: Departments & Inventory Categories -->
        <div class="breakdown-row">
          <div class="breakdown-card glass-panel">
            <div class="card-header-clean">
              <div>
                <h3 class="font-heading-3">Department Headcount & Resource Allocation</h3>
                <p class="font-caption text-muted">Active personnel distribution across corporate divisions</p>
              </div>
            </div>
            <div class="distribution-list">
              <div *ngFor="let dept of dashboard?.departmentDistribution" class="dist-item">
                <div class="dist-info">
                  <span class="dist-name font-body-bold">{{ dept.category }}</span>
                  <span class="dist-meta text-muted">{{ dept.count }} staff • \${{ dept.value | number:'1.0-0' }} budget</span>
                </div>
                <div class="dist-bar-track">
                  <div class="dist-bar-fill indigo" [style.width.%]="getDeptPercent(dept.count)"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="breakdown-card glass-panel">
            <div class="card-header-clean">
              <div>
                <h3 class="font-heading-3">Inventory Valuation by Category</h3>
                <p class="font-caption text-muted">Asset capitalization across warehouse hardware & licenses</p>
              </div>
            </div>
            <div class="distribution-list">
              <div *ngFor="let inv of dashboard?.inventoryDistribution" class="dist-item">
                <div class="dist-info">
                  <span class="dist-name font-body-bold">{{ inv.category }}</span>
                  <span class="dist-meta text-muted">{{ inv.count }} units • \${{ inv.value | number:'1.2-2' }}</span>
                </div>
                <div class="dist-bar-track">
                  <div class="dist-bar-fill cyan" [style.width.%]="getInvPercent(inv.value)"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 2: FINANCIAL INTELLIGENCE -->
      <div *ngIf="activeTab === 'financial'" class="tab-content">
        <div class="detail-grid">
          <div class="detail-card glass-panel">
            <h3 class="font-heading-3">Accounts Receivable Aging & Health</h3>
            <p class="font-caption text-muted">Detailed receivables balance and overdue cash liability audit</p>
            <div class="stat-highlight-grid" style="margin-top: 1.5rem;">
              <div class="stat-box">
                <span class="text-muted">TOTAL BILLED</span>
                <div class="stat-num text-white">\${{ (dashboard?.financial?.totalInvoiced || 0) | number:'1.2-2' }}</div>
              </div>
              <div class="stat-box">
                <span class="text-muted">TOTAL COLLECTED</span>
                <div class="stat-num text-emerald">\${{ (dashboard?.financial?.totalCollected || 0) | number:'1.2-2' }}</div>
              </div>
              <div class="stat-box">
                <span class="text-muted">CURRENT AR</span>
                <div class="stat-num text-cyan">\${{ (dashboard?.financial?.outstandingAr || 0) | number:'1.2-2' }}</div>
              </div>
              <div class="stat-box">
                <span class="text-muted">OVERDUE AR</span>
                <div class="stat-num text-rose">\${{ (dashboard?.financial?.overdueAr || 0) | number:'1.2-2' }}</div>
              </div>
            </div>
            <div style="margin-top: 2rem;">
              <button (click)="quickExport('FinancialSummary')" class="btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Export Financial Invoices Ledger (CSV)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 3: SALES & DEALS -->
      <div *ngIf="activeTab === 'sales'" class="tab-content">
        <div class="detail-grid">
          <div class="detail-card glass-panel">
            <h3 class="font-heading-3">CRM Pipeline Analysis & Probability Weighting</h3>
            <p class="font-caption text-muted">Opportunities categorized by sales stages and probability conversions</p>
            <div class="stat-highlight-grid" style="margin-top: 1.5rem;">
              <div class="stat-box">
                <span class="text-muted">TOTAL UNWEIGHTED PIPELINE</span>
                <div class="stat-num text-white">\${{ (dashboard?.sales?.totalPipelineValue || 0) | number:'1.0-0' }}</div>
              </div>
              <div class="stat-box">
                <span class="text-muted">PROBABILITY WEIGHTED VALUE</span>
                <div class="stat-num text-indigo">\${{ (dashboard?.sales?.weightedPipelineValue || 0) | number:'1.0-0' }}</div>
              </div>
              <div class="stat-box">
                <span class="text-muted">CLOSED WON REVENUE</span>
                <div class="stat-num text-emerald">\${{ (dashboard?.sales?.wonRevenue || 0) | number:'1.0-0' }}</div>
              </div>
              <div class="stat-box">
                <span class="text-muted">WIN CONVERSION RATE</span>
                <div class="stat-num text-cyan">{{ dashboard?.sales?.winRatePercent || 0 }}%</div>
              </div>
            </div>
            <div style="margin-top: 2rem;">
              <button (click)="quickExport('SalesPipeline')" class="btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Export Full Deals Pipeline (CSV)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 4: INVENTORY & SUPPLY -->
      <div *ngIf="activeTab === 'inventory'" class="tab-content">
        <div class="detail-grid">
          <div class="detail-card glass-panel">
            <h3 class="font-heading-3">Multi-Location Inventory Valuation</h3>
            <p class="font-caption text-muted">Stock capitalization across regional warehouses and fulfillment terminals</p>
            <div class="stat-highlight-grid" style="margin-top: 1.5rem;">
              <div class="stat-box">
                <span class="text-muted">TOTAL VALUATION</span>
                <div class="stat-num text-cyan">\${{ (dashboard?.inventory?.totalValuation || 0) | number:'1.2-2' }}</div>
              </div>
              <div class="stat-box">
                <span class="text-muted">MANAGED SKUS</span>
                <div class="stat-num text-white">{{ dashboard?.inventory?.totalSkus || 0 }}</div>
              </div>
              <div class="stat-box">
                <span class="text-muted">TOTAL UNITS ON HAND</span>
                <div class="stat-num text-indigo">{{ dashboard?.inventory?.totalUnitsOnHand || 0 }}</div>
              </div>
              <div class="stat-box">
                <span class="text-muted">LOW STOCK WARNINGS</span>
                <div class="stat-num text-rose">{{ dashboard?.inventory?.lowStockCount || 0 }}</div>
              </div>
            </div>
            <div style="margin-top: 2rem;">
              <button (click)="quickExport('InventoryValuation')" class="btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Export Inventory Valuation (CSV)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 5: MANUFACTURING -->
      <div *ngIf="activeTab === 'manufacturing'" class="tab-content">
        <div class="detail-grid">
          <div class="detail-card glass-panel">
            <h3 class="font-heading-3">Production Throughput & Assembly Yield</h3>
            <p class="font-caption text-muted">Work order progress, build execution, and production yield telemetry</p>
            <div class="stat-highlight-grid" style="margin-top: 1.5rem;">
              <div class="stat-box">
                <span class="text-muted">TOTAL WORK ORDERS</span>
                <div class="stat-num text-white">{{ dashboard?.manufacturing?.totalWorkOrders || 0 }}</div>
              </div>
              <div class="stat-box">
                <span class="text-muted">ACTIVE ON FLOOR</span>
                <div class="stat-num text-violet">{{ dashboard?.manufacturing?.activeWorkOrders || 0 }}</div>
              </div>
              <div class="stat-box">
                <span class="text-muted">UNITS PRODUCED</span>
                <div class="stat-num text-emerald">{{ dashboard?.manufacturing?.totalUnitsProduced || 0 }} / {{ dashboard?.manufacturing?.totalUnitsTarget || 0 }}</div>
              </div>
              <div class="stat-box">
                <span class="text-muted">PRODUCTION YIELD</span>
                <div class="stat-num text-cyan">{{ dashboard?.manufacturing?.productionYieldRatePercent || 0 }}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 6: WORKFORCE & HR -->
      <div *ngIf="activeTab === 'workforce'" class="tab-content">
        <div class="detail-grid">
          <div class="detail-card glass-panel">
            <h3 class="font-heading-3">Human Capital & Workforce Attendance</h3>
            <p class="font-caption text-muted">Employee presence rate, scheduled shifts, and leave entitlement log</p>
            <div class="stat-highlight-grid" style="margin-top: 1.5rem;">
              <div class="stat-box">
                <span class="text-muted">TOTAL WORKFORCE</span>
                <div class="stat-num text-white">{{ dashboard?.workforce?.totalEmployees || 0 }}</div>
              </div>
              <div class="stat-box">
                <span class="text-muted">PRESENT TODAY</span>
                <div class="stat-num text-emerald">{{ dashboard?.workforce?.presentToday || 0 }}</div>
              </div>
              <div class="stat-box">
                <span class="text-muted">ATTENDANCE RATE</span>
                <div class="stat-num text-cyan">{{ dashboard?.workforce?.attendanceRatePercent || 0 }}%</div>
              </div>
              <div class="stat-box">
                <span class="text-muted">PENDING LEAVE REQUESTS</span>
                <div class="stat-num text-amber">{{ dashboard?.workforce?.pendingLeaveRequests || 0 }}</div>
              </div>
            </div>
            <div style="margin-top: 2rem;">
              <button (click)="quickExport('WorkforceAttendance')" class="btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Export Attendance & Roster (CSV)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 7: DATA EXPORT CENTER -->
      <div *ngIf="activeTab === 'exports'" class="tab-content">
        <!-- Export Generator Card -->
        <div class="export-builder-card glass-panel">
          <div class="builder-header">
            <div class="badge badge-indigo">Data Export Engine</div>
            <h2 class="font-heading-2">Generate Cross-Domain Report</h2>
            <p class="font-caption text-muted">Select domain dataset and format to produce instantly downloadable audit files</p>
          </div>

          <form (ngSubmit)="submitExport()" class="export-form">
            <div class="form-row-3">
              <div class="form-group">
                <label>Report Dataset *</label>
                <select [(ngModel)]="exportRequest.reportType" name="reportType" required class="form-input">
                  <option value="FinancialSummary">Financial Invoices & Receivables Ledger</option>
                  <option value="SalesPipeline">CRM Deals & Opportunities Pipeline</option>
                  <option value="InventoryValuation">Multi-Location Inventory Valuation & Stock</option>
                  <option value="SupportSla">Customer Support & SLA Resolution Incidents</option>
                  <option value="WorkforceAttendance">HR Workforce Attendance & Roster Log</option>
                </select>
              </div>

              <div class="form-group">
                <label>Export Format *</label>
                <select [(ngModel)]="exportRequest.format" name="format" required class="form-input">
                  <option value="Csv">CSV Spreadsheet (.csv)</option>
                  <option value="Json">Structured JSON (.json)</option>
                </select>
              </div>

              <div class="form-group action-col">
                <label>&nbsp;</label>
                <button type="submit" [disabled]="isExporting" class="btn-primary btn-generate">
                  <svg *ngIf="!isExporting" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  <svg *ngIf="isExporting" class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                  </svg>
                  <span>{{ isExporting ? 'Generating Report...' : 'Download Report File' }}</span>
                </button>
              </div>
            </div>
          </form>

          <div *ngIf="lastExportResult" class="export-success-banner glass-panel">
            <div class="banner-icon">✅</div>
            <div class="banner-body">
              <div class="font-body-bold text-emerald">Report Generated & Downloaded: {{ lastExportResult.fileName }}</div>
              <div class="text-muted" style="font-size: 0.85rem;">
                {{ lastExportResult.recordCount }} records exported • {{ lastExportResult.fileSizeKb }} KB • {{ lastExportResult.generatedAtUtc | date:'medium' }}
              </div>
            </div>
            <button (click)="triggerDownload(lastExportResult)" class="btn-secondary" style="font-size: 0.8rem; padding: 0.4rem 0.85rem;">
              Re-download File
            </button>
          </div>
        </div>

        <!-- Export History Table -->
        <div class="table-container glass-panel" style="margin-top: 1.5rem;">
          <div class="table-header-title">
            <h3 class="font-heading-3">Audit Export History</h3>
            <span class="badge badge-indigo">{{ exportHistory.length }} Records Logged</span>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th>REPORT TITLE</th>
                <th>DOMAIN</th>
                <th>FORMAT</th>
                <th>RECORDS</th>
                <th>FILE SIZE</th>
                <th>GENERATED BY</th>
                <th>DATE & TIME</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let h of exportHistory">
                <td>
                  <span class="font-body-bold text-white">{{ h.title }}</span>
                </td>
                <td>
                  <span class="badge" [ngClass]="getReportTypeBadgeClass(h.reportType)">
                    {{ h.reportType }}
                  </span>
                </td>
                <td>
                  <span class="format-pill" [class.csv]="h.format === 'Csv'" [class.json]="h.format === 'Json'">
                    {{ h.format }}
                  </span>
                </td>
                <td>
                  <span class="mono">{{ h.recordCount }} rows</span>
                </td>
                <td>
                  <span class="mono">{{ h.fileSizeKb }} KB</span>
                </td>
                <td class="text-muted">
                  {{ h.generatedByEmployeeName || 'Authorized Admin' }}
                </td>
                <td class="text-muted">
                  {{ h.createdAtUtc | date:'yyyy-MM-dd HH:mm' }}
                </td>
              </tr>
              <tr *ngIf="exportHistory.length === 0">
                <td colspan="7" class="empty-state">
                  <div class="empty-icon">📁</div>
                  <div class="font-heading-3">No Export History Yet</div>
                  <p class="text-muted">Use the generator above to create and log your first cross-domain audit export.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .reports-page {
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

    /* Tabs */
    .tabs-container {
      display: flex;
      gap: 0.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 0.5rem;
      flex-wrap: wrap;
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
      font-size: 0.875rem;
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

    .tab-btn.export-tab.active {
      color: #6366f1;
      background: rgba(99, 102, 241, 0.1);
      border-color: rgba(99, 102, 241, 0.3);
    }

    /* 6-Domain Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
    }

    .kpi-card {
      padding: 1.25rem;
      border-radius: 12px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      transition: all 0.2s ease;
    }

    .kpi-card:hover {
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.2);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    }

    .kpi-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .kpi-domain {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.06em;
    }

    .kpi-icon {
      font-size: 1.25rem;
    }

    .kpi-value {
      font-size: 1.85rem;
      font-weight: 800;
      line-height: 1.1;

      .unit {
        font-size: 0.9rem;
        color: #94a3b8;
        font-weight: 500;
      }
    }

    .kpi-sub {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8rem;
      color: #94a3b8;
    }

    .kpi-badge {
      font-size: 0.7rem;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      font-weight: 600;
    }

    .kpi-bar-bg {
      height: 4px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 2px;
      overflow: hidden;
      margin-top: 0.25rem;
    }

    .kpi-bar-fill {
      height: 100%;
      border-radius: 2px;
      transition: width 0.5s ease;

      &.emerald { background: #10b981; }
      &.indigo { background: #6366f1; }
      &.amber { background: #f59e0b; }
      &.cyan { background: #06b6d4; }
      &.violet { background: #8b5cf6; }
    }

    /* Charts Row */
    .charts-row {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 1rem;
      margin-top: 0.5rem;

      @media (max-width: 1024px) {
        grid-template-columns: 1fr;
      }
    }

    .chart-card {
      padding: 1.5rem;
      border-radius: 12px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .card-header-clean {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }

    .legend-pills {
      display: flex;
      gap: 0.75rem;
    }

    .legend-pill {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.75rem;
      color: #94a3b8;

      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;

        &.invoiced { background: #6366f1; }
        &.collected { background: #10b981; }
      }
    }

    /* Bar Chart Representation */
    .bar-chart-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      height: 200px;
      padding-top: 1rem;
      gap: 0.75rem;
    }

    .chart-col {
      flex: 1;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      gap: 0.5rem;
    }

    .bars-pair {
      width: 100%;
      height: 140px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: 4px;
    }

    .bar {
      width: 14px;
      border-radius: 4px 4px 0 0;
      transition: height 0.4s ease;

      &.bar-invoiced {
        background: linear-gradient(180deg, #6366f1 0%, rgba(99, 102, 241, 0.4) 100%);
      }
      &.bar-collected {
        background: linear-gradient(180deg, #10b981 0%, rgba(16, 185, 129, 0.4) 100%);
      }
    }

    .col-label {
      font-size: 0.75rem;
      color: #94a3b8;
      white-space: nowrap;
    }

    .col-values {
      display: flex;
      gap: 4px;
      font-size: 0.6875rem;

      .val-inv { color: #818cf8; font-weight: 600; }
      .val-col { color: #34d399; font-weight: 600; }
    }

    /* Funnel */
    .funnel-container {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .funnel-stage {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .funnel-stage-header {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;

      .stage-name {
        color: #f8fafc;
        font-weight: 600;
      }
      .stage-stats {
        color: #94a3b8;
      }
    }

    .funnel-bar-bg {
      height: 8px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
      overflow: hidden;
    }

    .funnel-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #6366f1, #8b5cf6);
      border-radius: 4px;
      transition: width 0.4s ease;
    }

    /* Breakdown Row */
    .breakdown-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-top: 0.5rem;

      @media (max-width: 1024px) {
        grid-template-columns: 1fr;
      }
    }

    .breakdown-card {
      padding: 1.5rem;
      border-radius: 12px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .distribution-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .dist-item {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .dist-info {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
    }

    .dist-bar-track {
      height: 6px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 3px;
      overflow: hidden;
    }

    .dist-bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.4s ease;

      &.indigo { background: linear-gradient(90deg, #6366f1, #a5b4fc); }
      &.cyan { background: linear-gradient(90deg, #06b6d4, #67e8f9); }
    }

    /* Detail Domain Grids */
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .detail-card {
      padding: 2rem;
      border-radius: 12px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .stat-highlight-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .stat-box {
      padding: 1.25rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;

      span {
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.05em;
      }

      .stat-num {
        font-size: 1.75rem;
        font-weight: 800;
      }
    }

    /* Export Builder Card */
    .export-builder-card {
      padding: 2rem;
      border-radius: 12px;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(99, 102, 241, 0.25);
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .form-row-3 {
      display: grid;
      grid-template-columns: 2fr 1fr 1.2fr;
      gap: 1rem;
      align-items: flex-end;

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
      }
    }

    .action-col {
      display: flex;
      flex-direction: column;
    }

    .btn-generate {
      width: 100%;
      height: 42px;
      justify-content: center;
    }

    .export-success-banner {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.25rem;
      border-radius: 8px;
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.25);

      .banner-icon {
        font-size: 1.5rem;
      }

      .banner-body {
        flex: 1;
      }
    }

    /* Table Styles */
    .table-container {
      border-radius: 12px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      overflow-x: auto;
    }

    .table-header-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.875rem;

      th {
        padding: 0.875rem 1.5rem;
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        color: #94a3b8;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }

      td {
        padding: 1rem 1.5rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        color: #e2e8f0;
      }

      tbody tr:hover {
        background: rgba(255, 255, 255, 0.02);
      }
    }

    .format-pill {
      font-size: 0.75rem;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-weight: 700;
      text-transform: uppercase;

      &.csv {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
        border: 1px solid rgba(16, 185, 129, 0.3);
      }
      &.json {
        background: rgba(99, 102, 241, 0.15);
        color: #a5b4fc;
        border: 1px solid rgba(99, 102, 241, 0.3);
      }
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem !important;

      .empty-icon {
        font-size: 2.5rem;
        margin-bottom: 0.5rem;
      }
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class ReportsComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);

  public activeTab: DomainTab = 'overview';
  public isLoading = false;
  public isExporting = false;
  public currentRole: TenantRole = 'Owner';

  public dashboard: ExecutiveDashboard | null = null;
  public exportHistory: ReportExportHistory[] = [];
  public lastExportResult: ReportExport | null = null;

  public exportRequest: ReportExportRequest = {
    reportType: 'FinancialSummary',
    format: 'Csv'
  };

  public maxRevenue = 50000;

  ngOnInit(): void {
    this.authService.activeTenant$.subscribe(t => {
      if (t) {
        this.currentRole = t.role;
      }
    });
    this.loadDashboard();
    this.loadExportHistory();
  }

  public loadDashboard(): void {
    this.isLoading = true;
    this.apiService.getExecutiveReports().subscribe({
      next: (res) => {
        if (res.data) {
          this.dashboard = res.data;
          this.calculateMaxRevenue();
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  public loadExportHistory(): void {
    this.apiService.getReportHistory().subscribe({
      next: (res) => {
        if (res.data) {
          this.exportHistory = res.data;
        }
      }
    });
  }

  public submitExport(): void {
    this.isExporting = true;
    this.apiService.exportReport(this.exportRequest).subscribe({
      next: (res) => {
        if (res.data) {
          this.lastExportResult = res.data;
          this.triggerDownload(res.data);
          this.loadExportHistory();
        }
        this.isExporting = false;
      },
      error: () => {
        this.isExporting = false;
      }
    });
  }

  public quickExport(type: ReportType): void {
    this.exportRequest.reportType = type;
    this.exportRequest.format = 'Csv';
    this.activeTab = 'exports';
    this.submitExport();
  }

  public triggerDownload(exportData: ReportExport): void {
    const blob = new Blob([exportData.content], { type: exportData.mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportData.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  public getBarHeight(val: number, max: number): number {
    if (!max || max <= 0) return 10;
    const pct = Math.round((val / max) * 100);
    return Math.min(100, Math.max(10, pct));
  }

  public getFunnelWidth(amount: number): number {
    const max = 250000;
    const pct = Math.round((amount / max) * 100);
    return Math.min(100, Math.max(15, pct));
  }

  public getDeptPercent(count: number): number {
    const total = 31;
    return Math.min(100, Math.max(10, Math.round((count / total) * 100)));
  }

  public getInvPercent(val: number): number {
    const max = 50000;
    return Math.min(100, Math.max(10, Math.round((val / max) * 100)));
  }

  private calculateMaxRevenue(): void {
    if (!this.dashboard?.revenueTrend) return;
    let max = 0;
    for (const item of this.dashboard.revenueTrend) {
      if (item.invoiced > max) max = item.invoiced;
      if (item.collected > max) max = item.collected;
    }
    this.maxRevenue = max > 0 ? max * 1.15 : 50000;
  }

  public getRoleBadgeClass(role: TenantRole): string {
    switch (role) {
      case 'Owner': return 'badge-violet';
      case 'Admin': return 'badge-indigo';
      case 'Manager': return 'badge-cyan';
      case 'Employee': return 'badge-emerald';
      default: return 'badge-indigo';
    }
  }

  public getReportTypeBadgeClass(type: ReportType): string {
    switch (type) {
      case 'FinancialSummary': return 'badge-emerald';
      case 'SalesPipeline': return 'badge-indigo';
      case 'InventoryValuation': return 'badge-cyan';
      case 'SupportSla': return 'badge-amber';
      case 'WorkforceAttendance': return 'badge-emerald';
      default: return 'badge-indigo';
    }
  }
}
