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

  it('should render platform operations quick navigation items', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const navItems = compiled.querySelectorAll('.quick-nav-item');
    expect(navItems.length).toBeGreaterThanOrEqual(8);
  });

  it('should return appropriate badge class per role', () => {
    expect(component.getRoleBadgeClass('Owner')).toBe('badge-violet');
    expect(component.getRoleBadgeClass('Admin')).toBe('badge-indigo');
    expect(component.getRoleBadgeClass('Manager')).toBe('badge-cyan');
    expect(component.getRoleBadgeClass('Employee')).toBe('badge-emerald');
  });
});
