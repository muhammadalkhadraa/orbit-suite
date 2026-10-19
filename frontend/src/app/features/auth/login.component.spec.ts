import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { of, throwError } from 'rxjs';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let router: Router;
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent, HttpClientTestingModule],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    authService = TestBed.inject(AuthService);
    spyOn(router, 'navigate');
    fixture.detectChanges();
  });

  it('should create the login component', () => {
    expect(component).toBeTruthy();
  });

  it('should render sign-in title and input fields', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Sign in to Orbit');
    expect(compiled.querySelector('input[type="email"]')).toBeTruthy();
    expect(compiled.querySelector('input[type="password"]')).toBeTruthy();
  });

  it('should submit login credentials and route to workspace on success', () => {
    spyOn(authService, 'login').and.returnValue(of({
      accessToken: 'jwt-auth-token',
      tokenType: 'Bearer',
      expiresInMinutes: 120,
      user: { id: 'u1', email: 'alex.morgan@orbitbusiness.io', fullName: 'Alex Morgan', role: 'Owner' },
      activeTenant: { id: 't1', name: 'Apex Global', slug: 'apex', role: 'Owner' },
      availableTenants: []
    }));

    component.email = 'alex.morgan@orbitbusiness.io';
    component.password = 'OrbitPassword123!';
    component.onSubmit();

    expect(authService.login).toHaveBeenCalledWith({
      email: 'alex.morgan@orbitbusiness.io',
      password: 'OrbitPassword123!'
    });
    expect(component.loading).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/app/tasks']);
  });

  it('should display error message when login fails', () => {
    spyOn(authService, 'login').and.returnValue(
      throwError(() => ({ error: { message: 'Invalid credentials provided.' } }))
    );

    component.onSubmit();

    expect(component.loading).toBeFalse();
    expect(component.errorMessage).toBe('Invalid credentials provided.');
  });

  it('should perform quick 1-click role login and route to workspace', () => {
    spyOn(authService, 'loginAsDemoRole');

    component.quickLogin('Owner');
    expect(authService.loginAsDemoRole).toHaveBeenCalledWith('Owner');
    expect(router.navigate).toHaveBeenCalledWith(['/app/tasks']);

    component.quickLogin('Manager');
    expect(authService.loginAsDemoRole).toHaveBeenCalledWith('Manager');

    component.quickLogin('Employee');
    expect(authService.loginAsDemoRole).toHaveBeenCalledWith('Employee');
  });
});
