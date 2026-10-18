import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

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
});
