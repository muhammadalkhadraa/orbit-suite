import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HrComponent } from './hr.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LeaveRequest, AttendanceLog, ShiftSchedule } from '../../core/models/models';
import { of } from 'rxjs';

describe('HrComponent', () => {
  let component: HrComponent;
  let fixture: ComponentFixture<HrComponent>;

  const createDummyLeave = (overrides?: Partial<LeaveRequest>): LeaveRequest => ({
    id: 'lr-1',
    requestNumber: 'LR-2026-001',
    employeeId: 'emp-1',
    employeeName: 'Sarah Connor',
    employeeNumber: 'EMP-001',
    departmentName: 'Engineering',
    leaveType: 'Annual',
    startDateUtc: '2026-04-01T00:00:00Z',
    endDateUtc: '2026-04-05T00:00:00Z',
    daysCount: 5,
    reason: 'Annual family holiday',
    status: 'Pending',
    createdAtUtc: '2026-03-01T10:00:00Z',
    ...overrides
  });

  const createDummyAttendance = (overrides?: Partial<AttendanceLog>): AttendanceLog => ({
    id: 'att-1',
    employeeId: 'emp-1',
    employeeName: 'Sarah Connor',
    employeeNumber: 'EMP-001',
    departmentName: 'Engineering',
    date: '2026-03-15',
    checkInTimeUtc: '2026-03-15T09:00:00Z',
    checkOutTimeUtc: '2026-03-15T17:30:00Z',
    totalHours: 8.5,
    status: 'Present',
    workLocation: 'HQ - Main Campus',
    createdAtUtc: '2026-03-15T09:00:00Z',
    ...overrides
  });

  const createDummyShift = (overrides?: Partial<ShiftSchedule>): ShiftSchedule => ({
    id: 'sh-1',
    employeeId: 'emp-1',
    employeeName: 'Sarah Connor',
    employeeNumber: 'EMP-001',
    shiftName: 'Morning Shift',
    shiftType: 'MorningShift',
    startTime: '08:00:00',
    endTime: '16:30:00',
    effectiveFromUtc: '2026-01-01',
    isActive: true,
    createdAtUtc: '2026-01-01T00:00:00Z',
    ...overrides
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HrComponent, HttpClientTestingModule],
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

  it('should filter leave requests by status and search text', () => {
    component.leaveRequests = [
      createDummyLeave({ id: 'lr-1', requestNumber: 'LR-101', employeeName: 'Sarah Connor', status: 'Pending' }),
      createDummyLeave({ id: 'lr-2', requestNumber: 'LR-202', employeeName: 'John Doe', status: 'Approved' })
    ];

    component.setLeaveStatusFilter('Pending');
    expect(component.filteredLeaves.length).toBe(1);
    expect(component.filteredLeaves[0].id).toBe('lr-1');

    component.setLeaveStatusFilter('ALL');
    component.searchLeaveText = 'John';
    expect(component.filteredLeaves.length).toBe(1);
    expect(component.filteredLeaves[0].id).toBe('lr-2');
  });

  it('should filter attendance logs by status and search text', () => {
    component.attendanceLogs = [
      createDummyAttendance({ id: 'att-1', employeeName: 'Sarah Connor', status: 'Present', workLocation: 'HQ' }),
      createDummyAttendance({ id: 'att-2', employeeName: 'John Doe', status: 'Late', workLocation: 'Plant 1' })
    ];

    component.setAttendanceStatusFilter('Late');
    expect(component.filteredAttendance.length).toBe(1);
    expect(component.filteredAttendance[0].id).toBe('att-2');

    component.setAttendanceStatusFilter('ALL');
    component.searchAttendanceText = 'Plant 1';
    expect(component.filteredAttendance.length).toBe(1);
    expect(component.filteredAttendance[0].id).toBe('att-2');
  });

  it('should export leave requests to CSV in leaves tab', () => {
    component.activeTab = 'leaves';
    component.leaveRequests = [
      createDummyLeave({ requestNumber: 'LR-EXP-01' })
    ];

    spyOn(document, 'createElement').and.callThrough();
    component.exportHrCsv();
    expect(document.createElement).toHaveBeenCalledWith('a');
  });

  it('should export attendance logs to CSV in attendance tab', () => {
    component.activeTab = 'attendance';
    component.attendanceLogs = [
      createDummyAttendance({ employeeNumber: 'EMP-EXP-01' })
    ];

    spyOn(document, 'createElement').and.callThrough();
    component.exportHrCsv();
    expect(document.createElement).toHaveBeenCalledWith('a');
  });

  it('should export shifts to CSV in shifts tab', () => {
    component.activeTab = 'shifts';
    component.shiftSchedules = [
      createDummyShift({ shiftName: 'Night Shift Expedition' })
    ];

    spyOn(document, 'createElement').and.callThrough();
    component.exportHrCsv();
    expect(document.createElement).toHaveBeenCalledWith('a');
  });
});

