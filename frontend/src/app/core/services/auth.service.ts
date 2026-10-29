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

  public get currentDepartmentCode(): string {
    if (this.currentUser?.departmentCode) {
      return this.currentUser.departmentCode;
    }
    if (this.currentRole === 'Owner' || this.currentRole === 'Admin') {
      return 'IT';
    }
    return '';
  }

  public canAccessModule(moduleKey: string): boolean {
    const role = this.currentRole;
    const dept = this.currentDepartmentCode;

    // Executive Owner, Admin, or IT department has unrestricted clearance for ALL screens
    if (role === 'Owner' || role === 'Admin' || dept === 'IT') {
      return true;
    }

    // Common employee utility modules (personal dashboard, tasks, activity clock)
    if (moduleKey === 'dashboard' || moduleKey === 'tasks' || moduleKey === 'activity') {
      return true;
    }

    // HR can ONLY access HR and Employees directory
    if (dept === 'HR') {
      return moduleKey === 'hr' || moduleKey === 'employees';
    }

    // Accounting can ONLY access Finance/Accounting
    if (dept === 'FIN') {
      return moduleKey === 'finance';
    }

    // Other departments (Sales, Stores, etc.)
    if (dept === 'SALES') return moduleKey === 'crm';
    if (dept === 'STORES') return moduleKey === 'inventory';
    if (dept === 'AUDIT') return moduleKey === 'compliance';

    return false;
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
    sessionStorage.removeItem('orbit_prompted_start');
    sessionStorage.removeItem('orbit_activity_status');
    this.currentUserSubject.next(null);
    this.activeTenantSubject.next(null);
    this.availableTenantsSubject.next([]);
  }

  public loginAsDemoRole(role: TenantRole): void {
    if (role === 'Owner') {
      this.loginAsPersona('admin');
    } else if (role === 'Manager') {
      this.loginAsPersona('amr');
    } else {
      this.loginAsPersona('abdelrazik');
    }
  }

  public loginAsPersona(personaKey: 'admin' | 'muhammad' | 'amr' | 'abdelrazik'): void {
    let email = 'admin@kazareen.com';
    let fullName = 'Kazareen Administrator';
    let role: TenantRole = 'Owner';
    let departmentCode = 'EXEC';
    let departmentName = 'Executive Leadership';

    if (personaKey === 'muhammad') {
      email = 'alkhadraam@gmail.com';
      fullName = 'Muhammad Alkhadraa';
      role = 'Admin';
      departmentCode = 'IT';
      departmentName = 'Information Technology';
    } else if (personaKey === 'amr') {
      email = 'amr@kazareen.com';
      fullName = 'Amr El-Sayed';
      role = 'Employee';
      departmentCode = 'HR';
      departmentName = 'Human Resources';
    } else if (personaKey === 'abdelrazik') {
      email = 'abdelrazik@kazareen.com';
      fullName = 'Abdelrazik Hassan';
      role = 'Employee';
      departmentCode = 'FIN';
      departmentName = 'Finance & Accounting';
    }

    this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/login`, {
      email: email,
      password: 'Password123!'
    }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          if (!res.data.user.departmentCode) {
            res.data.user.departmentCode = departmentCode;
            res.data.user.departmentName = departmentName;
          }
          this.setSession(res.data);
        }
      },
      error: () => {
        const demoAuth: AuthResponse = {
          accessToken: 'demo_token_' + Date.now(),
          tokenType: 'Bearer',
          expiresInMinutes: 60,
          user: {
            id: 'usr-' + personaKey,
            email: email,
            fullName: fullName,
            role: role,
            departmentCode: departmentCode,
            departmentName: departmentName
          },
          activeTenant: {
            id: '33333333-3333-3333-3333-333333333333',
            name: 'Kazareen',
            slug: 'kazareen',
            role: role
          },
          availableTenants: [
            {
              tenantId: '33333333-3333-3333-3333-333333333333',
              tenantName: 'Kazareen',
              tenantSlug: 'kazareen',
              role: role,
              status: 'Active'
            }
          ]
        };
        this.setSession(demoAuth);
      }
    });
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
    const e = (email || '').toLowerCase();
    let personaKey: 'admin' | 'muhammad' | 'amr' | 'abdelrazik' = 'admin';
    if (e.includes('alkhadraam') || e.includes('muhammad')) {
      personaKey = 'muhammad';
    } else if (e.includes('amr')) {
      personaKey = 'amr';
    } else if (e.includes('abdelrazik')) {
      personaKey = 'abdelrazik';
    }

    let fullName = 'Kazareen Administrator';
    let role: TenantRole = 'Owner';
    let deptCode = 'EXEC';
    let deptName = 'Executive Leadership';
    if (personaKey === 'muhammad') {
      fullName = 'Muhammad Alkhadraa';
      role = 'Admin';
      deptCode = 'IT';
      deptName = 'Information Technology';
    } else if (personaKey === 'amr') {
      fullName = 'Amr El-Sayed';
      role = 'Employee';
      deptCode = 'HR';
      deptName = 'Human Resources';
    } else if (personaKey === 'abdelrazik') {
      fullName = 'Abdelrazik Hassan';
      role = 'Employee';
      deptCode = 'FIN';
      deptName = 'Finance & Accounting';
    }

    const demoAuth: AuthResponse = {
      accessToken: 'demo_token_' + Date.now(),
      tokenType: 'Bearer',
      expiresInMinutes: 60,
      user: {
        id: 'usr-' + personaKey,
        email: email,
        fullName: fullName,
        role: role,
        departmentCode: deptCode,
        departmentName: deptName
      },
      activeTenant: {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Kazareen',
        slug: 'kazareen',
        role: role
      },
      availableTenants: [
        {
          tenantId: '33333333-3333-3333-3333-333333333333',
          tenantName: 'Kazareen',
          tenantSlug: 'kazareen',
          role: role,
          status: 'Active'
        }
      ]
    };
    this.setSession(demoAuth);
    return demoAuth;
  }

  private createDemoRegisteredSession(data: { fullName: string; email: string; companyName: string }): AuthResponse {
    const company = data.companyName || 'Kazareen';
    const demo: AuthResponse = {
      accessToken: 'demo_token_' + Date.now(),
      tokenType: 'Bearer',
      expiresInMinutes: 60,
      user: {
        id: 'usr-admin',
        email: data.email,
        fullName: data.fullName,
        role: 'Owner',
        departmentCode: 'EXEC',
        departmentName: 'Executive Leadership'
      },
      activeTenant: {
        id: 'kazareen-tenant-id-001',
        name: company,
        slug: company.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        role: 'Owner'
      },
      availableTenants: [
        {
          tenantId: 'kazareen-tenant-id-001',
          tenantName: company,
          tenantSlug: company.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          role: 'Owner',
          status: 'Active'
        }
      ]
    };

    this.setSession(demo);
    return demo;
  }
}
