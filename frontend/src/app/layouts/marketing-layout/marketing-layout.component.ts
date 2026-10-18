import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-marketing-layout',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="marketing-page">
      <!-- Aurora Gradient Ambient Glows -->
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
      <div class="glow-orb orb-3"></div>

      <!-- Navigation Header -->
      <header class="marketing-header">
        <div class="header-container">
          <div class="brand-logo" routerLink="/">
            <div class="logo-symbol">
              <div class="logo-inner"></div>
            </div>
            <span class="brand-name">Orbit <span class="brand-sub">Suite</span></span>
          </div>

          <nav class="nav-links">
            <a href="#features">Platform</a>
            <a href="#architecture">Multi-Tenancy</a>
            <a href="#modules">Modules</a>
            <a href="#pricing">Pricing</a>
            <a href="#security">Security</a>
          </nav>

          <div class="header-actions">
            <a routerLink="/login" class="btn-secondary">Sign In</a>
            <button (click)="launchQuickDemo('Owner')" class="btn-primary">
              <span>Launch Live Workspace</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      </header>

      <!-- Hero Section -->
      <section class="hero-section">
        <div class="hero-content">
          <div class="hero-badge">
            <span class="badge-dot"></span>
            Enterprise Multi-Tenant SaaS Platform
          </div>

          <h1 class="hero-title font-heading-1">
            One Unified Operating System for <span class="aurora-gradient-text">Modern Enterprises</span>
          </h1>

          <p class="hero-subtitle">
            Seamlessly coordinate organizational hierarchies, role-based workflows, task governance, 
            and cross-functional business operations with cryptographic tenant isolation.
          </p>

          <div class="hero-cta-group">
            <button (click)="launchQuickDemo('Owner')" class="btn-primary btn-lg">
              <span>Enter Workspace as Owner</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
            <button (click)="launchQuickDemo('Manager')" class="btn-secondary btn-lg">
              <span>Test as Manager</span>
            </button>
            <button (click)="launchQuickDemo('Employee')" class="btn-secondary btn-lg">
              <span>Test as Employee</span>
            </button>
          </div>

          <!-- Hero Metrics Bar -->
          <div class="hero-metrics glass-panel">
            <div class="metric-item">
              <div class="metric-value aurora-gradient-text">100%</div>
              <div class="metric-label">Tenant Isolation Guarantee</div>
            </div>
            <div class="metric-divider"></div>
            <div class="metric-item">
              <div class="metric-value">8 Modules</div>
              <div class="metric-label">Unified Modular Monolith</div>
            </div>
            <div class="metric-divider"></div>
            <div class="metric-item">
              <div class="metric-value">4 Tiers</div>
              <div class="metric-label">Strict RBAC Hierarchy</div>
            </div>
            <div class="metric-divider"></div>
            <div class="metric-item">
              <div class="metric-value">REST & EF</div>
              <div class="metric-label">Automated Defense in Depth</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Architecture Highlights Section -->
      <section id="architecture" class="section-container">
        <div class="section-header">
          <div class="badge badge-indigo">Architectural Foundation</div>
          <h2 class="font-heading-2">Designed for Uncompromising Security & Scale</h2>
          <p class="font-body">Zero cross-tenant data leakage enforced at the database, service, and API gateway layers.</p>
        </div>

        <div class="cards-grid">
          <div class="glass-panel feature-card">
            <div class="feature-icon icon-indigo">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <h3 class="font-heading-3">Server-Derived Context</h3>
            <p class="font-body">Client-supplied tenant identifiers are never trusted. Identity is verified against database memberships with cryptographic JWT verification.</p>
          </div>

          <div class="glass-panel feature-card">
            <div class="feature-icon icon-violet">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
            </div>
            <h3 class="font-heading-3">EF Core Global Query Filters</h3>
            <p class="font-body">All tenant-scoped entities implement automatic compile-time query filters, ensuring cross-tenant queries return zero records by default.</p>
          </div>

          <div class="glass-panel feature-card">
            <div class="feature-icon icon-cyan">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <h3 class="font-heading-3">Decoupled Identities</h3>
            <p class="font-body">Authentication users are strictly separated from domain Employee profiles, enabling employment tracking without mandating credential overhead.</p>
          </div>
        </div>
      </section>

      <!-- Modules Suite Section -->
      <section id="modules" class="section-container">
        <div class="section-header">
          <div class="badge badge-cyan">Full Suite Coverage</div>
          <h2 class="font-heading-2">Ten Integrated Enterprise Modules</h2>
          <p class="font-body">Built as a cohesive modular monolith with shared organizational state and cryptographic tenant isolation.</p>
        </div>

        <div class="modules-grid">
          <div class="glass-panel module-card active-module">
            <div class="module-status badge badge-emerald">Phase 6 — Live</div>
            <h3 class="font-heading-3">Tasks & Projects</h3>
            <p class="font-body">Scoped work items with confirmed visibility rules (Employee own tasks, Manager direct reports, Admin company-wide).</p>
          </div>

          <div class="glass-panel module-card active-module">
            <div class="module-status badge badge-emerald">Phase 5 — Live</div>
            <h3 class="font-heading-3">Organization & Employees</h3>
            <p class="font-body">Hierarchical branch and department governance with self-referential reporting chains and role assignments.</p>
          </div>

          <div class="glass-panel module-card active-module">
            <div class="module-status badge badge-emerald">Phase 7 — Live</div>
            <h3 class="font-heading-3">CRM & Sales Pipelines</h3>
            <p class="font-body">6-stage sales funnels, win-loss probabilities, deal value forecasting, and customer relationship governance.</p>
          </div>

          <div class="glass-panel module-card active-module">
            <div class="module-status badge badge-emerald">Phase 8 — Live</div>
            <h3 class="font-heading-3">Customer Support Desk</h3>
            <p class="font-body">Service desk ticketing (TCK-1001), automated SLA response monitoring, priority matrix, and discussion threads.</p>
          </div>

          <div class="glass-panel module-card active-module">
            <div class="module-status badge badge-emerald">Phase 9 — Live</div>
            <h3 class="font-heading-3">Inventory & Procurement</h3>
            <p class="font-body">Multi-location warehouse stock movements, immutable double-entry ledger, supplier catalogs, and reorder levels.</p>
          </div>

          <div class="glass-panel module-card active-module">
            <div class="module-status badge badge-emerald">Phase 10 — Live</div>
            <h3 class="font-heading-3">Manufacturing & Production</h3>
            <p class="font-body">Work centers, multi-component bills of materials (BOM), production runs, and material consumption yields.</p>
          </div>

          <div class="glass-panel module-card active-module">
            <div class="module-status badge badge-emerald">Phase 11 — Live</div>
            <h3 class="font-heading-3">HR & Attendance</h3>
            <p class="font-body">Self-service digital time clock, supervisory leave request workflows, shift rotas, and departmental reporting.</p>
          </div>

          <div class="glass-panel module-card active-module">
            <div class="module-status badge badge-emerald">Phase 12 — Live</div>
            <h3 class="font-heading-3">Invoicing & Accounting</h3>
            <p class="font-body">High-integrity ledger controls, invoice posting (INV-YYYY-XXXX), tax calculation rules, and payment receipts.</p>
          </div>

          <div class="glass-panel module-card active-module">
            <div class="module-status badge badge-emerald">Phase 13 — Live</div>
            <h3 class="font-heading-3">Reports & Analytics</h3>
            <p class="font-body">Cross-domain telemetry dashboards, operational KPI charts, and on-demand CSV & JSON file exports.</p>
          </div>

          <div class="glass-panel module-card active-module">
            <div class="module-status badge badge-emerald">Phase 14 — Live</div>
            <h3 class="font-heading-3">Audit Trail & Security</h3>
            <p class="font-body">Forensic chronological event ledger, client IP and user agent tracking, and raw payload inspection.</p>
          </div>
        </div>
      </section>

      <!-- Pricing & Subscription Plans Section -->
      <section id="pricing" class="section-container">
        <div class="section-header">
          <div class="badge badge-amber">Predictable Enterprise Value</div>
          <h2 class="font-heading-2">Transparent Pricing Built for Hyper-Growth</h2>
          <p class="font-body">No hidden fees, no per-module add-ons. Full suite features with instant provisioning.</p>

          <div class="pricing-toggle-wrap">
            <span class="cycle-text" [class.active-cycle]="!annualBilling">Monthly Billing</span>
            <button class="pricing-switch" (click)="toggleBilling()" [class.annual-on]="annualBilling">
              <span class="switch-knob"></span>
            </button>
            <span class="cycle-text" [class.active-cycle]="annualBilling">
              Annual Billing <span class="badge badge-emerald save-chip">Save 20%</span>
            </span>
          </div>
        </div>

        <div class="pricing-cards-grid">
          <!-- Starter Tier -->
          <div class="glass-panel pricing-tier-card">
            <div class="tier-top">
              <span class="tier-name font-heading-3">Starter</span>
              <p class="tier-desc font-caption">Foundational organizational governance for agile teams</p>
            </div>

            <div class="tier-price-box">
              <span class="curr font-mono">$</span>
              <span class="val font-mono">{{ annualBilling ? 24 : 29 }}</span>
              <span class="term font-caption">/ mo</span>
            </div>
            <div class="bill-note font-caption" *ngIf="annualBilling">Billed $288 annually</div>

            <div class="features-checklist">
              <div class="feature-row">
                <svg class="check-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Up to 5 authenticated team seats</span>
              </div>
              <div class="feature-row">
                <svg class="check-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Tasks & Kanban project board</span>
              </div>
              <div class="feature-row">
                <svg class="check-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Decoupled Employee Directory</span>
              </div>
              <div class="feature-row">
                <svg class="check-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                <span>10 GB Encrypted Blob Storage</span>
              </div>
            </div>

            <button (click)="launchQuickDemo('Employee')" class="btn-secondary w-full">
              <span>Start Free Starter Demo</span>
            </button>
          </div>

          <!-- Professional Tier -->
          <div class="glass-panel pricing-tier-card featured-pricing-card">
            <div class="popular-ribbon">MOST POPULAR</div>
            <div class="tier-top">
              <span class="tier-name font-heading-3">Professional</span>
              <p class="tier-desc font-caption">Full-spectrum business suite with multi-facility support</p>
            </div>

            <div class="tier-price-box">
              <span class="curr font-mono">$</span>
              <span class="val font-mono">{{ annualBilling ? 79 : 99 }}</span>
              <span class="term font-caption">/ mo</span>
            </div>
            <div class="bill-note font-caption" *ngIf="annualBilling">Billed $948 annually</div>

            <div class="features-checklist">
              <div class="feature-row">
                <svg class="check-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Up to 15 authenticated team seats</span>
              </div>
              <div class="feature-row">
                <svg class="check-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                <span>CRM & 6-Stage Deal Pipelines</span>
              </div>
              <div class="feature-row">
                <svg class="check-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Customer Support Ticketing & SLAs</span>
              </div>
              <div class="feature-row">
                <svg class="check-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Multi-Branch Inventory & Ledger</span>
              </div>
              <div class="feature-row">
                <svg class="check-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Invoicing & Accounting Statements</span>
              </div>
              <div class="feature-row">
                <svg class="check-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                <span>50 GB Encrypted Storage</span>
              </div>
            </div>

            <button (click)="launchQuickDemo('Manager')" class="btn-primary w-full">
              <span>Launch Professional Demo</span>
            </button>
          </div>

          <!-- Enterprise Tier -->
          <div class="glass-panel pricing-tier-card">
            <div class="tier-top">
              <span class="tier-name font-heading-3">Enterprise Scale</span>
              <p class="tier-desc font-caption">Maximum security, manufacturing runs, and forensic audit</p>
            </div>

            <div class="tier-price-box">
              <span class="curr font-mono">$</span>
              <span class="val font-mono">{{ annualBilling ? 199 : 249 }}</span>
              <span class="term font-caption">/ mo</span>
            </div>
            <div class="bill-note font-caption" *ngIf="annualBilling">Billed $2,388 annually</div>

            <div class="features-checklist">
              <div class="feature-row">
                <svg class="check-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Up to 50 authenticated team seats</span>
              </div>
              <div class="feature-row">
                <svg class="check-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Manufacturing & BOM Recipes</span>
              </div>
              <div class="feature-row">
                <svg class="check-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Digital Time Clock & Leave Approvals</span>
              </div>
              <div class="feature-row">
                <svg class="check-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Executive Telemetry & Exporter</span>
              </div>
              <div class="feature-row">
                <svg class="check-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Forensic Security Audit Ledger</span>
              </div>
              <div class="feature-row">
                <svg class="check-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                <span>250 GB Encrypted Storage + 99.99% SLA</span>
              </div>
            </div>

            <button (click)="launchQuickDemo('Owner')" class="btn-primary w-full">
              <span>Launch Enterprise Demo</span>
            </button>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="marketing-footer">
        <div class="footer-container">
          <div class="footer-brand">
            <span class="brand-name">Orbit <span class="brand-sub">Suite</span></span>
            <p class="font-caption">Enterprise Multi-Tenant SaaS Business Management Platform</p>
          </div>
          <div class="footer-links">
            <a routerLink="/login">Sign In</a>
            <a routerLink="/register">Register Company</a>
            <a routerLink="/app/tasks">Task Management</a>
            <a routerLink="/app/organization">Organization</a>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    @use 'styles/variables' as *;
    @use 'styles/mixins' as *;

    .marketing-page {
      position: relative;
      overflow-x: hidden;
      min-height: 100vh;
      color: $text-primary;
    }

    // Aurora Glowing Orbs
    .glow-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(120px);
      pointer-events: none;
      z-index: 0;
      opacity: 0.45;
    }

    .orb-1 {
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, $aurora-indigo, transparent 70%);
      top: -100px;
      left: 10%;
    }

    .orb-2 {
      width: 450px;
      height: 450px;
      background: radial-gradient(circle, $aurora-violet, transparent 70%);
      top: 200px;
      right: 5%;
    }

    .orb-3 {
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, $aurora-cyan, transparent 70%);
      top: 60%;
      left: 30%;
    }

    // Header
    .marketing-header {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(6, 9, 17, 0.75);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid $border-glass;
    }

    .header-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .brand-logo {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
      cursor: pointer;
    }

    .logo-symbol {
      width: 34px;
      height: 34px;
      border-radius: $radius-md;
      background: linear-gradient(135deg, $aurora-indigo 0%, $aurora-violet 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 15px rgba(99, 102, 241, 0.5);
    }

    .logo-inner {
      width: 14px;
      height: 14px;
      border: 2px solid #ffffff;
      border-radius: 50%;
    }

    .brand-name {
      font-size: 1.25rem;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.02em;
    }

    .brand-sub {
      color: #a5b4fc;
      font-weight: 400;
    }

    .nav-links {
      display: flex;
      gap: 2rem;

      a {
        color: $text-secondary;
        text-decoration: none;
        font-size: 0.875rem;
        font-weight: 500;
        transition: color $transition-fast;

        &:hover {
          color: #ffffff;
        }
      }

      @include responsive-md {
        display: none;
      }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    // Hero Section
    .hero-section {
      position: relative;
      z-index: 1;
      padding: 5rem 1.5rem 4rem;
      display: flex;
      justify-content: center;
      text-align: center;
    }

    .hero-content {
      max-width: 900px;
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 1rem;
      background: rgba(99, 102, 241, 0.12);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: $radius-full;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #a5b4fc;
      margin-bottom: 1.75rem;
    }

    .badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: $aurora-indigo;
      box-shadow: 0 0 8px $aurora-indigo;
    }

    .hero-title {
      font-size: 3.5rem;
      line-height: 1.15;
      font-weight: 800;
      margin-bottom: 1.5rem;

      @include responsive-sm {
        font-size: 2.25rem;
      }
    }

    .hero-subtitle {
      font-size: 1.125rem;
      line-height: 1.6;
      color: $text-secondary;
      margin-bottom: 2.5rem;
      max-width: 720px;
      margin-left: auto;
      margin-right: auto;
    }

    .hero-cta-group {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      margin-bottom: 3.5rem;
      flex-wrap: wrap;

      .btn-lg {
        padding: 0.875rem 1.75rem;
        font-size: 0.9375rem;
      }
    }

    .hero-metrics {
      display: flex;
      align-items: center;
      justify-content: space-around;
      padding: 1.75rem 2rem;
      max-width: 850px;
      margin: 0 auto;

      @include responsive-sm {
        flex-direction: column;
        gap: 1.5rem;
      }
    }

    .metric-item {
      text-align: center;
    }

    .metric-value {
      font-size: 1.75rem;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 0.25rem;
    }

    .metric-label {
      font-size: 0.8125rem;
      color: $text-muted;
    }

    .metric-divider {
      width: 1px;
      height: 40px;
      background: $border-glass;

      @include responsive-sm {
        display: none;
      }
    }

    // Sections
    .section-container {
      position: relative;
      z-index: 1;
      max-width: 1200px;
      margin: 0 auto;
      padding: 5rem 1.5rem;
    }

    .section-header {
      text-align: center;
      margin-bottom: 3.5rem;

      .badge {
        margin-bottom: 1rem;
      }

      h2 {
        margin-bottom: 0.75rem;
      }

      p {
        max-width: 600px;
        margin: 0 auto;
      }
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
    }

    .feature-card {
      padding: 2rem;
      transition: all $transition-normal;

      &:hover {
        transform: translateY(-4px);
        border-color: $border-glass-hover;
      }

      .feature-icon {
        width: 48px;
        height: 48px;
        border-radius: $radius-md;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 1.25rem;

        &.icon-indigo {
          background: rgba(99, 102, 241, 0.15);
          color: #a5b4fc;
        }

        &.icon-violet {
          background: rgba(139, 92, 246, 0.15);
          color: #c084fc;
        }

        &.icon-cyan {
          background: rgba(6, 182, 212, 0.15);
          color: #67e8f9;
        }
      }

      h3 {
        margin-bottom: 0.75rem;
      }
    }

    .modules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1.25rem;
    }

    .module-card {
      padding: 1.5rem;
      position: relative;
      transition: all $transition-fast;

      &:hover {
        border-color: $border-glass-hover;
      }

      &.active-module {
        border-color: rgba(16, 185, 129, 0.3);
      }

      .module-status {
        margin-bottom: 0.875rem;
      }

      h3 {
        margin-bottom: 0.5rem;
        font-size: 1.125rem;
      }
    }

    // Pricing Section
    .pricing-toggle-wrap {
      display: inline-flex;
      align-items: center;
      gap: 0.875rem;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 0.5rem 1.25rem;
      border-radius: $radius-full;
      margin-top: 1.5rem;

      .cycle-text {
        font-size: 0.875rem;
        color: $text-muted;
        transition: color $transition-fast;

        &.active-cycle {
          color: $text-primary;
          font-weight: 600;
        }
      }

      .save-chip {
        font-size: 0.6875rem;
        margin-left: 0.375rem;
      }

      .pricing-switch {
        width: 44px;
        height: 24px;
        background: rgba(255, 255, 255, 0.15);
        border: none;
        border-radius: 12px;
        cursor: pointer;
        position: relative;
        transition: background $transition-fast;

        &.annual-on {
          background: $aurora-emerald;

          .switch-knob {
            transform: translateX(20px);
          }
        }

        .switch-knob {
          display: block;
          width: 18px;
          height: 18px;
          background: #ffffff;
          border-radius: 50%;
          position: absolute;
          top: 3px;
          left: 3px;
          transition: transform $transition-fast;
        }
      }
    }

    .pricing-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.5rem;
      margin-top: 2rem;
    }

    .pricing-tier-card {
      padding: 2.25rem;
      display: flex;
      flex-direction: column;
      position: relative;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: $radius-lg;
      transition: all $transition-fast;

      &:hover {
        transform: translateY(-4px);
        border-color: rgba(255, 255, 255, 0.2);
      }

      &.featured-pricing-card {
        border-color: rgba($aurora-indigo, 0.7);
        box-shadow: 0 10px 40px rgba($aurora-indigo, 0.2);
        background: linear-gradient(180deg, rgba($aurora-indigo, 0.08) 0%, rgba(13, 19, 33, 0.8) 100%);
      }

      .popular-ribbon {
        position: absolute;
        top: -12px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(90deg, $aurora-indigo, $aurora-violet);
        color: #ffffff;
        font-size: 0.6875rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        padding: 0.25rem 0.875rem;
        border-radius: $radius-full;
        box-shadow: 0 0 12px rgba(99, 102, 241, 0.5);
      }

      .tier-top {
        margin-bottom: 1.25rem;

        .tier-name {
          font-size: 1.5rem;
          font-weight: 700;
          color: $text-primary;
          margin-bottom: 0.375rem;
        }

        .tier-desc {
          color: $text-secondary;
          line-height: 1.4;
        }
      }

      .tier-price-box {
        display: flex;
        align-items: baseline;
        gap: 0.25rem;
        margin-bottom: 0.25rem;

        .curr {
          font-size: 1.5rem;
          color: $text-secondary;
        }

        .val {
          font-size: 2.75rem;
          font-weight: 800;
          color: #ffffff;
          line-height: 1;
        }

        .term {
          font-size: 0.875rem;
          color: $text-muted;
        }
      }

      .bill-note {
        color: $aurora-emerald;
        margin-bottom: 1.25rem;
      }

      .features-checklist {
        display: flex;
        flex-direction: column;
        gap: 0.875rem;
        margin: 1.5rem 0 2rem 0;
        flex-grow: 1;

        .feature-row {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          font-size: 0.875rem;
          color: $text-secondary;

          .check-svg {
            color: $aurora-emerald;
            flex-shrink: 0;
          }
        }
      }
    }

    .w-full {
      width: 100%;
    }

    // Footer
    .marketing-footer {
      border-top: 1px solid $border-glass;
      background: rgba(6, 9, 17, 0.9);
      padding: 3rem 1.5rem;
      position: relative;
      z-index: 1;
    }

    .footer-container {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;

      @include responsive-sm {
        flex-direction: column;
        gap: 1.5rem;
        text-align: center;
      }
    }

    .footer-links {
      display: flex;
      gap: 1.5rem;

      a {
        color: $text-secondary;
        text-decoration: none;
        font-size: 0.875rem;
        transition: color $transition-fast;

        &:hover {
          color: #ffffff;
        }
      }
    }
  `]
})
export class MarketingLayoutComponent {
  public annualBilling = true;

  constructor(private authService: AuthService, private router: Router) {}

  public toggleBilling(): void {
    this.annualBilling = !this.annualBilling;
  }

  public launchQuickDemo(role: 'Owner' | 'Manager' | 'Employee'): void {
    this.authService.loginAsDemoRole(role);
    this.router.navigate(['/app/tasks']);
  }
}
