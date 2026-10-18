import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { tenantInterceptor } from './tenant.interceptor';
import { AuthService } from '../services/auth.service';

describe('tenantInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([tenantInterceptor])),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            getToken: () => 'mock-jwt-token',
            getActiveTenantId: () => 'tenant-uuid-123'
          }
        }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should attach Bearer token and X-Tenant-Id headers when available', () => {
    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('Authorization')).toBe('Bearer mock-jwt-token');
    expect(req.request.headers.get('X-Tenant-Id')).toBe('tenant-uuid-123');
    req.flush({});
  });

  it('should not attach headers when token or tenantId are null', () => {
    spyOn(authService, 'getToken').and.returnValue(null);
    spyOn(authService, 'getActiveTenantId').and.returnValue(null);

    httpClient.get('/api/unauthenticated').subscribe();

    const req = httpMock.expectOne('/api/unauthenticated');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    expect(req.request.headers.has('X-Tenant-Id')).toBeFalse();
    req.flush({});
  });
});
