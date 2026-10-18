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

      <!-- Branches Content -->
      <div *ngIf="activeTab === 'branches'" class="tab-pane">
        <div class="cards-grid">
          <div *ngFor="let branch of branches" class="glass-panel branch-card">
            <div class="card-top">
              <span class="badge badge-cyan">{{ branch.code }}</span>
              <span class="badge" [ngClass]="branch.isActive ? 'badge-emerald' : 'badge-rose'">
                {{ branch.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>
            <h3 class="branch-name">{{ branch.name }}</h3>
            <p class="branch-location">📍 {{ branch.city }}, {{ branch.country }}</p>
            <div class="branch-footer">
              <span class="emp-count">👥 {{ branch.employeeCount }} Assigned Employees</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Departments Content -->
      <div *ngIf="activeTab === 'departments'" class="tab-pane">
        <div class="cards-grid">
          <div *ngFor="let dept of departments" class="glass-panel branch-card">
            <div class="card-top">
              <span class="badge badge-violet">{{ dept.code }}</span>
              <span class="badge" [ngClass]="dept.isActive ? 'badge-emerald' : 'badge-rose'">
                {{ dept.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>
            <h3 class="branch-name">{{ dept.name }}</h3>
            <p class="branch-location">{{ dept.description || 'General departmental operating unit' }}</p>
            <div class="branch-footer">
              <span class="emp-count">👥 {{ dept.employeeCount }} Assigned Personnel</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Add Branch Modal -->
      <div class="modal-overlay" *ngIf="showBranchModal" (click)="closeModals()">
        <div class="modal-dialog glass-panel-elevated" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2 class="font-heading-3">Add Operating Branch</h2>
            <button class="modal-close-btn" (click)="closeModals()">✕</button>
          </div>
          <form (ngSubmit)="submitCreateBranch()" class="modal-body">
            <div class="form-group">
              <label for="brName">Branch Facility Name *</label>
              <input id="brName" type="text" [(ngModel)]="newBranchName" name="bName" placeholder="e.g. Asia-Pacific Regional Hub" required />
            </div>
            <div class="form-group">
              <label for="brCode">Branch Code (Unique) *</label>
              <input id="brCode" type="text" [(ngModel)]="newBranchCode" name="bCode" placeholder="e.g. APAC-SG" required />
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
              <button type="submit" class="btn-primary" [disabled]="!newBranchName || !newBranchCode">Save Branch</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Add Department Modal -->
      <div class="modal-overlay" *ngIf="showDeptModal" (click)="closeModals()">
        <div class="modal-dialog glass-panel-elevated" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2 class="font-heading-3">Add Department</h2>
            <button class="modal-close-btn" (click)="closeModals()">✕</button>
          </div>
          <form (ngSubmit)="submitCreateDept()" class="modal-body">
            <div class="form-group">
              <label for="dpName">Department Name *</label>
              <input id="dpName" type="text" [(ngModel)]="newDeptName" name="dName" placeholder="e.g. Quality Assurance & Auditing" required />
            </div>
            <div class="form-group">
              <label for="dpCode">Department Code (Unique) *</label>
              <input id="dpCode" type="text" [(ngModel)]="newDeptCode" name="dCode" placeholder="e.g. QA-AUD" required />
            </div>
            <div class="form-group">
              <label for="dpDesc">Purpose & Mission</label>
              <textarea id="dpDesc" rows="3" [(ngModel)]="newDeptDesc" name="dDesc" placeholder="Responsibilities and functional mandate..."></textarea>
            </div>
            <div class="modal-footer">
              <button type="button" (click)="closeModals()" class="btn-secondary">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="!newDeptName || !newDeptCode">Save Department</button>
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

      .card-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
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

  public showBranchModal = false;
  public newBranchName = '';
  public newBranchCode = '';
  public newBranchCity = '';
  public newBranchCountry = '';

  public showDeptModal = false;
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

  public openBranchModal(): void {
    this.newBranchName = '';
    this.newBranchCode = '';
    this.newBranchCity = '';
    this.newBranchCountry = '';
    this.showBranchModal = true;
  }

  public openDeptModal(): void {
    this.newDeptName = '';
    this.newDeptCode = '';
    this.newDeptDesc = '';
    this.showDeptModal = true;
  }

  public closeModals(): void {
    this.showBranchModal = false;
    this.showDeptModal = false;
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
}
