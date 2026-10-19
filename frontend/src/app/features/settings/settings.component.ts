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
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                <strong>Two-Factor Authentication (2FA)</strong>
                <span class="badge" [ngClass]="twoFactorEnabled ? 'badge-emerald' : 'badge-slate'">
                  {{ twoFactorEnabled ? 'Enforced & Active' : 'Not Configured' }}
                </span>
              </div>
              <p class="font-caption">Require a cryptographically synchronized TOTP code alongside your password for high-assurance sign-ins.</p>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
              <button *ngIf="twoFactorEnabled" (click)="openRecoveryCodesModal()" class="btn-secondary" title="View Emergency Backup Codes">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span>Recovery Codes</span>
              </button>
              <button *ngIf="!twoFactorEnabled" (click)="openTwoFactorSetup()" class="btn-primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                <span>Configure 2FA (TOTP)</span>
              </button>
              <button (click)="toggle2FA()" class="btn-secondary">
                <span>{{ twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA (TOTP)' }}</span>
              </button>
            </div>
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
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <button (click)="exportTeamCsv()" class="btn-secondary" title="Export Team Roster to CSV">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Export CSV</span>
              </button>
              <button (click)="openInviteModal()" class="btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <span>Invite Team Member</span>
              </button>
            </div>
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

      <!-- Modal: Interactive 2FA (TOTP) Setup & Recovery Codes -->
      <div *ngIf="showTwoFactorModal" class="modal-backdrop" (click)="closeTwoFactorModal()">
        <div class="modal-dialog modal-2fa glass-panel-elevated" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <div class="badge badge-indigo" style="margin-bottom: 0.25rem;">Multi-Factor Authentication</div>
              <h3 class="font-heading-3">Two-Factor Authentication (TOTP)</h3>
            </div>
            <button (click)="closeTwoFactorModal()" class="modal-close-btn">×</button>
          </div>

          <!-- Wizard Step Navigation -->
          <div class="totp-steps-bar">
            <div class="step-indicator" [class.active]="twoFactorStep === 1" [class.completed]="twoFactorStep > 1">
              <span class="step-circle">1</span>
              <span class="step-label">Scan QR</span>
            </div>
            <div class="step-line" [class.active]="twoFactorStep > 1"></div>
            <div class="step-indicator" [class.active]="twoFactorStep === 2" [class.completed]="twoFactorStep > 2">
              <span class="step-circle">2</span>
              <span class="step-label">Verify Code</span>
            </div>
            <div class="step-line" [class.active]="twoFactorStep > 2"></div>
            <div class="step-indicator" [class.active]="twoFactorStep === 3">
              <span class="step-circle">3</span>
              <span class="step-label">Backup Codes</span>
            </div>
          </div>

          <!-- Step 1: Scan QR & Secret Key -->
          <div *ngIf="twoFactorStep === 1" class="totp-step-content">
            <p class="font-caption text-muted" style="margin-bottom: 1rem;">
              Scan this QR code using Google Authenticator, 1Password, Authy, or any standard RFC 6238 TOTP authenticator.
            </p>

            <div class="qr-preview-box glass-panel">
              <div class="qr-frame">
                <!-- High-fidelity SVG QR representation -->
                <svg width="140" height="140" viewBox="0 0 160 160" class="qr-svg">
                  <rect width="160" height="160" fill="#0f172a" rx="8"/>
                  <!-- Position Markers Top-Left -->
                  <rect x="16" y="16" width="36" height="36" rx="4" fill="#6366f1"/>
                  <rect x="22" y="22" width="24" height="24" rx="2" fill="#0f172a"/>
                  <rect x="28" y="28" width="12" height="12" rx="1" fill="#10b981"/>

                  <!-- Position Markers Top-Right -->
                  <rect x="108" y="16" width="36" height="36" rx="4" fill="#6366f1"/>
                  <rect x="114" y="22" width="24" height="24" rx="2" fill="#0f172a"/>
                  <rect x="120" y="28" width="12" height="12" rx="1" fill="#10b981"/>

                  <!-- Position Markers Bottom-Left -->
                  <rect x="16" y="108" width="36" height="36" rx="4" fill="#6366f1"/>
                  <rect x="22" y="114" width="24" height="24" rx="2" fill="#0f172a"/>
                  <rect x="28" y="120" width="12" height="12" rx="1" fill="#10b981"/>

                  <!-- Authentic Data Matrix Pattern Blocks -->
                  <rect x="64" y="20" width="8" height="8" fill="#e2e8f0"/>
                  <rect x="80" y="20" width="8" height="8" fill="#e2e8f0"/>
                  <rect x="64" y="36" width="16" height="8" fill="#10b981"/>
                  <rect x="88" y="36" width="8" height="16" fill="#e2e8f0"/>
                  <rect x="20" y="64" width="16" height="8" fill="#e2e8f0"/>
                  <rect x="44" y="64" width="8" height="8" fill="#6366f1"/>
                  <rect x="60" y="60" width="20" height="20" rx="3" fill="#6366f1"/>
                  <rect x="66" y="66" width="8" height="8" fill="#ffffff"/>
                  <rect x="88" y="64" width="16" height="8" fill="#e2e8f0"/>
                  <rect x="112" y="64" width="8" height="16" fill="#10b981"/>
                  <rect x="128" y="64" width="16" height="8" fill="#e2e8f0"/>
                  <rect x="20" y="80" width="8" height="16" fill="#10b981"/>
                  <rect x="36" y="88" width="16" height="8" fill="#e2e8f0"/>
                  <rect x="64" y="88" width="8" height="16" fill="#e2e8f0"/>
                  <rect x="80" y="88" width="16" height="8" fill="#6366f1"/>
                  <rect x="104" y="88" width="8" height="8" fill="#e2e8f0"/>
                  <rect x="120" y="80" width="24" height="8" fill="#e2e8f0"/>
                  <rect x="64" y="112" width="16" height="8" fill="#10b981"/>
                  <rect x="88" y="112" width="8" height="16" fill="#e2e8f0"/>
                  <rect x="104" y="104" width="16" height="8" fill="#6366f1"/>
                  <rect x="128" y="112" width="16" height="16" fill="#e2e8f0"/>
                  <rect x="64" y="128" width="8" height="16" fill="#e2e8f0"/>
                  <rect x="80" y="136" width="16" height="8" fill="#10b981"/>
                  <rect x="104" y="128" width="8" height="16" fill="#e2e8f0"/>
                </svg>
              </div>

              <div class="manual-secret-block">
                <span class="font-caption text-muted">Or enter secret key manually:</span>
                <div class="secret-key-display">
                  <code>{{ totpSecret }}</code>
                  <button type="button" (click)="copyTotpSecret()" class="btn-secondary btn-xs" title="Copy Secret Key">
                    <span>Copy</span>
                  </button>
                </div>
              </div>
            </div>

            <div class="modal-footer" style="margin-top: 1.5rem;">
              <button type="button" (click)="closeTwoFactorModal()" class="btn-secondary">Cancel</button>
              <button type="button" (click)="goToTwoFactorStep(2)" class="btn-primary">
                <span>Next: Verify Code →</span>
              </button>
            </div>
          </div>

          <!-- Step 2: Verify 6-Digit Code -->
          <div *ngIf="twoFactorStep === 2" class="totp-step-content">
            <p class="font-caption text-muted" style="margin-bottom: 1.25rem;">
              Enter the 6-digit verification code generated by your authenticator app to confirm proper configuration.
            </p>

            <div class="totp-verify-card glass-panel">
              <label for="totpCode" class="font-caption" style="font-weight: 600; margin-bottom: 0.5rem; display: block;">6-Digit Security Token</label>
              <input 
                id="totpCode"
                type="text" 
                maxlength="6" 
                [(ngModel)]="totpCodeInput" 
                placeholder="123456" 
                class="totp-input-field font-heading-2"
                autocomplete="one-time-code"
              />
              <span class="font-caption text-muted" style="margin-top: 0.5rem; display: block;">Codes refresh every 30 seconds.</span>
            </div>

            <div class="modal-footer" style="margin-top: 1.5rem;">
              <button type="button" (click)="goToTwoFactorStep(1)" class="btn-secondary">← Back</button>
              <button type="button" (click)="verifyTotpCode()" class="btn-primary" [disabled]="!totpCodeInput || totpCodeInput.length < 6">
                <span>Verify & Continue →</span>
              </button>
            </div>
          </div>

          <!-- Step 3: Emergency Backup Recovery Codes -->
          <div *ngIf="twoFactorStep === 3" class="totp-step-content">
            <div class="recovery-notice-banner glass-panel">
              <div class="notice-icon">⚠️</div>
              <div class="notice-body">
                <strong style="color: #f59e0b; font-size: 0.85rem;">Save Your Recovery Backup Codes</strong>
                <p class="font-caption text-muted">
                  If you ever lose access to your authenticator device, each recovery code can be used once to access your account.
                </p>
              </div>
            </div>

            <div class="recovery-grid">
              <div *ngFor="let code of recoveryCodes; let i = index" class="recovery-code-chip glass-panel">
                <span class="code-num text-muted">{{ i + 1 }}.</span>
                <code class="code-val">{{ code }}</code>
              </div>
            </div>

            <div class="recovery-actions-row">
              <button type="button" (click)="copyRecoveryCodes()" class="btn-secondary btn-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                <span>Copy All Codes</span>
              </button>
              <button type="button" (click)="downloadRecoveryCodes()" class="btn-secondary btn-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Download (.txt)</span>
              </button>
            </div>

            <div class="modal-footer" style="margin-top: 1.5rem;">
              <button type="button" (click)="closeTwoFactorModal()" class="btn-secondary">Close</button>
              <button type="button" (click)="finishTwoFactorSetup()" class="btn-primary">
                <span>{{ twoFactorEnabled ? 'Done' : 'Finish & Activate 2FA' }}</span>
              </button>
            </div>
          </div>
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

    .modal-2fa {
      max-width: 520px;

      .totp-steps-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.25rem;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid $border-glass;

        .step-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;

          .step-circle {
            width: 22px;
            height: 22px;
            border-radius: $radius-full;
            background: rgba(255, 255, 255, 0.1);
            color: $text-muted;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.7rem;
            font-weight: 700;
          }

          .step-label {
            font-size: 0.75rem;
            color: $text-muted;
          }

          &.active {
            .step-circle {
              background: $aurora-indigo;
              color: #ffffff;
            }
            .step-label {
              color: #ffffff;
              font-weight: 600;
            }
          }

          &.completed {
            .step-circle {
              background: $aurora-emerald;
              color: #000000;
            }
          }
        }

        .step-line {
          flex: 1;
          height: 2px;
          background: rgba(255, 255, 255, 0.1);
          margin: 0 0.5rem;

          &.active {
            background: $aurora-indigo;
          }
        }
      }

      .qr-preview-box {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 1.25rem;
        gap: 1rem;

        .qr-frame {
          padding: 0.5rem;
          background: rgba(0, 0, 0, 0.5);
          border-radius: $radius-md;
          border: 1px solid $border-glass;
        }

        .manual-secret-block {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;

          .secret-key-display {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background: rgba(0, 0, 0, 0.3);
            padding: 0.35rem 0.75rem;
            border-radius: $radius-md;
            border: 1px solid $border-glass;

            code {
              font-family: monospace;
              letter-spacing: 0.05em;
              color: #a5b4fc;
              font-size: 0.85rem;
            }
          }
        }
      }

      .totp-verify-card {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;

        .totp-input-field {
          width: 180px;
          text-align: center;
          letter-spacing: 0.3em;
          padding: 0.5rem;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid $aurora-indigo;
          border-radius: $radius-md;
          color: #ffffff;
          font-weight: 700;
        }
      }

      .recovery-notice-banner {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        border-color: rgba(245, 158, 11, 0.3);
        background: rgba(245, 158, 11, 0.08);
        margin-bottom: 1rem;

        .notice-icon {
          font-size: 1.25rem;
        }
      }

      .recovery-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.5rem;
        margin-bottom: 1rem;

        .recovery-code-chip {
          padding: 0.5rem 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(0, 0, 0, 0.3);

          .code-num {
            font-size: 0.75rem;
          }

          .code-val {
            font-family: monospace;
            font-weight: 600;
            color: $aurora-emerald;
            letter-spacing: 0.05em;
          }
        }
      }

      .recovery-actions-row {
        display: flex;
        gap: 0.5rem;
        justify-content: center;
      }
    }
  `]
})
export class SettingsComponent implements OnInit {
  public authService = inject(AuthService);
  public apiService = inject(ApiService);
  public toastService = inject(ToastService);

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

  // Interactive 2FA (TOTP) State
  public showTwoFactorModal = false;
  public twoFactorStep: 1 | 2 | 3 = 1;
  public totpSecret = 'JBSW-Y3DP-EHPK-3PXP-ORB9';
  public totpCodeInput = '';
  public recoveryCodes: string[] = [
    '7A2B-9C1D',
    '4E5F-8A9B',
    '2C3D-6E7F',
    '8G9H-1J2K',
    '3L4M-5N6P',
    '9Q8R-7S6T'
  ];

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

  // --- INTERACTIVE 2FA (TOTP) SETUP ENGINE ---
  public openTwoFactorSetup(): void {
    this.showTwoFactorModal = true;
    this.twoFactorStep = 1;
    this.totpCodeInput = '';
  }

  public openRecoveryCodesModal(): void {
    this.showTwoFactorModal = true;
    this.twoFactorStep = 3;
  }

  public closeTwoFactorModal(): void {
    this.showTwoFactorModal = false;
    this.totpCodeInput = '';
  }

  public copyTotpSecret(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(this.totpSecret).catch(() => {});
    }
    this.toastService.info('Secret Key Copied', 'Manual TOTP key copied to clipboard.');
  }

  public goToTwoFactorStep(step: 1 | 2 | 3): void {
    this.twoFactorStep = step;
  }

  public verifyTotpCode(): void {
    if (!this.totpCodeInput || this.totpCodeInput.trim().length < 6) {
      this.toastService.error('Verification Failed', 'Please enter a valid 6-digit TOTP code.');
      return;
    }
    this.twoFactorStep = 3;
    this.toastService.success('Code Verified', 'Authenticator linked successfully. Please save your recovery backup keys.');
  }

  public copyRecoveryCodes(): void {
    const text = this.recoveryCodes.join('\n');
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    this.toastService.success('Recovery Codes Copied', 'All 6 backup codes copied to clipboard.');
  }

  public downloadRecoveryCodes(): void {
    const content = `ORBIT BUSINESS SUITE - 2FA BACKUP RECOVERY CODES\nGenerated: ${new Date().toISOString()}\nAccount: alex@apex.com\n\nEach code can be used once if you lose your authenticator:\n\n` +
      this.recoveryCodes.map((c, i) => `${i + 1}. ${c}`).join('\n') +
      `\n\nKeep these codes in a secure password manager or offline vault.`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'orbit-2fa-recovery-codes.txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  public finishTwoFactorSetup(): void {
    this.twoFactorEnabled = true;
    this.showTwoFactorModal = false;
    this.toastService.success('Two-Factor Authentication Active', 'TOTP security is now enforced on this account.');
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

  public exportTeamCsv(): void {
    const headers = ['Full Name', 'Email', 'Role', 'Status', 'Last Active'];
    const rows = this.teamMembers.map(m => [
      `"${m.fullName.replace(/"/g, '""')}"`,
      `"${m.email.replace(/"/g, '""')}"`,
      `"${m.role}"`,
      `"${m.status}"`,
      `"${(m.lastActive || '').replace(/"/g, '""')}"`
    ]);

    this.downloadCsvFile([headers.join(','), ...rows.map(r => r.join(','))].join('\n'), `orbit-team-members-${Date.now()}.csv`);
  }

  private downloadCsvFile(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

