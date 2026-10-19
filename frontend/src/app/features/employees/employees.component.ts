import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Employee, Branch, Department } from '../../core/models/models';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="employees-page">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <div class="badge badge-indigo" style="margin-bottom: 0.5rem;">Phase 5 Organization Model</div>
          <h1 class="font-heading-2">Employee Directory & Hierarchy</h1>
          <p class="font-caption">Decoupled employment records with departmental and managerial reporting links</p>
        </div>
        <div class="header-actions" *ngIf="canManage()">
          <button (click)="openCreateModal()" class="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>Add Employee Profile</span>
          </button>
        </div>
      </div>

      <!-- Identity Separation Callout -->
      <div class="identity-note glass-panel">
        <div class="note-icon">💡</div>
        <div class="note-content">
          <strong>Architectural Rule: Separation of Identity & Employment:</strong> In Orbit Business Suite, Employee Profiles exist independently of login credentials. An employee record does not mandate a user credential account, supporting shop floor, field staff, and contractors seamlessly.
        </div>
      </div>

      <!-- Search & Filters Toolbar -->
      <div class="filter-toolbar glass-panel">
        <div class="toolbar-left">
          <div class="search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input 
              type="text" 
              [(ngModel)]="searchQuery" 
              (input)="onFilterChange()" 
              placeholder="Search by name, title, or employee number..." 
            />
          </div>

          <div class="select-filter">
            <select [(ngModel)]="selectedBranchId" (change)="onFilterChange()" aria-label="Filter by Branch">
              <option value="">All Branches</option>
              <option *ngFor="let br of branches" [value]="br.id">{{ br.name }}</option>
            </select>
          </div>

          <div class="select-filter">
            <select [(ngModel)]="selectedDeptId" (change)="onFilterChange()" aria-label="Filter by Department">
              <option value="">All Departments</option>
              <option *ngFor="let dp of departments" [value]="dp.id">{{ dp.name }}</option>
            </select>
          </div>
        </div>

        <div class="toolbar-right">
          <button (click)="exportToCsv()" class="btn-secondary btn-export" title="Download Directory as CSV">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Export CSV</span>
          </button>
          <div class="filter-count">
            Showing {{ filteredEmployees.length }} active personnel
          </div>
        </div>
      </div>

      <!-- Employees Grid -->
      <div class="employees-grid">
        <div *ngFor="let emp of filteredEmployees" class="employee-card glass-panel-elevated">
          <div class="emp-card-header">
            <div class="emp-avatar">
              {{ getInitials(emp.fullName) }}
            </div>
            <div class="emp-title-group">
              <h3 class="emp-name">{{ emp.fullName }}</h3>
              <span class="emp-job">{{ emp.jobTitle }}</span>
            </div>
            <div class="emp-header-badges">
              <span class="badge" [ngClass]="emp.userId ? 'badge-emerald' : 'badge-indigo'">
                {{ emp.userId ? 'System Access' : 'Employment Only' }}
              </span>
              <div class="emp-actions" *ngIf="canManage()">
                <button (click)="openEditModal(emp)" class="btn-card-action" title="Edit Employee Profile">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </button>
                <button (click)="confirmDelete(emp)" class="btn-card-action btn-del" title="Delete Employee Profile">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
          </div>

          <div class="emp-details">
            <div class="emp-detail-row">
              <span class="detail-label">Employee ID:</span>
              <span class="detail-val font-mono">{{ emp.employeeNumber }}</span>
            </div>
            <div class="emp-detail-row">
              <span class="detail-label">Email:</span>
              <span class="detail-val">{{ emp.email }}</span>
            </div>
            <div class="emp-detail-row">
              <span class="detail-label">Department:</span>
              <span class="detail-val">{{ emp.departmentName || 'General Management' }}</span>
            </div>
            <div class="emp-detail-row">
              <span class="detail-label">Branch:</span>
              <span class="detail-val">{{ emp.branchName || 'Headquarters' }}</span>
            </div>
            <div class="emp-detail-row" *ngIf="emp.reportsToName">
              <span class="detail-label">Reports To:</span>
              <span class="detail-val text-indigo">👤 {{ emp.reportsToName }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Add / Edit Employee Modal Dialog -->
      <div class="modal-overlay" *ngIf="showModal" (click)="closeModal()">
        <div class="modal-dialog glass-panel-elevated" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2 class="font-heading-3">{{ isEditing ? 'Edit Employee Profile' : 'Add Employee Profile' }}</h2>
            <button class="modal-close-btn" (click)="closeModal()">✕</button>
          </div>

          <form (ngSubmit)="submitEmployeeForm()" class="modal-body">
            <div class="form-row">
              <div class="form-group">
                <label for="empFirst">First Name *</label>
                <input id="empFirst" type="text" [(ngModel)]="newFirstName" name="firstName" required />
              </div>
              <div class="form-group">
                <label for="empLast">Last Name *</label>
                <input id="empLast" type="text" [(ngModel)]="newLastName" name="lastName" required />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="empNum">Employee Number *</label>
                <input id="empNum" type="text" [(ngModel)]="newEmployeeNumber" name="empNumber" [readonly]="isEditing" placeholder="e.g. EMP-042" required />
              </div>
              <div class="form-group">
                <label for="empEmail">Email Address *</label>
                <input id="empEmail" type="email" [(ngModel)]="newEmail" name="email" required />
              </div>
            </div>

            <div class="form-group">
              <label for="empJob">Job Title *</label>
              <input id="empJob" type="text" [(ngModel)]="newJobTitle" name="jobTitle" placeholder="e.g. Senior Logistics Analyst" required />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="empBranch">Branch Location</label>
                <select id="empBranch" [(ngModel)]="newBranchId" name="branch">
                  <option [value]="''">Select branch...</option>
                  <option *ngFor="let br of branches" [value]="br.id">{{ br.name }} ({{ br.code }})</option>
                </select>
              </div>

              <div class="form-group">
                <label for="empDept">Department</label>
                <select id="empDept" [(ngModel)]="newDeptId" name="department">
                  <option [value]="''">Select department...</option>
                  <option *ngFor="let dp of departments" [value]="dp.id">{{ dp.name }} ({{ dp.code }})</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label for="empManager">Reporting Manager</label>
              <select id="empManager" [(ngModel)]="newReportsToId" name="manager">
                <option [value]="''">None (Reports to Owner)</option>
                <option *ngFor="let emp of getEligibleManagers()" [value]="emp.id">{{ emp.fullName }} ({{ emp.jobTitle }})</option>
              </select>
            </div>

            <div class="modal-footer">
              <button type="button" (click)="closeModal()" class="btn-secondary">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="!newFirstName || !newLastName || !newEmail || !newEmployeeNumber">
                {{ isEditing ? 'Save Changes' : 'Save Employee Profile' }}
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

    .employees-page {
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

    .identity-note {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.25rem;
      border-color: rgba(99, 102, 241, 0.25);
      background: rgba(17, 24, 39, 0.6);

      .note-icon {
        font-size: 1.25rem;
      }

      .note-content {
        font-size: 0.8125rem;
        color: $text-secondary;
        line-height: 1.4;

        strong {
          color: #ffffff;
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
        min-width: 200px;
        max-width: 320px;
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

    .employees-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.25rem;
    }

    .employee-card {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      transition: all $transition-fast;

      &:hover {
        border-color: $border-glass-hover;
        transform: translateY(-2px);
      }

      .emp-card-header {
        display: flex;
        align-items: center;
        gap: 0.875rem;

        .emp-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, $aurora-indigo, $aurora-violet);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.9375rem;
          color: #ffffff;
          box-shadow: 0 0 10px rgba(99, 102, 241, 0.4);
        }

        .emp-title-group {
          flex: 1;

          .emp-name {
            font-size: 1rem;
            font-weight: 600;
            color: #ffffff;
            line-height: 1.25;
          }

          .emp-job {
            font-size: 0.75rem;
            color: $text-muted;
          }
        }

        .emp-header-badges {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .emp-actions {
          display: flex;
          align-items: center;
          gap: 0.25rem;
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
      }

      .emp-details {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
        padding-top: 0.75rem;
        border-top: 1px solid $border-glass;

        .emp-detail-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.8125rem;

          .detail-label {
            color: $text-muted;
          }

          .detail-val {
            color: $text-secondary;
            font-weight: 500;

            &.font-mono {
              font-family: monospace;
              color: #cbd5e1;
            }

            &.text-indigo {
              color: #a5b4fc;
            }
          }
        }
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
      max-width: 520px;
      padding: 1.75rem;
      max-height: 90vh;
      overflow-y: auto;
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
export class EmployeesComponent implements OnInit {
  public employees: Employee[] = [];
  public filteredEmployees: Employee[] = [];
  public branches: Branch[] = [];
  public departments: Department[] = [];
  public searchQuery = '';
  public selectedBranchId = '';
  public selectedDeptId = '';

  public showModal = false;
  public isEditing = false;
  public editingEmployeeId = '';
  public newFirstName = '';
  public newLastName = '';
  public newEmail = '';
  public newJobTitle = '';
  public newEmployeeNumber = '';
  public newBranchId = '';
  public newDeptId = '';
  public newReportsToId = '';

  constructor(private apiService: ApiService, private authService: AuthService) {}

  public ngOnInit(): void {
    this.loadEmployees();
    this.apiService.getBranches().subscribe(res => {
      if (res.data) this.branches = res.data;
    });
    this.apiService.getDepartments().subscribe(res => {
      if (res.data) this.departments = res.data;
    });
  }

  public loadEmployees(): void {
    this.apiService.getEmployees().subscribe(res => {
      if (res.data) {
        this.employees = res.data.data;
        this.onFilterChange();
      }
    });
  }

  public onFilterChange(): void {
    let result = [...this.employees];

    if (this.selectedBranchId) {
      result = result.filter(e => e.branchId === this.selectedBranchId);
    }

    if (this.selectedDeptId) {
      result = result.filter(e => e.departmentId === this.selectedDeptId);
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(e =>
        e.fullName.toLowerCase().includes(q) ||
        e.jobTitle.toLowerCase().includes(q) ||
        e.employeeNumber.toLowerCase().includes(q)
      );
    }

    this.filteredEmployees = result;
  }

  public onSearch(): void {
    this.onFilterChange();
  }

  public canManage(): boolean {
    const role = this.authService.currentRole;
    return role === 'Owner' || role === 'Admin';
  }

  public openCreateModal(): void {
    this.isEditing = false;
    this.editingEmployeeId = '';
    this.newFirstName = '';
    this.newLastName = '';
    this.newEmail = '';
    this.newJobTitle = '';
    this.newEmployeeNumber = `EMP-0${this.employees.length + 1}`;
    this.newBranchId = '';
    this.newDeptId = '';
    this.newReportsToId = '';
    this.showModal = true;
  }

  public openEditModal(emp: Employee): void {
    this.isEditing = true;
    this.editingEmployeeId = emp.id;
    this.newFirstName = emp.firstName;
    this.newLastName = emp.lastName;
    this.newEmail = emp.email;
    this.newJobTitle = emp.jobTitle;
    this.newEmployeeNumber = emp.employeeNumber;
    this.newBranchId = emp.branchId || '';
    this.newDeptId = emp.departmentId || '';
    this.newReportsToId = emp.reportsToEmployeeId || '';
    this.showModal = true;
  }

  public closeModal(): void {
    this.showModal = false;
    this.isEditing = false;
    this.editingEmployeeId = '';
  }

  public submitEmployeeForm(): void {
    if (this.isEditing) {
      this.submitEditEmployee();
    } else {
      this.submitCreateEmployee();
    }
  }

  public submitCreateEmployee(): void {
    this.apiService.createEmployee({
      firstName: this.newFirstName,
      lastName: this.newLastName,
      email: this.newEmail,
      jobTitle: this.newJobTitle,
      employeeNumber: this.newEmployeeNumber,
      branchId: this.newBranchId || undefined,
      departmentId: this.newDeptId || undefined,
      reportsToEmployeeId: this.newReportsToId || undefined
    }).subscribe(() => {
      this.closeModal();
      this.loadEmployees();
    });
  }

  public submitEditEmployee(): void {
    this.apiService.updateEmployee(this.editingEmployeeId, {
      firstName: this.newFirstName,
      lastName: this.newLastName,
      email: this.newEmail,
      jobTitle: this.newJobTitle,
      branchId: this.newBranchId || undefined,
      departmentId: this.newDeptId || undefined,
      reportsToEmployeeId: this.newReportsToId || undefined
    }).subscribe(() => {
      this.closeModal();
      this.loadEmployees();
    });
  }

  public confirmDelete(emp: Employee): void {
    if (confirm(`Are you sure you want to remove employee profile for ${emp.fullName} (${emp.employeeNumber})?`)) {
      this.apiService.deleteEmployee(emp.id).subscribe(() => {
        this.loadEmployees();
      });
    }
  }

  public getEligibleManagers(): Employee[] {
    if (!this.isEditing) return this.employees;
    return this.employees.filter(e => e.id !== this.editingEmployeeId);
  }

  public exportToCsv(): void {
    const headers = ['Employee ID', 'Full Name', 'Email', 'Job Title', 'Department', 'Branch', 'System Access', 'Reports To'];
    const rows = this.filteredEmployees.map(e => [
      `"${e.employeeNumber}"`,
      `"${e.fullName}"`,
      `"${e.email}"`,
      `"${e.jobTitle}"`,
      `"${e.departmentName || 'General Management'}"`,
      `"${e.branchName || 'Headquarters'}"`,
      `"${e.userId ? 'Yes' : 'No'}"`,
      `"${e.reportsToName || 'None'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `orbit-employee-directory-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  public getInitials(name: string): string {
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (name[0] || 'E').toUpperCase();
  }
}
