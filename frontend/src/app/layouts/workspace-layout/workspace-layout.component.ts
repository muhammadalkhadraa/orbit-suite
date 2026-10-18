import { Component, HostListener, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { TenantRole } from '../../core/models/models';

export interface CommandPaletteItem {
  id: string;
  category: 'Navigation' | 'Action' | 'Resource';
  title: string;
  subtitle?: string;
  icon: string;
  badgeClass?: string;
  action: () => void;
}

@Component({
  selector: 'app-workspace-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  template: `
    <div class="workspace-container">
      <!-- Sidebar Navigation -->
      <aside class="workspace-sidebar" [class.open]="mobileSidebarOpen">
        <div class="sidebar-header">
          <div class="brand-badge" routerLink="/app/dashboard">
            <div class="brand-symbol">
              <div class="inner-circle"></div>
            </div>
            <div class="brand-text">
              <span class="app-title">Orbit Suite</span>
              <span class="app-version">Enterprise v1.0</span>
            </div>
          </div>
        </div>

        <!-- Active Tenant Context Badge -->
        <div class="tenant-context-card">
          <div class="tenant-label">ACTIVE COMPANY</div>
          <div class="tenant-name" *ngIf="activeTenant$ | async as tenant">
            {{ tenant.name }}
          </div>
          <div class="role-indicator" *ngIf="activeTenant$ | async as tenant">
            <span class="badge" [ngClass]="getRoleBadgeClass(tenant.role)">
              Role: {{ tenant.role }}
            </span>
          </div>
        </div>

        <!-- Role Testing Bar -->
        <div class="demo-role-switcher">
          <div class="switcher-title">Instant Role Preview</div>
          <div class="role-pill-group">
            <button (click)="switchRole('Owner')" class="role-pill" [class.active]="(activeTenant$ | async)?.role === 'Owner'">Owner</button>
            <button (click)="switchRole('Manager')" class="role-pill" [class.active]="(activeTenant$ | async)?.role === 'Manager'">Manager</button>
            <button (click)="switchRole('Employee')" class="role-pill" [class.active]="(activeTenant$ | async)?.role === 'Employee'">Employee</button>
          </div>
        </div>

        <!-- Navigation Menu -->
        <nav class="sidebar-nav">
          <div class="nav-section-title">CORE OPERATIONS</div>

          <a routerLink="/app/dashboard" routerLinkActive="active" (click)="closeMobile()" class="nav-item">
            <svg class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            <span>Dashboard</span>
          </a>

          <a routerLink="/app/tasks" routerLinkActive="active" (click)="closeMobile()" class="nav-item">
            <svg class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            <span>Tasks & Projects</span>
            <span class="nav-tag badge-emerald">Live</span>
          </a>

          <a routerLink="/app/employees" routerLinkActive="active" (click)="closeMobile()" class="nav-item">
            <svg class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span>Employees</span>
            <span class="nav-tag badge-emerald">Live</span>
          </a>

          <a routerLink="/app/organization" routerLinkActive="active" (click)="closeMobile()" class="nav-item">
            <svg class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
            <span>Organization</span>
            <span class="nav-tag badge-emerald">Live</span>
          </a>

          <div class="nav-section-title">BUSINESS SUITE MODULES</div>

          <a routerLink="/app/crm" routerLinkActive="active" (click)="closeMobile()" class="nav-item">
            <svg class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
            <span>CRM & Sales</span>
            <span class="nav-tag badge-emerald">Live</span>
          </a>

          <a routerLink="/app/support" routerLinkActive="active" (click)="closeMobile()" class="nav-item">
            <svg class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span>Customer Support</span>
            <span class="nav-tag badge-emerald">Live</span>
          </a>

          <a routerLink="/app/inventory" routerLinkActive="active" (click)="closeMobile()" class="nav-item">
            <svg class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            <span>Inventory & Purchasing</span>
            <span class="nav-tag badge-emerald">Live</span>
          </a>

          <a routerLink="/app/manufacturing" routerLinkActive="active" (click)="closeMobile()" class="nav-item">
            <svg class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span>Manufacturing</span>
            <span class="nav-tag badge-emerald">Live</span>
          </a>

          <a routerLink="/app/hr" routerLinkActive="active" (click)="closeMobile()" class="nav-item">
            <svg class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
            <span>HR & Attendance</span>
            <span class="nav-tag badge-emerald">Live</span>
          </a>

          <a routerLink="/app/finance" routerLinkActive="active" (click)="closeMobile()" class="nav-item">
            <svg class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <span>Invoicing & Accounting</span>
            <span class="nav-tag badge-emerald">Live</span>
          </a>

          <a routerLink="/app/reports" routerLinkActive="active" (click)="closeMobile()" class="nav-item">
            <svg class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            <span>Reports & Dashboards</span>
            <span class="nav-tag badge-emerald">Live</span>
          </a>

          <div class="nav-section-title">SECURITY & GOVERNANCE</div>

          <a routerLink="/app/audit" routerLinkActive="active" (click)="closeMobile()" class="nav-item">
            <svg class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>Audit Trail</span>
            <span class="nav-tag badge-cyan">Admin</span>
          </a>

          <a routerLink="/app/settings" routerLinkActive="active" (click)="closeMobile()" class="nav-item">
            <svg class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span>Workspace Settings</span>
            <span class="nav-tag badge-violet">Config</span>
          </a>

          <a routerLink="/app/billing" routerLinkActive="active" (click)="closeMobile()" class="nav-item">
            <svg class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            <span>Plans & Billing</span>
            <span class="nav-tag badge-amber">Pro</span>
          </a>
        </nav>
      </aside>

      <!-- Main Shell Area -->
      <div class="workspace-main">
        <!-- Top App Header -->
        <header class="workspace-header">
          <div class="header-left">
            <button class="mobile-menu-btn" (click)="toggleMobileSidebar()">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div class="breadcrumb-trail">
              <span class="crumb-root">Orbit Workspace</span>
              <span class="crumb-separator">/</span>
              <span class="crumb-tenant" *ngIf="activeTenant$ | async as tenant">{{ tenant.name }}</span>
            </div>
          </div>

          <!-- Global Command Palette Search Trigger Button -->
          <button class="command-palette-trigger" (click)="openCommandPalette()" title="Search workspace or jump to... (Ctrl+K)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <span class="trigger-label">Search workspace or jump to...</span>
            <kbd class="key-shortcut">Ctrl K</kbd>
          </button>

          <div class="header-right">
            <!-- Tenant Switcher Dropdown -->
            <div class="tenant-selector" *ngIf="(availableTenants$ | async)?.length">
              <select [value]="(activeTenant$ | async)?.id" (change)="onTenantSelect($event)">
                <option *ngFor="let t of availableTenants$ | async" [value]="t.tenantId">
                  🏢 {{ t.tenantName }} ({{ t.role }})
                </option>
              </select>
            </div>

            <!-- User Menu -->
            <div class="user-profile-menu">
              <div class="user-avatar">
                {{ getUserInitials() }}
              </div>
              <div class="user-details">
                <span class="user-name">{{ (currentUser$ | async)?.fullName || 'Authorized User' }}</span>
                <span class="user-email">{{ (currentUser$ | async)?.email }}</span>
              </div>
              <button (click)="logout()" class="btn-logout" title="Sign out">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </button>
            </div>
          </div>
        </header>

        <!-- Dynamic Content Router Area -->
        <main class="workspace-content">
          <router-outlet></router-outlet>
        </main>

        <!-- Global Command Palette Modal Overlay -->
        <div *ngIf="commandPaletteOpen" class="command-palette-overlay" (click)="closeCommandPalette()">
          <div class="command-palette-modal glass-panel-elevated" (click)="$event.stopPropagation()">
            <div class="palette-input-wrapper">
              <svg class="palette-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input 
                #paletteInput
                type="text" 
                class="palette-input" 
                [(ngModel)]="paletteQuery" 
                (input)="filterPaletteItems()" 
                (keydown)="onPaletteKeydown($event)"
                placeholder="Type a command, page, employee, or task..." 
                autofocus 
              />
              <button class="palette-esc-btn" (click)="closeCommandPalette()">ESC</button>
            </div>

            <div class="palette-results">
              <div *ngIf="filteredPaletteItems.length === 0" class="palette-empty">
                No matching actions or resources found for "{{ paletteQuery }}".
              </div>

              <div 
                *ngFor="let item of filteredPaletteItems; let i = index" 
                class="palette-item" 
                [class.active]="selectedPaletteIndex === i"
                (click)="executePaletteItem(item)"
                (mouseenter)="selectedPaletteIndex = i"
              >
                <div class="item-icon-box">{{ item.icon }}</div>
                <div class="item-info">
                  <div class="item-title">{{ item.title }}</div>
                  <div class="item-subtitle" *ngIf="item.subtitle">{{ item.subtitle }}</div>
                </div>
                <span class="badge" [ngClass]="item.badgeClass || 'badge-indigo'">{{ item.category }}</span>
              </div>
            </div>

            <div class="palette-footer">
              <span><kbd>↑</kbd> <kbd>↓</kbd> Navigate</span>
              <span><kbd>↵</kbd> Select</span>
              <span><kbd>esc</kbd> Close</span>
            </div>
          </div>
        </div>

        <!-- Floating Reactive Toast Notifications -->
        <div class="toast-overlay" *ngIf="toasts$ | async as toasts">
          <div *ngFor="let toast of toasts" class="toast-item glass-panel-elevated" [ngClass]="'toast-' + toast.type">
            <div class="toast-icon-box">
              <span *ngIf="toast.type === 'success'">✓</span>
              <span *ngIf="toast.type === 'error'">✕</span>
              <span *ngIf="toast.type === 'warning'">⚠️</span>
              <span *ngIf="toast.type === 'info'">ℹ️</span>
            </div>
            <div class="toast-info">
              <div class="toast-title-text">{{ toast.title }}</div>
              <div class="toast-message-text" *ngIf="toast.message">{{ toast.message }}</div>
            </div>
            <button class="toast-close-btn" (click)="dismissToast(toast.id)">×</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @use 'styles/variables' as *;
    @use 'styles/mixins' as *;

    .workspace-container {
      display: flex;
      min-height: 100vh;
      background-color: $bg-void;
    }

    // Sidebar
    .workspace-sidebar {
      width: 270px;
      min-width: 270px;
      background: rgba(11, 15, 25, 0.95);
      border-right: 1px solid $border-glass;
      display: flex;
      flex-direction: column;
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
      z-index: 40;
      transition: transform $transition-fast;

      @include responsive-lg {
        position: fixed;
        left: 0;
        top: 0;
        bottom: 0;
        transform: translateX(-100%);

        &.open {
          transform: translateX(0);
          box-shadow: 10px 0 30px rgba(0, 0, 0, 0.8);
        }
      }
    }

    .sidebar-header {
      padding: 1.25rem 1.25rem 1rem;
      border-bottom: 1px solid $border-glass;
    }

    .brand-badge {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
    }

    .brand-symbol {
      width: 32px;
      height: 32px;
      border-radius: $radius-md;
      background: linear-gradient(135deg, $aurora-indigo 0%, $aurora-violet 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 12px rgba(99, 102, 241, 0.4);
    }

    .inner-circle {
      width: 12px;
      height: 12px;
      border: 2px solid #ffffff;
      border-radius: 50%;
    }

    .brand-text {
      display: flex;
      flex-direction: column;

      .app-title {
        font-size: 1.125rem;
        font-weight: 700;
        color: #ffffff;
        line-height: 1.2;
      }

      .app-version {
        font-size: 0.6875rem;
        color: #a5b4fc;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
    }

    .tenant-context-card {
      margin: 1rem 1rem 0.5rem;
      padding: 0.875rem 1rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid $border-glass;
      border-radius: $radius-md;

      .tenant-label {
        font-size: 0.6875rem;
        color: $text-muted;
        font-weight: 600;
        letter-spacing: 0.06em;
        margin-bottom: 0.25rem;
      }

      .tenant-name {
        font-size: 0.9375rem;
        font-weight: 600;
        color: #ffffff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 0.5rem;
      }
    }

    // Role Switcher for live testing
    .demo-role-switcher {
      margin: 0.25rem 1rem 1rem;
      padding: 0.75rem;
      background: rgba(99, 102, 241, 0.07);
      border: 1px dashed rgba(99, 102, 241, 0.3);
      border-radius: $radius-md;

      .switcher-title {
        font-size: 0.6875rem;
        color: #a5b4fc;
        font-weight: 600;
        text-transform: uppercase;
        margin-bottom: 0.375rem;
      }

      .role-pill-group {
        display: flex;
        gap: 0.375rem;

        .role-pill {
          flex: 1;
          padding: 0.25rem 0.5rem;
          font-size: 0.6875rem;
          font-weight: 600;
          color: $text-secondary;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid transparent;
          border-radius: $radius-sm;
          cursor: pointer;
          transition: all $transition-fast;

          &:hover {
            color: #ffffff;
            background: rgba(255, 255, 255, 0.1);
          }

          &.active {
            background: $aurora-indigo;
            color: #ffffff;
            box-shadow: 0 0 8px rgba(99, 102, 241, 0.5);
          }
        }
      }
    }

    // Nav List
    .sidebar-nav {
      flex: 1;
      padding: 0 0.75rem 1.5rem;
      overflow-y: auto;

      .nav-section-title {
        font-size: 0.6875rem;
        font-weight: 700;
        color: $text-muted;
        letter-spacing: 0.08em;
        padding: 0.875rem 0.75rem 0.375rem;
      }

      .nav-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.625rem 0.75rem;
        color: $text-secondary;
        text-decoration: none;
        font-size: 0.875rem;
        font-weight: 500;
        border-radius: $radius-md;
        margin-bottom: 0.125rem;
        transition: all $transition-fast;

        .nav-icon {
          color: $text-muted;
          transition: color $transition-fast;
        }

        &:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.04);

          .nav-icon {
            color: $aurora-indigo;
          }
        }

        &.active {
          color: #ffffff;
          background: rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(99, 102, 241, 0.3);

          .nav-icon {
            color: #a5b4fc;
          }
        }

        .nav-tag {
          margin-left: auto;
          font-size: 0.625rem;
          padding: 0.125rem 0.375rem;
        }
      }
    }

    // Main Workspace
    .workspace-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    // Workspace Header
    .workspace-header {
      height: 64px;
      background: rgba(11, 15, 25, 0.8);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid $border-glass;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      position: sticky;
      top: 0;
      z-index: 30;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .mobile-menu-btn {
      display: none;
      background: none;
      border: none;
      color: $text-primary;
      cursor: pointer;

      @include responsive-lg {
        display: block;
      }
    }

    .breadcrumb-trail {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;

      .crumb-root {
        color: $text-muted;
      }

      .crumb-separator {
        color: $border-glass-hover;
      }

      .crumb-tenant {
        color: #ffffff;
        font-weight: 600;
      }
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .tenant-selector {
      select {
        background: rgba(255, 255, 255, 0.05);
        color: $text-primary;
        border: 1px solid $border-glass;
        border-radius: $radius-md;
        padding: 0.375rem 0.75rem;
        font-size: 0.8125rem;
        outline: none;
        cursor: pointer;

        option {
          background: #111827;
          color: #ffffff;
        }

        &:focus {
          border-color: $aurora-indigo;
        }
      }
    }

    .user-profile-menu {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .user-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: linear-gradient(135deg, $aurora-violet, $aurora-cyan);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8125rem;
      font-weight: 700;
      color: #ffffff;
      box-shadow: 0 0 10px rgba(139, 92, 246, 0.4);
    }

    .user-details {
      display: flex;
      flex-direction: column;

      @include responsive-sm {
        display: none;
      }

      .user-name {
        font-size: 0.8125rem;
        font-weight: 600;
        color: #ffffff;
        line-height: 1.2;
      }

      .user-email {
        font-size: 0.6875rem;
        color: $text-muted;
      }
    }

    .btn-logout {
      background: none;
      border: 1px solid transparent;
      padding: 0.375rem;
      border-radius: $radius-md;
      color: $text-muted;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all $transition-fast;

      &:hover {
        color: $aurora-rose;
        background: rgba(244, 63, 94, 0.1);
        border-color: rgba(244, 63, 94, 0.3);
      }
    }

    // Content
    .workspace-content {
      flex: 1;
      padding: 1.75rem;
      overflow-y: auto;

      @include responsive-sm {
        padding: 1rem;
      }
    }

    // Floating Toasts
    .toast-overlay {
      position: fixed;
      top: 1.5rem;
      right: 1.5rem;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-width: 380px;
      pointer-events: none;
    }

    .toast-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      border-radius: $radius-md;
      pointer-events: auto;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
      animation: toastSlideIn $transition-normal cubic-bezier(0.16, 1, 0.3, 1);

      &.toast-success {
        border-color: rgba(16, 185, 129, 0.4);
        .toast-icon-box { color: #6ee7b7; background: rgba(16, 185, 129, 0.15); }
      }

      &.toast-error {
        border-color: rgba(244, 63, 94, 0.4);
        .toast-icon-box { color: #fda4af; background: rgba(244, 63, 94, 0.15); }
      }

      &.toast-warning {
        border-color: rgba(245, 158, 11, 0.4);
        .toast-icon-box { color: #fcd34d; background: rgba(245, 158, 11, 0.15); }
      }

      &.toast-info {
        border-color: rgba(6, 182, 212, 0.4);
        .toast-icon-box { color: #67e8f9; background: rgba(6, 182, 212, 0.15); }
      }
    }

    @keyframes toastSlideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    .toast-icon-box {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .toast-info {
      flex: 1;
      min-width: 0;

      .toast-title-text {
        font-size: 0.8125rem;
        font-weight: 600;
        color: #ffffff;
        line-height: 1.25;
      }

      .toast-message-text {
        font-size: 0.75rem;
        color: $text-secondary;
        margin-top: 0.125rem;
        line-height: 1.35;
      }
    }

    .toast-close-btn {
      background: none;
      border: none;
      color: $text-muted;
      font-size: 1.125rem;
      cursor: pointer;
      padding: 0;
      line-height: 1;

      &:hover {
        color: #ffffff;
      }
    }

    // Command Palette Trigger
    .command-palette-trigger {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.4375rem 0.875rem;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid $border-glass;
      border-radius: $radius-full;
      color: $text-muted;
      font-size: 0.8125rem;
      cursor: pointer;
      transition: all $transition-fast;
      min-width: 280px;

      @include responsive-md {
        min-width: 0;
        .trigger-label { display: none; }
      }

      &:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: $border-glass-hover;
        color: $text-primary;
      }

      .key-shortcut {
        margin-left: auto;
        padding: 0.125rem 0.375rem;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: $radius-sm;
        font-size: 0.6875rem;
        font-family: inherit;
        color: #a5b4fc;
      }
    }

    // Command Palette Modal
    .command-palette-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(12px);
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding-top: 10vh;
      z-index: 1000;
    }

    .command-palette-modal {
      width: 100%;
      max-width: 580px;
      padding: 0;
      overflow: hidden;
      border-radius: $radius-lg;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(99, 102, 241, 0.2);
      animation: palettePop $transition-fast ease-out;
    }

    @keyframes palettePop {
      from { transform: scale(0.96) translateY(-10px); opacity: 0; }
      to { transform: scale(1) translateY(0); opacity: 1; }
    }

    .palette-input-wrapper {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid $border-glass;

      .palette-search-icon {
        color: #a5b4fc;
        flex-shrink: 0;
      }

      .palette-input {
        flex: 1;
        background: none;
        border: none;
        outline: none;
        color: #ffffff;
        font-size: 1rem;
        font-weight: 500;

        &::placeholder {
          color: $text-muted;
        }
      }

      .palette-esc-btn {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid $border-glass;
        border-radius: $radius-sm;
        color: $text-muted;
        font-size: 0.6875rem;
        font-weight: 600;
        padding: 0.125rem 0.375rem;
        cursor: pointer;
      }
    }

    .palette-results {
      max-height: 340px;
      overflow-y: auto;
      padding: 0.5rem;
    }

    .palette-empty {
      padding: 2rem 1.5rem;
      text-align: center;
      color: $text-muted;
      font-size: 0.875rem;
    }

    .palette-item {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      padding: 0.625rem 0.875rem;
      border-radius: $radius-md;
      cursor: pointer;
      transition: all $transition-fast;

      &:hover, &.active {
        background: rgba(99, 102, 241, 0.15);

        .item-title {
          color: #ffffff;
        }

        .item-icon-box {
          background: rgba(99, 102, 241, 0.3);
          color: #a5b4fc;
        }
      }

      .item-icon-box {
        width: 30px;
        height: 30px;
        border-radius: $radius-md;
        background: rgba(255, 255, 255, 0.05);
        color: $text-secondary;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.9375rem;
        flex-shrink: 0;
        transition: all $transition-fast;
      }

      .item-info {
        flex: 1;
        min-width: 0;

        .item-title {
          font-size: 0.875rem;
          font-weight: 500;
          color: $text-secondary;
          line-height: 1.25;
        }

        .item-subtitle {
          font-size: 0.75rem;
          color: $text-muted;
          margin-top: 0.125rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }
    }

    .palette-footer {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      padding: 0.625rem 1.25rem;
      background: rgba(0, 0, 0, 0.3);
      border-top: 1px solid $border-glass;
      font-size: 0.6875rem;
      color: $text-muted;

      kbd {
        padding: 0.125rem 0.3125rem;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: $radius-sm;
        color: #a5b4fc;
        font-family: inherit;
      }
    }
  `]
})
export class WorkspaceLayoutComponent {
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  @ViewChild('paletteInput') paletteInputElement?: ElementRef<HTMLInputElement>;

  public mobileSidebarOpen = false;
  public currentUser$ = this.authService.currentUser$;
  public activeTenant$ = this.authService.activeTenant$;
  public availableTenants$ = this.authService.availableTenants$;
  public toasts$ = this.toastService.toasts$;

  // Command Palette State
  public commandPaletteOpen = false;
  public paletteQuery = '';
  public selectedPaletteIndex = 0;
  public paletteItems: CommandPaletteItem[] = [];
  public filteredPaletteItems: CommandPaletteItem[] = [];

  constructor() {
    this.initializePaletteItems();
  }

  @HostListener('window:keydown', ['$event'])
  public handleGlobalKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.toggleCommandPalette();
    } else if (event.key === 'Escape' && this.commandPaletteOpen) {
      this.closeCommandPalette();
    }
  }

  public openCommandPalette(): void {
    this.commandPaletteOpen = true;
    this.paletteQuery = '';
    this.filterPaletteItems();
    this.selectedPaletteIndex = 0;
    setTimeout(() => {
      this.paletteInputElement?.nativeElement?.focus();
    }, 50);
  }

  public closeCommandPalette(): void {
    this.commandPaletteOpen = false;
  }

  public toggleCommandPalette(): void {
    if (this.commandPaletteOpen) {
      this.closeCommandPalette();
    } else {
      this.openCommandPalette();
    }
  }

  public filterPaletteItems(): void {
    if (!this.paletteQuery.trim()) {
      this.filteredPaletteItems = [...this.paletteItems];
    } else {
      const q = this.paletteQuery.toLowerCase();
      this.filteredPaletteItems = this.paletteItems.filter(item =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
      );
    }
    this.selectedPaletteIndex = 0;
  }

  public onPaletteKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (this.selectedPaletteIndex < this.filteredPaletteItems.length - 1) {
        this.selectedPaletteIndex++;
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (this.selectedPaletteIndex > 0) {
        this.selectedPaletteIndex--;
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const selected = this.filteredPaletteItems[this.selectedPaletteIndex];
      if (selected) {
        this.executePaletteItem(selected);
      }
    }
  }

  public executePaletteItem(item: CommandPaletteItem): void {
    this.closeCommandPalette();
    item.action();
  }

  private initializePaletteItems(): void {
    this.paletteItems = [
      // Navigation
      { id: 'nav-dash', category: 'Navigation', title: 'Dashboard', subtitle: 'Executive high-level KPIs and activity feed', icon: '📊', badgeClass: 'badge-indigo', action: () => this.router.navigate(['/app/dashboard']) },
      { id: 'nav-tasks', category: 'Navigation', title: 'Tasks & Projects', subtitle: 'Kanban board and work item management', icon: '✓', badgeClass: 'badge-emerald', action: () => this.router.navigate(['/app/tasks']) },
      { id: 'nav-emp', category: 'Navigation', title: 'Employees Directory', subtitle: 'Decoupled personnel and managerial hierarchy', icon: '👤', badgeClass: 'badge-emerald', action: () => this.router.navigate(['/app/employees']) },
      { id: 'nav-org', category: 'Navigation', title: 'Organization Structure', subtitle: 'Facilities, branches, and functional departments', icon: '🏢', badgeClass: 'badge-cyan', action: () => this.router.navigate(['/app/organization']) },
      { id: 'nav-crm', category: 'Navigation', title: 'CRM & Sales', subtitle: 'Accounts, pipeline stages, and conversion tracking', icon: '💼', badgeClass: 'badge-violet', action: () => this.router.navigate(['/app/crm']) },
      { id: 'nav-sup', category: 'Navigation', title: 'Customer Support', subtitle: 'Incident ticketing desk, SLA governance, comments', icon: '💬', badgeClass: 'badge-cyan', action: () => this.router.navigate(['/app/support']) },
      { id: 'nav-inv', category: 'Navigation', title: 'Inventory & Procurement', subtitle: 'Warehousing, stock levels, and audit logs', icon: '📦', badgeClass: 'badge-amber', action: () => this.router.navigate(['/app/inventory']) },
      { id: 'nav-mfg', category: 'Navigation', title: 'Manufacturing', subtitle: 'Work orders, Bill of Materials, and work centers', icon: '⚙️', badgeClass: 'badge-indigo', action: () => this.router.navigate(['/app/manufacturing']) },
      { id: 'nav-hr', category: 'Navigation', title: 'HR & Attendance', subtitle: 'Shifts, clock in/out, and leave management', icon: '⏱️', badgeClass: 'badge-emerald', action: () => this.router.navigate(['/app/hr']) },
      { id: 'nav-fin', category: 'Navigation', title: 'Invoicing & Finance', subtitle: 'General ledger invoices, payments, and accounting', icon: '💵', badgeClass: 'badge-violet', action: () => this.router.navigate(['/app/finance']) },
      { id: 'nav-rep', category: 'Navigation', title: 'Reports & Dashboards', subtitle: 'Executive cross-module reporting and CSV exports', icon: '📈', badgeClass: 'badge-indigo', action: () => this.router.navigate(['/app/reports']) },
      { id: 'nav-aud', category: 'Navigation', title: 'Audit Trail', subtitle: 'Immutable compliance logging and record changes', icon: '🛡️', badgeClass: 'badge-cyan', action: () => this.router.navigate(['/app/audit']) },
      { id: 'nav-set', category: 'Navigation', title: 'Workspace Settings', subtitle: 'Tenant parameters, password, team access, and API keys', icon: '⚙️', badgeClass: 'badge-violet', action: () => this.router.navigate(['/app/settings']) },
      { id: 'nav-billing', category: 'Navigation', title: 'Plans & Billing Management', subtitle: 'Subscription tier, quotas, invoices, and payment vault', icon: '💳', badgeClass: 'badge-amber', action: () => this.router.navigate(['/app/billing']) },

      // Quick Actions
      { id: 'act-task', category: 'Action', title: 'Create Work Item', subtitle: 'Create a new task on the Kanban board', icon: '+', badgeClass: 'badge-emerald', action: () => this.router.navigate(['/app/tasks']) },
      { id: 'act-emp', category: 'Action', title: 'Add Employee Profile', subtitle: 'Register personnel without mandating credentials', icon: '+', badgeClass: 'badge-emerald', action: () => this.router.navigate(['/app/employees']) },
      { id: 'act-branch', category: 'Action', title: 'Add Branch Facility', subtitle: 'Provision an operating warehouse or office location', icon: '+', badgeClass: 'badge-cyan', action: () => this.router.navigate(['/app/organization']) },
      { id: 'act-role-owner', category: 'Action', title: 'Preview as Owner', subtitle: 'Switch active demo session to Company Owner', icon: '👑', badgeClass: 'badge-violet', action: () => this.switchRole('Owner') },
      { id: 'act-role-mgr', category: 'Action', title: 'Preview as Manager', subtitle: 'Switch active demo session to Department Manager', icon: '👔', badgeClass: 'badge-cyan', action: () => this.switchRole('Manager') },
      { id: 'act-role-emp', category: 'Action', title: 'Preview as Employee', subtitle: 'Switch active demo session to Individual Contributor', icon: '💼', badgeClass: 'badge-emerald', action: () => this.switchRole('Employee') },

      // Key Resources
      { id: 'res-task-1', category: 'Resource', title: 'Q4 Freight Logistics Audit', subtitle: 'Task assigned to David Lee (Operations)', icon: '📌', badgeClass: 'badge-amber', action: () => this.router.navigate(['/app/tasks']) },
      { id: 'res-task-2', category: 'Resource', title: 'Inventory Reorder Threshold Sync', subtitle: 'Urgent task (Supply Chain Calibration)', icon: '📌', badgeClass: 'badge-rose', action: () => this.router.navigate(['/app/tasks']) },
      { id: 'res-emp-1', category: 'Resource', title: 'Alex Morgan', subtitle: 'Founder & CEO (Global Headquarters)', icon: '👤', badgeClass: 'badge-violet', action: () => this.router.navigate(['/app/employees']) },
      { id: 'res-emp-2', category: 'Resource', title: 'Sarah Jenkins', subtitle: 'Director of Operations (EMEA)', icon: '👤', badgeClass: 'badge-cyan', action: () => this.router.navigate(['/app/employees']) }
    ];
    this.filteredPaletteItems = [...this.paletteItems];
  }

  public toggleMobileSidebar(): void {
    this.mobileSidebarOpen = !this.mobileSidebarOpen;
  }

  public closeMobile(): void {
    this.mobileSidebarOpen = false;
  }

  public switchRole(role: TenantRole): void {
    this.authService.loginAsDemoRole(role);
    // Reload active view with updated role-scoped permissions
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate(['/app/tasks']);
    });
  }

  public onTenantSelect(event: Event): void {
    const tenantId = (event.target as HTMLSelectElement).value;
    this.authService.switchTenant(tenantId).subscribe();
  }

  public logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  public getUserInitials(): string {
    const user = this.authService['currentUserSubject'].value;
    if (!user || !user.fullName) return 'U';
    const parts = user.fullName.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0][0].toUpperCase();
  }

  public getRoleBadgeClass(role: TenantRole): string {
    switch (role) {
      case 'Owner': return 'badge-violet';
      case 'Admin': return 'badge-indigo';
      case 'Manager': return 'badge-cyan';
      case 'Employee': return 'badge-emerald';
      default: return 'badge-indigo';
    }
  }

  public dismissToast(id: string): void {
    this.toastService.remove(id);
  }
}
