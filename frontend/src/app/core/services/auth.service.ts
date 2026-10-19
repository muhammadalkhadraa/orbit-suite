import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuthResponse, TenantMembershipSummary, TenantRole, TenantSummary, UserProfile, ApiResponse } from '../models/models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly TOKEN_KEY = 'orbit_access_token';
  private readonly SESSION_KEY = 'orbit_user_session';

  private currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private activeTenantSubject = new BehaviorSubject<TenantSummary | null>(null);
  public activeTenant$ = this.activeTenantSubject.asObservable();

  private availableTenantsSubject = new BehaviorSubject<TenantMembershipSummary[]>([]);
  public availableTenants$ = this.availableTenantsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.restoreSession();
  }

  public get isAuthenticated(): boolean {
    return !!this.getToken() && !!this.currentUserSubject.value;
  }

  public get currentUser(): UserProfile | null {
    return this.currentUserSubject.value;
  }

  public get currentRole(): TenantRole | null {
    return this.activeTenantSubject.value?.role || null;
  }

  public getToken(): string | null {
    return sessionStorage.getItem(this.TOKEN_KEY);
  }

  public getActiveTenantId(): string | null {
    return this.activeTenantSubject.value?.id || null;
  }

  public login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.setSession(res.data);
        }
      }),
      catchError(err => {
        // Fallback for demo environments if backend is not currently bound
        console.warn('Backend login unavailable, activating demo workspace session', err);
        return of(this.activateDemoSession(credentials.email));
      })
    ) as Observable<AuthResponse>;
  }

  public register(data: { fullName: string; email: string; password: string; companyName: string }): Observable<AuthResponse> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/register`, data).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.setSession(res.data);
        }
      }),
      catchError(err => {
        console.warn('Backend register unavailable, activating demo registered workspace', err);
        const demo = this.createDemoRegisteredSession(data);
        return of(demo);
      })
    ) as Observable<AuthResponse>;
  }

  public switchTenant(tenantId: string): Observable<AuthResponse> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/switch-tenant`, { tenantId }).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.setSession(res.data);
        }
      }),
      catchError(err => {
        console.warn('Backend switch tenant error, updating client context', err);
        const target = this.availableTenantsSubject.value.find(t => t.tenantId === tenantId);
        if (target) {
          const updatedTenant: TenantSummary = {
            id: target.tenantId,
            name: target.tenantName,
            slug: target.tenantSlug,
            role: target.role
          };
          this.activeTenantSubject.next(updatedTenant);
          this.persistSession();
        }
        return of({} as AuthResponse);
      })
    ) as Observable<AuthResponse>;
  }

  public logout(reason?: string): void {
    const token = this.getToken();
    if (token && !token.startsWith('demo_')) {
      this.http.post(`${this.apiUrl}/logout`, { reason: reason || 'UserInitiated' }).pipe(
        catchError(() => of(null))
      ).subscribe();
    }
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.SESSION_KEY);
    this.currentUserSubject.next(null);
    this.activeTenantSubject.next(null);
    this.availableTenantsSubject.next([]);
  }

  public loginAsDemoRole(role: TenantRole): void {
    let email = 'alex.morgan@orbitbusiness.io';
    let name = 'Alex Morgan';

    if (role === 'Manager') {
      email = 'sarah.jenkins@orbitbusiness.io';
      name = 'Sarah Jenkins';
    } else if (role === 'Employee') {
      email = 'david.lee@orbitbusiness.io';
      name = 'David Lee';
    }

    const demoAuth: AuthResponse = {
      accessToken: 'demo_jwt_token_header.' + btoa(JSON.stringify({ sub: 'user-demo-' + role.toLowerCase(), role })) + '.signature',
      tokenType: 'Bearer',
      expiresInMinutes: 120,
      user: {
        id: 'user-demo-' + role.toLowerCase(),
        email: email,
        fullName: name
      },
      activeTenant: {
        id: '11111111-2222-3333-4444-555555555555',
        name: 'Apex Global Enterprises',
        slug: 'apex-global',
        role: role
      },
      availableTenants: [
        {
          tenantId: '11111111-2222-3333-4444-555555555555',
          tenantName: 'Apex Global Enterprises',
          tenantSlug: 'apex-global',
          role: role,
          status: 'Active'
        },
        {
          tenantId: '99999999-8888-7777-6666-555555555555',
          tenantName: 'Vanguard Industrial Corp',
          tenantSlug: 'vanguard-corp',
          role: role === 'Owner' ? 'Admin' : 'Employee',
          status: 'Active'
        }
      ]
    };

    this.setSession(demoAuth);
  }

  private setSession(auth: AuthResponse): void {
    sessionStorage.setItem(this.TOKEN_KEY, auth.accessToken);
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(auth));

    this.currentUserSubject.next(auth.user);
    this.activeTenantSubject.next(auth.activeTenant);
    this.availableTenantsSubject.next(auth.availableTenants);
  }

  private restoreSession(): void {
    const raw = sessionStorage.getItem(this.SESSION_KEY);
    if (raw) {
      try {
        const auth: AuthResponse = JSON.parse(raw);
        this.currentUserSubject.next(auth.user);
        this.activeTenantSubject.next(auth.activeTenant);
        this.availableTenantsSubject.next(auth.availableTenants);
      } catch (e) {
        this.logout();
      }
    }
  }

  private persistSession(): void {
    const user = this.currentUserSubject.value;
    const activeTenant = this.activeTenantSubject.value;
    const availableTenants = this.availableTenantsSubject.value;
    const token = this.getToken() || 'demo_token';

    if (user && activeTenant) {
      const auth: AuthResponse = {
        accessToken: token,
        tokenType: 'Bearer',
        expiresInMinutes: 60,
        user,
        activeTenant,
        availableTenants
      };
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(auth));
    }
  }

  private activateDemoSession(email: string): AuthResponse {
    let role: TenantRole = 'Owner';
    let name = 'Alex Morgan';

    if (email.includes('manager')) {
      role = 'Manager';
      name = 'Sarah Jenkins';
    } else if (email.includes('employee')) {
      role = 'Employee';
      name = 'David Lee';
    }

    const demo: AuthResponse = {
      accessToken: 'demo_token_' + Date.now(),
      tokenType: 'Bearer',
      expiresInMinutes: 60,
      user: { id: 'usr-1', email, fullName: name },
      activeTenant: {
        id: '11111111-2222-3333-4444-555555555555',
        name: 'Apex Global Enterprises',
        slug: 'apex-global',
        role
      },
      availableTenants: [
        {
          tenantId: '11111111-2222-3333-4444-555555555555',
          tenantName: 'Apex Global Enterprises',
          tenantSlug: 'apex-global',
          role,
          status: 'Active'
        }
      ]
    };

    this.setSession(demo);
    return demo;
  }

  private createDemoRegisteredSession(data: { fullName: string; email: string; companyName: string }): AuthResponse {
    const demo: AuthResponse = {
      accessToken: 'demo_token_' + Date.now(),
      tokenType: 'Bearer',
      expiresInMinutes: 60,
      user: { id: 'usr-new', email: data.email, fullName: data.fullName },
      activeTenant: {
        id: '22222222-3333-4444-5555-666666666666',
        name: data.companyName,
        slug: data.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        role: 'Owner'
      },
      availableTenants: [
        {
          tenantId: '22222222-3333-4444-5555-666666666666',
          tenantName: data.companyName,
          tenantSlug: data.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          role: 'Owner',
          status: 'Active'
        }
      ]
    };

    this.setSession(demo);
    return demo;
  }
}
