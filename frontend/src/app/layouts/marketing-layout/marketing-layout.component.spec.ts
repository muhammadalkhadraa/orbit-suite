import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MarketingLayoutComponent } from './marketing-layout.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

describe('MarketingLayoutComponent', () => {
  let component: MarketingLayoutComponent;
  let fixture: ComponentFixture<MarketingLayoutComponent>;
  let authService: AuthService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarketingLayoutComponent, HttpClientTestingModule],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(MarketingLayoutComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    fixture.detectChanges();
  });

  it('should create the marketing layout component', () => {
    expect(component).toBeTruthy();
  });

  it('should render brand title, hero section, architecture cards, 10 modules, and security showcase', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand-name')?.textContent).toContain('Orbit');
    expect(compiled.querySelector('.hero-title')?.textContent).toContain('One Unified Operating System');
    expect(compiled.querySelector('#features')).toBeTruthy();
    expect(compiled.querySelector('#architecture')).toBeTruthy();
    expect(compiled.querySelector('#modules')).toBeTruthy();
    expect(compiled.querySelector('#pricing')).toBeTruthy();
    expect(compiled.querySelector('#security')).toBeTruthy();
    expect(compiled.querySelectorAll('.feature-card').length).toBe(6);
    expect(compiled.querySelectorAll('.module-card').length).toBe(10);
    expect(compiled.querySelectorAll('.pricing-tier-card').length).toBe(3);
    expect(compiled.querySelector('.compliance-ribbon')).toBeTruthy();
  });

  it('should toggle annual and monthly billing cycle', () => {
    expect(component.annualBilling).toBeTrue();
    component.toggleBilling();
    expect(component.annualBilling).toBeFalse();
    component.toggleBilling();
    expect(component.annualBilling).toBeTrue();
  });

  it('should launch quick demo with specified role and route to workspace tasks', () => {
    spyOn(authService, 'loginAsDemoRole').and.callThrough();
    component.launchQuickDemo('Manager');
    expect(authService.loginAsDemoRole).toHaveBeenCalledWith('Manager');
    expect(router.navigate).toHaveBeenCalledWith(['/app/tasks']);
  });
});
