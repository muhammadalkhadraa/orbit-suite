import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="not-found-page">
      <!-- Ambient Glow Orbs -->
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>

      <div class="not-found-card glass-panel-elevated">
        <div class="code-badge">
          <span class="badge-code font-mono">404</span>
          <span class="badge-label">RESOURCE NOT LOCATED</span>
        </div>

        <h1 class="not-found-title font-heading-1">
          Lost in Orbit
        </h1>

        <p class="not-found-desc font-body">
          The requested coordinate or view does not exist within the current workspace perimeter, 
          or you may not possess cryptographically verified authorization for this endpoint.
        </p>

        <div class="not-found-actions">
          <a routerLink="/app/dashboard" class="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span>Return to Workspace</span>
          </a>

          <a routerLink="/" class="btn-secondary">
            <span>Platform Overview</span>
          </a>

          <a routerLink="/login" class="btn-secondary btn-sign-in">
            <span>Sign In</span>
          </a>
        </div>

        <div class="quick-links-tray glass-panel">
          <span class="tray-title font-caption">POPULAR DESTINATIONS</span>
          <div class="tray-links">
            <a routerLink="/app/tasks" class="tray-link">Tasks & Projects</a>
            <span class="tray-dot">•</span>
            <a routerLink="/app/crm" class="tray-link">CRM Pipeline</a>
            <span class="tray-dot">•</span>
            <a routerLink="/app/support" class="tray-link">Support Desk</a>
            <span class="tray-dot">•</span>
            <a routerLink="/app/finance" class="tray-link">Invoicing</a>
            <span class="tray-dot">•</span>
            <a routerLink="/app/settings" class="tray-link">Settings</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @use 'styles/variables' as *;
    @use 'styles/mixins' as *;

    .not-found-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      position: relative;
      overflow: hidden;
      background: radial-gradient(circle at 50% 30%, #0d1226 0%, #060911 100%);
    }

    .glow-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(120px);
      pointer-events: none;
      z-index: 0;
      opacity: 0.35;
    }

    .orb-1 {
      width: 480px;
      height: 480px;
      background: radial-gradient(circle, $aurora-indigo, transparent 70%);
      top: -120px;
      left: 20%;
    }

    .orb-2 {
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, $aurora-violet, transparent 70%);
      bottom: -100px;
      right: 25%;
    }

    .not-found-card {
      width: 100%;
      max-width: 580px;
      padding: 3rem 2.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      z-index: 1;

      @include responsive-sm {
        padding: 2rem 1.5rem;
      }
    }

    .code-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.375rem 1rem;
      background: rgba(99, 102, 241, 0.12);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: $radius-full;
      margin-bottom: 1.5rem;

      .badge-code {
        font-size: 1.125rem;
        font-weight: 800;
        color: #a5b4fc;
        letter-spacing: 0.05em;
      }

      .badge-label {
        font-size: 0.6875rem;
        font-weight: 700;
        color: #c7d2fe;
        letter-spacing: 0.08em;
      }
    }

    .not-found-title {
      font-size: 2.5rem;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.15;
      margin-bottom: 1rem;
      background: linear-gradient(135deg, #ffffff 40%, #a5b4fc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;

      @include responsive-sm {
        font-size: 2rem;
      }
    }

    .not-found-desc {
      font-size: 0.9375rem;
      color: $text-secondary;
      line-height: 1.6;
      max-width: 460px;
      margin-bottom: 2rem;
    }

    .not-found-actions {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.875rem;
      flex-wrap: wrap;
      margin-bottom: 2.25rem;

      a {
        text-decoration: none;
      }

      .btn-primary {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.625rem 1.25rem;
      }

      .btn-secondary {
        padding: 0.625rem 1.25rem;
      }
    }

    .quick-links-tray {
      width: 100%;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.625rem;
      background: rgba(255, 255, 255, 0.02);

      .tray-title {
        font-size: 0.6875rem;
        font-weight: 700;
        color: $text-muted;
        letter-spacing: 0.06em;
      }

      .tray-links {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        gap: 0.625rem;

        .tray-link {
          font-size: 0.8125rem;
          color: #a5b4fc;
          text-decoration: none;
          transition: color $transition-fast;

          &:hover {
            color: #ffffff;
            text-decoration: underline;
          }
        }

        .tray-dot {
          color: $text-muted;
          font-size: 0.75rem;
        }
      }
    }
  `]
})
export class NotFoundComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  public isLoggedIn(): boolean {
    return this.authService.isAuthenticated;
  }
}
