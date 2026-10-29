import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { errorInterceptor } from './error.interceptor';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

describe('errorInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;
  let router: Router;
  let toastService: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            logout: jasmine.createSpy('logout'),
            getToken: jasmine.createSpy('getToken').and.returnValue('jwt_mock_token')
          }
        },
        {
          provide: Router,
          useValue: {
            navigate: jasmine.createSpy('navigate')
          }
        },
        {
          provide: ToastService,
          useValue: {
            warning: jasmine.createSpy('warning'),
            error: jasmine.createSpy('error')
          }
        }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    toastService = TestBed.inject(ToastService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should pass successful HTTP responses through unchanged', () => {
    let responseData: any = null;
    httpClient.get('/api/health').subscribe(res => {
      responseData = res;
    });

    const req = httpMock.expectOne('/api/health');
    req.flush({ status: 'ok' });

    expect(responseData).toEqual({ status: 'ok' });
    expect(authService.logout).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should handle 401 Unauthorized by logging out, alerting, and routing to login', () => {
    let errorCaught = false;
    httpClient.get('/api/protected').subscribe({
      next: () => fail('Should have failed with 401'),
      error: err => {
        expect(err.status).toBe(401);
        errorCaught = true;
      }
    });

    const req = httpMock.expectOne('/api/protected');
    req.flush({ message: 'Token expired' }, { status: 401, statusText: 'Unauthorized' });

    expect(errorCaught).toBeTrue();
    expect(authService.logout).toHaveBeenCalled();
    expect(toastService.warning).toHaveBeenCalledWith('Session Expired', jasmine.any(String));
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should handle 403 Forbidden by notifying user with an access denied toast', () => {
    let errorCaught = false;
    httpClient.get('/api/restricted').subscribe({
      next: () => fail('Should have failed with 403'),
      error: err => {
        expect(err.status).toBe(403);
        errorCaught = true;
      }
    });

    const req = httpMock.expectOne('/api/restricted');
    req.flush({ message: 'Owner permission required' }, { status: 403, statusText: 'Forbidden' });

    expect(errorCaught).toBeTrue();
    expect(toastService.error).toHaveBeenCalledWith('Access Denied', 'Owner permission required');
    expect(authService.logout).not.toHaveBeenCalled();
  });
});
