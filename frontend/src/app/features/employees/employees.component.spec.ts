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
      providers: [provideRouter([])]
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
    spyOnProperty(authService, 'currentRole', 'get').and.returnValue('Owner');
    expect(component.canManage()).toBeTrue();

    (Object.getOwnPropertyDescriptor(authService, 'currentRole')?.get as jasmine.Spy).and.returnValue('Admin');
    expect(component.canManage()).toBeTrue();

    (Object.getOwnPropertyDescriptor(authService, 'currentRole')?.get as jasmine.Spy).and.returnValue('Employee');
    expect(component.canManage()).toBeFalse();
  });

  it('should filter employees list by search query', () => {
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
        hireDateUtc: new Date().toISOString(),
        isActive: true
      }
    ];

    component.searchQuery = 'Morgan';
    component.onSearch();
    expect(component.filteredEmployees.length).toBe(1);
    expect(component.filteredEmployees[0].fullName).toBe('Alex Morgan');

    component.searchQuery = '';
    component.onSearch();
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

    component.submitCreateEmployee();

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
});
