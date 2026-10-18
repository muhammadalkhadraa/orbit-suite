import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterComponent } from './register.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { of, throwError } from 'rxjs';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let authService: AuthService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterComponent, HttpClientTestingModule],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    fixture.detectChanges();
  });

  it('should create the register component', () => {
    expect(component).toBeTruthy();
  });

  it('should render registration heading and form controls', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Create Tenant Workspace');
    expect(compiled.querySelector('#companyName')).toBeTruthy();
    expect(compiled.querySelector('#fullName')).toBeTruthy();
    expect(compiled.querySelector('#email')).toBeTruthy();
    expect(compiled.querySelector('#password')).toBeTruthy();
  });

  it('should validate required fields on submit without input', () => {
    component.onSubmit();
    expect(component.errorMessage).toContain('All fields are required');
  });

  it('should successfully submit and navigate to dashboard on registration success', () => {
    spyOn(authService, 'register').and.returnValue(of({
      accessToken: 'jwt-token',
      tokenType: 'Bearer',
      expiresInMinutes: 120,
      user: { id: 'u1', email: 'owner@apex.com', fullName: 'Alice Vance', role: 'Owner' },
      activeTenant: { id: 't1', name: 'Apex Logistics', slug: 'apex-logistics', role: 'Owner' },
      availableTenants: []
    }));

    component.companyName = 'Apex Logistics';
    component.fullName = 'Alice Vance';
    component.email = 'owner@apex.com';
    component.password = 'password123';

    component.onSubmit();

    expect(authService.register).toHaveBeenCalledWith({
      companyName: 'Apex Logistics',
      fullName: 'Alice Vance',
      email: 'owner@apex.com',
      password: 'password123'
    });
    expect(component.loading).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/app/dashboard']);
  });

  it('should display error message on registration failure', () => {
    spyOn(authService, 'register').and.returnValue(
      throwError(() => ({ error: { message: 'Organization name is already registered' } }))
    );

    component.companyName = 'Existing Org';
    component.fullName = 'Alice Vance';
    component.email = 'owner@apex.com';
    component.password = 'password123';

    component.onSubmit();

    expect(component.loading).toBeFalse();
    expect(component.errorMessage).toBe('Organization name is already registered');
  });
});
