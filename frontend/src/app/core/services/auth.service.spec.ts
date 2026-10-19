import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should allow demo role switching for interactive preview', () => {
    service.loginAsDemoRole('Owner');
    expect(service.isAuthenticated).toBeTrue();
    expect(service.currentRole).toBe('Owner');
    expect(service.currentUser?.fullName).toBe('Alex Morgan');

    service.loginAsDemoRole('Manager');
    expect(service.currentRole).toBe('Manager');
    expect(service.currentUser?.fullName).toBe('Sarah Jenkins');

    service.loginAsDemoRole('Employee');
    expect(service.currentRole).toBe('Employee');
    expect(service.currentUser?.fullName).toBe('David Lee');
  });

  it('should clear session state upon logout', () => {
    service.loginAsDemoRole('Owner');
    expect(service.isAuthenticated).toBeTrue();

    service.logout();
    expect(service.isAuthenticated).toBeFalse();
    expect(service.currentUser).toBeNull();
    expect(service.getToken()).toBeNull();
  });

  it('should notify backend /api/v1/auth/logout with reason when logging out an authenticated session', () => {
    const httpMock = TestBed.inject(HttpTestingController);
    sessionStorage.setItem('orbit_access_token', 'real_bearer_jwt_token_123');
    service.logout('InactivityTimeout');

    const req = httpMock.expectOne(request => request.url.endsWith('/auth/logout'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ reason: 'InactivityTimeout' });
    req.flush({ success: true });
    httpMock.verify();
  });
});
