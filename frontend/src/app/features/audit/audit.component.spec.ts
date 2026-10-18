import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuditComponent } from './audit.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

describe('AuditComponent', () => {
  let component: AuditComponent;
  let fixture: ComponentFixture<AuditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditComponent, HttpClientTestingModule],
      providers: [provideRouter([])]
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
    const dummyLog = {
      id: 'aud-test-1',
      tenantId: 't1',
      action: 'ClockIn',
      entityName: 'AttendanceLog',
      timestampUtc: new Date().toISOString()
    };

    component.inspectLog(dummyLog);
    expect(component.activeInspectLog).toBe(dummyLog);

    component.closeInspect();
    expect(component.activeInspectLog).toBeNull();
  });
});
