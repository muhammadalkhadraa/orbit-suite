import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card glass-panel-elevated">
        <div class="card-header">
          <div class="logo-symbol" routerLink="/">
            <div class="logo-inner"></div>
          </div>
          <h1 class="font-heading-2">Create Tenant Workspace</h1>
          <p class="font-caption">Provision your independent multi-tenant enterprise</p>
        </div>

        <form (ngSubmit)="onSubmit()" class="auth-form">
          <div *ngIf="errorMessage" class="error-banner">
            {{ errorMessage }}
          </div>

          <div class="form-group">
            <label for="companyName">Company / Organization Legal Name</label>
            <input 
              id="companyName" 
              type="text" 
              [(ngModel)]="companyName" 
              name="companyName" 
              placeholder="e.g. Apex Global Logistics Inc." 
              required 
            />
          </div>

          <div class="form-group">
            <label for="fullName">Your Full Name (Executive Owner)</label>
            <input 
              id="fullName" 
              type="text" 
              [(ngModel)]="fullName" 
              name="fullName" 
              placeholder="e.g. Alexander Vance" 
              required 
            />
          </div>

          <div class="form-group">
            <label for="email">Work Email</label>
            <input 
              id="email" 
              type="email" 
              [(ngModel)]="email" 
              name="email" 
              placeholder="alexander@apexlogistics.com" 
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
              placeholder="Minimum 6 characters" 
              required 
            />
          </div>

          <button type="submit" class="btn-primary btn-block" [disabled]="loading">
            <span *ngIf="!loading">Provision Tenant & Launch Suite</span>
            <span *ngIf="loading">Creating Company Workspace...</span>
          </button>
        </form>

        <div class="card-footer">
          <span>Already have an account?</span>
          <a routerLink="/login">Sign in</a>
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
      max-width: 480px;
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
export class RegisterComponent {
  public companyName = '';
  public fullName = '';
  public email = '';
  public password = '';
  public loading = false;
  public errorMessage: string | null = null;

  constructor(private authService: AuthService, private router: Router) {}

  public onSubmit(): void {
    if (!this.companyName || !this.fullName || !this.email || !this.password) {
      this.errorMessage = 'All fields are required to establish an organization tenant.';
      return;
    }

    this.loading = true;
    this.errorMessage = null;

    this.authService.register({
      companyName: this.companyName,
      fullName: this.fullName,
      email: this.email,
      password: this.password
    }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/app/dashboard']);
      },
      error: err => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Tenant registration failed. Please try again.';
      }
    });
  }
}
