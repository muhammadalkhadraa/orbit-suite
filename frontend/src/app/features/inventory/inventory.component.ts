import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import {
  Product,
  ProductInventory,
  StockMovement,
  InventoryMetrics,
  ProductCategory,
  StockMovementType,
  CreateProductRequest,
  UpdateProductRequest,
  AdjustStockRequest,
  Branch,
  TenantRole
} from '../../core/models/models';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="inventory-page">
      <!-- Header Section -->
      <div class="page-header">
        <div>
          <div class="badge badge-cyan" style="margin-bottom: 0.5rem;">Multi-Location Inventory & Stock Ledger</div>
          <h1 class="font-heading-2">Product Catalog & Inventory Control</h1>
          <p class="font-caption">Real-time SKU tracking, multi-branch warehouse distribution, atomic stock adjustments, and immutable movement ledger</p>
        </div>
        <div class="header-actions">
          <button (click)="exportInventoryCsv()" class="btn-secondary" title="Export Current Inventory / Ledger to CSV">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Export CSV</span>
          </button>
          <button (click)="openAdjustModal()" class="btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
            <span>Adjust / Transfer Stock</span>
          </button>
          <button *ngIf="canManageCatalog" (click)="openCreateModal()" class="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>New Product SKU</span>
          </button>
        </div>
      </div>

      <!-- Confirmed Role Permission Banner -->
      <div class="role-scope-banner glass-panel">
        <div class="scope-icon">📦</div>
        <div class="scope-details">
          <div class="scope-title">
            ACTIVE PERMISSION SCOPE: <span class="badge" [ngClass]="getRoleBadgeClass(currentRole)">{{ currentRole }}</span>
          </div>
          <p class="scope-explanation" [ngSwitch]="currentRole">
            <span *ngSwitchCase="'Owner'">
              <strong>Full Tenant Authority:</strong> Complete governance over product pricing, catalog creation, cross-branch transfers, and inventory write-offs across all branches in {{ (activeTenant$ | async)?.name }}.
            </span>
            <span *ngSwitchCase="'Admin'">
              <strong>Warehouse Administrator:</strong> Authorized to create new SKUs, modify price book data, initiate inter-branch stock transfers, and perform reconciliation adjustments.
            </span>
            <span *ngSwitchCase="'Manager'">
              <strong>Branch Operations Manager:</strong> Authorized to execute stock receipts, local branch inventory adjustments, and view valuation metrics.
            </span>
            <span *ngSwitchCase="'Employee'">
              <strong>Logistics Operator:</strong> Read access to catalog availability, stock lookup, and execution of verified physical count receipts and stock adjustments.
            </span>
            <span *ngSwitchDefault>
              Multi-location inventory tracking enabled.
            </span>
          </p>
        </div>
      </div>

      <!-- KPI Metrics Row -->
      <div class="metrics-row">
        <div class="metric-card glass-panel">
          <div class="metric-header">
            <span class="metric-label">INVENTORY VALUATION</span>
            <span class="metric-icon">💎</span>
          </div>
          <div class="metric-value font-heading-2 text-emerald">
            \${{ (metrics?.totalInventoryValuation || 0) | number:'1.2-2' }}
          </div>
          <span class="metric-sub text-muted">Cost basis across all warehouses</span>
        </div>

        <div class="metric-card glass-panel">
          <div class="metric-header">
            <span class="metric-label">ACTIVE CATALOG SKUS</span>
            <span class="metric-icon">🏷️</span>
          </div>
          <div class="metric-value font-heading-2 text-indigo">
            {{ metrics?.activeProductsCount || 0 }}
          </div>
          <span class="metric-sub text-muted">{{ metrics?.totalProductsCount || 0 }} total registered products</span>
        </div>

        <div class="metric-card glass-panel">
          <div class="metric-header">
            <span class="metric-label">PHYSICAL UNITS ON HAND</span>
            <span class="metric-icon">📊</span>
          </div>
          <div class="metric-value font-heading-2 text-cyan">
            {{ (metrics?.totalUnitsOnHand || 0) | number }}
          </div>
          <span class="metric-sub text-muted">Aggregate quantity in stock</span>
        </div>

        <div class="metric-card glass-panel">
          <div class="metric-header">
            <span class="metric-label">REORDER ALERTS</span>
            <span class="metric-icon">⚠️</span>
          </div>
          <div class="metric-value font-heading-2 text-amber">
            {{ (metrics?.lowStockProductsCount || 0) + (metrics?.outOfStockProductsCount || 0) }}
          </div>
          <span class="metric-sub text-rose" *ngIf="(metrics?.outOfStockProductsCount || 0) > 0">
            {{ metrics?.outOfStockProductsCount }} out of stock!
          </span>
          <span class="metric-sub text-muted" *ngIf="(metrics?.outOfStockProductsCount || 0) === 0">
            {{ metrics?.lowStockProductsCount }} below reorder point
          </span>
        </div>
      </div>

      <!-- Main Tabs Navigation -->
      <div class="tabs-container">
        <button
          class="tab-btn"
          [class.active]="activeTab === 'catalog'"
          (click)="activeTab = 'catalog'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          <span>Catalog & Stock Levels ({{ products.length }})</span>
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab === 'ledger'"
          (click)="activeTab = 'ledger'; loadMovements()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          <span>Stock Movement Ledger ({{ movements.length }})</span>
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab === 'branches'"
          (click)="activeTab = 'branches'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
          <span>Warehouse Locations ({{ branches.length }})</span>
        </button>
      </div>

      <!-- TAB 1: CATALOG & STOCK LEVELS -->
      <div *ngIf="activeTab === 'catalog'" class="tab-content">
        <!-- Filter Controls -->
        <div class="filters-bar glass-panel">
          <div class="search-input-wrapper">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="applyFilters()"
              placeholder="Search by SKU, product name, or description..."
              class="search-input" />
          </div>

          <div class="filter-group">
            <select [(ngModel)]="selectedCategory" (ngModelChange)="applyFilters()" class="select-filter">
              <option value="">All Categories</option>
              <option *ngFor="let cat of categories" [value]="cat">{{ cat }}</option>
            </select>

            <select [(ngModel)]="stockFilter" (ngModelChange)="applyFilters()" class="select-filter">
              <option value="all">All Stock Statuses</option>
              <option value="in_stock">In Stock (Available)</option>
              <option value="low_stock">Low Stock (At/Below Reorder)</option>
              <option value="out_of_stock">Out of Stock (Zero Units)</option>
            </select>

            <select [(ngModel)]="selectedBranchFilter" (ngModelChange)="applyFilters()" class="select-filter">
              <option value="">All Warehouses</option>
              <option *ngFor="let b of branches" [value]="b.id">{{ b.name }} ({{ b.code }})</option>
            </select>
          </div>
        </div>

        <!-- Products Table -->
        <div class="table-container glass-panel">
          <table class="data-table">
            <thead>
              <tr>
                <th>SKU & ITEM</th>
                <th>CATEGORY</th>
                <th>PRICING & VALUATION</th>
                <th>AVAILABLE STOCK</th>
                <th>LOCATION BREAKDOWN</th>
                <th>STATUS</th>
                <th style="text-align: right;">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let product of filteredProducts" [class.inactive-row]="!product.isActive">
                <td>
                  <div class="product-cell">
                    <span class="sku-badge">{{ product.sku }}</span>
                    <div class="product-info">
                      <div class="product-name font-body-bold">{{ product.name }}</div>
                      <div class="product-desc text-muted">{{ product.description || 'No description provided' }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="category-tag">{{ product.category }}</span>
                </td>
                <td>
                  <div class="pricing-cell">
                    <div><span class="text-muted">Price:</span> <strong>\${{ product.unitPrice | number:'1.2-2' }}</strong></div>
                    <div class="text-muted"><span class="text-muted">Cost:</span> \${{ product.unitCost | number:'1.2-2' }}</div>
                    <div class="valuation-tag text-emerald">
                      Val: \${{ product.inventoryValuation | number:'1.0-0' }}
                    </div>
                  </div>
                </td>
                <td>
                  <div class="stock-level-cell">
                    <div class="stock-qty">
                      <span class="qty-num font-heading-3" [ngClass]="getStockTextClass(product)">
                        {{ product.totalQuantityOnHand }}
                      </span>
                      <span class="qty-unit text-muted">{{ product.unitOfMeasure }}</span>
                    </div>
                    <div class="stock-progress-bg">
                      <div
                        class="stock-progress-fill"
                        [ngClass]="getProgressBarClass(product)"
                        [style.width.%]="getStockBarPercentage(product)"></div>
                    </div>
                    <div class="stock-meta text-muted">
                      <span>Res: {{ product.totalQuantityReserved }}</span>
                      <span>Min: {{ product.reorderLevel }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="branch-chips">
                    <div *ngFor="let inv of product.branchInventories" class="branch-chip" [class.low-chip]="inv.isLowStock">
                      <span class="chip-code">{{ inv.branchCode }}:</span>
                      <span class="chip-qty font-body-bold">{{ inv.quantityOnHand }}</span>
                      <span *ngIf="inv.aisleBinLocation" class="chip-bin text-muted">({{ inv.aisleBinLocation }})</span>
                    </div>
                    <div *ngIf="product.branchInventories.length === 0" class="text-muted" style="font-size: 0.8rem;">
                      No stock allocated
                    </div>
                  </div>
                </td>
                <td>
                  <span *ngIf="!product.isActive" class="badge badge-rose">Inactive</span>
                  <span *ngIf="product.isActive && product.totalQuantityOnHand <= 0" class="badge badge-rose">Out of Stock</span>
                  <span *ngIf="product.isActive && product.totalQuantityOnHand > 0 && product.isLowStock" class="badge badge-amber">Low Stock</span>
                  <span *ngIf="product.isActive && !product.isLowStock" class="badge badge-emerald">Optimal</span>
                </td>
                <td style="text-align: right;">
                  <div class="action-buttons">
                    <button (click)="openQuickAdjust(product)" title="Adjust Stock" class="btn-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                    </button>
                    <button *ngIf="canManageCatalog" (click)="openEditModal(product)" title="Edit Product" class="btn-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredProducts.length === 0">
                <td colspan="7" class="empty-state">
                  <div class="empty-icon">🔍</div>
                  <div class="font-heading-3">No Products Found</div>
                  <p class="text-muted">Try adjusting your search criteria or category filter.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 2: STOCK MOVEMENT LEDGER -->
      <div *ngIf="activeTab === 'ledger'" class="tab-content">
        <!-- Ledger Filters -->
        <div class="filters-bar glass-panel">
          <div class="search-input-wrapper">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              [(ngModel)]="ledgerSearchQuery"
              (ngModelChange)="applyLedgerFilters()"
              placeholder="Search reference #, reason, SKU, or product..."
              class="search-input" />
          </div>

          <div class="filter-group">
            <select [(ngModel)]="selectedMovementType" (ngModelChange)="applyLedgerFilters()" class="select-filter">
              <option value="">All Movement Types</option>
              <option *ngFor="let t of movementTypes" [value]="t">{{ t }}</option>
            </select>
          </div>
        </div>

        <!-- Ledger Table -->
        <div class="table-container glass-panel">
          <table class="data-table">
            <thead>
              <tr>
                <th>TIMESTAMP (UTC)</th>
                <th>TYPE</th>
                <th>SKU & PRODUCT</th>
                <th>QUANTITY</th>
                <th>ROUTE / WAREHOUSE</th>
                <th>REFERENCE #</th>
                <th>REASON / NOTES</th>
                <th>RECORDED BY</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let mov of filteredMovements">
                <td class="text-muted timestamp-cell">
                  {{ mov.timestampUtc | date:'yyyy-MM-dd HH:mm' }}
                </td>
                <td>
                  <span class="badge" [ngClass]="getMovementBadgeClass(mov.type)">
                    {{ mov.type }}
                  </span>
                </td>
                <td>
                  <div>
                    <span class="sku-badge" style="font-size: 0.75rem;">{{ mov.productSku }}</span>
                    <span class="font-body-bold" style="margin-left: 0.5rem;">{{ mov.productName }}</span>
                  </div>
                </td>
                <td>
                  <span class="font-heading-3" [ngClass]="getMovementQuantityClass(mov.type)">
                    {{ getMovementQuantityPrefix(mov.type) }}{{ mov.quantity }}
                  </span>
                </td>
                <td>
                  <div *ngIf="mov.type === 'Transfer' && mov.destinationBranchName" class="route-display">
                    <span>{{ mov.branchName }}</span>
                    <span class="route-arrow">➔</span>
                    <span class="text-cyan">{{ mov.destinationBranchName }}</span>
                  </div>
                  <div *ngIf="mov.type !== 'Transfer'">
                    {{ mov.branchName }}
                  </div>
                </td>
                <td>
                  <span class="ref-badge">{{ mov.referenceNumber || '—' }}</span>
                </td>
                <td>
                  <span class="text-muted">{{ mov.reason || 'Standard adjustment' }}</span>
                </td>
                <td>
                  <span class="text-muted">{{ mov.performedByEmployeeName || 'Automated System' }}</span>
                </td>
              </tr>
              <tr *ngIf="filteredMovements.length === 0">
                <td colspan="8" class="empty-state">
                  <div class="empty-icon">📜</div>
                  <div class="font-heading-3">No Ledger Entries Found</div>
                  <p class="text-muted">Stock movements will appear here when inventory changes occur.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 3: WAREHOUSE BRANCH BREAKDOWN -->
      <div *ngIf="activeTab === 'branches'" class="tab-content">
        <div class="branches-grid">
          <div *ngFor="let branch of branches" class="branch-card glass-panel">
            <div class="branch-card-header">
              <div class="branch-title-group">
                <span class="branch-code-badge">{{ branch.code }}</span>
                <h3 class="font-heading-3">{{ branch.name }}</h3>
                <span class="branch-location text-muted">{{ branch.city }}, {{ branch.country }}</span>
              </div>
              <span class="badge badge-emerald">Operational</span>
            </div>

            <div class="branch-metrics-row">
              <div class="branch-metric">
                <span class="metric-num font-heading-2 text-cyan">{{ getBranchTotalUnits(branch.id) }}</span>
                <span class="metric-desc text-muted">Total Units</span>
              </div>
              <div class="branch-metric">
                <span class="metric-num font-heading-2 text-emerald">\${{ getBranchValuation(branch.id) | number:'1.0-0' }}</span>
                <span class="metric-desc text-muted">Valuation</span>
              </div>
              <div class="branch-metric">
                <span class="metric-num font-heading-2 text-indigo">{{ getBranchSkuCount(branch.id) }}</span>
                <span class="metric-desc text-muted">Unique SKUs</span>
              </div>
            </div>

            <div class="branch-stock-list">
              <div class="branch-stock-title font-body-bold">Stocked Items:</div>
              <div *ngFor="let item of getBranchProducts(branch.id)" class="branch-stock-item">
                <span class="sku-badge" style="font-size: 0.7rem;">{{ item.productSku }}</span>
                <span class="stock-item-name">{{ item.productName }}</span>
                <span class="stock-item-qty font-body-bold">{{ item.quantityOnHand }} units</span>
                <span *ngIf="item.aisleBinLocation" class="stock-item-bin text-muted">[{{ item.aisleBinLocation }}]</span>
              </div>
              <div *ngIf="getBranchProducts(branch.id).length === 0" class="text-muted" style="font-size: 0.85rem; padding: 0.5rem 0;">
                No items currently assigned to this location.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL: CREATE PRODUCT -->
      <div *ngIf="showCreateModal" class="modal-backdrop">
        <div class="modal-card glass-panel">
          <div class="modal-header">
            <div class="badge badge-indigo">Catalog Governance</div>
            <h2 class="font-heading-2">Register New Product SKU</h2>
            <p class="font-caption">Define product specifications, cost parameters, and initial warehouse allocation</p>
          </div>

          <form (ngSubmit)="submitCreateProduct()" class="modal-form">
            <div class="form-row-2">
              <div class="form-group">
                <label>SKU (Stock Keeping Unit) *</label>
                <input
                  type="text"
                  [(ngModel)]="newProduct.sku"
                  name="sku"
                  required
                  placeholder="e.g. SRV-RACK-42U"
                  class="form-input mono" />
              </div>

              <div class="form-group">
                <label>Product Category *</label>
                <select [(ngModel)]="newProduct.category" name="category" required class="form-input">
                  <option *ngFor="let c of categories" [value]="c">{{ c }}</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label>Product Name *</label>
              <input
                type="text"
                [(ngModel)]="newProduct.name"
                name="name"
                required
                placeholder="e.g. 42U Enterprise Server Rack"
                class="form-input" />
            </div>

            <div class="form-group">
              <label>Description</label>
              <textarea
                [(ngModel)]="newProduct.description"
                name="description"
                rows="2"
                placeholder="Product technical overview and specifications..."
                class="form-input"></textarea>
            </div>

            <div class="form-row-3">
              <div class="form-group">
                <label>Unit Selling Price ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  [(ngModel)]="newProduct.unitPrice"
                  name="unitPrice"
                  required
                  class="form-input" />
              </div>

              <div class="form-group">
                <label>Unit Cost ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  [(ngModel)]="newProduct.unitCost"
                  name="unitCost"
                  required
                  class="form-input" />
              </div>

              <div class="form-group">
                <label>Reorder Level *</label>
                <input
                  type="number"
                  [(ngModel)]="newProduct.reorderLevel"
                  name="reorderLevel"
                  required
                  class="form-input" />
              </div>
            </div>

            <div class="form-divider">
              <span>INITIAL WAREHOUSE ALLOCATION (OPTIONAL)</span>
            </div>

            <div class="form-row-3">
              <div class="form-group">
                <label>Initial Warehouse</label>
                <select [(ngModel)]="newProduct.initialBranchId" name="initialBranchId" class="form-input">
                  <option [ngValue]="undefined">None (0 Initial Stock)</option>
                  <option *ngFor="let b of branches" [value]="b.id">{{ b.name }} ({{ b.code }})</option>
                </select>
              </div>

              <div class="form-group">
                <label>Initial Quantity</label>
                <input
                  type="number"
                  [(ngModel)]="newProduct.initialQuantity"
                  name="initialQuantity"
                  min="0"
                  class="form-input" />
              </div>

              <div class="form-group">
                <label>Aisle / Bin Location</label>
                <input
                  type="text"
                  [(ngModel)]="newProduct.aisleBinLocation"
                  name="aisleBinLocation"
                  placeholder="e.g. Aisle 3, Shelf B"
                  class="form-input" />
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" (click)="showCreateModal = false" class="btn-ghost">Cancel</button>
              <button type="submit" [disabled]="isSubmitting" class="btn-primary">
                {{ isSubmitting ? 'Registering...' : 'Add Product to Catalog' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL: ADJUST / TRANSFER STOCK -->
      <div *ngIf="showAdjustModal" class="modal-backdrop">
        <div class="modal-card glass-panel">
          <div class="modal-header">
            <div class="badge badge-cyan">Inventory Operations</div>
            <h2 class="font-heading-2">Record Stock Movement / Transfer</h2>
            <p class="font-caption">Execute atomic stock adjustments or inter-branch transfers with ledger audit trail</p>
          </div>

          <form (ngSubmit)="submitAdjustStock()" class="modal-form">
            <div class="form-row-2">
              <div class="form-group">
                <label>Target Product *</label>
                <select [(ngModel)]="adjustRequest.productId" name="productId" required class="form-input">
                  <option value="">Select Product...</option>
                  <option *ngFor="let p of products" [value]="p.id">
                    {{ p.sku }} — {{ p.name }} ({{ p.totalQuantityOnHand }} on hand)
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label>Movement Type *</label>
                <select [(ngModel)]="adjustRequest.type" name="type" required class="form-input">
                  <option *ngFor="let t of movementTypes" [value]="t">{{ t }}</option>
                </select>
              </div>
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label>{{ adjustRequest.type === 'Transfer' ? 'Source Warehouse *' : 'Warehouse Location *' }}</label>
                <select [(ngModel)]="adjustRequest.branchId" name="branchId" required class="form-input">
                  <option value="">Select Warehouse...</option>
                  <option *ngFor="let b of branches" [value]="b.id">{{ b.name }} ({{ b.code }})</option>
                </select>
              </div>

              <div *ngIf="adjustRequest.type === 'Transfer'" class="form-group">
                <label>Destination Warehouse *</label>
                <select [(ngModel)]="adjustRequest.destinationBranchId" name="destinationBranchId" required class="form-input">
                  <option value="">Select Destination...</option>
                  <option *ngFor="let b of branches" [value]="b.id" [disabled]="b.id === adjustRequest.branchId">
                    {{ b.name }} ({{ b.code }})
                  </option>
                </select>
              </div>

              <div *ngIf="adjustRequest.type !== 'Transfer'" class="form-group">
                <label>Quantity *</label>
                <input
                  type="number"
                  min="1"
                  [(ngModel)]="adjustRequest.quantity"
                  name="quantity"
                  required
                  placeholder="Units to adjust"
                  class="form-input" />
              </div>
            </div>

            <div *ngIf="adjustRequest.type === 'Transfer'" class="form-group">
              <label>Transfer Quantity *</label>
              <input
                type="number"
                min="1"
                [(ngModel)]="adjustRequest.quantity"
                name="quantity"
                required
                placeholder="Units to transfer"
                class="form-input" />
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label>Reference # (PO, SO, or Cycle Count)</label>
                <input
                  type="text"
                  [(ngModel)]="adjustRequest.referenceNumber"
                  name="referenceNumber"
                  placeholder="e.g. PO-2026-904"
                  class="form-input mono" />
              </div>

              <div class="form-group">
                <label>Aisle / Bin Update (Optional)</label>
                <input
                  type="text"
                  [(ngModel)]="adjustRequest.aisleBinLocation"
                  name="aisleBinLocation"
                  placeholder="e.g. Aisle C-2, Bin 14"
                  class="form-input" />
              </div>
            </div>

            <div class="form-group">
              <label>Reason / Audit Note *</label>
              <input
                type="text"
                [(ngModel)]="adjustRequest.reason"
                name="reason"
                required
                placeholder="e.g. Quarterly cycle count variance, Customer RMA intake..."
                class="form-input" />
            </div>

            <div class="modal-actions">
              <button type="button" (click)="showAdjustModal = false" class="btn-ghost">Cancel</button>
              <button type="submit" [disabled]="isSubmitting" class="btn-primary">
                {{ isSubmitting ? 'Posting Ledger...' : 'Commit Stock Movement' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL: EDIT PRODUCT -->
      <div *ngIf="showEditModal && editingProduct" class="modal-backdrop">
        <div class="modal-card glass-panel">
          <div class="modal-header">
            <div class="badge badge-indigo">Catalog Update</div>
            <h2 class="font-heading-2">Edit SKU: {{ editingProduct.sku }}</h2>
            <p class="font-caption">Update pricing structure, category tags, and active lifecycle status</p>
          </div>

          <form (ngSubmit)="submitUpdateProduct()" class="modal-form">
            <div class="form-group">
              <label>Product Name *</label>
              <input
                type="text"
                [(ngModel)]="editRequest.name"
                name="editName"
                required
                class="form-input" />
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label>Category *</label>
                <select [(ngModel)]="editRequest.category" name="editCategory" class="form-input">
                  <option *ngFor="let c of categories" [value]="c">{{ c }}</option>
                </select>
              </div>

              <div class="form-group">
                <label>Unit of Measure</label>
                <input
                  type="text"
                  [(ngModel)]="editRequest.unitOfMeasure"
                  name="editUom"
                  class="form-input" />
              </div>
            </div>

            <div class="form-group">
              <label>Description</label>
              <textarea
                [(ngModel)]="editRequest.description"
                name="editDesc"
                rows="2"
                class="form-input"></textarea>
            </div>

            <div class="form-row-3">
              <div class="form-group">
                <label>Selling Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  [(ngModel)]="editRequest.unitPrice"
                  name="editPrice"
                  class="form-input" />
              </div>

              <div class="form-group">
                <label>Cost Basis ($)</label>
                <input
                  type="number"
                  step="0.01"
                  [(ngModel)]="editRequest.unitCost"
                  name="editCost"
                  class="form-input" />
              </div>

              <div class="form-group">
                <label>Reorder Point</label>
                <input
                  type="number"
                  [(ngModel)]="editRequest.reorderLevel"
                  name="editReorder"
                  class="form-input" />
              </div>
            </div>

            <div class="form-group" style="display: flex; align-items: center; gap: 0.75rem; margin-top: 0.5rem;">
              <input
                type="checkbox"
                id="editIsActive"
                [(ngModel)]="editRequest.isActive"
                name="editIsActive" />
              <label for="editIsActive" style="margin: 0; cursor: pointer;">Active in Product Catalog</label>
            </div>

            <div class="modal-actions">
              <button type="button" (click)="showEditModal = false" class="btn-ghost">Cancel</button>
              <button type="submit" [disabled]="isSubmitting" class="btn-primary">
                {{ isSubmitting ? 'Saving...' : 'Update Product' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .inventory-page {
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
      border: 1px solid rgba(99, 102, 241, 0.25);
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
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.1);
      border-color: rgba(56, 189, 248, 0.3);
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
      border-color: #38bdf8;
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

    /* Data Table */
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

    .inactive-row {
      opacity: 0.5;
    }

    .product-cell {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .sku-badge {
      font-family: monospace;
      font-size: 0.8rem;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.25);
      display: inline-block;
      width: fit-content;
    }

    .category-tag {
      font-size: 0.8rem;
      color: #cbd5e1;
      background: rgba(255, 255, 255, 0.06);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }

    .pricing-cell {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      font-size: 0.85rem;
    }

    .valuation-tag {
      font-size: 0.75rem;
      font-weight: 600;
    }

    .stock-level-cell {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 140px;
    }

    .stock-qty {
      display: flex;
      align-items: baseline;
      gap: 0.35rem;
    }

    .qty-num {
      font-size: 1.25rem;
      font-weight: 800;
    }

    .stock-progress-bg {
      height: 4px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.1);
      overflow: hidden;
    }

    .stock-progress-fill {
      height: 100%;
      border-radius: 2px;
      transition: width 0.3s ease;
    }

    .bg-emerald { background: #10b981; }
    .bg-amber { background: #f59e0b; }
    .bg-rose { background: #f43f5e; }

    .stock-meta {
      display: flex;
      justify-content: space-between;
      font-size: 0.7rem;
    }

    .branch-chips {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .branch-chip {
      font-size: 0.75rem;
      padding: 0.2rem 0.45rem;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      gap: 0.35rem;
      width: fit-content;
    }

    .branch-chip.low-chip {
      border-color: rgba(245, 158, 11, 0.4);
      background: rgba(245, 158, 11, 0.08);
    }

    .chip-code {
      color: #94a3b8;
      font-weight: 600;
    }

    .timestamp-cell {
      font-size: 0.8rem;
      white-space: nowrap;
    }

    .ref-badge {
      font-family: monospace;
      font-size: 0.8rem;
      color: #cbd5e1;
    }

    .route-display {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.85rem;
    }

    .route-arrow {
      color: #38bdf8;
      font-weight: bold;
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

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
    }

    .empty-icon {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }

    /* Branch Grid */
    .branches-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 1.5rem;
    }

    .branch-card {
      padding: 1.5rem;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .branch-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .branch-code-badge {
      font-family: monospace;
      font-size: 0.75rem;
      font-weight: 700;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.1);
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      display: inline-block;
      margin-bottom: 0.35rem;
    }

    .branch-metrics-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      padding: 0.75rem;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.2);
    }

    .branch-metric {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.15rem;
    }

    .branch-stock-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .branch-stock-title {
      font-size: 0.85rem;
      color: #94a3b8;
    }

    .branch-stock-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      padding: 0.4rem 0.6rem;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.03);
    }

    .stock-item-name {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
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
      max-width: 600px;
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
      border-color: #38bdf8;
      box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
    }

    .form-input.mono {
      font-family: monospace;
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

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1rem;
    }

    /* Common Buttons & Colors */
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      background: linear-gradient(135deg, #38bdf8 0%, #6366f1 100%);
      color: #ffffff;
      font-weight: 600;
      font-size: 0.9rem;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(56, 189, 248, 0.25);
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
  `]
})
export class InventoryComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  public activeTenant$ = this.auth.activeTenant$;
  public currentRole: TenantRole = 'Owner';

  public activeTab: 'catalog' | 'ledger' | 'branches' = 'catalog';

  public products: Product[] = [];
  public filteredProducts: Product[] = [];
  public movements: StockMovement[] = [];
  public filteredMovements: StockMovement[] = [];
  public branches: Branch[] = [];
  public metrics: InventoryMetrics | null = null;

  public categories: ProductCategory[] = [
    'Hardware',
    'Software',
    'Electronics',
    'RawMaterials',
    'Components',
    'FinishedGoods',
    'Services'
  ];

  public movementTypes: StockMovementType[] = [
    'Receipt',
    'AdjustmentIn',
    'AdjustmentOut',
    'Transfer',
    'SaleShipment',
    'Scrap'
  ];

  // Filters
  public searchQuery = '';
  public selectedCategory = '';
  public stockFilter = 'all';
  public selectedBranchFilter = '';

  public ledgerSearchQuery = '';
  public selectedMovementType = '';

  // Modals state
  public showCreateModal = false;
  public showAdjustModal = false;
  public showEditModal = false;
  public isSubmitting = false;

  public newProduct: CreateProductRequest = {
    sku: '',
    name: '',
    description: '',
    category: 'Hardware',
    unitOfMeasure: 'pcs',
    unitPrice: 0,
    unitCost: 0,
    reorderLevel: 10,
    initialQuantity: 0
  };

  public adjustRequest: AdjustStockRequest = {
    productId: '',
    branchId: '',
    type: 'Receipt',
    quantity: 1,
    reason: ''
  };

  public editingProduct: Product | null = null;
  public editRequest: UpdateProductRequest = {
    name: '',
    description: '',
    category: 'Hardware',
    unitOfMeasure: 'pcs',
    unitPrice: 0,
    unitCost: 0,
    reorderLevel: 10,
    isActive: true
  };

  public get canManageCatalog(): boolean {
    return this.currentRole === 'Owner' || this.currentRole === 'Admin' || this.currentRole === 'Manager';
  }

  public ngOnInit(): void {
    this.activeTenant$.subscribe(t => {
      if (t) {
        this.currentRole = t.role;
      }
    });

    this.loadBranches();
    this.loadProducts();
    this.loadMetrics();
  }

  public loadBranches(): void {
    this.api.getBranches().subscribe(res => {
      if (res.success && res.data) {
        this.branches = res.data;
      }
    });
  }

  public loadProducts(): void {
    this.api.getProducts().subscribe(res => {
      if (res.success && res.data) {
        this.products = res.data.data;
        this.applyFilters();
      }
    });
  }

  public loadMetrics(): void {
    this.api.getInventoryMetrics().subscribe(res => {
      if (res.success && res.data) {
        this.metrics = res.data;
      }
    });
  }

  public loadMovements(): void {
    this.api.getStockMovements().subscribe(res => {
      if (res.success && res.data) {
        this.movements = res.data.data;
        this.applyLedgerFilters();
      }
    });
  }

  public applyFilters(): void {
    let list = [...this.products];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }

    if (this.selectedCategory) {
      list = list.filter(p => p.category === this.selectedCategory);
    }

    if (this.stockFilter === 'in_stock') {
      list = list.filter(p => p.totalQuantityOnHand > 0);
    } else if (this.stockFilter === 'low_stock') {
      list = list.filter(p => p.isLowStock && p.totalQuantityOnHand > 0);
    } else if (this.stockFilter === 'out_of_stock') {
      list = list.filter(p => p.totalQuantityOnHand <= 0);
    }

    if (this.selectedBranchFilter) {
      list = list.filter(p => p.branchInventories.some(i => i.branchId === this.selectedBranchFilter));
    }

    this.filteredProducts = list;
  }

  public applyLedgerFilters(): void {
    let list = [...this.movements];

    if (this.ledgerSearchQuery.trim()) {
      const q = this.ledgerSearchQuery.toLowerCase().trim();
      list = list.filter(m =>
        m.productName.toLowerCase().includes(q) ||
        m.productSku.toLowerCase().includes(q) ||
        (m.referenceNumber && m.referenceNumber.toLowerCase().includes(q)) ||
        (m.reason && m.reason.toLowerCase().includes(q))
      );
    }

    if (this.selectedMovementType) {
      list = list.filter(m => m.type === this.selectedMovementType);
    }

    this.filteredMovements = list;
  }

  public openCreateModal(): void {
    this.newProduct = {
      sku: '',
      name: '',
      description: '',
      category: 'Hardware',
      unitOfMeasure: 'pcs',
      unitPrice: 100,
      unitCost: 50,
      reorderLevel: 10,
      initialBranchId: this.branches.length > 0 ? this.branches[0].id : undefined,
      initialQuantity: 10
    };
    this.showCreateModal = true;
  }

  public submitCreateProduct(): void {
    if (!this.newProduct.sku || !this.newProduct.name) return;
    this.isSubmitting = true;

    this.api.createProduct(this.newProduct).subscribe({
      next: res => {
        this.isSubmitting = false;
        if (res.success) {
          this.showCreateModal = false;
          this.loadProducts();
          this.loadMetrics();
        }
      },
      error: () => {
        this.isSubmitting = false;
      }
    });
  }

  public openAdjustModal(): void {
    this.adjustRequest = {
      productId: this.products.length > 0 ? this.products[0].id : '',
      branchId: this.branches.length > 0 ? this.branches[0].id : '',
      type: 'Receipt',
      quantity: 10,
      reason: 'Physical delivery check'
    };
    this.showAdjustModal = true;
  }

  public openQuickAdjust(product: Product): void {
    this.adjustRequest = {
      productId: product.id,
      branchId: product.branchInventories.length > 0 ? product.branchInventories[0].branchId : (this.branches[0]?.id || ''),
      type: 'Receipt',
      quantity: 10,
      reason: 'Standard stock adjustment'
    };
    this.showAdjustModal = true;
  }

  public submitAdjustStock(): void {
    if (!this.adjustRequest.productId || !this.adjustRequest.branchId || this.adjustRequest.quantity <= 0) return;
    this.isSubmitting = true;

    this.api.adjustStock(this.adjustRequest).subscribe({
      next: res => {
        this.isSubmitting = false;
        if (res.success) {
          this.showAdjustModal = false;
          this.loadProducts();
          this.loadMetrics();
          this.loadMovements();
        }
      },
      error: () => {
        this.isSubmitting = false;
      }
    });
  }

  public openEditModal(product: Product): void {
    this.editingProduct = product;
    this.editRequest = {
      name: product.name,
      description: product.description || '',
      category: product.category,
      unitOfMeasure: product.unitOfMeasure,
      unitPrice: product.unitPrice,
      unitCost: product.unitCost,
      reorderLevel: product.reorderLevel,
      isActive: product.isActive
    };
    this.showEditModal = true;
  }

  public submitUpdateProduct(): void {
    if (!this.editingProduct) return;
    this.isSubmitting = true;

    this.api.updateProduct(this.editingProduct.id, this.editRequest).subscribe({
      next: res => {
        this.isSubmitting = false;
        if (res.success) {
          this.showEditModal = false;
          this.loadProducts();
          this.loadMetrics();
        }
      },
      error: () => {
        this.isSubmitting = false;
      }
    });
  }

  // Branch aggregations for Tab 3
  public getBranchProducts(branchId: string): ProductInventory[] {
    const list: ProductInventory[] = [];
    for (const p of this.products) {
      const inv = p.branchInventories.find(i => i.branchId === branchId);
      if (inv) {
        list.push(inv);
      }
    }
    return list;
  }

  public getBranchTotalUnits(branchId: string): number {
    return this.getBranchProducts(branchId).reduce((sum, i) => sum + i.quantityOnHand, 0);
  }

  public getBranchValuation(branchId: string): number {
    let sum = 0;
    for (const p of this.products) {
      const inv = p.branchInventories.find(i => i.branchId === branchId);
      if (inv) {
        sum += inv.quantityOnHand * p.unitCost;
      }
    }
    return sum;
  }

  public getBranchSkuCount(branchId: string): number {
    return this.getBranchProducts(branchId).length;
  }

  // Visual helper styles
  public getStockTextClass(p: Product): string {
    if (p.totalQuantityOnHand <= 0) return 'text-rose';
    if (p.isLowStock) return 'text-amber';
    return 'text-emerald';
  }

  public getProgressBarClass(p: Product): string {
    if (p.totalQuantityOnHand <= 0) return 'bg-rose';
    if (p.isLowStock) return 'bg-amber';
    return 'bg-emerald';
  }

  public getStockBarPercentage(p: Product): number {
    if (p.totalQuantityOnHand <= 0) return 0;
    const target = p.reorderLevel * 2.5;
    if (target <= 0) return 100;
    return Math.min(100, Math.round((p.totalQuantityOnHand / target) * 100));
  }

  public getRoleBadgeClass(role: TenantRole): string {
    switch (role) {
      case 'Owner': return 'badge-amber';
      case 'Admin': return 'badge-indigo';
      case 'Manager': return 'badge-cyan';
      default: return 'badge-emerald';
    }
  }

  public getMovementBadgeClass(type: StockMovementType): string {
    switch (type) {
      case 'Receipt': return 'badge-emerald';
      case 'AdjustmentIn': return 'badge-cyan';
      case 'Transfer': return 'badge-indigo';
      case 'AdjustmentOut': return 'badge-amber';
      case 'SaleShipment': return 'badge-purple';
      case 'Scrap': return 'badge-rose';
      default: return 'badge-indigo';
    }
  }

  public getMovementQuantityPrefix(type: StockMovementType): string {
    switch (type) {
      case 'Receipt':
      case 'AdjustmentIn':
        return '+';
      case 'AdjustmentOut':
      case 'SaleShipment':
      case 'Scrap':
        return '-';
      default:
        return '±';
    }
  }

  public getMovementQuantityClass(type: StockMovementType): string {
    switch (type) {
      case 'Receipt':
      case 'AdjustmentIn':
        return 'text-emerald';
      case 'AdjustmentOut':
      case 'SaleShipment':
      case 'Scrap':
        return 'text-rose';
      case 'Transfer':
        return 'text-cyan';
      default:
        return 'text-indigo';
    }
  }

  public exportInventoryCsv(): void {
    if (this.activeTab === 'ledger') {
      const headers = ['Reference #', 'SKU', 'Product Name', 'Movement Type', 'Quantity', 'Branch Name', 'Reason', 'Timestamp'];
      const rows = this.filteredMovements.map(m => [
        `"${m.referenceNumber || ''}"`,
        `"${m.productSku.replace(/"/g, '""')}"`,
        `"${m.productName.replace(/"/g, '""')}"`,
        `"${m.type}"`,
        `"${m.quantity}"`,
        `"${(m.branchName || 'Central Warehouse').replace(/"/g, '""')}"`,
        `"${(m.reason || '').replace(/"/g, '""')}"`,
        `"${m.timestampUtc || ''}"`
      ]);
      this.downloadCsvFile([headers.join(','), ...rows.map(r => r.join(','))].join('\n'), `orbit-inventory-ledger-${Date.now()}.csv`);
    } else {
      const headers = ['SKU', 'Product Name', 'Category', 'Unit Price', 'Unit Cost', 'Total Qty On Hand', 'Valuation', 'Reorder Level', 'Is Low Stock', 'Status'];
      const rows = this.filteredProducts.map(p => [
        `"${p.sku.replace(/"/g, '""')}"`,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.category}"`,
        `"${p.unitPrice}"`,
        `"${p.unitCost}"`,
        `"${p.totalQuantityOnHand}"`,
        `"${p.inventoryValuation || (p.totalQuantityOnHand * p.unitCost)}"`,
        `"${p.reorderLevel}"`,
        `"${p.isLowStock ? 'YES' : 'NO'}"`,
        `"${p.isActive ? 'Active' : 'Inactive'}"`
      ]);
      this.downloadCsvFile([headers.join(','), ...rows.map(r => r.join(','))].join('\n'), `orbit-inventory-catalog-${Date.now()}.csv`);
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

