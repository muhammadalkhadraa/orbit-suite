import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card glass-panel-elevated">
        <div class="card-header">
          <div class="logo-symbol" routerLink="/">
            <div class="logo-inner"></div>
          </div>
          <h1 class="font-heading-2">Sign in to Orbit</h1>
          <p class="font-caption">Unified Multi-Tenant Business Management Suite</p>
        </div>

        <form (ngSubmit)="onSubmit()" class="auth-form">
          <div *ngIf="errorMessage" class="error-banner">
            {{ errorMessage }}
          </div>

          <div class="form-group">
            <label for="email">Work Email</label>
            <input 
              id="email" 
              type="email" 
              [(ngModel)]="email" 
              name="email" 
              placeholder="alex.morgan@orbitbusiness.io" 
              required 
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input 
              id="password" 
              type="password" 
              [(ngModel)]="password" 
              name="password" 
              placeholder="••••••••••••" 
              required 
            />
          </div>

          <button type="submit" class="btn-primary btn-block" [disabled]="loading">
            <span *ngIf="!loading">Authenticate & Enter Workspace</span>
            <span *ngIf="loading">Validating Credentials...</span>
          </button>
        </form>

        <div class="auth-divider">
          <span>OR TEST WITH INSTANT ROLES</span>
        </div>

        <!-- Quick 1-Click Demo Buttons -->
        <div class="demo-role-buttons">
          <button (click)="quickLogin('Owner')" class="btn-secondary role-quick-btn">
            <div class="quick-icon">👑</div>
            <div class="quick-info">
              <span class="quick-title">Company Owner</span>
              <span class="quick-desc">Full tenant governance</span>
            </div>
          </button>

          <button (click)="quickLogin('Manager')" class="btn-secondary role-quick-btn">
            <div class="quick-icon">📊</div>
            <div class="quick-info">
              <span class="quick-title">Department Manager</span>
              <span class="quick-desc">Team task supervision</span>
            </div>
          </button>

          <button (click)="quickLogin('Employee')" class="btn-secondary role-quick-btn">
            <div class="quick-icon">👤</div>
            <div class="quick-info">
              <span class="quick-title">Standard Employee</span>
              <span class="quick-desc">Personal assigned scope</span>
            </div>
          </button>
        </div>

        <div class="card-footer">
          <span>Need to register a company?</span>
          <a routerLink="/register">Create new tenant account</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @use 'styles/variables' as *;
    @use 'styles/mixins' as *;

    .auth-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }

    .auth-card {
      width: 100%;
      max-width: 440px;
      padding: 2.25rem;
    }

    .card-header {
      text-align: center;
      margin-bottom: 2rem;

      .logo-symbol {
        width: 40px;
        height: 40px;
        margin: 0 auto 1rem;
        border-radius: $radius-md;
        background: linear-gradient(135deg, $aurora-indigo 0%, $aurora-violet 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 15px rgba(99, 102, 241, 0.5);
        cursor: pointer;

        .logo-inner {
          width: 16px;
          height: 16px;
          border: 2px solid #ffffff;
          border-radius: 50%;
        }
      }

      h1 {
        margin-bottom: 0.25rem;
      }
    }

    .error-banner {
      background: rgba(244, 63, 94, 0.15);
      border: 1px solid rgba(244, 63, 94, 0.3);
      color: #fda4af;
      padding: 0.75rem;
      border-radius: $radius-md;
      font-size: 0.8125rem;
      margin-bottom: 1rem;
    }

    .btn-block {
      width: 100%;
      padding: 0.75rem;
      margin-top: 0.5rem;
    }

    .auth-divider {
      text-align: center;
      margin: 1.75rem 0 1.25rem;
      position: relative;

      &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 1px;
        background: $border-glass;
        z-index: 0;
      }

      span {
        position: relative;
        background: #111827;
        padding: 0 0.75rem;
        font-size: 0.6875rem;
        font-weight: 700;
        color: $text-muted;
        letter-spacing: 0.05em;
        z-index: 1;
      }
    }

    .demo-role-buttons {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }

    .role-quick-btn {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 0.875rem;
      text-align: left;
      width: 100%;

      .quick-icon {
        font-size: 1.25rem;
      }

      .quick-info {
        display: flex;
        flex-direction: column;

        .quick-title {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #ffffff;
        }

        .quick-desc {
          font-size: 0.6875rem;
          color: $text-muted;
        }
      }
    }

    .card-footer {
      text-align: center;
      font-size: 0.8125rem;
      color: $text-secondary;
      margin-top: 1.5rem;

      a {
        color: #a5b4fc;
        text-decoration: none;
        font-weight: 500;
        margin-left: 0.375rem;

        &:hover {
          text-decoration: underline;
        }
      }
    }
  `]
})
export class LoginComponent {
  public email = 'admin@kazareen.com';
  public password = 'Password123!';
  public loading = false;
  public errorMessage: string | null = null;

  constructor(private authService: AuthService, private router: Router) {}

  public onSubmit(): void {
    this.loading = true;
    this.errorMessage = null;

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/app/hr']);
      },
      error: err => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Authentication failed. Please verify credentials.';
      }
    });
  }

  public quickLogin(role: 'Owner' | 'Manager' | 'Employee'): void {
    if (role === 'Owner') {
      this.email = 'admin@kazareen.com';
    } else if (role === 'Manager') {
      this.email = 'amr@kazareen.com';
    } else {
      this.email = 'abdelrazik@kazareen.com';
    }
    this.password = 'Password123!';
    this.loading = true;
    this.errorMessage = null;

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/app/hr']);
      },
      error: () => {
        this.loading = false;
        this.authService.loginAsDemoRole(role);
        this.router.navigate(['/app/hr']);
      }
    });
  }
}
