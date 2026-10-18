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
        <div class="search-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            (input)="onSearch()" 
            placeholder="Search by name, title, or employee number..." 
          />
        </div>
        <div class="filter-count">
          Showing {{ filteredEmployees.length }} active personnel
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
            <span class="badge" [ngClass]="emp.userId ? 'badge-emerald' : 'badge-indigo'">
              {{ emp.userId ? 'System Access' : 'Employment Only' }}
            </span>
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

      <!-- Add Employee Modal Dialog -->
      <div class="modal-overlay" *ngIf="showModal" (click)="closeModal()">
        <div class="modal-dialog glass-panel-elevated" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2 class="font-heading-3">Add Employee Profile</h2>
            <button class="modal-close-btn" (click)="closeModal()">✕</button>
          </div>

          <form (ngSubmit)="submitCreateEmployee()" class="modal-body">
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
                <input id="empNum" type="text" [(ngModel)]="newEmployeeNumber" name="empNumber" placeholder="e.g. EMP-042" required />
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
                <option *ngFor="let emp of employees" [value]="emp.id">{{ emp.fullName }} ({{ emp.jobTitle }})</option>
              </select>
            </div>

            <div class="modal-footer">
              <button type="button" (click)="closeModal()" class="btn-secondary">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="!newFirstName || !newLastName || !newEmail || !newEmployeeNumber">
                Save Employee Profile
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

      @include responsive-sm {
        flex-direction: column;
        gap: 0.75rem;
        align-items: stretch;
      }

      .search-box {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex: 1;
        max-width: 400px;
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

      .filter-count {
        font-size: 0.8125rem;
        color: $text-muted;
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

  public showModal = false;
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
        this.filteredEmployees = [...this.employees];
      }
    });
  }

  public onSearch(): void {
    if (!this.searchQuery.trim()) {
      this.filteredEmployees = [...this.employees];
      return;
    }
    const q = this.searchQuery.toLowerCase();
    this.filteredEmployees = this.employees.filter(e =>
      e.fullName.toLowerCase().includes(q) ||
      e.jobTitle.toLowerCase().includes(q) ||
      e.employeeNumber.toLowerCase().includes(q)
    );
  }

  public canManage(): boolean {
    const role = this.authService.currentRole;
    return role === 'Owner' || role === 'Admin';
  }

  public openCreateModal(): void {
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

  public closeModal(): void {
    this.showModal = false;
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

  public getInitials(name: string): string {
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (name[0] || 'E').toUpperCase();
  }
}
