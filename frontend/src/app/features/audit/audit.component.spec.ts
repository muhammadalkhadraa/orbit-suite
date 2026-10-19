import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuditComponent } from './audit.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AuditLog } from '../../core/models/models';
import { of } from 'rxjs';

describe('AuditComponent', () => {
  let component: AuditComponent;
  let fixture: ComponentFixture<AuditComponent>;

  const createDummyAuditLog = (overrides?: Partial<AuditLog>): AuditLog => ({
    id: 'aud-test-1',
    tenantId: 't-1',
    action: 'ClockIn',
    entityName: 'AttendanceLog',
    entityId: 'att-1234',
    userEmail: 'operator@apex.com',
    ipAddress: '192.168.1.100',
    detailsJson: '{"status":"Verified"}',
    timestampUtc: '2026-03-15T09:00:00Z',
    ...overrides
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditComponent, HttpClientTestingModule],
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

    fixture = TestBed.createComponent(AuditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the audit component', () => {
    expect(component).toBeTruthy();
  });

  it('should render header title and SOC2 Type II badge', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Audit & Security Trail');
    expect(compiled.textContent).toContain('SOC2 Type II');
  });

  it('should format JSON payload or provide fallback', () => {
    const formatted = component.formatJson('{"action":"Login"}');
    expect(formatted).toContain('"action": "Login"');

    const empty = component.formatJson('');
    expect(empty).toContain('No additional payload attributes recorded');
  });

  it('should map action strings to semantic badge colors', () => {
    expect(component.getActionBadgeClass('UserLogin')).toBe('badge-indigo');
    expect(component.getActionBadgeClass('CreateProduct')).toBe('badge-emerald');
    expect(component.getActionBadgeClass('UpdateInvoice')).toBe('badge-cyan');
    expect(component.getActionBadgeClass('VoidInvoice')).toBe('badge-rose');
    expect(component.getActionBadgeClass('RecordPayment')).toBe('badge-amber');
  });

  it('should open and close log inspector modal', () => {
    const dummyLog = createDummyAuditLog();

    component.inspectLog(dummyLog);
    expect(component.activeInspectLog).toBe(dummyLog);

    component.closeInspect();
    expect(component.activeInspectLog).toBeNull();
  });

  it('should reset page on filter change and handle pagination', () => {
    spyOn(component, 'loadAuditLogs');
    component.currentPage = 3;
    component.totalPages = 5;

    component.onFilterChange();
    expect(component.currentPage).toBe(1);
    expect(component.loadAuditLogs).toHaveBeenCalled();

    component.changePage(2);
    expect(component.currentPage).toBe(2);

    // Should not allow page beyond totalPages
    component.changePage(10);
    expect(component.currentPage).toBe(2);
  });

  it('should export audit trail to CSV format', () => {
    component.auditLogs = [createDummyAuditLog()];

    spyOn(document, 'createElement').and.callThrough();
    component.exportAuditCsv();
    expect(document.createElement).toHaveBeenCalledWith('a');
  });

  it('should allow filtering audit logs by specific user email and clearing filter', () => {
    spyOn(component, 'loadAuditLogs');

    component.filterByUser('sarah.jenkins@orbitbusiness.io');
    expect(component.selectedUserEmail).toBe('sarah.jenkins@orbitbusiness.io');
    expect(component.currentPage).toBe(1);
    expect(component.loadAuditLogs).toHaveBeenCalled();

    component.clearUserFilter();
    expect(component.selectedUserEmail).toBe('');
    expect(component.loadAuditLogs).toHaveBeenCalledTimes(2);
  });

  it('should map Logout action to badge-amber color', () => {
    expect(component.getActionBadgeClass('Logout')).toBe('badge-amber');
    expect(component.getActionBadgeClass('Login')).toBe('badge-indigo');
    expect(component.getActionBadgeClass('Register')).toBe('badge-indigo');
  });
});

