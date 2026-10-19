import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { roleGuard } from './role.guard';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('roleGuard', () => {
  let authService: AuthService;
  let router: Router;
  let toastService: ToastService;

  const mockState = { url: '/app/audit' } as RouterStateSnapshot;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: Router,
          useValue: { navigate: jasmine.createSpy('navigate') }
        }
      ]
    });

    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    toastService = TestBed.inject(ToastService);
  });

  it('should allow navigation when no roles are specified in route data', () => {
    const route = { data: {} } as ActivatedRouteSnapshot;
    const result = TestBed.runInInjectionContext(() => roleGuard(route, mockState));
    expect(result).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should allow navigation when current role matches allowed roles', () => {
    const route = { data: { roles: ['Owner', 'Admin'] } } as unknown as ActivatedRouteSnapshot;
    spyOnProperty(authService, 'currentRole', 'get').and.returnValue('Owner');

    const result = TestBed.runInInjectionContext(() => roleGuard(route, mockState));
    expect(result).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should deny navigation, display toast warning, and redirect to dashboard when unauthorized', () => {
    const route = { data: { roles: ['Owner', 'Admin'] } } as unknown as ActivatedRouteSnapshot;
    spyOnProperty(authService, 'currentRole', 'get').and.returnValue('Employee');
    spyOn(toastService, 'warning');

    const result = TestBed.runInInjectionContext(() => roleGuard(route, mockState));
    expect(result).toBeFalse();
    expect(toastService.warning).toHaveBeenCalledWith('Access Restricted', jasmine.any(String));
    expect(router.navigate).toHaveBeenCalledWith(['/app/dashboard']);
  });
});
