import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { TenantDetails, Branch, Department } from '../../core/models/models';

@Component({
  selector: 'app-organization',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="org-page">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <div class="badge badge-cyan" style="margin-bottom: 0.5rem;">Phase 5 Hierarchy Model</div>
          <h1 class="font-heading-2">Organization Structure</h1>
          <p class="font-caption">Multi-branch and departmental operating units for {{ company?.name }}</p>
        </div>
        <div class="header-actions" *ngIf="canManage()">
          <button (click)="openBranchModal()" class="btn-secondary">
            <span>+ Add Branch</span>
          </button>
          <button (click)="openDeptModal()" class="btn-primary">
            <span>+ Add Department</span>
          </button>
        </div>
      </div>

      <!-- Company Overview Card -->
      <div class="company-card glass-panel-elevated">
        <div class="comp-header">
          <div class="comp-symbol">🏢</div>
          <div class="comp-info">
            <h2 class="comp-title">{{ company?.name }}</h2>
            <div class="comp-tags">
              <span class="badge badge-emerald">Status: {{ company?.status }}</span>
              <span class="badge badge-indigo">Slug: {{ company?.slug }}</span>
              <span class="badge badge-cyan">Currency: {{ company?.currencyCode || 'USD' }}</span>
              <span class="badge badge-violet">TZ: {{ company?.timeZoneId || 'America/New_York' }}</span>
            </div>
          </div>
        </div>

        <div class="comp-stats-grid">
          <div class="comp-stat-item">
            <span class="stat-num">{{ branches.length }}</span>
            <span class="stat-lbl">Operating Facilities / Branches</span>
          </div>
          <div class="comp-stat-item">
            <span class="stat-num">{{ departments.length }}</span>
            <span class="stat-lbl">Functional Departments</span>
          </div>
          <div class="comp-stat-item">
            <span class="stat-num">{{ company?.employeeCount || 3 }}</span>
            <span class="stat-lbl">Registered Personnel</span>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="tabs-header">
        <button (click)="activeTab = 'branches'" class="tab-btn" [class.active]="activeTab === 'branches'">
          Operating Branches ({{ branches.length }})
        </button>
        <button (click)="activeTab = 'departments'" class="tab-btn" [class.active]="activeTab === 'departments'">
          Departments ({{ departments.length }})
        </button>
      </div>

      <!-- Search & Filters Toolbar -->
      <div class="filter-toolbar glass-panel">
        <div class="toolbar-left">
          <div class="search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input 
              type="text" 
              [(ngModel)]="searchQuery" 
              [placeholder]="activeTab === 'branches' ? 'Search branches by name, code, city...' : 'Search departments by name, code...'" 
            />
          </div>

          <div class="select-filter">
            <select [(ngModel)]="statusFilter" aria-label="Filter by Status">
              <option value="ALL">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        <div class="toolbar-right">
          <button (click)="exportToCsv()" class="btn-secondary btn-export" [title]="'Export ' + activeTab + ' as CSV'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Export CSV</span>
          </button>
          <div class="filter-count">
            Showing {{ activeTab === 'branches' ? getFilteredBranches().length : getFilteredDepartments().length }} {{ activeTab }}
          </div>
        </div>
      </div>

      <!-- Branches Content -->
      <div *ngIf="activeTab === 'branches'" class="tab-pane">
        <div class="cards-grid">
          <div *ngFor="let branch of getFilteredBranches()" class="glass-panel branch-card">
            <div class="card-top">
              <div class="card-badges">
                <span class="badge badge-cyan">{{ branch.code }}</span>
                <span class="badge" [ngClass]="branch.isActive ? 'badge-emerald' : 'badge-rose'">
                  {{ branch.isActive ? 'Active' : 'Inactive' }}
                </span>
              </div>
              <div class="card-actions" *ngIf="canManage()">
                <button (click)="openEditBranchModal(branch)" class="btn-card-action" title="Edit Operating Branch">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </button>
                <button (click)="confirmDeleteBranch(branch)" class="btn-card-action btn-del" title="Delete Operating Branch">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
            <h3 class="branch-name">{{ branch.name }}</h3>
            <p class="branch-location">📍 {{ branch.city || 'Unspecified' }}, {{ branch.country || 'Global' }}</p>
            <div class="branch-footer">
              <span class="emp-count">👥 {{ branch.employeeCount }} Assigned Employees</span>
            </div>
          </div>
          <div *ngIf="getFilteredBranches().length === 0" class="empty-state glass-panel">
            No operating branches match the selected filter criteria.
          </div>
        </div>
      </div>

      <!-- Departments Content -->
      <div *ngIf="activeTab === 'departments'" class="tab-pane">
        <div class="cards-grid">
          <div *ngFor="let dept of getFilteredDepartments()" class="glass-panel branch-card">
            <div class="card-top">
              <div class="card-badges">
                <span class="badge badge-violet">{{ dept.code }}</span>
                <span class="badge" [ngClass]="dept.isActive ? 'badge-emerald' : 'badge-rose'">
                  {{ dept.isActive ? 'Active' : 'Inactive' }}
                </span>
              </div>
              <div class="card-actions" *ngIf="canManage()">
                <button (click)="openEditDeptModal(dept)" class="btn-card-action" title="Edit Department">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </button>
                <button (click)="confirmDeleteDept(dept)" class="btn-card-action btn-del" title="Delete Department">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
            <h3 class="branch-name">{{ dept.name }}</h3>
            <p class="branch-location">{{ dept.description || 'General departmental operating unit' }}</p>
            <div class="branch-footer">
              <span class="emp-count">👥 {{ dept.employeeCount }} Assigned Personnel</span>
            </div>
          </div>
          <div *ngIf="getFilteredDepartments().length === 0" class="empty-state glass-panel">
            No departments match the selected filter criteria.
          </div>
        </div>
      </div>

      <!-- Add / Edit Branch Modal -->
      <div class="modal-overlay" *ngIf="showBranchModal" (click)="closeModals()">
        <div class="modal-dialog glass-panel-elevated" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2 class="font-heading-3">{{ isEditingBranch ? 'Edit Operating Branch' : 'Add Operating Branch' }}</h2>
            <button class="modal-close-btn" (click)="closeModals()">✕</button>
          </div>
          <form (ngSubmit)="submitBranchForm()" class="modal-body">
            <div class="form-group">
              <label for="brName">Branch Facility Name *</label>
              <input id="brName" type="text" [(ngModel)]="newBranchName" name="bName" placeholder="e.g. Asia-Pacific Regional Hub" required />
            </div>
            <div class="form-group">
              <label for="brCode">Branch Code (Unique) *</label>
              <input id="brCode" type="text" [(ngModel)]="newBranchCode" name="bCode" [readonly]="isEditingBranch" placeholder="e.g. APAC-SG" required />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="brCity">City</label>
                <input id="brCity" type="text" [(ngModel)]="newBranchCity" name="bCity" placeholder="Singapore" />
              </div>
              <div class="form-group">
                <label for="brCountry">Country</label>
                <input id="brCountry" type="text" [(ngModel)]="newBranchCountry" name="bCountry" placeholder="Singapore" />
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" (click)="closeModals()" class="btn-secondary">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="!newBranchName || !newBranchCode">
                {{ isEditingBranch ? 'Save Changes' : 'Save Branch' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Add / Edit Department Modal -->
      <div class="modal-overlay" *ngIf="showDeptModal" (click)="closeModals()">
        <div class="modal-dialog glass-panel-elevated" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2 class="font-heading-3">{{ isEditingDept ? 'Edit Department' : 'Add Department' }}</h2>
            <button class="modal-close-btn" (click)="closeModals()">✕</button>
          </div>
          <form (ngSubmit)="submitDeptForm()" class="modal-body">
            <div class="form-group">
              <label for="dpName">Department Name *</label>
              <input id="dpName" type="text" [(ngModel)]="newDeptName" name="dName" placeholder="e.g. Quality Assurance & Auditing" required />
            </div>
            <div class="form-group">
              <label for="dpCode">Department Code (Unique) *</label>
              <input id="dpCode" type="text" [(ngModel)]="newDeptCode" name="dCode" [readonly]="isEditingDept" placeholder="e.g. QA-AUD" required />
            </div>
            <div class="form-group">
              <label for="dpDesc">Purpose & Mission</label>
              <textarea id="dpDesc" rows="3" [(ngModel)]="newDeptDesc" name="dDesc" placeholder="Responsibilities and functional mandate..."></textarea>
            </div>
            <div class="modal-footer">
              <button type="button" (click)="closeModals()" class="btn-secondary">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="!newDeptName || !newDeptCode">
                {{ isEditingDept ? 'Save Changes' : 'Save Department' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @use 'styles/variables' as *;
    @use 'styles/mixins' as *;

    .org-page {
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

    .header-actions {
      display: flex;
      gap: 0.75rem;
    }

    .company-card {
      padding: 1.75rem;
      background: rgba(17, 24, 39, 0.8);

      .comp-header {
        display: flex;
        align-items: center;
        gap: 1.25rem;
        margin-bottom: 1.5rem;

        .comp-symbol {
          font-size: 2.25rem;
          width: 56px;
          height: 56px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid $border-glass;
          border-radius: $radius-lg;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .comp-info {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;

          .comp-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: #ffffff;
          }

          .comp-tags {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
          }
        }
      }

      .comp-stats-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1.5rem;
        padding-top: 1.25rem;
        border-top: 1px solid $border-glass;

        @include responsive-sm {
          grid-template-columns: 1fr;
        }

        .comp-stat-item {
          display: flex;
          flex-direction: column;

          .stat-num {
            font-size: 1.5rem;
            font-weight: 700;
            color: #a5b4fc;
          }

          .stat-lbl {
            font-size: 0.75rem;
            color: $text-muted;
          }
        }
      }
    }

    .tabs-header {
      display: flex;
      gap: 0.5rem;
      border-bottom: 1px solid $border-glass;
      padding-bottom: 0.5rem;

      .tab-btn {
        background: none;
        border: none;
        color: $text-secondary;
        padding: 0.625rem 1.25rem;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        border-radius: $radius-md;
        transition: all $transition-fast;

        &:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.05);
        }

        &.active {
          color: #ffffff;
          background: rgba(99, 102, 241, 0.2);
          border: 1px solid rgba(99, 102, 241, 0.35);
        }
      }
    }

    .filter-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1.25rem;
      gap: 1rem;
      flex-wrap: wrap;

      .toolbar-left {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex: 1;
        flex-wrap: wrap;
        min-width: 280px;
      }

      .search-box {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex: 1;
        min-width: 220px;
        max-width: 340px;
        color: $text-muted;

        input {
          background: none;
          border: none;
          color: #ffffff;
          font-size: 0.875rem;
          width: 100%;
          outline: none;

          &::placeholder {
            color: $text-muted;
          }
        }
      }

      .select-filter select {
        background: rgba(17, 24, 39, 0.7);
        border: 1px solid $border-glass;
        border-radius: 6px;
        color: $text-secondary;
        font-size: 0.8125rem;
        padding: 0.4rem 0.75rem;
        outline: none;
        cursor: pointer;

        &:focus {
          border-color: $aurora-indigo;
          color: #ffffff;
        }

        option {
          background: #111827;
          color: #ffffff;
        }
      }

      .toolbar-right {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .btn-export {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        font-size: 0.8125rem;
        padding: 0.4rem 0.75rem;
      }

      .filter-count {
        font-size: 0.8125rem;
        color: $text-muted;
        white-space: nowrap;
      }
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.25rem;
    }

    .branch-card {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      transition: all $transition-fast;

      &:hover {
        border-color: $border-glass-hover;
        transform: translateY(-2px);
      }

      .card-top {
        display: flex;
        align-items: center;
        justify-content: space-between;

        .card-badges {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .card-actions {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
      }

      .btn-card-action {
        background: transparent;
        border: 1px solid transparent;
        border-radius: 4px;
        color: $text-muted;
        padding: 0.25rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all $transition-fast;

        &:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.08);
          border-color: $border-glass;
        }

        &.btn-del:hover {
          color: #fda4af;
          background: rgba(244, 63, 94, 0.15);
          border-color: rgba(244, 63, 94, 0.3);
        }
      }

      .branch-name {
        font-size: 1.125rem;
        font-weight: 600;
        color: #ffffff;
      }

      .branch-location {
        font-size: 0.8125rem;
        color: $text-secondary;
      }

      .branch-footer {
        padding-top: 0.75rem;
        border-top: 1px solid $border-glass;
        font-size: 0.75rem;
        color: $text-muted;
      }
    }

    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 2.5rem;
      color: $text-muted;
      font-size: 0.875rem;
    }

    // Modal
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      z-index: 100;
    }

    .modal-dialog {
      width: 100%;
      max-width: 500px;
      padding: 1.75rem;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;

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
export class OrganizationComponent implements OnInit {
  public company: TenantDetails | null = null;
  public branches: Branch[] = [];
  public departments: Department[] = [];
  public activeTab: 'branches' | 'departments' = 'branches';

  public searchQuery = '';
  public statusFilter: 'ALL' | 'Active' | 'Inactive' = 'ALL';

  public showBranchModal = false;
  public isEditingBranch = false;
  public editingBranchId = '';
  public newBranchName = '';
  public newBranchCode = '';
  public newBranchCity = '';
  public newBranchCountry = '';

  public showDeptModal = false;
  public isEditingDept = false;
  public editingDeptId = '';
  public newDeptName = '';
  public newDeptCode = '';
  public newDeptDesc = '';

  constructor(private apiService: ApiService, private authService: AuthService) {}

  public ngOnInit(): void {
    this.loadData();
  }

  public loadData(): void {
    this.apiService.getCompany().subscribe(res => {
      if (res.data) this.company = res.data;
    });
    this.apiService.getBranches().subscribe(res => {
      if (res.data) this.branches = res.data;
    });
    this.apiService.getDepartments().subscribe(res => {
      if (res.data) this.departments = res.data;
    });
  }

  public canManage(): boolean {
    const role = this.authService.currentRole;
    return role === 'Owner' || role === 'Admin';
  }

  public getFilteredBranches(): Branch[] {
    let result = [...this.branches];

    if (this.statusFilter === 'Active') {
      result = result.filter(b => b.isActive);
    } else if (this.statusFilter === 'Inactive') {
      result = result.filter(b => !b.isActive);
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(b =>
        b.name.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        (b.city && b.city.toLowerCase().includes(q)) ||
        (b.country && b.country.toLowerCase().includes(q))
      );
    }

    return result;
  }

  public getFilteredDepartments(): Department[] {
    let result = [...this.departments];

    if (this.statusFilter === 'Active') {
      result = result.filter(d => d.isActive);
    } else if (this.statusFilter === 'Inactive') {
      result = result.filter(d => !d.isActive);
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        (d.description && d.description.toLowerCase().includes(q))
      );
    }

    return result;
  }

  public openBranchModal(): void {
    this.isEditingBranch = false;
    this.editingBranchId = '';
    this.newBranchName = '';
    this.newBranchCode = '';
    this.newBranchCity = '';
    this.newBranchCountry = '';
    this.showBranchModal = true;
  }

  public openEditBranchModal(branch: Branch): void {
    this.isEditingBranch = true;
    this.editingBranchId = branch.id;
    this.newBranchName = branch.name;
    this.newBranchCode = branch.code;
    this.newBranchCity = branch.city || '';
    this.newBranchCountry = branch.country || '';
    this.showBranchModal = true;
  }

  public openDeptModal(): void {
    this.isEditingDept = false;
    this.editingDeptId = '';
    this.newDeptName = '';
    this.newDeptCode = '';
    this.newDeptDesc = '';
    this.showDeptModal = true;
  }

  public openEditDeptModal(dept: Department): void {
    this.isEditingDept = true;
    this.editingDeptId = dept.id;
    this.newDeptName = dept.name;
    this.newDeptCode = dept.code;
    this.newDeptDesc = dept.description || '';
    this.showDeptModal = true;
  }

  public closeModals(): void {
    this.showBranchModal = false;
    this.showDeptModal = false;
    this.isEditingBranch = false;
    this.isEditingDept = false;
    this.editingBranchId = '';
    this.editingDeptId = '';
  }

  public submitBranchForm(): void {
    if (this.isEditingBranch) {
      this.submitEditBranch();
    } else {
      this.submitCreateBranch();
    }
  }

  public submitCreateBranch(): void {
    this.apiService.createBranch({
      name: this.newBranchName,
      code: this.newBranchCode,
      city: this.newBranchCity,
      country: this.newBranchCountry
    }).subscribe(() => {
      this.closeModals();
      this.loadData();
    });
  }

  public submitEditBranch(): void {
    this.apiService.updateBranch(this.editingBranchId, {
      name: this.newBranchName,
      code: this.newBranchCode,
      city: this.newBranchCity,
      country: this.newBranchCountry
    }).subscribe(() => {
      this.closeModals();
      this.loadData();
    });
  }

  public confirmDeleteBranch(branch: Branch): void {
    if (confirm(`Are you sure you want to delete branch ${branch.name} (${branch.code})?`)) {
      this.apiService.deleteBranch(branch.id).subscribe(() => {
        this.loadData();
      });
    }
  }

  public submitDeptForm(): void {
    if (this.isEditingDept) {
      this.submitEditDept();
    } else {
      this.submitCreateDept();
    }
  }

  public submitCreateDept(): void {
    this.apiService.createDepartment({
      name: this.newDeptName,
      code: this.newDeptCode,
      description: this.newDeptDesc
    }).subscribe(() => {
      this.closeModals();
      this.loadData();
    });
  }

  public submitEditDept(): void {
    this.apiService.updateDepartment(this.editingDeptId, {
      name: this.newDeptName,
      code: this.newDeptCode,
      description: this.newDeptDesc
    }).subscribe(() => {
      this.closeModals();
      this.loadData();
    });
  }

  public confirmDeleteDept(dept: Department): void {
    if (confirm(`Are you sure you want to delete department ${dept.name} (${dept.code})?`)) {
      this.apiService.deleteDepartment(dept.id).subscribe(() => {
        this.loadData();
      });
    }
  }

  public exportToCsv(): void {
    if (this.activeTab === 'branches') {
      const headers = ['Branch Code', 'Branch Name', 'City', 'Country', 'Status', 'Employee Count'];
      const rows = this.getFilteredBranches().map(b => [
        `"${b.code}"`,
        `"${b.name}"`,
        `"${b.city || ''}"`,
        `"${b.country || ''}"`,
        `"${b.isActive ? 'Active' : 'Inactive'}"`,
        `"${b.employeeCount}"`
      ]);
      this.downloadCsv([headers.join(','), ...rows.map(r => r.join(','))].join('\n'), `orbit-branches-${Date.now()}.csv`);
    } else {
      const headers = ['Department Code', 'Department Name', 'Description', 'Status', 'Employee Count'];
      const rows = this.getFilteredDepartments().map(d => [
        `"${d.code}"`,
        `"${d.name}"`,
        `"${d.description || ''}"`,
        `"${d.isActive ? 'Active' : 'Inactive'}"`,
        `"${d.employeeCount}"`
      ]);
      this.downloadCsv([headers.join(','), ...rows.map(r => r.join(','))].join('\n'), `orbit-departments-${Date.now()}.csv`);
    }
  }

  private downloadCsv(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
