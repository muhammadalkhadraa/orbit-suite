import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent, HttpClientTestingModule],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the dashboard component', () => {
    expect(component).toBeTruthy();
  });

  it('should render executive title and active tenant security card', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Executive Dashboard');
    expect(compiled.querySelector('.security-title')?.textContent).toContain('ACTIVE TENANT SECURITY ENFORCEMENT');
  });

  it('should render platform operations quick navigation items including billing', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const navItems = compiled.querySelectorAll('.quick-nav-item');
    expect(navItems.length).toBeGreaterThanOrEqual(10);
    const hasBilling = Array.from(navItems).some(item => item.textContent?.includes('Billing'));
    expect(hasBilling).toBeTrue();
  });

  it('should update telemetry time range', () => {
    expect(component.selectedTimeRange).toBe('7D');
    component.setTimeRange('30D');
    expect(component.selectedTimeRange).toBe('30D');
    component.setTimeRange('90D');
    expect(component.selectedTimeRange).toBe('90D');
  });

  it('should render SVG sparklines and telemetry chart elements', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.sparkline-wrap').length).toBe(4);
    expect(compiled.querySelector('.telemetry-chart-card')).toBeTruthy();
    expect(compiled.querySelector('.chart-svg')).toBeTruthy();
  });

  it('should return appropriate badge class per role', () => {
    expect(component.getRoleBadgeClass('Owner')).toBe('badge-violet');
    expect(component.getRoleBadgeClass('Admin')).toBe('badge-indigo');
    expect(component.getRoleBadgeClass('Manager')).toBe('badge-cyan');
    expect(component.getRoleBadgeClass('Employee')).toBe('badge-emerald');
    expect(component.getRoleBadgeClass('Guest')).toBe('badge-indigo');
  });

  it('should return appropriate badge class per task status', () => {
    expect(component.getStatusBadge('Todo')).toBe('badge-indigo');
    expect(component.getStatusBadge('InProgress')).toBe('badge-cyan');
    expect(component.getStatusBadge('InReview')).toBe('badge-amber');
    expect(component.getStatusBadge('Done')).toBe('badge-emerald');
    expect(component.getStatusBadge('Unknown')).toBe('badge-indigo');
  });
});
