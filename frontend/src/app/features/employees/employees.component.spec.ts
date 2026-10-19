import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmployeesComponent } from './employees.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { of } from 'rxjs';

describe('EmployeesComponent', () => {
  let component: EmployeesComponent;
  let fixture: ComponentFixture<EmployeesComponent>;
  let apiService: ApiService;
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeesComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            activeTenant$: of({ id: 't-1', name: 'Apex Global', slug: 'apex', role: 'Owner' }),
            currentRole: 'Owner'
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeesComponent);
    component = fixture.componentInstance;
    apiService = TestBed.inject(ApiService);
    authService = TestBed.inject(AuthService);
    fixture.detectChanges();
  });

  it('should create the employees component', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle employee creation modal and auto-assign employee number', () => {
    component.employees = [
      {
        id: 'emp-1',
        tenantId: 't-1',
        employeeNumber: 'EMP-001',
        firstName: 'Alex',
        lastName: 'Morgan',
        fullName: 'Alex Morgan',
        email: 'alex@starlight.com',
        jobTitle: 'Chief Executive Officer',
        hireDateUtc: new Date().toISOString(),
        isActive: true
      }
    ];

    component.openCreateModal();
    expect(component.showModal).toBeTrue();
    expect(component.isEditing).toBeFalse();
    expect(component.newEmployeeNumber).toBe('EMP-02');

    component.closeModal();
    expect(component.showModal).toBeFalse();
  });

  it('should compute employee initials correctly', () => {
    expect(component.getInitials('Alex Morgan')).toBe('AM');
    expect(component.getInitials('Cher')).toBe('C');
    expect(component.getInitials('')).toBe('E');
  });

  it('should evaluate canManage role permissions', () => {
    (authService as any).currentRole = 'Owner';
    expect(component.canManage()).toBeTrue();

    (authService as any).currentRole = 'Admin';
    expect(component.canManage()).toBeTrue();

    (authService as any).currentRole = 'Employee';
    expect(component.canManage()).toBeFalse();
  });

  it('should filter employees list by search query, branch, and department', () => {
    component.employees = [
      {
        id: 'emp-1',
        tenantId: 't-1',
        userId: 'u-1',
        employeeNumber: 'EMP-001',
        firstName: 'Alex',
        lastName: 'Morgan',
        fullName: 'Alex Morgan',
        email: 'alex@starlight.com',
        jobTitle: 'Chief Executive Officer',
        branchId: 'br-hq',
        departmentId: 'dp-exec',
        hireDateUtc: new Date().toISOString(),
        isActive: true
      },
      {
        id: 'emp-2',
        tenantId: 't-1',
        userId: 'u-2',
        employeeNumber: 'EMP-002',
        firstName: 'Sarah',
        lastName: 'Jenkins',
        fullName: 'Sarah Jenkins',
        email: 'sarah@starlight.com',
        jobTitle: 'VP of Operations',
        branchId: 'br-remote',
        departmentId: 'dp-ops',
        hireDateUtc: new Date().toISOString(),
        isActive: true
      }
    ];

    // Search query filter
    component.searchQuery = 'Morgan';
    component.onFilterChange();
    expect(component.filteredEmployees.length).toBe(1);
    expect(component.filteredEmployees[0].fullName).toBe('Alex Morgan');

    // Reset search, test Branch filter
    component.searchQuery = '';
    component.selectedBranchId = 'br-remote';
    component.onFilterChange();
    expect(component.filteredEmployees.length).toBe(1);
    expect(component.filteredEmployees[0].fullName).toBe('Sarah Jenkins');

    // Test Department filter
    component.selectedBranchId = '';
    component.selectedDeptId = 'dp-exec';
    component.onFilterChange();
    expect(component.filteredEmployees.length).toBe(1);
    expect(component.filteredEmployees[0].fullName).toBe('Alex Morgan');

    // Clear filters
    component.selectedDeptId = '';
    component.onFilterChange();
    expect(component.filteredEmployees.length).toBe(2);
  });

  it('should submit employee creation request and reload list', () => {
    spyOn(apiService, 'createEmployee').and.returnValue(of({
      success: true,
      data: {
        id: 'emp-new',
        tenantId: 't-1',
        employeeNumber: 'EMP-003',
        firstName: 'Elena',
        lastName: 'Rostova',
        fullName: 'Elena Rostova',
        email: 'elena@starlight.com',
        jobTitle: 'Systems Architect',
        hireDateUtc: new Date().toISOString(),
        isActive: true
      }
    }));
    spyOn(component, 'loadEmployees');

    component.openCreateModal();
    component.newFirstName = 'Elena';
    component.newLastName = 'Rostova';
    component.newEmail = 'elena@starlight.com';
    component.newJobTitle = 'Systems Architect';
    component.newEmployeeNumber = 'EMP-003';

    component.submitEmployeeForm();

    expect(apiService.createEmployee).toHaveBeenCalledWith(jasmine.objectContaining({
      firstName: 'Elena',
      lastName: 'Rostova',
      email: 'elena@starlight.com',
      jobTitle: 'Systems Architect',
      employeeNumber: 'EMP-003'
    }));
    expect(component.showModal).toBeFalse();
    expect(component.loadEmployees).toHaveBeenCalled();
  });

  it('should open edit modal, prefill employee details, and submit update request', () => {
    const existingEmployee = {
      id: 'emp-42',
      tenantId: 't-1',
      employeeNumber: 'EMP-042',
      firstName: 'Marcus',
      lastName: 'Vance',
      fullName: 'Marcus Vance',
      email: 'marcus@starlight.com',
      jobTitle: 'DevOps Lead',
      branchId: 'br-1',
      departmentId: 'dp-1',
      reportsToEmployeeId: 'emp-1',
      hireDateUtc: new Date().toISOString(),
      isActive: true
    };

    spyOn(apiService, 'updateEmployee').and.returnValue(of({
      success: true,
      data: existingEmployee
    }));
    spyOn(component, 'loadEmployees');

    component.openEditModal(existingEmployee);
    expect(component.showModal).toBeTrue();
    expect(component.isEditing).toBeTrue();
    expect(component.editingEmployeeId).toBe('emp-42');
    expect(component.newFirstName).toBe('Marcus');
    expect(component.newLastName).toBe('Vance');
    expect(component.newEmail).toBe('marcus@starlight.com');
    expect(component.newJobTitle).toBe('DevOps Lead');
    expect(component.newBranchId).toBe('br-1');
    expect(component.newDeptId).toBe('dp-1');

    // Modify fields and submit
    component.newJobTitle = 'Director of Platform Engineering';
    component.submitEmployeeForm();

    expect(apiService.updateEmployee).toHaveBeenCalledWith('emp-42', jasmine.objectContaining({
      firstName: 'Marcus',
      lastName: 'Vance',
      jobTitle: 'Director of Platform Engineering'
    }));
    expect(component.showModal).toBeFalse();
    expect(component.loadEmployees).toHaveBeenCalled();
  });

  it('should prompt confirmation and delete employee profile', () => {
    const emp = {
      id: 'emp-99',
      tenantId: 't-1',
      employeeNumber: 'EMP-099',
      firstName: 'Temporary',
      lastName: 'Contractor',
      fullName: 'Temporary Contractor',
      email: 'temp@starlight.com',
      jobTitle: 'Consultant',
      hireDateUtc: new Date().toISOString(),
      isActive: true
    };

    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(apiService, 'deleteEmployee').and.returnValue(of({
      success: true,
      data: null
    }));
    spyOn(component, 'loadEmployees');

    component.confirmDelete(emp);
    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to remove employee profile for Temporary Contractor (EMP-099)?'
    );
    expect(apiService.deleteEmployee).toHaveBeenCalledWith('emp-99');
    expect(component.loadEmployees).toHaveBeenCalled();
  });

  it('should not delete employee if user cancels confirmation', () => {
    const emp = {
      id: 'emp-99',
      tenantId: 't-1',
      employeeNumber: 'EMP-099',
      firstName: 'Temporary',
      lastName: 'Contractor',
      fullName: 'Temporary Contractor',
      email: 'temp@starlight.com',
      jobTitle: 'Consultant',
      hireDateUtc: new Date().toISOString(),
      isActive: true
    };

    spyOn(window, 'confirm').and.returnValue(false);
    spyOn(apiService, 'deleteEmployee');

    component.confirmDelete(emp);
    expect(apiService.deleteEmployee).not.toHaveBeenCalled();
  });

  it('should export filtered employees to CSV format', () => {
    component.filteredEmployees = [
      {
        id: 'emp-1',
        tenantId: 't-1',
        employeeNumber: 'EMP-001',
        firstName: 'Alex',
        lastName: 'Morgan',
        fullName: 'Alex Morgan',
        email: 'alex@starlight.com',
        jobTitle: 'Chief Executive Officer',
        hireDateUtc: new Date().toISOString(),
        isActive: true
      }
    ];

    spyOn(document, 'createElement').and.callThrough();
    component.exportToCsv();
    expect(document.createElement).toHaveBeenCalledWith('a');
  });
});
