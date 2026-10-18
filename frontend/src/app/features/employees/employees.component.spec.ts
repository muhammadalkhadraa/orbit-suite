import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmployeesComponent } from './employees.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

describe('EmployeesComponent', () => {
  let component: EmployeesComponent;
  let fixture: ComponentFixture<EmployeesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeesComponent, HttpClientTestingModule],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the employees component', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle employee creation modal', () => {
    component.openCreateModal();
    expect(component.showModal).toBeTrue();
    component.closeModal();
    expect(component.showModal).toBeFalse();
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
});
