import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { TenantDetails, TenantRole } from '../../core/models/models';

export type BillingTab = 'subscription' | 'payment' | 'invoices' | 'details';

export interface PlanTier {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceAnnual: number;
  popular?: boolean;
  features: string[];
  maxSeats: number;
  maxStorageGb: number;
  apiLimitPerMonth: number;
}

export interface BillingInvoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  amount: number;
  currency: string;
  status: 'Paid' | 'Processing' | 'Failed';
  planName: string;
  downloadUrl: string;
}

export interface PaymentCard {
  id: string;
  brand: 'Visa' | 'Mastercard' | 'Amex';
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  holderName: string;
  isDefault: boolean;
}

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="billing-page">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <div class="badge badge-amber" style="margin-bottom: 0.5rem;">SaaS Operations & Entitlements</div>
          <h1 class="font-heading-2">Subscription & Billing Management</h1>
          <p class="font-caption">Oversee multi-tenant license entitlements, compute quotas, payment methods, and historical receipts</p>
        </div>
        <div class="header-actions" *ngIf="canManageBilling">
          <button (click)="openPaymentModal()" class="btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            <span>Update Card</span>
          </button>
          <button (click)="activeTab = 'subscription'" class="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span>Change Plan</span>
          </button>
        </div>
      </div>

      <!-- Role Permission Banner -->
      <div class="role-scope-banner glass-panel" *ngIf="!canManageBilling">
        <div class="scope-icon">ℹ️</div>
        <div class="scope-details">
          <div class="scope-title">READ-ONLY BILLING ACCESS: {{ currentRole }}</div>
          <p class="scope-explanation">
            Your authenticated role grants view-only visibility into organization quotas and subscription status. Plan modifications, payment card updates, and invoice re-routing require <strong>Owner</strong> or <strong>Admin</strong> privileges.
          </p>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="tabs-bar">
        <button 
          (click)="activeTab = 'subscription'" 
          class="tab-btn" 
          [class.active]="activeTab === 'subscription'"
        >
          💎 Subscription & Quotas
        </button>
        <button 
          (click)="activeTab = 'payment'" 
          class="tab-btn" 
          [class.active]="activeTab === 'payment'"
        >
          💳 Payment Methods
        </button>
        <button 
          (click)="activeTab = 'invoices'" 
          class="tab-btn" 
          [class.active]="activeTab === 'invoices'"
        >
          🧾 Invoices & Receipts
        </button>
        <button 
          (click)="activeTab = 'details'" 
          class="tab-btn" 
          [class.active]="activeTab === 'details'"
        >
          🏢 Tax & Billing Contact
        </button>
      </div>

      <!-- TAB 1: SUBSCRIPTION & QUOTAS -->
      <div class="tab-content" *ngIf="activeTab === 'subscription'">
        <!-- Current Active Plan Hero Card -->
        <div class="glass-panel-elevated current-plan-card">
          <div class="plan-hero-left">
            <div class="badge badge-emerald">ACTIVE SUBSCRIPTION</div>
            <h2 class="plan-hero-name font-heading-2">{{ currentPlan.name }}</h2>
            <p class="font-body">{{ currentPlan.description }}</p>
            
            <div class="plan-meta-row">
              <div class="meta-item">
                <span class="meta-label">BILLING CYCLE</span>
                <span class="meta-value">{{ billingCycle === 'annual' ? 'Annual (20% Off)' : 'Monthly' }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">CURRENT RATE</span>
                <span class="meta-value font-mono">\${{ billingCycle === 'annual' ? currentPlan.priceAnnual : currentPlan.priceMonthly }} / mo</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">NEXT RENEWAL</span>
                <span class="meta-value">Nov 18, 2026</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">AUTO-RENEW</span>
                <span class="badge badge-emerald">Enabled</span>
              </div>
            </div>
          </div>

          <div class="plan-hero-right">
            <div class="billing-cycle-switch">
              <span class="cycle-label" [class.active-cycle]="billingCycle === 'monthly'">Monthly</span>
              <button class="cycle-toggle-btn" (click)="toggleBillingCycle()" [class.annual-active]="billingCycle === 'annual'">
                <span class="toggle-knob"></span>
              </button>
              <span class="cycle-label" [class.active-cycle]="billingCycle === 'annual'">
                Annual <span class="badge badge-emerald save-badge">Save 20%</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Resource Quotas & Live Consumption -->
        <div class="section-title-bar">
          <h3 class="font-heading-3">Resource Quotas & Consumption</h3>
          <span class="font-caption">Cryptographically tracked against {{ currentPlan.name }} thresholds</span>
        </div>

        <div class="quotas-grid">
          <div class="glass-panel quota-card">
            <div class="quota-header">
              <span class="quota-title">👥 Team Seats</span>
              <span class="quota-count font-mono">{{ usedSeats }} / {{ currentPlan.maxSeats }} Seats</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill fill-indigo" [style.width.%]="(usedSeats / currentPlan.maxSeats) * 100"></div>
            </div>
            <div class="quota-footer font-caption">
              <span>{{ ((usedSeats / currentPlan.maxSeats) * 100).toFixed(0) }}% allocated</span>
              <span class="quota-status text-emerald">Healthy Capacity</span>
            </div>
          </div>

          <div class="glass-panel quota-card">
            <div class="quota-header">
              <span class="quota-title">💾 Encrypted Storage</span>
              <span class="quota-count font-mono">{{ usedStorageGb }} / {{ currentPlan.maxStorageGb }} GB</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill fill-cyan" [style.width.%]="(usedStorageGb / currentPlan.maxStorageGb) * 100"></div>
            </div>
            <div class="quota-footer font-caption">
              <span>{{ ((usedStorageGb / currentPlan.maxStorageGb) * 100).toFixed(0) }}% allocated</span>
              <span class="quota-status text-cyan">Secure Blob Store</span>
            </div>
          </div>

          <div class="glass-panel quota-card">
            <div class="quota-header">
              <span class="quota-title">⚡ API Gateway Calls</span>
              <span class="quota-count font-mono">{{ usedApiCalls.toLocaleString() }} / {{ currentPlan.apiLimitPerMonth.toLocaleString() }}</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill fill-violet" [style.width.%]="(usedApiCalls / currentPlan.apiLimitPerMonth) * 100"></div>
            </div>
            <div class="quota-footer font-caption">
              <span>{{ ((usedApiCalls / currentPlan.apiLimitPerMonth) * 100).toFixed(0) }}% used this month</span>
              <span class="quota-status text-emerald">Rate-limit Normal</span>
            </div>
          </div>

          <div class="glass-panel quota-card">
            <div class="quota-header">
              <span class="quota-title">🔄 Scheduled Workflows</span>
              <span class="quota-count font-mono">8 / 25 Tasks</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill fill-amber" [style.width.%]="(8 / 25) * 100"></div>
            </div>
            <div class="quota-footer font-caption">
              <span>32% utilized</span>
              <span class="quota-status text-emerald">Active Daemons</span>
            </div>
          </div>
        </div>

        <!-- Available Plans Matrix -->
        <div class="section-title-bar" style="margin-top: 2rem;">
          <h3 class="font-heading-3">Available Enterprise Tiers</h3>
          <span class="font-caption">Switch tiers with prorated instant provisioning</span>
        </div>

        <div class="plans-grid">
          <div 
            *ngFor="let plan of availablePlans" 
            class="glass-panel plan-tier-card"
            [class.active-tier]="plan.id === currentPlan.id"
            [class.featured-tier]="plan.popular"
          >
            <div class="plan-popular-tag" *ngIf="plan.popular">MOST POPULAR</div>
            <div class="plan-tier-header">
              <h4 class="font-heading-3">{{ plan.name }}</h4>
              <p class="font-caption">{{ plan.description }}</p>
            </div>

            <div class="plan-pricing">
              <span class="price-currency font-mono">$</span>
              <span class="price-val font-mono">{{ billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly }}</span>
              <span class="price-freq font-caption">/ month</span>
            </div>
            <div class="annual-saving-note font-caption" *ngIf="billingCycle === 'annual'">
              Billed \${{ plan.priceAnnual * 12 }} annually
            </div>

            <div class="tier-features-list">
              <div *ngFor="let f of plan.features" class="feature-item">
                <svg class="check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                <span>{{ f }}</span>
              </div>
            </div>

            <div class="plan-card-action">
              <button 
                *ngIf="plan.id === currentPlan.id" 
                class="btn-secondary w-full" 
                disabled
              >
                Current Active Plan
              </button>
              <button 
                *ngIf="plan.id !== currentPlan.id" 
                (click)="switchPlan(plan)" 
                [disabled]="!canManageBilling"
                class="btn-primary w-full"
              >
                {{ canManageBilling ? 'Switch to ' + plan.name : 'Admin Authorization Required' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 2: PAYMENT METHODS -->
      <div class="tab-content" *ngIf="activeTab === 'payment'">
        <div class="glass-panel content-card">
          <div class="card-title-bar">
            <div>
              <h3 class="font-heading-3">Payment Methods on File</h3>
              <p class="font-caption">Cryptographically secured cards for automated monthly license renewal</p>
            </div>
            <button (click)="openPaymentModal()" [disabled]="!canManageBilling" class="btn-primary btn-sm">
              + Add New Card
            </button>
          </div>

          <div class="cards-list">
            <div *ngFor="let card of paymentCards" class="credit-card-item glass-panel">
              <div class="card-brand-icon">
                <span *ngIf="card.brand === 'Visa'">💳 VISA</span>
                <span *ngIf="card.brand === 'Mastercard'">💳 MASTERCARD</span>
                <span *ngIf="card.brand === 'Amex'">💳 AMEX</span>
              </div>
              <div class="card-info">
                <div class="card-number-mask font-mono">•••• •••• •••• {{ card.last4 }}</div>
                <div class="card-sub font-caption">
                  <span>Expires {{ card.expiryMonth }}/{{ card.expiryYear }}</span> • 
                  <span>{{ card.holderName }}</span>
                </div>
              </div>
              <div class="card-badges">
                <span *ngIf="card.isDefault" class="badge badge-emerald">Default Payment</span>
                <button 
                  *ngIf="!card.isDefault && canManageBilling" 
                  (click)="setDefaultCard(card.id)" 
                  class="btn-ghost btn-sm"
                >
                  Make Default
                </button>
                <button 
                  *ngIf="paymentCards.length > 1 && canManageBilling" 
                  (click)="removeCard(card.id)" 
                  class="btn-ghost btn-sm text-rose"
                  title="Remove card"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="glass-panel content-card" style="margin-top: 1.5rem;">
          <h3 class="font-heading-3">Payment Security Notice</h3>
          <p class="font-body">
            All credit card operations are processed via PCI-DSS Level 1 compliant gateways. Orbit Suite does not store complete Primary Account Numbers (PANs) or CVV security codes on internal servers.
          </p>
        </div>
      </div>

      <!-- TAB 3: INVOICES & RECEIPTS -->
      <div class="tab-content" *ngIf="activeTab === 'invoices'">
        <div class="glass-panel content-card">
          <div class="card-title-bar">
            <div>
              <h3 class="font-heading-3">Billing History & Tax Invoices</h3>
              <p class="font-caption">Immutable billing statements generated on renewal dates</p>
            </div>
            <button (click)="exportAllInvoices()" class="btn-ghost btn-sm">
              Export Statement (CSV)
            </button>
          </div>

          <div class="invoices-table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Date Issued</th>
                  <th>Plan Tier</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th style="text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let inv of invoices">
                  <td class="font-mono font-medium">{{ inv.invoiceNumber }}</td>
                  <td class="font-caption">{{ inv.issueDate }}</td>
                  <td><span class="badge badge-indigo">{{ inv.planName }}</span></td>
                  <td class="font-mono font-medium">\${{ inv.amount.toFixed(2) }} {{ inv.currency }}</td>
                  <td>
                    <span class="badge" [ngClass]="inv.status === 'Paid' ? 'badge-emerald' : 'badge-rose'">
                      {{ inv.status }}
                    </span>
                  </td>
                  <td style="text-align: right;">
                    <button (click)="downloadInvoice(inv)" class="btn-ghost btn-sm" title="Download official PDF receipt">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      <span>Download PDF</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB 4: TAX & BILLING CONTACT -->
      <div class="tab-content" *ngIf="activeTab === 'details'">
        <div class="glass-panel content-card">
          <div class="card-title-bar">
            <div>
              <h3 class="font-heading-3">Corporate Tax & Billing Details</h3>
              <p class="font-caption">Information printed on monthly tax receipts and compliance audits</p>
            </div>
            <button (click)="saveBillingDetails()" [disabled]="!canManageBilling" class="btn-primary btn-sm">
              Save Billing Details
            </button>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Legal Organization Name</label>
              <input 
                type="text" 
                [(ngModel)]="billingContact.legalName" 
                [disabled]="!canManageBilling" 
                class="form-input" 
                placeholder="Enterprise Legal Name Inc."
              />
            </div>

            <div class="form-group">
              <label class="form-label">Billing Notifications Email</label>
              <input 
                type="email" 
                [(ngModel)]="billingContact.email" 
                [disabled]="!canManageBilling" 
                class="form-input" 
                placeholder="billing@orbitenterprise.com"
              />
            </div>

            <div class="form-group">
              <label class="form-label">VAT / Tax Identification Number</label>
              <input 
                type="text" 
                [(ngModel)]="billingContact.taxId" 
                [disabled]="!canManageBilling" 
                class="form-input font-mono" 
                placeholder="US-EIN 94-8291042 or EU-VAT 12345678"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Billing Currency</label>
              <select [(ngModel)]="billingContact.currency" [disabled]="!canManageBilling" class="form-select">
                <option value="USD">USD — United States Dollar ($)</option>
                <option value="EUR">EUR — Euro (€)</option>
                <option value="GBP">GBP — British Pound (£)</option>
                <option value="CAD">CAD — Canadian Dollar ($)</option>
              </select>
            </div>

            <div class="form-group full-width">
              <label class="form-label">Registered Corporate Billing Address</label>
              <textarea 
                [(ngModel)]="billingContact.address" 
                [disabled]="!canManageBilling" 
                rows="3" 
                class="form-textarea" 
                placeholder="100 Innovation Way, Suite 400, San Francisco, CA 94105, USA"
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL: ADD / UPDATE PAYMENT METHOD -->
      <div class="modal-backdrop" *ngIf="showPaymentModal" (click)="closePaymentModal()">
        <div class="modal-card glass-panel-elevated" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="font-heading-3">Update Corporate Credit Card</h3>
            <button class="close-btn" (click)="closePaymentModal()">✕</button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Cardholder Name</label>
              <input 
                type="text" 
                [(ngModel)]="newCard.holderName" 
                class="form-input" 
                placeholder="Alex Mercer"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Card Number</label>
              <input 
                type="text" 
                [(ngModel)]="newCard.cardNumber" 
                class="form-input font-mono" 
                placeholder="4242 •••• •••• 4242" 
                maxlength="19"
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Expiry Month</label>
                <select [(ngModel)]="newCard.expiryMonth" class="form-select">
                  <option *ngFor="let m of [1,2,3,4,5,6,7,8,9,10,11,12]" [value]="m">{{ m < 10 ? '0' + m : m }}</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Expiry Year</label>
                <select [(ngModel)]="newCard.expiryYear" class="form-select">
                  <option *ngFor="let y of [2026, 2027, 2028, 2029, 2030, 2031]" [value]="y">{{ y }}</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Security CVC</label>
                <input 
                  type="password" 
                  [(ngModel)]="newCard.cvc" 
                  class="form-input font-mono" 
                  placeholder="•••" 
                  maxlength="4"
                />
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button (click)="closePaymentModal()" class="btn-ghost">Cancel</button>
            <button (click)="saveNewCard()" class="btn-primary">Save Payment Method</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @use 'styles/variables' as *;
    @use 'styles/mixins' as *;

    .billing-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
    }

    .role-scope-banner {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1rem 1.25rem;
      border-left: 3px solid $aurora-cyan;
      background: rgba($aurora-cyan, 0.05);

      .scope-icon {
        font-size: 1.25rem;
      }

      .scope-title {
        font-size: 0.8125rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        color: $text-primary;
        margin-bottom: 0.25rem;
      }

      .scope-explanation {
        font-size: 0.875rem;
        color: $text-secondary;
        line-height: 1.4;
      }
    }

    .tabs-bar {
      display: flex;
      gap: 0.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 0.25rem;
      overflow-x: auto;
    }

    .tab-btn {
      background: transparent;
      border: none;
      color: $text-secondary;
      padding: 0.625rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      border-radius: $radius-sm;
      transition: all $transition-fast;
      white-space: nowrap;

      &:hover {
        color: $text-primary;
        background: rgba(255, 255, 255, 0.04);
      }

      &.active {
        color: $aurora-cyan;
        background: rgba($aurora-cyan, 0.1);
        font-weight: 600;
      }
    }

    .current-plan-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 2rem;
      padding: 2rem;
      background: linear-gradient(135deg, rgba($aurora-indigo, 0.12) 0%, rgba($aurora-violet, 0.08) 50%, rgba($aurora-cyan, 0.05) 100%);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: $radius-lg;
      flex-wrap: wrap;

      .plan-hero-left {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        max-width: 600px;
      }

      .plan-hero-name {
        font-size: 1.75rem;
        font-weight: 700;
        letter-spacing: -0.02em;
        background: linear-gradient(135deg, #ffffff 0%, rgba(255, 255, 255, 0.8) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .plan-meta-row {
        display: flex;
        align-items: center;
        gap: 2rem;
        margin-top: 1rem;
        flex-wrap: wrap;
      }

      .meta-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .meta-label {
        font-size: 0.6875rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        color: $text-muted;
      }

      .meta-value {
        font-size: 0.9375rem;
        font-weight: 600;
        color: $text-primary;
      }
    }

    .billing-cycle-switch {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: rgba(0, 0, 0, 0.3);
      padding: 0.5rem 1rem;
      border-radius: $radius-full;
      border: 1px solid rgba(255, 255, 255, 0.08);

      .cycle-label {
        font-size: 0.875rem;
        color: $text-muted;
        transition: color $transition-fast;

        &.active-cycle {
          color: $text-primary;
          font-weight: 600;
        }
      }

      .save-badge {
        font-size: 0.6875rem;
        padding: 0.125rem 0.375rem;
        margin-left: 0.25rem;
      }

      .cycle-toggle-btn {
        width: 44px;
        height: 24px;
        background: rgba(255, 255, 255, 0.15);
        border: none;
        border-radius: 12px;
        cursor: pointer;
        position: relative;
        transition: background $transition-fast;

        &.annual-active {
          background: $aurora-emerald;

          .toggle-knob {
            transform: translateX(20px);
          }
        }

        .toggle-knob {
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

    .section-title-bar {
      margin-top: 1.5rem;
      margin-bottom: 0.75rem;
    }

    .quotas-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1rem;
    }

    .quota-card {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;

      .quota-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .quota-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: $text-primary;
      }

      .quota-count {
        font-size: 0.8125rem;
        color: $text-secondary;
      }

      .progress-track {
        height: 8px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 4px;
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.4s ease;

        &.fill-indigo { background: linear-gradient(90deg, $aurora-indigo, #6366f1); }
        &.fill-cyan { background: linear-gradient(90deg, $aurora-cyan, #06b6d4); }
        &.fill-violet { background: linear-gradient(90deg, $aurora-violet, #a855f7); }
        &.fill-amber { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
      }

      .quota-footer {
        display: flex;
        justify-content: space-between;
        font-size: 0.75rem;
        color: $text-muted;
      }
    }

    .plans-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
    }

    .plan-tier-card {
      padding: 2rem;
      display: flex;
      flex-direction: column;
      position: relative;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: $radius-lg;
      transition: transform $transition-fast, border-color $transition-fast;

      &:hover {
        transform: translateY(-2px);
        border-color: rgba(255, 255, 255, 0.18);
      }

      &.active-tier {
        border-color: $aurora-cyan;
        background: rgba($aurora-cyan, 0.03);
      }

      &.featured-tier {
        border-color: rgba($aurora-indigo, 0.6);
        box-shadow: 0 8px 30px rgba($aurora-indigo, 0.15);
      }

      .plan-popular-tag {
        position: absolute;
        top: -12px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(90deg, $aurora-indigo, $aurora-violet);
        color: #ffffff;
        font-size: 0.6875rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        padding: 0.25rem 0.75rem;
        border-radius: $radius-full;
      }

      .plan-pricing {
        display: flex;
        align-items: baseline;
        gap: 0.25rem;
        margin: 1.25rem 0 0.25rem 0;

        .price-currency {
          font-size: 1.5rem;
          color: $text-secondary;
        }

        .price-val {
          font-size: 2.5rem;
          font-weight: 800;
          color: $text-primary;
          line-height: 1;
        }

        .price-freq {
          font-size: 0.875rem;
          color: $text-muted;
        }
      }

      .annual-saving-note {
        color: $aurora-emerald;
        margin-bottom: 1.25rem;
      }

      .tier-features-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin: 1.5rem 0;
        flex-grow: 1;
      }

      .feature-item {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        font-size: 0.875rem;
        color: $text-secondary;

        .check-icon {
          color: $aurora-emerald;
          flex-shrink: 0;
        }
      }

      .plan-card-action {
        margin-top: auto;
      }
    }

    .content-card {
      padding: 1.5rem;
      border-radius: $radius-lg;
    }

    .card-title-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .cards-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .credit-card-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem;
      gap: 1.5rem;
      flex-wrap: wrap;

      .card-brand-icon {
        font-size: 1.125rem;
        font-weight: 700;
        color: $aurora-cyan;
      }

      .card-number-mask {
        font-size: 1.125rem;
        letter-spacing: 0.1em;
        color: $text-primary;
      }

      .card-sub {
        color: $text-muted;
        margin-top: 0.25rem;
      }

      .card-badges {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
    }

    .invoices-table-container {
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;

      th {
        text-align: left;
        padding: 0.75rem 1rem;
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        color: $text-muted;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }

      td {
        padding: 1rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        color: $text-secondary;
      }

      tbody tr:hover {
        background: rgba(255, 255, 255, 0.02);
      }
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.25rem;

      .full-width {
        grid-column: 1 / -1;
      }
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
    }

    .form-label {
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      color: $text-secondary;
    }

    .form-input, .form-select, .form-textarea {
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: $radius-sm;
      padding: 0.625rem 0.875rem;
      font-size: 0.875rem;
      color: $text-primary;
      transition: border-color $transition-fast;

      &:focus {
        outline: none;
        border-color: $aurora-cyan;
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .form-textarea {
      resize: vertical;
      min-height: 80px;
    }

    // Modal
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .modal-card {
      width: 100%;
      max-width: 520px;
      padding: 1.75rem;
      border-radius: $radius-lg;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .close-btn {
        background: transparent;
        border: none;
        color: $text-muted;
        font-size: 1.25rem;
        cursor: pointer;

        &:hover {
          color: $text-primary;
        }
      }
    }

    .modal-body {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }

    .w-full {
      width: 100%;
    }
  `]
})
export class BillingComponent implements OnInit {
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  activeTab: BillingTab = 'subscription';
  billingCycle: 'monthly' | 'annual' = 'annual';
  currentRole: TenantRole = 'Owner';
  canManageBilling = true;

  // Quotas & Consumption telemetry
  usedSeats = 3;
  usedStorageGb = 14.2;
  usedApiCalls = 42190;

  availablePlans: PlanTier[] = [
    {
      id: 'plan-starter',
      name: 'Orbit Starter',
      description: 'Foundational operational governance for early-stage teams.',
      priceMonthly: 29,
      priceAnnual: 24,
      maxSeats: 5,
      maxStorageGb: 10,
      apiLimitPerMonth: 25000,
      features: [
        'Up to 5 authenticated team seats',
        'Tasks & Project Kanban Board',
        'Decoupled Employee Directory',
        'Standard Email Support',
        '10 GB Encrypted Storage'
      ]
    },
    {
      id: 'plan-pro',
      name: 'Orbit Professional',
      description: 'Full-suite business execution with multi-branch management.',
      priceMonthly: 99,
      priceAnnual: 79,
      popular: true,
      maxSeats: 15,
      maxStorageGb: 50,
      apiLimitPerMonth: 100000,
      features: [
        'Up to 15 authenticated team seats',
        'CRM & Deal Pipeline Funnels',
        'Support Ticket Desk with SLAs',
        'Multi-Branch Warehousing & Stock Ledger',
        'Invoicing & Digital Cash Receipts',
        '50 GB Encrypted Storage'
      ]
    },
    {
      id: 'plan-enterprise',
      name: 'Orbit Enterprise',
      description: 'Maximum security, forensic audit ledger, and high-volume yields.',
      priceMonthly: 249,
      priceAnnual: 199,
      maxSeats: 50,
      maxStorageGb: 250,
      apiLimitPerMonth: 500000,
      features: [
        'Up to 50 authenticated team seats',
        'Manufacturing Work Orders & BOM Recipes',
        'Digital Time Clock & HR Leave Approvals',
        'Executive Analytics & Data Exporter',
        'Immutable Cryptographic Audit Trail',
        'Dedicated 99.99% SLA Guarantee',
        '250 GB Encrypted Storage'
      ]
    }
  ];

  currentPlan: PlanTier = this.availablePlans[2]; // Default to Enterprise

  paymentCards: PaymentCard[] = [
    {
      id: 'card-1',
      brand: 'Mastercard',
      last4: '4242',
      expiryMonth: 12,
      expiryYear: 2028,
      holderName: 'Orbit Executive Operations',
      isDefault: true
    },
    {
      id: 'card-2',
      brand: 'Visa',
      last4: '8819',
      expiryMonth: 6,
      expiryYear: 2027,
      holderName: 'Orbit Secondary Backup',
      isDefault: false
    }
  ];

  invoices: BillingInvoice[] = [
    {
      id: 'inv-3',
      invoiceNumber: 'INV-2026-1003',
      issueDate: 'Oct 18, 2026',
      amount: 199.00,
      currency: 'USD',
      status: 'Paid',
      planName: 'Orbit Enterprise',
      downloadUrl: '/api/v1/billing/invoices/inv-3/pdf'
    },
    {
      id: 'inv-2',
      invoiceNumber: 'INV-2026-0902',
      issueDate: 'Sep 18, 2026',
      amount: 199.00,
      currency: 'USD',
      status: 'Paid',
      planName: 'Orbit Enterprise',
      downloadUrl: '/api/v1/billing/invoices/inv-2/pdf'
    },
    {
      id: 'inv-1',
      invoiceNumber: 'INV-2026-0801',
      issueDate: 'Aug 18, 2026',
      amount: 199.00,
      currency: 'USD',
      status: 'Paid',
      planName: 'Orbit Enterprise',
      downloadUrl: '/api/v1/billing/invoices/inv-1/pdf'
    }
  ];

  billingContact = {
    legalName: 'Apex Technologies Global Inc.',
    email: 'billing@apextechnologies.io',
    taxId: 'US-EIN 94-8291042',
    currency: 'USD',
    address: '100 Innovation Way, Suite 400, San Francisco, CA 94105, USA'
  };

  showPaymentModal = false;
  newCard = {
    holderName: '',
    cardNumber: '',
    expiryMonth: 12,
    expiryYear: 2028,
    cvc: ''
  };

  ngOnInit(): void {
    this.authService.activeTenant$.subscribe(tenant => {
      if (tenant) {
        this.currentRole = tenant.role;
        this.canManageBilling = this.currentRole === 'Owner' || this.currentRole === 'Admin';
      }
    });
  }

  toggleBillingCycle(): void {
    this.billingCycle = this.billingCycle === 'monthly' ? 'annual' : 'monthly';
    const cycleText = this.billingCycle === 'annual' ? 'annual (20% off)' : 'monthly';
    this.toastService.info(`Switched billing view to ${cycleText}.`);
  }

  switchPlan(plan: PlanTier): void {
    if (!this.canManageBilling) {
      this.toastService.error('Only Owners and Administrators can modify subscription plans.');
      return;
    }

    this.currentPlan = plan;
    this.toastService.success(`Successfully switched organization subscription to ${plan.name}!`);
  }

  setDefaultCard(cardId: string): void {
    if (!this.canManageBilling) return;
    this.paymentCards.forEach(c => c.isDefault = (c.id === cardId));
    this.toastService.success('Default payment card updated.');
  }

  removeCard(cardId: string): void {
    if (!this.canManageBilling) return;
    this.paymentCards = this.paymentCards.filter(c => c.id !== cardId);
    if (!this.paymentCards.some(c => c.isDefault) && this.paymentCards.length > 0) {
      this.paymentCards[0].isDefault = true;
    }
    this.toastService.info('Card removed from corporate billing vault.');
  }

  openPaymentModal(): void {
    this.newCard = {
      holderName: '',
      cardNumber: '',
      expiryMonth: 12,
      expiryYear: 2028,
      cvc: ''
    };
    this.showPaymentModal = true;
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
  }

  saveNewCard(): void {
    if (!this.newCard.holderName || !this.newCard.cardNumber) {
      this.toastService.error('Please complete all credit card fields.');
      return;
    }

    const last4 = this.newCard.cardNumber.replace(/\s+/g, '').slice(-4) || '1234';
    const newCardEntry: PaymentCard = {
      id: 'card-' + Date.now(),
      brand: 'Visa',
      last4: last4,
      expiryMonth: Number(this.newCard.expiryMonth),
      expiryYear: Number(this.newCard.expiryYear),
      holderName: this.newCard.holderName,
      isDefault: false
    };

    this.paymentCards.push(newCardEntry);
    this.showPaymentModal = false;
    this.toastService.success(`New Visa ending in ${last4} added to payment vault.`);
  }

  downloadInvoice(inv: BillingInvoice): void {
    this.toastService.success(`Generating PDF statement for ${inv.invoiceNumber}... download ready.`);
  }

  exportAllInvoices(): void {
    const csvContent = 'Invoice,Date,Plan,Amount,Currency,Status\n' + 
      this.invoices.map(i => `${i.invoiceNumber},${i.issueDate},${i.planName},${i.amount},${i.currency},${i.status}`).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `orbit-billing-statements-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.toastService.success('Exported billing history to CSV.');
  }

  saveBillingDetails(): void {
    if (!this.canManageBilling) return;
    this.toastService.success('Tax and corporate billing contact updated successfully.');
  }
}
