import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import {
  WorkOrder,
  BillOfMaterials,
  BomItem,
  ManufacturingMetrics,
  WorkOrderStatus,
  WorkOrderPriority,
  CreateWorkOrderRequest,
  UpdateWorkOrderRequest,
  UpdateWorkOrderStatusRequest,
  CreateBomRequest,
  CreateBomItemRequest,
  Product,
  Branch,
  Employee,
  TenantRole
} from '../../core/models/models';

@Component({
  selector: 'app-manufacturing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="manufacturing-page">
      <!-- Header Section -->
      <div class="page-header">
        <div>
          <div class="badge badge-indigo" style="margin-bottom: 0.5rem;">Manufacturing & Production Control (Phase 11)</div>
          <h1 class="font-heading-2">Work Orders & Bill of Materials (BOM)</h1>
          <p class="font-caption">Coordinate shop-floor assembly, track production progress, manage recipe formulations, and yield finished goods into warehouse inventory</p>
        </div>
        <div class="header-actions">
          <button (click)="exportManufacturingCsv()" class="btn-secondary" title="Export Work Orders / BOMs to CSV">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Export CSV</span>
          </button>
          <button *ngIf="canManageManufacturing" (click)="openCreateBomModal()" class="btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            <span>Create BOM</span>
          </button>
          <button *ngIf="canManageManufacturing" (click)="openCreateWoModal()" class="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>New Work Order</span>
          </button>
        </div>
      </div>

      <!-- Confirmed Role Permission Banner -->
      <div class="role-scope-banner glass-panel">
        <div class="scope-icon">⚙️</div>
        <div class="scope-details">
          <div class="scope-title">
            ACTIVE PERMISSION SCOPE: <span class="badge" [ngClass]="getRoleBadgeClass(currentRole)">{{ currentRole }}</span>
          </div>
          <p class="scope-explanation" [ngSwitch]="currentRole">
            <span *ngSwitchCase="'Owner'">
              <strong>Full Enterprise Authority:</strong> Complete governance over manufacturing operations, BOM formulation recipes, shop-floor dispatching, and plant capacity across {{ (activeTenant$ | async)?.name }}.
            </span>
            <span *ngSwitchCase="'Admin'">
              <strong>Production Administrator:</strong> Authorized to create new BOM engineering recipes, plan and schedule work orders, cancel runs, and oversee multi-branch shop floor execution.
            </span>
            <span *ngSwitchCase="'Manager'">
              <strong>Plant Operations Manager:</strong> Authorized to plan and schedule work orders, assign lead engineers, monitor shop-floor progress, and sign off on completed manufacturing runs.
            </span>
            <span *ngSwitchCase="'Employee'">
              <strong>Production Technician / Lead:</strong> View assigned work orders at your plant, update execution progress, log produced units, and mark orders completed.
            </span>
            <span *ngSwitchDefault>
              Multi-facility manufacturing management enabled.
            </span>
          </p>
        </div>
      </div>

      <!-- KPI Metrics Bar -->
      <div class="metrics-grid">
        <div class="metric-card glass-panel">
          <div class="metric-header">
            <span class="metric-title font-caption">Total Work Orders</span>
            <span class="metric-icon">📋</span>
          </div>
          <div class="metric-value font-heading-1">{{ metrics.totalWorkOrders }}</div>
          <div class="metric-footer text-muted font-caption">
            <span class="badge badge-indigo">{{ metrics.plannedCount }} Planned</span>
            <span class="badge badge-cyan" style="margin-left: 0.25rem;">{{ metrics.inProgressCount }} Active</span>
          </div>
        </div>

        <div class="metric-card glass-panel">
          <div class="metric-header">
            <span class="metric-title font-caption">In-Progress Production</span>
            <span class="metric-icon">⚡</span>
          </div>
          <div class="metric-value font-heading-1 text-cyan">{{ metrics.inProgressCount }}</div>
          <div class="metric-footer font-caption text-muted">
            Shop-floor assembly active
          </div>
        </div>

        <div class="metric-card glass-panel">
          <div class="metric-header">
            <span class="metric-title font-caption">Completed Runs</span>
            <span class="metric-icon">✓</span>
          </div>
          <div class="metric-value font-heading-1 text-emerald">{{ metrics.completedCount }}</div>
          <div class="metric-footer font-caption text-muted">
            <span class="text-emerald font-semibold">{{ metrics.totalUnitsProduced | number:'1.0-0' }}</span> units yielded to stock
          </div>
        </div>

        <div class="metric-card glass-panel">
          <div class="metric-header">
            <span class="metric-title font-caption">Target vs Produced</span>
            <span class="metric-icon">🎯</span>
          </div>
          <div class="metric-value font-heading-1 text-amber">
            {{ metrics.totalUnitsProduced | number:'1.0-0' }} <span style="font-size: 1rem; color: #94a3b8;">/ {{ metrics.totalUnitsTarget | number:'1.0-0' }}</span>
          </div>
          <div class="metric-footer font-caption">
            <span class="badge" [ngClass]="metrics.completionRate >= 80 ? 'badge-emerald' : 'badge-amber'">
              {{ metrics.completionRate }}% Run Completion
            </span>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="tabs-bar">
        <button
          (click)="activeTab = 'orders'"
          [class.active]="activeTab === 'orders'"
          class="tab-btn">
          <span>Work Orders Queue</span>
          <span class="tab-badge">{{ workOrders.length }}</span>
        </button>
        <button
          (click)="activeTab = 'boms'"
          [class.active]="activeTab === 'boms'"
          class="tab-btn">
          <span>Bill of Materials (BOM)</span>
          <span class="tab-badge">{{ boms.length }}</span>
        </button>
        <button
          (click)="activeTab = 'operations'"
          [class.active]="activeTab === 'operations'"
          class="tab-btn">
          <span>Production Facilities</span>
          <span class="tab-badge">{{ branches.length }}</span>
        </button>
      </div>

      <!-- TAB 1: WORK ORDERS QUEUE -->
      <div *ngIf="activeTab === 'orders'" class="tab-content">
        <!-- Filter and Search Toolbar -->
        <div class="filter-toolbar glass-panel">
          <div class="search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (input)="applyFilters()"
              placeholder="Search by order #, finished good SKU, product name..."
              class="search-input" />
          </div>

          <div class="filter-group">
            <select [(ngModel)]="statusFilter" (change)="applyFilters()" class="filter-select">
              <option value="ALL">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Planned">Planned</option>
              <option value="InProgress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <select [(ngModel)]="priorityFilter" (change)="applyFilters()" class="filter-select">
              <option value="ALL">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>

            <select [(ngModel)]="branchFilter" (change)="applyFilters()" class="filter-select">
              <option value="ALL">All Facilities</option>
              <option *ngFor="let b of branches" [value]="b.id">{{ b.name }}</option>
            </select>
          </div>
        </div>

        <!-- Orders Table -->
        <div class="table-container glass-panel">
          <table class="data-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Target Finished Good</th>
                <th>Facility & Lead</th>
                <th>Target vs Produced</th>
                <th>Priority</th>
                <th>Status</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let wo of filteredWorkOrders" [class.overdue-row]="wo.isOverdue">
                <td>
                  <div class="font-mono font-semibold text-cyan">{{ wo.orderNumber }}</div>
                  <div class="font-caption text-muted">{{ wo.createdAtUtc | date:'shortDate' }}</div>
                </td>
                <td>
                  <div class="font-semibold">{{ wo.productName }}</div>
                  <div class="font-mono font-caption text-muted">SKU: {{ wo.productSku }}</div>
                  <div *ngIf="wo.bomNumber" class="bom-tag font-caption">
                    <span>Recipe: {{ wo.bomNumber }}</span>
                  </div>
                </td>
                <td>
                  <div>{{ wo.branchName }}</div>
                  <div class="font-caption text-muted">
                    Lead: {{ wo.assignedEmployeeName || 'Unassigned' }}
                  </div>
                </td>
                <td style="min-width: 170px;">
                  <div class="progress-info font-caption">
                    <span class="font-semibold text-emerald">{{ wo.quantityProduced | number:'1.0-0' }}</span> / {{ wo.quantityTarget | number:'1.0-0' }} units
                    <span class="text-muted" style="float: right;">{{ wo.progressPercentage }}%</span>
                  </div>
                  <div class="progress-bar-bg">
                    <div class="progress-bar-fill" [style.width.%]="wo.progressPercentage" [ngClass]="getProgressColor(wo)"></div>
                  </div>
                  <div *ngIf="wo.dueDateUtc" class="font-caption" [ngClass]="wo.isOverdue ? 'text-rose font-semibold' : 'text-muted'">
                    Due: {{ wo.dueDateUtc | date:'mediumDate' }} {{ wo.isOverdue ? '(Overdue)' : '' }}
                  </div>
                </td>
                <td>
                  <span class="badge" [ngClass]="getPriorityBadgeClass(wo.priority)">
                    {{ wo.priority }}
                  </span>
                </td>
                <td>
                  <span class="badge" [ngClass]="getStatusBadgeClass(wo.status)">
                    {{ wo.status }}
                  </span>
                </td>
                <td style="text-align: right;">
                  <div class="action-buttons">
                    <button (click)="viewWorkOrderDetails(wo)" title="View Order Details" class="btn-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>

                    <!-- Advance to Planned -->
                    <button
                      *ngIf="canManageManufacturing && wo.status === 'Draft'"
                      (click)="updateStatus(wo, 'Planned')"
                      title="Schedule / Plan Order"
                      class="btn-icon btn-action-indigo">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </button>

                    <!-- Start Production -->
                    <button
                      *ngIf="(wo.status === 'Draft' || wo.status === 'Planned')"
                      (click)="updateStatus(wo, 'InProgress')"
                      title="Start Production Run"
                      class="btn-icon btn-action-cyan">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    </button>

                    <!-- Complete Production Run -->
                    <button
                      *ngIf="wo.status === 'InProgress'"
                      (click)="openCompleteModal(wo)"
                      title="Complete Production & Yield to Inventory"
                      class="btn-icon btn-action-emerald">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                    </button>

                    <!-- Cancel Order -->
                    <button
                      *ngIf="canManageManufacturing && (wo.status === 'Draft' || wo.status === 'Planned' || wo.status === 'InProgress')"
                      (click)="cancelWorkOrder(wo)"
                      title="Cancel Order"
                      class="btn-icon btn-action-rose">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    </button>

                    <!-- Delete Draft -->
                    <button
                      *ngIf="canManageManufacturing && wo.status === 'Draft'"
                      (click)="deleteWorkOrder(wo)"
                      title="Delete Draft"
                      class="btn-icon btn-action-rose">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredWorkOrders.length === 0">
                <td colspan="7" class="empty-state">
                  <div class="empty-icon">⚙️</div>
                  <div class="font-heading-3">No Work Orders Found</div>
                  <p class="text-muted">Adjust filter parameters or create a new manufacturing work order.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 2: BILL OF MATERIALS (BOM) -->
      <div *ngIf="activeTab === 'boms'" class="tab-content">
        <div class="boms-grid">
          <div *ngFor="let bom of boms" class="bom-card glass-panel">
            <div class="bom-card-header">
              <div>
                <span class="font-mono text-cyan font-semibold">{{ bom.bomNumber }}</span>
                <span class="badge badge-indigo" style="margin-left: 0.5rem;">{{ bom.version }}</span>
              </div>
              <span class="badge" [ngClass]="bom.isActive ? 'badge-emerald' : 'badge-slate'">
                {{ bom.isActive ? 'Active Recipe' : 'Archived' }}
              </span>
            </div>

            <h3 class="bom-name font-heading-3">{{ bom.name }}</h3>
            <p *ngIf="bom.description" class="bom-desc font-caption text-muted">{{ bom.description }}</p>

            <div class="bom-product-box">
              <span class="font-caption text-muted">Assembles Finished Good:</span>
              <div class="font-semibold">{{ bom.productName }}</div>
              <div class="font-mono font-caption text-muted">SKU: {{ bom.productSku }}</div>
            </div>

            <div class="bom-components-section">
              <div class="bom-comp-title font-caption font-semibold">
                <span>Required Component SKUs</span>
                <span class="badge badge-cyan">{{ bom.items.length }} Items</span>
              </div>

              <div class="bom-items-list">
                <div *ngFor="let item of bom.items" class="bom-item-row">
                  <div>
                    <span class="font-semibold">{{ item.componentProductName }}</span>
                    <span class="font-mono font-caption text-muted" style="margin-left: 0.5rem;">({{ item.componentProductSku }})</span>
                  </div>
                  <div class="font-mono font-semibold text-emerald">
                    {{ item.quantityRequired }} {{ item.unitOfMeasure }}
                  </div>
                </div>
              </div>
            </div>

            <div class="bom-card-footer">
              <button (click)="openCreateWoFromBom(bom)" class="btn-primary" style="width: 100%;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <span>Launch Work Order from Recipe</span>
              </button>
            </div>
          </div>

          <div *ngIf="boms.length === 0" class="empty-state glass-panel" style="grid-column: 1 / -1; padding: 3rem;">
            <div class="empty-icon">📜</div>
            <div class="font-heading-3">No Bill of Materials Defined</div>
            <p class="text-muted">Create your first recipe linking component materials to finished goods.</p>
            <button (click)="openCreateBomModal()" class="btn-primary" style="margin-top: 1rem;">
              Create First BOM
            </button>
          </div>
        </div>
      </div>

      <!-- TAB 3: PRODUCTION FACILITIES -->
      <div *ngIf="activeTab === 'operations'" class="tab-content">
        <div class="facilities-grid">
          <div *ngFor="let branch of branches" class="facility-card glass-panel">
            <div class="facility-header">
              <div>
                <h3 class="font-heading-3">{{ branch.name }}</h3>
                <div class="font-mono font-caption text-muted">{{ branch.code }} • {{ branch.city }}, {{ branch.country }}</div>
              </div>
              <span class="badge badge-emerald">Plant Active</span>
            </div>

            <div class="facility-stats">
              <div class="facility-stat">
                <span class="font-caption text-muted">Active Work Orders</span>
                <span class="font-heading-2 text-cyan">{{ getActiveOrdersForBranch(branch.id) }}</span>
              </div>
              <div class="facility-stat">
                <span class="font-caption text-muted">Total Run Target</span>
                <span class="font-heading-2 text-amber">{{ getTargetUnitsForBranch(branch.id) | number:'1.0-0' }}</span>
              </div>
            </div>

            <div class="facility-footer">
              <span class="font-caption text-muted">Staffing: {{ branch.employeeCount }} Assigned Personnel</span>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL 1: CREATE WORK ORDER -->
      <div *ngIf="showCreateWoModal" class="modal-backdrop">
        <div class="modal-dialog glass-panel-elevated modal-md">
          <div class="modal-header">
            <div>
              <div class="badge badge-indigo" style="margin-bottom: 0.25rem;">Shop-Floor Production</div>
              <h2 class="font-heading-3">Launch New Work Order</h2>
            </div>
            <button (click)="showCreateWoModal = false" class="btn-close">×</button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Target Finished Good (Product SKU) *</label>
              <select [(ngModel)]="newWo.productId" (change)="onFinishedGoodSelect()" class="form-control">
                <option value="" disabled>-- Select Finished Product to Manufacture --</option>
                <option *ngFor="let prod of finishedGoodsList" [value]="prod.id">
                  {{ prod.name }} (SKU: {{ prod.sku }})
                </option>
              </select>
            </div>

            <div class="form-group" *ngIf="availableBomsForProduct.length > 0">
              <label class="form-label">Bill of Materials (BOM Formulation Recipe)</label>
              <select [(ngModel)]="newWo.billOfMaterialsId" class="form-control">
                <option [ngValue]="undefined">-- Optional Formulation Recipe --</option>
                <option *ngFor="let b of availableBomsForProduct" [value]="b.id">
                  {{ b.name }} ({{ b.bomNumber }} - {{ b.version }})
                </option>
              </select>
            </div>

            <div class="form-row">
              <div class="form-group form-col">
                <label class="form-label">Manufacturing Facility (Branch) *</label>
                <select [(ngModel)]="newWo.branchId" class="form-control">
                  <option value="" disabled>-- Select Assembly Plant --</option>
                  <option *ngFor="let b of branches" [value]="b.id">{{ b.name }} ({{ b.code }})</option>
                </select>
              </div>

              <div class="form-group form-col">
                <label class="form-label">Lead Production Engineer / Tech</label>
                <select [(ngModel)]="newWo.assignedEmployeeId" class="form-control">
                  <option [ngValue]="undefined">-- Assign Operator (Optional) --</option>
                  <option *ngFor="let emp of employees" [value]="emp.id">{{ emp.fullName }} ({{ emp.jobTitle }})</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group form-col">
                <label class="form-label">Target Quantity to Produce *</label>
                <input type="number" [(ngModel)]="newWo.quantityTarget" min="1" class="form-control" />
              </div>

              <div class="form-group form-col">
                <label class="form-label">Work Order Priority</label>
                <select [(ngModel)]="newWo.priority" class="form-control">
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group form-col">
                <label class="form-label">Planned Start Date</label>
                <input type="date" [(ngModel)]="newWoStartDate" class="form-control" />
              </div>
              <div class="form-group form-col">
                <label class="form-label">Target Completion Due Date</label>
                <input type="date" [(ngModel)]="newWoDueDate" class="form-control" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Shop-Floor Instructions & Batch Notes</label>
              <textarea [(ngModel)]="newWo.notes" rows="3" placeholder="Lot specifications, packaging constraints, or assembly notes..." class="form-control"></textarea>
            </div>
          </div>

          <div class="modal-footer">
            <button (click)="showCreateWoModal = false" class="btn-secondary">Cancel</button>
            <button (click)="submitCreateWorkOrder()" [disabled]="!isWoValid() || isSubmitting" class="btn-primary">
              <span *ngIf="!isSubmitting">Dispatch Work Order</span>
              <span *ngIf="isSubmitting">Dispatching...</span>
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL 2: COMPLETE WORK ORDER -->
      <div *ngIf="showCompleteModal && activeWoToComplete" class="modal-backdrop">
        <div class="modal-dialog glass-panel-elevated modal-sm">
          <div class="modal-header">
            <div>
              <div class="badge badge-emerald" style="margin-bottom: 0.25rem;">Quality Sign-Off & Inventory Yield</div>
              <h2 class="font-heading-3">Complete Work Order</h2>
            </div>
            <button (click)="showCompleteModal = false" class="btn-close">×</button>
          </div>

          <div class="modal-body">
            <div class="summary-box glass-panel" style="margin-bottom: 1rem;">
              <div class="font-mono text-cyan">{{ activeWoToComplete.orderNumber }}</div>
              <div class="font-semibold">{{ activeWoToComplete.productName }}</div>
              <div class="font-caption text-muted">Targeted Units: {{ activeWoToComplete.quantityTarget }}</div>
            </div>

            <div class="form-group">
              <label class="form-label">Actual Finished Units Yielded *</label>
              <input type="number" [(ngModel)]="completeQuantity" min="1" class="form-control" />
              <p class="font-caption text-muted" style="margin-top: 0.25rem;">
                These units will be atomically credited to <strong>{{ activeWoToComplete.branchName }}</strong> physical inventory with a verified stock movement record.
              </p>
            </div>

            <div class="form-group">
              <label class="form-label">Completion Notes / Scrap Explanation</label>
              <textarea [(ngModel)]="completeNotes" rows="2" placeholder="Quality inspection passed, any scrap write-off notes..." class="form-control"></textarea>
            </div>
          </div>

          <div class="modal-footer">
            <button (click)="showCompleteModal = false" class="btn-secondary">Cancel</button>
            <button (click)="submitCompleteWorkOrder()" [disabled]="completeQuantity <= 0 || isSubmitting" class="btn-primary">
              <span *ngIf="!isSubmitting">Sign Off & Yield Stock</span>
              <span *ngIf="isSubmitting">Processing...</span>
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL 3: CREATE BILL OF MATERIALS (BOM) -->
      <div *ngIf="showCreateBomModal" class="modal-backdrop">
        <div class="modal-dialog glass-panel-elevated modal-lg">
          <div class="modal-header">
            <div>
              <div class="badge badge-cyan" style="margin-bottom: 0.25rem;">Engineering Specifications</div>
              <h2 class="font-heading-3">Formulate Bill of Materials (BOM)</h2>
            </div>
            <button (click)="showCreateBomModal = false" class="btn-close">×</button>
          </div>

          <div class="modal-body">
            <div class="form-row">
              <div class="form-group form-col">
                <label class="form-label">Target Finished Good Product *</label>
                <select [(ngModel)]="newBom.productId" class="form-control">
                  <option value="" disabled>-- Select Finished Product to Formulate --</option>
                  <option *ngFor="let prod of finishedGoodsList" [value]="prod.id">
                    {{ prod.name }} (SKU: {{ prod.sku }})
                  </option>
                </select>
              </div>

              <div class="form-group form-col">
                <label class="form-label">Recipe Name *</label>
                <input type="text" [(ngModel)]="newBom.name" placeholder="e.g. Titan IoT Gateway Assembly Recipe" class="form-control" />
              </div>

              <div class="form-group" style="width: 120px;">
                <label class="form-label">Version</label>
                <input type="text" [(ngModel)]="newBom.version" placeholder="v1.0" class="form-control" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Description / Engineering Notes</label>
              <input type="text" [(ngModel)]="newBom.description" placeholder="Master component formulation for production run..." class="form-control" />
            </div>

            <!-- Dynamic Component Items Builder -->
            <div class="bom-builder-section">
              <div class="builder-header">
                <h4 class="font-heading-3" style="font-size: 1rem;">Component Materials & Parts Required</h4>
                <button type="button" (click)="addBomLineItem()" class="btn-secondary btn-sm">
                  + Add Component Part
                </button>
              </div>

              <table class="builder-table">
                <thead>
                  <tr>
                    <th>Component Material SKU *</th>
                    <th style="width: 130px;">Quantity *</th>
                    <th style="width: 110px;">Unit of Measure</th>
                    <th>Part Notes</th>
                    <th style="width: 40px;"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of newBomItems; let i = index">
                    <td>
                      <select (change)="onComponentSelect(i, $event)" class="form-control">
                        <option value="" [selected]="!item.componentProductId">-- Select Part SKU --</option>
                        <option *ngFor="let comp of componentProductsList" [value]="comp.id" [selected]="comp.id === item.componentProductId">
                          {{ comp.name }} ({{ comp.sku }})
                        </option>
                      </select>
                    </td>
                    <td>
                      <input type="number" [(ngModel)]="item.quantityRequired" min="0.01" step="0.1" class="form-control" />
                    </td>
                    <td>
                      <input type="text" [(ngModel)]="item.unitOfMeasure" placeholder="pcs" class="form-control" />
                    </td>
                    <td>
                      <input type="text" [(ngModel)]="item.notes" placeholder="Assembly note..." class="form-control" />
                    </td>
                    <td style="text-align: center;">
                      <button (click)="removeBomLineItem(i)" class="btn-remove">×</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="modal-footer">
            <button (click)="showCreateBomModal = false" class="btn-secondary">Cancel</button>
            <button (click)="submitCreateBom()" [disabled]="!isBomValid() || isSubmitting" class="btn-primary">
              <span *ngIf="!isSubmitting">Save Formulation Recipe</span>
              <span *ngIf="isSubmitting">Saving...</span>
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL 4: VIEW WORK ORDER DETAILS -->
      <div *ngIf="showPreviewModal && previewWo" class="modal-backdrop">
        <div class="modal-dialog glass-panel-elevated modal-md">
          <div class="modal-header">
            <div>
              <div class="badge" [ngClass]="getStatusBadgeClass(previewWo.status)">{{ previewWo.status }}</div>
              <h2 class="font-heading-3" style="margin-top: 0.25rem;">Work Order {{ previewWo.orderNumber }}</h2>
            </div>
            <button (click)="showPreviewModal = false" class="btn-close">×</button>
          </div>

          <div class="modal-body">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label font-caption text-muted">Finished Product</span>
                <span class="detail-value font-semibold">{{ previewWo.productName }}</span>
                <span class="font-mono font-caption text-muted">SKU: {{ previewWo.productSku }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label font-caption text-muted">Manufacturing Facility</span>
                <span class="detail-value font-semibold">{{ previewWo.branchName }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label font-caption text-muted">Priority</span>
                <span class="badge" [ngClass]="getPriorityBadgeClass(previewWo.priority)">{{ previewWo.priority }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label font-caption text-muted">Lead Operator</span>
                <span class="detail-value">{{ previewWo.assignedEmployeeName || 'Unassigned' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label font-caption text-muted">Target Quantity</span>
                <span class="detail-value font-semibold">{{ previewWo.quantityTarget }} units</span>
              </div>
              <div class="detail-item">
                <span class="detail-label font-caption text-muted">Units Produced</span>
                <span class="detail-value font-semibold text-emerald">{{ previewWo.quantityProduced }} units</span>
              </div>
              <div class="detail-item" *ngIf="previewWo.startDateUtc">
                <span class="detail-label font-caption text-muted">Started At</span>
                <span class="detail-value">{{ previewWo.startDateUtc | date:'medium' }}</span>
              </div>
              <div class="detail-item" *ngIf="previewWo.completedDateUtc">
                <span class="detail-label font-caption text-muted">Completed At</span>
                <span class="detail-value text-emerald font-semibold">{{ previewWo.completedDateUtc | date:'medium' }}</span>
              </div>
            </div>

            <div *ngIf="previewWo.notes" class="preview-notes glass-panel" style="margin-top: 1rem;">
              <span class="font-caption text-muted">Assembly & Batch Notes:</span>
              <p class="font-body" style="margin-top: 0.25rem;">{{ previewWo.notes }}</p>
            </div>
          </div>

          <div class="modal-footer">
            <button (click)="showPreviewModal = false" class="btn-primary">Close Details</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @use 'styles/variables' as *;
    @use 'styles/mixins' as *;

    .manufacturing-page {
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
    }

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

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
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
      color: #94a3b8;
    }

    .metric-value {
      font-size: 2rem;
      font-weight: 800;
      line-height: 1.1;
    }

    .metric-footer {
      display: flex;
      align-items: center;
      margin-top: auto;
    }

    .tabs-bar {
      display: flex;
      gap: 0.5rem;
      border-bottom: 1px solid rgba(148, 163, 184, 0.15);
      padding-bottom: 0.25rem;
    }

    .tab-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1rem;
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      border-radius: 6px;
      transition: all 0.15s ease;

      &:hover {
        color: #f8fafc;
        background: rgba(148, 163, 184, 0.08);
      }

      &.active {
        color: #38bdf8;
        background: rgba(56, 189, 248, 0.12);
        font-weight: 600;
      }
    }

    .tab-badge {
      font-size: 0.75rem;
      padding: 0.125rem 0.375rem;
      border-radius: 9999px;
      background: rgba(148, 163, 184, 0.2);
      color: #f8fafc;
    }

    .filter-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      padding: 0.875rem 1.25rem;
      margin-bottom: 1rem;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex: 1;
      min-width: 250px;
      color: #94a3b8;
    }

    .search-input {
      background: transparent;
      border: none;
      color: #f8fafc;
      width: 100%;
      font-size: 0.875rem;
      outline: none;

      &::placeholder {
        color: #64748b;
      }
    }

    .filter-group {
      display: flex;
      gap: 0.75rem;
    }

    .filter-select {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(148, 163, 184, 0.2);
      color: #f8fafc;
      font-size: 0.8125rem;
      padding: 0.375rem 0.75rem;
      border-radius: 6px;
      outline: none;
    }

    .table-container {
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;

      th {
        text-align: left;
        padding: 0.875rem 1rem;
        color: #94a3b8;
        font-weight: 600;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 1px solid rgba(148, 163, 184, 0.1);
      }

      td {
        padding: 0.875rem 1rem;
        border-bottom: 1px solid rgba(148, 163, 184, 0.06);
        vertical-align: middle;
      }

      tbody tr:hover {
        background: rgba(148, 163, 184, 0.04);
      }
    }

    .overdue-row {
      background: rgba(244, 63, 94, 0.04) !important;
    }

    .progress-info {
      margin-bottom: 0.25rem;
    }

    .progress-bar-bg {
      width: 100%;
      height: 6px;
      background: rgba(148, 163, 184, 0.15);
      border-radius: 9999px;
      overflow: hidden;
    }

    .progress-bar-fill {
      height: 100%;
      border-radius: 9999px;
      transition: width 0.3s ease;
    }

    .progress-emerald { background: #10b981; }
    .progress-cyan { background: #06b6d4; }
    .progress-amber { background: #f59e0b; }
    .progress-rose { background: #f43f5e; }

    .bom-tag {
      margin-top: 0.25rem;
      color: #38bdf8;
    }

    .action-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 0.375rem;
    }

    .btn-icon {
      background: rgba(148, 163, 184, 0.08);
      border: 1px solid rgba(148, 163, 184, 0.15);
      color: #94a3b8;
      padding: 0.375rem;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;

      &:hover {
        color: #f8fafc;
        background: rgba(148, 163, 184, 0.18);
      }
    }

    .btn-action-indigo:hover { color: #818cf8; border-color: #818cf8; }
    .btn-action-cyan:hover { color: #38bdf8; border-color: #38bdf8; }
    .btn-action-emerald:hover { color: #34d399; border-color: #34d399; }
    .btn-action-rose:hover { color: #fb7185; border-color: #fb7185; }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
    }

    .empty-icon {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }

    /* BOM Grid */
    .boms-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 1.25rem;
    }

    .bom-card {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
    }

    .bom-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .bom-name {
      font-size: 1.125rem;
      color: #f8fafc;
      margin: 0;
    }

    .bom-product-box {
      background: rgba(15, 23, 42, 0.5);
      padding: 0.75rem;
      border-radius: 6px;
      border: 1px solid rgba(148, 163, 184, 0.1);
    }

    .bom-components-section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .bom-comp-title {
      display: flex;
      justify-content: space-between;
      color: #94a3b8;
    }

    .bom-items-list {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      max-height: 160px;
      overflow-y: auto;
    }

    .bom-item-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.375rem 0.5rem;
      background: rgba(148, 163, 184, 0.04);
      border-radius: 4px;
      font-size: 0.8125rem;
    }

    .bom-card-footer {
      margin-top: auto;
      padding-top: 0.5rem;
    }

    /* Facilities Grid */
    .facilities-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.25rem;
    }

    .facility-card {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .facility-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .facility-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      background: rgba(15, 23, 42, 0.4);
      padding: 0.875rem;
      border-radius: 6px;
    }

    .facility-stat {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .modal-dialog {
      background: #0f172a;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 12px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }

    .modal-sm { max-width: 450px; }
    .modal-md { max-width: 650px; }
    .modal-lg { max-width: 850px; }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    }

    .btn-close {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 1.5rem;
      cursor: pointer;
      line-height: 1;
      &:hover { color: #f8fafc; }
    }

    .modal-body {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1.25rem 1.5rem;
      border-top: 1px solid rgba(148, 163, 184, 0.1);
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .form-row {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .form-col {
      flex: 1;
      min-width: 180px;
    }

    .form-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: #cbd5e1;
    }

    .form-control {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(148, 163, 184, 0.25);
      color: #f8fafc;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      font-size: 0.875rem;
      outline: none;

      &:focus {
        border-color: #38bdf8;
      }
    }

    .bom-builder-section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }

    .builder-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .builder-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8125rem;

      th {
        text-align: left;
        padding: 0.5rem;
        color: #94a3b8;
      }

      td {
        padding: 0.375rem;
      }
    }

    .btn-remove {
      background: rgba(244, 63, 94, 0.1);
      border: 1px solid rgba(244, 63, 94, 0.3);
      color: #fb7185;
      border-radius: 4px;
      padding: 0.25rem 0.5rem;
      cursor: pointer;

      &:hover {
        background: #f43f5e;
        color: white;
      }
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .preview-notes {
      padding: 0.75rem;
      border-radius: 6px;
    }

    .text-cyan { color: #38bdf8; }
    .text-emerald { color: #34d399; }
    .text-amber { color: #fbbf24; }
    .text-rose { color: #fb7185; }
    .font-mono { font-family: monospace; }
  `]
})
export class ManufacturingComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  public activeTenant$ = this.auth.activeTenant$;
  public currentRole: TenantRole = 'Owner';

  public activeTab: 'orders' | 'boms' | 'operations' = 'orders';

  public workOrders: WorkOrder[] = [];
  public filteredWorkOrders: WorkOrder[] = [];
  public boms: BillOfMaterials[] = [];
  public branches: Branch[] = [];
  public employees: Employee[] = [];
  public products: Product[] = [];

  public metrics: ManufacturingMetrics = {
    totalWorkOrders: 0,
    draftCount: 0,
    plannedCount: 0,
    inProgressCount: 0,
    completedCount: 0,
    cancelledCount: 0,
    totalUnitsTarget: 0,
    totalUnitsProduced: 0,
    completionRate: 0
  };

  // Filters
  public searchQuery = '';
  public statusFilter = 'ALL';
  public priorityFilter = 'ALL';
  public branchFilter = 'ALL';

  // Modals state
  public showCreateWoModal = false;
  public showCompleteModal = false;
  public showCreateBomModal = false;
  public showPreviewModal = false;
  public isSubmitting = false;

  // Create WO form
  public newWo: CreateWorkOrderRequest = {
    productId: '',
    branchId: '',
    quantityTarget: 10,
    priority: 'Medium'
  };
  public newWoStartDate = '';
  public newWoDueDate = '';
  public availableBomsForProduct: BillOfMaterials[] = [];

  // Complete modal form
  public activeWoToComplete: WorkOrder | null = null;
  public completeQuantity = 0;
  public completeNotes = '';

  // Create BOM form
  public newBom: CreateBomRequest = {
    productId: '',
    name: '',
    version: 'v1.0',
    items: []
  };
  public newBomItems: CreateBomItemRequest[] = [];

  // Preview sheet
  public previewWo: WorkOrder | null = null;

  public ngOnInit(): void {
    this.activeTenant$.subscribe(t => {
      if (t) {
        this.currentRole = t.role;
      }
    });

    this.loadWorkOrders();
    this.loadBoms();
    this.loadMetrics();
    this.loadBranches();
    this.loadEmployees();
    this.loadProducts();
  }

  public get canManageManufacturing(): boolean {
    return this.currentRole === 'Owner' || this.currentRole === 'Admin' || this.currentRole === 'Manager';
  }

  public get finishedGoodsList(): Product[] {
    return this.products.filter(p => p.category === 'FinishedGoods' || p.category === 'Hardware' || p.category === 'Electronics');
  }

  public get componentProductsList(): Product[] {
    return this.products;
  }

  public loadWorkOrders(): void {
    this.api.getWorkOrders().subscribe(res => {
      if (res.success && res.data) {
        this.workOrders = res.data.data;
        this.applyFilters();
      }
    });
  }

  public loadBoms(): void {
    this.api.getBillsOfMaterials().subscribe(res => {
      if (res.success && res.data) {
        this.boms = res.data;
      }
    });
  }

  public loadMetrics(): void {
    this.api.getManufacturingMetrics().subscribe(res => {
      if (res.success && res.data) {
        this.metrics = res.data;
      }
    });
  }

  public loadBranches(): void {
    this.api.getBranches().subscribe(res => {
      if (res.success && res.data) {
        this.branches = res.data;
      }
    });
  }

  public loadEmployees(): void {
    this.api.getEmployees().subscribe(res => {
      if (res.success && res.data) {
        this.employees = res.data.data;
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

  public applyFilters(): void {
    let list = [...this.workOrders];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(w =>
        w.orderNumber.toLowerCase().includes(q) ||
        w.productName.toLowerCase().includes(q) ||
        w.productSku.toLowerCase().includes(q) ||
        (w.notes && w.notes.toLowerCase().includes(q))
      );
    }

    if (this.statusFilter !== 'ALL') {
      list = list.filter(w => w.status === this.statusFilter);
    }

    if (this.priorityFilter !== 'ALL') {
      list = list.filter(w => w.priority === this.priorityFilter);
    }

    if (this.branchFilter !== 'ALL') {
      list = list.filter(w => w.branchId === this.branchFilter);
    }

    this.filteredWorkOrders = list;
  }

  // Launch Work Order Modal
  public openCreateWoModal(): void {
    const defaultBranch = this.branches.length > 0 ? this.branches[0].id : '';
    const defaultProduct = this.finishedGoodsList.length > 0 ? this.finishedGoodsList[0].id : (this.products.length > 0 ? this.products[0].id : '');

    this.newWo = {
      productId: defaultProduct,
      branchId: defaultBranch,
      quantityTarget: 25,
      priority: 'Medium',
      notes: ''
    };
    this.newWoStartDate = new Date().toISOString().substring(0, 10);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);
    this.newWoDueDate = dueDate.toISOString().substring(0, 10);

    this.onFinishedGoodSelect();
    this.showCreateWoModal = true;
  }

  public openCreateWoFromBom(bom: BillOfMaterials): void {
    this.openCreateWoModal();
    this.newWo.productId = bom.productId;
    this.newWo.billOfMaterialsId = bom.id;
    this.onFinishedGoodSelect();
  }

  public onFinishedGoodSelect(): void {
    if (!this.newWo.productId) {
      this.availableBomsForProduct = [];
      return;
    }
    this.availableBomsForProduct = this.boms.filter(b => b.productId === this.newWo.productId);
    if (this.availableBomsForProduct.length > 0 && !this.newWo.billOfMaterialsId) {
      this.newWo.billOfMaterialsId = this.availableBomsForProduct[0].id;
    }
  }

  public isWoValid(): boolean {
    return !!this.newWo.productId && !!this.newWo.branchId && this.newWo.quantityTarget > 0;
  }

  public submitCreateWorkOrder(): void {
    if (!this.isWoValid()) return;
    this.isSubmitting = true;

    if (this.newWoStartDate) {
      this.newWo.startDateUtc = new Date(this.newWoStartDate).toISOString();
    }
    if (this.newWoDueDate) {
      this.newWo.dueDateUtc = new Date(this.newWoDueDate).toISOString();
    }

    this.api.createWorkOrder(this.newWo).subscribe({
      next: res => {
        this.isSubmitting = false;
        if (res.success) {
          this.showCreateWoModal = false;
          this.loadWorkOrders();
          this.loadMetrics();
        }
      },
      error: () => {
        this.isSubmitting = false;
      }
    });
  }

  // Update Status & Completion
  public updateStatus(wo: WorkOrder, targetStatus: WorkOrderStatus): void {
    this.api.updateWorkOrderStatus(wo.id, { status: targetStatus }).subscribe(res => {
      if (res.success) {
        this.loadWorkOrders();
        this.loadMetrics();
      }
    });
  }

  public openCompleteModal(wo: WorkOrder): void {
    this.activeWoToComplete = wo;
    this.completeQuantity = wo.quantityTarget;
    this.completeNotes = '';
    this.showCompleteModal = true;
  }

  public submitCompleteWorkOrder(): void {
    if (!this.activeWoToComplete || this.completeQuantity <= 0) return;
    this.isSubmitting = true;

    this.api.updateWorkOrderStatus(this.activeWoToComplete.id, {
      status: 'Completed',
      quantityProduced: this.completeQuantity,
      notes: this.completeNotes
    }).subscribe({
      next: res => {
        this.isSubmitting = false;
        if (res.success) {
          this.showCompleteModal = false;
          this.loadWorkOrders();
          this.loadMetrics();
          this.loadProducts(); // Reload products to refresh on-hand counts
        }
      },
      error: () => {
        this.isSubmitting = false;
      }
    });
  }

  public cancelWorkOrder(wo: WorkOrder): void {
    if (confirm(`Are you sure you want to cancel work order ${wo.orderNumber}?`)) {
      this.updateStatus(wo, 'Cancelled');
    }
  }

  public deleteWorkOrder(wo: WorkOrder): void {
    if (confirm(`Delete draft work order ${wo.orderNumber}?`)) {
      this.api.deleteWorkOrder(wo.id).subscribe(res => {
        if (res.success) {
          this.loadWorkOrders();
          this.loadMetrics();
        }
      });
    }
  }

  // Create BOM
  public openCreateBomModal(): void {
    const defaultProduct = this.finishedGoodsList.length > 0 ? this.finishedGoodsList[0].id : '';
    this.newBom = {
      productId: defaultProduct,
      name: '',
      version: 'v1.0',
      description: '',
      items: []
    };
    this.newBomItems = [
      {
        componentProductId: this.products.length > 0 ? this.products[0].id : '',
        quantityRequired: 1,
        unitOfMeasure: 'pcs',
        notes: ''
      }
    ];
    this.showCreateBomModal = true;
  }

  public addBomLineItem(): void {
    this.newBomItems.push({
      componentProductId: this.products.length > 0 ? this.products[0].id : '',
      quantityRequired: 1,
      unitOfMeasure: 'pcs',
      notes: ''
    });
  }

  public removeBomLineItem(index: number): void {
    this.newBomItems.splice(index, 1);
  }

  public onComponentSelect(index: number, event: any): void {
    this.newBomItems[index].componentProductId = event.target.value;
  }

  public isBomValid(): boolean {
    return !!this.newBom.productId &&
           !!this.newBom.name.trim() &&
           this.newBomItems.length > 0 &&
           this.newBomItems.every(i => !!i.componentProductId && i.quantityRequired > 0);
  }

  public submitCreateBom(): void {
    if (!this.isBomValid()) return;
    this.isSubmitting = true;

    this.newBom.items = this.newBomItems;

    this.api.createBom(this.newBom).subscribe({
      next: res => {
        this.isSubmitting = false;
        if (res.success) {
          this.showCreateBomModal = false;
          this.loadBoms();
        }
      },
      error: () => {
        this.isSubmitting = false;
      }
    });
  }

  // Preview
  public viewWorkOrderDetails(wo: WorkOrder): void {
    this.previewWo = wo;
    this.showPreviewModal = true;
  }

  // Helpers
  public getActiveOrdersForBranch(branchId: string): number {
    return this.workOrders.filter(w => w.branchId === branchId && (w.status === 'Planned' || w.status === 'InProgress')).length;
  }

  public getTargetUnitsForBranch(branchId: string): number {
    return this.workOrders.filter(w => w.branchId === branchId).reduce((s, w) => s + w.quantityTarget, 0);
  }

  public getRoleBadgeClass(role: TenantRole): string {
    switch (role) {
      case 'Owner': return 'badge-amber';
      case 'Admin': return 'badge-indigo';
      case 'Manager': return 'badge-cyan';
      default: return 'badge-emerald';
    }
  }

  public getPriorityBadgeClass(priority: WorkOrderPriority): string {
    switch (priority) {
      case 'Urgent': return 'badge-rose';
      case 'High': return 'badge-amber';
      case 'Medium': return 'badge-indigo';
      case 'Low': return 'badge-slate';
      default: return 'badge-slate';
    }
  }

  public getStatusBadgeClass(status: WorkOrderStatus): string {
    switch (status) {
      case 'Completed': return 'badge-emerald';
      case 'InProgress': return 'badge-cyan';
      case 'Planned': return 'badge-indigo';
      case 'Draft': return 'badge-slate';
      case 'Cancelled': return 'badge-rose';
      default: return 'badge-slate';
    }
  }

  public getProgressColor(wo: WorkOrder): string {
    if (wo.status === 'Completed') return 'progress-emerald';
    if (wo.status === 'InProgress') return 'progress-cyan';
    if (wo.isOverdue) return 'progress-rose';
    return 'progress-amber';
  }

  public exportManufacturingCsv(): void {
    if (this.activeTab === 'boms') {
      const headers = ['BOM #', 'Recipe Name', 'Finished Good SKU', 'Product Name', 'Version', 'Components Count', 'Status'];
      const rows = this.boms.map(b => [
        `"${b.bomNumber}"`,
        `"${b.name.replace(/"/g, '""')}"`,
        `"${b.productSku.replace(/"/g, '""')}"`,
        `"${b.productName.replace(/"/g, '""')}"`,
        `"${b.version}"`,
        `"${b.items?.length || 0}"`,
        `"${b.isActive ? 'Active' : 'Archived'}"`
      ]);
      this.downloadCsvFile([headers.join(','), ...rows.map(r => r.join(','))].join('\n'), `orbit-manufacturing-boms-${Date.now()}.csv`);
    } else {
      const headers = ['Order #', 'Product SKU', 'Product Name', 'Facility', 'Lead Engineer', 'Target Qty', 'Produced Qty', 'Progress (%)', 'Priority', 'Status', 'Due Date', 'Is Overdue'];
      const rows = this.filteredWorkOrders.map(wo => [
        `"${wo.orderNumber}"`,
        `"${wo.productSku.replace(/"/g, '""')}"`,
        `"${wo.productName.replace(/"/g, '""')}"`,
        `"${wo.branchName.replace(/"/g, '""')}"`,
        `"${(wo.assignedEmployeeName || 'Unassigned').replace(/"/g, '""')}"`,
        `"${wo.quantityTarget}"`,
        `"${wo.quantityProduced}"`,
        `"${wo.progressPercentage}%"`,
        `"${wo.priority}"`,
        `"${wo.status}"`,
        `"${wo.dueDateUtc || ''}"`,
        `"${wo.isOverdue ? 'YES' : 'NO'}"`
      ]);
      this.downloadCsvFile([headers.join(','), ...rows.map(r => r.join(','))].join('\n'), `orbit-manufacturing-workorders-${Date.now()}.csv`);
    }
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

