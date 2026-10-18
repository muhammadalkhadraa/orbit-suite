import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { TenantDetails, TenantRole } from '../../core/models/models';

interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: TenantRole;
  status: 'Active' | 'Pending' | 'Suspended';
  lastActive: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-page">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <div class="badge badge-violet" style="margin-bottom: 0.5rem;">Governance & Configuration</div>
          <h1 class="font-heading-2">Workspace & Account Settings</h1>
          <p class="font-caption">Manage organizational parameters, security credentials, team access, and developer keys</p>
        </div>
      </div>

      <!-- Settings Navigation Tabs -->
      <div class="tabs-bar">
        <button 
          (click)="activeTab = 'organization'" 
          class="tab-btn" 
          [class.active]="activeTab === 'organization'"
        >
          🏢 Organization Profile
        </button>
        <button 
          (click)="activeTab = 'security'" 
          class="tab-btn" 
          [class.active]="activeTab === 'security'"
        >
          🔐 User Security & Credentials
        </button>
        <button 
          (click)="activeTab = 'team'" 
          class="tab-btn" 
          [class.active]="activeTab === 'team'"
        >
          👥 Team Access & Roles
        </button>
        <button 
          (click)="activeTab = 'api'" 
          class="tab-btn" 
          [class.active]="activeTab === 'api'"
        >
          ⚡ API & Webhooks
        </button>
      </div>

      <!-- Tab 1: Organization Profile -->
      <section *ngIf="activeTab === 'organization'" class="tab-pane">
        <div class="glass-panel-elevated settings-card">
          <div class="card-header">
            <h2 class="font-heading-3">Company Information</h2>
            <p class="font-caption">Primary configuration parameters for this isolated multi-tenant workspace</p>
          </div>

          <form (ngSubmit)="saveOrgSettings()" class="settings-form">
            <div class="form-row">
              <div class="form-group">
                <label for="compName">Company Legal Name</label>
                <input id="compName" type="text" [(ngModel)]="orgName" name="orgName" required />
              </div>
              <div class="form-group">
                <label for="compSlug">Tenant Slug (Immutable Identifier)</label>
                <input id="compSlug" type="text" [value]="orgSlug" disabled class="input-disabled" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="industry">Industry Sector</label>
                <select id="industry" [(ngModel)]="orgIndustry" name="orgIndustry">
                  <option value="Logistics & Supply Chain">Logistics & Supply Chain</option>
                  <option value="Manufacturing & Industrial">Manufacturing & Industrial</option>
                  <option value="Enterprise Technology & SaaS">Enterprise Technology & SaaS</option>
                  <option value="Healthcare & Biotechnology">Healthcare & Biotechnology</option>
                  <option value="Financial Services">Financial Services</option>
                </select>
              </div>

              <div class="form-group">
                <label for="currency">Base Accounting Currency</label>
                <select id="currency" [(ngModel)]="orgCurrency" name="orgCurrency">
                  <option value="USD">USD ($) - United States Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                  <option value="JPY">JPY (¥) - Japanese Yen</option>
                  <option value="SGD">SGD ($) - Singapore Dollar</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label for="timezone">Workspace Default Timezone</label>
              <select id="timezone" [(ngModel)]="orgTimezone" name="orgTimezone">
                <option value="America/New_York">Eastern Time (US - New York)</option>
                <option value="America/Chicago">Central Time (US - Chicago)</option>
                <option value="America/Los_Angeles">Pacific Time (US - Los Angeles)</option>
                <option value="Europe/London">Greenwich Mean Time (UK - London)</option>
                <option value="Europe/Berlin">Central European Time (Germany - Berlin)</option>
                <option value="Asia/Tokyo">Japan Standard Time (Tokyo)</option>
                <option value="Asia/Singapore">Singapore Standard Time (Singapore)</option>
              </select>
            </div>

            <div class="card-footer">
              <button type="submit" class="btn-primary" [disabled]="savingOrg">
                <span>{{ savingOrg ? 'Saving Changes...' : 'Save Organization Profile' }}</span>
              </button>
            </div>
          </form>
        </div>
      </section>

      <!-- Tab 2: User Security & Credentials -->
      <section *ngIf="activeTab === 'security'" class="tab-pane">
        <div class="glass-panel-elevated settings-card">
          <div class="card-header">
            <h2 class="font-heading-3">Identity & Authentication</h2>
            <p class="font-caption">Manage account access, credential security, and active sessions</p>
          </div>

          <div class="user-summary-badge glass-panel">
            <div class="user-avatar-large">
              {{ getUserInitials() }}
            </div>
            <div class="user-meta">
              <div class="user-name-title">{{ currentUser?.fullName || 'Alexander Vance' }}</div>
              <div class="user-email-text">{{ currentUser?.email || 'owner@apexglobal.com' }}</div>
              <span class="badge badge-violet" style="margin-top: 0.25rem;">Role: {{ currentRole }}</span>
            </div>
          </div>

          <form (ngSubmit)="changePassword()" class="settings-form" style="margin-top: 1.5rem;">
            <h3 class="font-heading-3" style="font-size: 1rem; margin-bottom: 0.75rem;">Change Account Password</h3>

            <div class="form-group">
              <label for="currentPassword">Current Password</label>
              <input id="currentPassword" type="password" [(ngModel)]="currentPassword" name="currentPassword" placeholder="••••••••" required />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="newPassword">New Password</label>
                <input id="newPassword" type="password" [(ngModel)]="newPassword" name="newPassword" placeholder="Minimum 8 characters" required />
              </div>
              <div class="form-group">
                <label for="confirmPassword">Confirm New Password</label>
                <input id="confirmPassword" type="password" [(ngModel)]="confirmPassword" name="confirmPassword" placeholder="Confirm new password" required />
              </div>
            </div>

            <div class="card-footer">
              <button type="submit" class="btn-primary">
                <span>Update Password</span>
              </button>
            </div>
          </form>

          <div class="two-factor-section glass-panel" style="margin-top: 2rem;">
            <div class="tf-details">
              <strong>Two-Factor Authentication (2FA)</strong>
              <p class="font-caption">Require an authentication code alongside your password for high-assurance sign-ins.</p>
            </div>
            <button (click)="toggle2FA()" class="btn-secondary">
              <span>{{ twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA (TOTP)' }}</span>
            </button>
          </div>
        </div>
      </section>

      <!-- Tab 3: Team Access & Roles -->
      <section *ngIf="activeTab === 'team'" class="tab-pane">
        <div class="glass-panel-elevated settings-card">
          <div class="card-header-flex">
            <div>
              <h2 class="font-heading-3">Authorized Team Members</h2>
              <p class="font-caption">Users with active cryptographic memberships within this company tenant</p>
            </div>
            <button (click)="openInviteModal()" class="btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>Invite Team Member</span>
            </button>
          </div>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>MEMBER</th>
                  <th>ROLE</th>
                  <th>STATUS</th>
                  <th>LAST ACTIVITY</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let member of teamMembers">
                  <td>
                    <div class="member-cell">
                      <div class="member-avatar">{{ getInitials(member.fullName) }}</div>
                      <div>
                        <div class="member-name">{{ member.fullName }}</div>
                        <div class="member-email">{{ member.email }}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="badge" [ngClass]="getRoleBadgeClass(member.role)">{{ member.role }}</span>
                  </td>
                  <td>
                    <span class="badge badge-emerald">{{ member.status }}</span>
                  </td>
                  <td class="text-secondary">{{ member.lastActive }}</td>
                  <td>
                    <button (click)="removeMember(member.id)" class="btn-table-action text-danger" title="Revoke Access">
                      Revoke
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- Tab 4: API & Webhooks -->
      <section *ngIf="activeTab === 'api'" class="tab-pane">
        <div class="glass-panel-elevated settings-card">
          <div class="card-header">
            <h2 class="font-heading-3">Developer API Access</h2>
            <p class="font-caption">Use scoped API keys to integrate external ERP, accounting, or custom software</p>
          </div>

          <div class="api-key-box glass-panel">
            <div class="key-header">
              <span class="key-label">LIVE PRODUCTION SECRET KEY</span>
              <span class="badge badge-indigo">Read & Write Scope</span>
            </div>
            <div class="key-value-row">
              <input type="text" [value]="apiKey" readonly class="input-code" />
              <button (click)="copyApiKey()" class="btn-secondary">
                <span>Copy Key</span>
              </button>
              <button (click)="regenerateApiKey()" class="btn-secondary text-danger">
                <span>Roll Key</span>
              </button>
            </div>
            <p class="font-caption" style="margin-top: 0.5rem; color: #a5b4fc;">
              ⚠️ Keep this key confidential. Requests authenticated with this key inherit tenant Owner authority.
            </p>
          </div>

          <div class="webhook-section" style="margin-top: 2rem;">
            <h3 class="font-heading-3" style="font-size: 1rem; margin-bottom: 0.5rem;">Outbound Event Webhooks</h3>
            <p class="font-caption" style="margin-bottom: 1rem;">Receive HTTP POST payloads when work orders, invoices, or tickets change status.</p>

            <div class="form-group">
              <label for="webhookUrl">Webhook Endpoint URL</label>
              <input id="webhookUrl" type="url" [(ngModel)]="webhookUrl" placeholder="https://api.yourcompany.com/webhooks/orbit" />
            </div>

            <button (click)="saveWebhook()" class="btn-primary" style="margin-top: 0.75rem;">
              <span>Save Webhook Destination</span>
            </button>
          </div>
        </div>
      </section>

      <!-- Modal: Invite Member -->
      <div *ngIf="showInviteModal" class="modal-backdrop">
        <div class="modal-dialog glass-panel-elevated">
          <div class="modal-header">
            <h3 class="font-heading-3">Invite Team Member</h3>
            <button (click)="closeInviteModal()" class="modal-close-btn">×</button>
          </div>
          <form (ngSubmit)="submitInvite()">
            <div class="form-group">
              <label for="invName">Full Name</label>
              <input id="invName" type="text" [(ngModel)]="inviteName" name="inviteName" placeholder="e.g. Rachel Adams" required />
            </div>
            <div class="form-group">
              <label for="invEmail">Work Email</label>
              <input id="invEmail" type="email" [(ngModel)]="inviteEmail" name="inviteEmail" placeholder="rachel@company.com" required />
            </div>
            <div class="form-group">
              <label for="invRole">Assigned Access Role</label>
              <select id="invRole" [(ngModel)]="inviteRole" name="inviteRole">
                <option value="Admin">Admin - Full company administration</option>
                <option value="Manager">Manager - Team and departmental governance</option>
                <option value="Employee">Employee - Individual assigned tasks & attendance</option>
              </select>
            </div>
            <div class="modal-footer">
              <button type="button" (click)="closeInviteModal()" class="btn-secondary">Cancel</button>
              <button type="submit" class="btn-primary">Send Invitation</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @use 'styles/variables' as *;
    @use 'styles/mixins' as *;

    .settings-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .page-header {
      margin-bottom: 0.5rem;
    }

    .tabs-bar {
      display: flex;
      gap: 0.5rem;
      border-bottom: 1px solid $border-glass;
      padding-bottom: 0.5rem;
      overflow-x: auto;

      .tab-btn {
        background: none;
        border: none;
        padding: 0.625rem 1rem;
        font-size: 0.875rem;
        font-weight: 600;
        color: $text-secondary;
        border-radius: $radius-md;
        cursor: pointer;
        transition: all $transition-fast;
        white-space: nowrap;

        &:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.04);
        }

        &.active {
          color: #ffffff;
          background: rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(99, 102, 241, 0.3);
        }
      }
    }

    .settings-card {
      padding: 2rem;
      max-width: 900px;
    }

    .card-header {
      margin-bottom: 1.5rem;

      h2 {
        margin-bottom: 0.25rem;
      }
    }

    .card-header-flex {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;

      h2 {
        margin-bottom: 0.25rem;
      }
    }

    .settings-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;

      @include responsive-sm {
        grid-template-columns: 1fr;
      }
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;

      label {
        font-size: 0.8125rem;
        font-weight: 500;
        color: $text-secondary;
      }

      input, select {
        padding: 0.625rem 0.875rem;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid $border-glass;
        border-radius: $radius-md;
        color: #ffffff;
        font-size: 0.875rem;
        outline: none;
        transition: border-color $transition-fast;

        &:focus {
          border-color: $aurora-indigo;
        }

        option {
          background: #111827;
          color: #ffffff;
        }
      }

      .input-disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .card-footer {
      display: flex;
      justify-content: flex-end;
      margin-top: 0.5rem;
    }

    .user-summary-badge {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      padding: 1.25rem;
      border-radius: $radius-md;

      .user-avatar-large {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, $aurora-violet, $aurora-cyan);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.25rem;
        font-weight: 700;
        color: #ffffff;
        box-shadow: 0 0 15px rgba(139, 92, 246, 0.4);
      }

      .user-name-title {
        font-size: 1.125rem;
        font-weight: 600;
        color: #ffffff;
      }

      .user-email-text {
        font-size: 0.8125rem;
        color: $text-muted;
      }
    }

    .two-factor-section {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem;
      border-radius: $radius-md;

      strong {
        color: #ffffff;
      }
    }

    .table-container {
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;

      th {
        text-align: left;
        font-size: 0.6875rem;
        font-weight: 700;
        color: $text-muted;
        letter-spacing: 0.08em;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid $border-glass;
      }

      td {
        padding: 0.875rem 1rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        font-size: 0.875rem;
      }
    }

    .member-cell {
      display: flex;
      align-items: center;
      gap: 0.75rem;

      .member-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(99, 102, 241, 0.2);
        color: #a5b4fc;
        font-size: 0.75rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .member-name {
        font-weight: 600;
        color: #ffffff;
      }

      .member-email {
        font-size: 0.75rem;
        color: $text-muted;
      }
    }

    .btn-table-action {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 0.8125rem;
      font-weight: 500;
      padding: 0.25rem 0.5rem;
      border-radius: $radius-sm;

      &.text-danger {
        color: #fda4af;

        &:hover {
          background: rgba(244, 63, 94, 0.15);
        }
      }
    }

    .api-key-box {
      padding: 1.25rem;
      border-radius: $radius-md;

      .key-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.5rem;
        font-size: 0.6875rem;
        font-weight: 600;
        color: $text-muted;
      }

      .key-value-row {
        display: flex;
        gap: 0.5rem;

        .input-code {
          flex: 1;
          font-family: monospace;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid $border-glass;
          border-radius: $radius-md;
          padding: 0.5rem 0.75rem;
          color: #a5b4fc;
          font-size: 0.8125rem;
        }
      }
    }

    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: 1rem;
    }

    .modal-dialog {
      width: 100%;
      max-width: 480px;
      padding: 1.75rem;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.25rem;

      .modal-close-btn {
        background: none;
        border: none;
        color: $text-muted;
        font-size: 1.25rem;
        cursor: pointer;

        &:hover {
          color: #ffffff;
        }
      }
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }
  `]
})
export class SettingsComponent implements OnInit {
  private authService = inject(AuthService);
  private apiService = inject(ApiService);
  private toastService = inject(ToastService);

  public activeTab: 'organization' | 'security' | 'team' | 'api' = 'organization';
  public currentUser = this.authService.currentUser;
  public currentRole = this.authService.currentRole || 'Owner';

  // Org Profile
  public orgName = 'Apex Global Enterprises';
  public orgSlug = 'apex-global';
  public orgIndustry = 'Logistics & Supply Chain';
  public orgCurrency = 'USD';
  public orgTimezone = 'America/New_York';
  public savingOrg = false;

  // Security
  public currentPassword = '';
  public newPassword = '';
  public confirmPassword = '';
  public twoFactorEnabled = false;

  // Team
  public teamMembers: TeamMember[] = [
    { id: 'tm-1', fullName: 'Alex Morgan', email: 'alex.morgan@orbitbusiness.io', role: 'Owner', status: 'Active', lastActive: 'Just now' },
    { id: 'tm-2', fullName: 'Sarah Jenkins', email: 'sarah.jenkins@orbitbusiness.io', role: 'Manager', status: 'Active', lastActive: '15 mins ago' },
    { id: 'tm-3', fullName: 'David Lee', email: 'david.lee@orbitbusiness.io', role: 'Employee', status: 'Active', lastActive: '1 hour ago' }
  ];
  public showInviteModal = false;
  public inviteName = '';
  public inviteEmail = '';
  public inviteRole: TenantRole = 'Employee';

  // API
  public apiKey = 'orb_live_sec_99af28b6d8c914e7a83d73b0';
  public webhookUrl = 'https://api.apexglobal.com/webhooks/orbit';

  public ngOnInit(): void {
    this.apiService.getCompany().subscribe(res => {
      if (res.data) {
        this.orgName = res.data.name;
        this.orgSlug = res.data.slug;
        if (res.data.industry) this.orgIndustry = res.data.industry;
        if (res.data.currencyCode) this.orgCurrency = res.data.currencyCode;
        if (res.data.timeZoneId) this.orgTimezone = res.data.timeZoneId;
      }
    });
  }

  public saveOrgSettings(): void {
    this.savingOrg = true;
    setTimeout(() => {
      this.savingOrg = false;
      this.toastService.success('Organization Profile Saved', `${this.orgName} settings updated successfully.`);
    }, 400);
  }

  public changePassword(): void {
    if (!this.currentPassword || !this.newPassword) {
      this.toastService.error('Validation Error', 'Please complete all password fields.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.toastService.error('Password Mismatch', 'The new passwords entered do not match.');
      return;
    }
    this.toastService.success('Credentials Updated', 'Your account password has been changed.');
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
  }

  public toggle2FA(): void {
    this.twoFactorEnabled = !this.twoFactorEnabled;
    const state = this.twoFactorEnabled ? 'enabled' : 'disabled';
    this.toastService.info('Two-Factor Authentication', `Two-Factor Authentication is now ${state}.`);
  }

  public openInviteModal(): void {
    this.inviteName = '';
    this.inviteEmail = '';
    this.inviteRole = 'Employee';
    this.showInviteModal = true;
  }

  public closeInviteModal(): void {
    this.showInviteModal = false;
  }

  public submitInvite(): void {
    if (!this.inviteName || !this.inviteEmail) {
      this.toastService.error('Missing Information', 'Please provide member name and work email.');
      return;
    }

    const newMember: TeamMember = {
      id: `tm-${Date.now()}`,
      fullName: this.inviteName,
      email: this.inviteEmail,
      role: this.inviteRole,
      status: 'Active',
      lastActive: 'Invitation sent'
    };

    this.teamMembers.push(newMember);
    this.toastService.success('Invitation Sent', `Invitation email sent to ${this.inviteEmail} (${this.inviteRole}).`);
    this.closeInviteModal();
  }

  public removeMember(id: string): void {
    this.teamMembers = this.teamMembers.filter(m => m.id !== id);
    this.toastService.warning('Access Revoked', 'The user access membership has been removed from this tenant.');
  }

  public copyApiKey(): void {
    navigator.clipboard?.writeText(this.apiKey);
    this.toastService.info('Key Copied', 'Production API secret key copied to clipboard.');
  }

  public regenerateApiKey(): void {
    const randomHex = Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    this.apiKey = `orb_live_sec_${randomHex}`;
    this.toastService.warning('API Key Rolled', 'A new API secret key has been generated.');
  }

  public saveWebhook(): void {
    this.toastService.success('Webhook Saved', 'Outbound event destination configured.');
  }

  public getUserInitials(): string {
    const name = this.currentUser?.fullName || 'Alexander Vance';
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0][0].toUpperCase();
  }

  public getInitials(name: string): string {
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (name[0] || 'U').toUpperCase();
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
}
