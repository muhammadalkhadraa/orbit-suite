import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HrComponent } from './hr.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

describe('HrComponent', () => {
  let component: HrComponent;
  let fixture: ComponentFixture<HrComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HrComponent, HttpClientTestingModule],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(HrComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the HR component', () => {
    expect(component).toBeTruthy();
  });

  it('should default to leaves tab upon initialization', () => {
    expect(component.activeTab).toBe('leaves');
  });

  it('should switch between leaves, attendance, and shifts tabs', () => {
    component.activeTab = 'attendance';
    expect(component.activeTab).toBe('attendance');

    component.activeTab = 'shifts';
    expect(component.activeTab).toBe('shifts');

    component.activeTab = 'leaves';
    expect(component.activeTab).toBe('leaves');
  });

  it('should evaluate canManageHr correctly based on role', () => {
    component.currentRole = 'Owner';
    expect(component.canManageHr).toBeTrue();

    component.currentRole = 'Manager';
    expect(component.canManageHr).toBeTrue();

    component.currentRole = 'Admin';
    expect(component.canManageHr).toBeTrue();

    component.currentRole = 'Employee';
    expect(component.canManageHr).toBeFalse();
  });

  it('should toggle create leave modal and calculate duration', () => {
    component.openCreateLeaveModal();
    expect(component.showCreateLeaveModal).toBeTrue();

    component.newLeave.startDateUtc = '2026-11-01';
    component.newLeave.endDateUtc = '2026-11-05';
    component.calculateDays();
    expect(component.calculatedDays).toBe(5);

    component.closeCreateLeaveModal();
    expect(component.showCreateLeaveModal).toBeFalse();
  });

  it('should filter leave requests by status', () => {
    component.setLeaveStatusFilter('Pending');
    expect(component.selectedLeaveStatus).toBe('Pending');

    component.setLeaveStatusFilter('Approved');
    expect(component.selectedLeaveStatus).toBe('Approved');

    component.setLeaveStatusFilter('ALL');
    expect(component.selectedLeaveStatus).toBe('ALL');
  });
});
