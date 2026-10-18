import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

interface ModuleSpecData {
  title: string;
  badge: string;
  phase: string;
  description: string;
  purpose: string;
  confirmedBoundaries: string[];
  pendingDecisions: { decision: string; why: string; options: string }[];
  plannedEntities: string[];
}

@Component({
  selector: 'app-module-spec',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="module-spec-page" *ngIf="currentSpec">
      <!-- Header -->
      <div class="page-header">
        <div>
          <div class="badge badge-indigo" style="margin-bottom: 0.5rem;">{{ currentSpec.phase }}</div>
          <h1 class="font-heading-2">{{ currentSpec.title }}</h1>
          <p class="font-caption">{{ currentSpec.description }}</p>
        </div>
        <div class="badge badge-amber">
          Awaiting Domain Workflow Approval
        </div>
      </div>

      <!-- Architectural Rule Warning Banner -->
      <div class="rule-banner glass-panel">
        <div class="rule-icon">⚠️</div>
        <div class="rule-content">
          <strong>Critical Engineering Rule:</strong> The presence of this module in the first-release scope does not mean its detailed business rules have been locked down. To prevent fabricating domain logic (e.g. posting rules, labor laws, or costing formulas), architectural boundaries are defined and awaiting confirmed workflow decisions.
        </div>
      </div>

      <!-- Scope & Purpose Card -->
      <div class="glass-panel-elevated content-card">
        <h2 class="font-heading-3 card-title">Module Scope & Architectural Purpose</h2>
        <p class="font-body">{{ currentSpec.purpose }}</p>

        <h3 class="font-heading-3 sub-title">Confirmed Architectural Integration Points</h3>
        <ul class="points-list">
          <li *ngFor="let point of currentSpec.confirmedBoundaries">
            <span class="point-check">✓</span>
            <span>{{ point }}</span>
          </li>
        </ul>
      </div>

      <!-- Decisions Requiring Confirmation -->
      <div class="glass-panel content-card">
        <h2 class="font-heading-3 card-title">Decisions Required Before Detailed Implementation</h2>
        <p class="font-caption" style="margin-bottom: 1.25rem;">
          The following decisions must be confirmed before creating production state transitions:
        </p>

        <div class="decisions-table-container">
          <table class="decisions-table">
            <thead>
              <tr>
                <th>Decision Required</th>
                <th>Why It Matters</th>
                <th>Architectural Options</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of currentSpec.pendingDecisions">
                <td class="dec-title">{{ item.decision }}</td>
                <td class="dec-why">{{ item.why }}</td>
                <td class="dec-opt">{{ item.options }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Planned Entities & Contracts -->
      <div class="glass-panel content-card">
        <h2 class="font-heading-3 card-title">Planned Domain Entities (Pending Confirmation)</h2>
        <div class="entity-pills">
          <span *ngFor="let ent of currentSpec.plannedEntities" class="badge badge-cyan">
            {{ ent }}
          </span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @use 'styles/variables' as *;
    @use 'styles/mixins' as *;

    .module-spec-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;

      @include responsive-sm {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
    }

    .rule-banner {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.25rem 1.5rem;
      border-color: rgba(245, 158, 11, 0.3);
      background: rgba(245, 158, 11, 0.05);

      .rule-icon {
        font-size: 1.5rem;
      }

      .rule-content {
        font-size: 0.8125rem;
        color: #fde68a;
        line-height: 1.5;

        strong {
          color: #ffffff;
        }
      }
    }

    .content-card {
      padding: 1.75rem;

      .card-title {
        margin-bottom: 0.75rem;
      }

      .sub-title {
        margin-top: 1.5rem;
        margin-bottom: 0.75rem;
        font-size: 1rem;
      }
    }

    .points-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      li {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        font-size: 0.875rem;
        color: $text-secondary;

        .point-check {
          color: #6ee7b7;
          font-weight: 700;
        }
      }
    }

    .decisions-table-container {
      overflow-x: auto;
    }

    .decisions-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8125rem;

      th {
        text-align: left;
        padding: 0.75rem 1rem;
        background: rgba(255, 255, 255, 0.03);
        border-bottom: 1px solid $border-glass;
        color: $text-muted;
        font-weight: 600;
        text-transform: uppercase;
        font-size: 0.6875rem;
        letter-spacing: 0.05em;
      }

      td {
        padding: 0.875rem 1rem;
        border-bottom: 1px solid $border-glass;
        vertical-align: top;
      }

      .dec-title {
        color: #ffffff;
        font-weight: 600;
        white-space: nowrap;
      }

      .dec-why {
        color: $text-secondary;
      }

      .dec-opt {
        color: #a5b4fc;
      }
    }

    .entity-pills {
      display: flex;
      gap: 0.625rem;
      flex-wrap: wrap;
    }
  `]
})
export class ModuleSpecComponent implements OnInit {
  public currentSpec: ModuleSpecData | null = null;

  private specs: Record<string, ModuleSpecData> = {
    crm: {
      title: 'CRM & Sales Management',
      badge: 'CRM',
      phase: 'Phase 7 Module Specification',
      description: 'Account tracking, lead qualification, and opportunity pipeline governance',
      purpose: 'Provide structured sales relationship management logically isolated per company tenant without crossing into arbitrary financial booking.',
      confirmedBoundaries: [
        'Mandatory TenantId scoping via ITenantScopedEntity.',
        'Access controls restricted to sales representatives, managers, and tenant admins.',
        'Shared customer identifiers ready for downstream support and invoicing links.'
      ],
      pendingDecisions: [
        { decision: 'Lead Lifecycle Transitions', why: 'Dictates state machine allowed moves', options: 'Strict linear stages vs flexible custom board' },
        { decision: 'Customer Ownership Model', why: 'Determines record privacy among sales reps', options: 'Company-shared vs rep-owned private accounts' },
        { decision: 'Quotation Approval Matrix', why: 'Controls whether discounts require manager approval', options: 'Automatic under threshold vs mandatory sign-off' }
      ],
      plannedEntities: ['Lead', 'Contact', 'CustomerAccount', 'Opportunity', 'SalesStage', 'Quotation']
    },
    support: {
      title: 'Customer Support & Ticketing',
      badge: 'Support',
      phase: 'Phase 7 Module Specification',
      description: 'Incident tracking, SLA governance, and customer case management',
      purpose: 'Manage client issue resolution and case routing isolated strictly to tenant customer accounts.',
      confirmedBoundaries: [
        'Complete isolation between independent tenants.',
        'Support tickets link to verified Company customer accounts.',
        'Role-scoped assignment to support employees.'
      ],
      pendingDecisions: [
        { decision: 'SLA Escalation Rules', why: 'Governs notification and priority inflation', options: 'Tiered response timers vs manual priority' },
        { decision: 'Customer Portal Access', why: 'Determines external user access', options: 'Read-only public token vs dedicated customer logins' },
        { decision: 'Internal vs Public Notes', why: 'Prevents internal discussion leakage', options: 'Visibility flag on ticket comments' }
      ],
      plannedEntities: ['Ticket', 'TicketComment', 'SlaPolicy', 'SupportCategory', 'CustomerContact']
    },
    inventory: {
      title: 'Inventory & Procurement',
      badge: 'Inventory',
      phase: 'Phase 7 Module Specification',
      description: 'Warehouse storage locations, stock ledger movements, and purchase orders',
      purpose: 'Track product availability, supplier catalogs, and inventory valuation across branch facilities.',
      confirmedBoundaries: [
        'Branch-scoped warehouse storage locations.',
        'Immutable stock transaction ledger (no hard deletes on inventory movements).',
        'Direct link to procurement purchase requisitions.'
      ],
      pendingDecisions: [
        { decision: 'Inventory Costing Method', why: 'Financial balance sheet implications', options: 'FIFO vs Weighted Average Costing' },
        { decision: 'Stock Reorder Automation', why: 'Triggers supplier purchase orders', options: 'Automated threshold orders vs notification only' },
        { decision: 'Multi-Location Transfers', why: 'Transit stock custody and approval', options: 'Two-step dispatch/receive vs instant transfer' }
      ],
      plannedEntities: ['ProductItem', 'Warehouse', 'StockMovement', 'Supplier', 'PurchaseOrder', 'InventoryCount']
    },
    manufacturing: {
      title: 'Manufacturing & Production',
      badge: 'Manufacturing',
      phase: 'Phase 7 Module Specification',
      description: 'Bills of Materials (BOM), work centers, and production order routing',
      purpose: 'Coordinate raw material conversion into finished goods with full lot traceability.',
      confirmedBoundaries: [
        'Integrated with Branch facilities and inventory stores.',
        'Audited material consumption logs.',
        'Production orders assigned to manufacturing teams.'
      ],
      pendingDecisions: [
        { decision: 'Routing & Work Center Scheduling', why: 'Capacity planning complexity', options: 'Sequential operations vs concurrent stages' },
        { decision: 'Scrap & Wastage Accounting', why: 'Cost variance attribution', options: 'Standard scrap allowance vs actual logged loss' },
        { decision: 'Lot/Batch Tracking', why: 'Regulatory traceability requirements', options: 'Mandatory batch numbers vs optional tracking' }
      ],
      plannedEntities: ['WorkCenter', 'BillOfMaterials', 'ProductionOrder', 'OperationStep', 'MaterialConsumption']
    },
    hr: {
      title: 'HR & Attendance',
      badge: 'HR',
      phase: 'Phase 7 Module Specification',
      description: 'Shift scheduling, leave requests, and employee administration',
      purpose: 'Manage organizational staffing, time tracking, and leave policies while honoring jurisdiction neutrality.',
      confirmedBoundaries: [
        'Linked directly to EmployeeProfile domain entity.',
        'Managerial approval hierarchy based on confirmed ReportsTo relationships.',
        'Data privacy protections on sensitive medical/leave notes.'
      ],
      pendingDecisions: [
        { decision: 'Attendance Validation Method', why: 'Determines check-in integrity', options: 'IP / Geo-fence check-in vs manual logging' },
        { decision: 'Leave Accrual Policy', why: 'Labor law dependencies', options: 'Configurable accrual rates vs manual allocation' },
        { decision: 'Payroll Integration Boundary', why: 'High-compliance external boundary', options: 'Internal calculations vs export to third-party payroll' }
      ],
      plannedEntities: ['ShiftSchedule', 'AttendanceLog', 'LeaveRequest', 'LeaveType', 'HolidayCalendar']
    },
    finance: {
      title: 'Invoicing & Accounting',
      badge: 'Finance',
      phase: 'Phase 7 Module Specification',
      description: 'General ledger, double-entry auditability, invoice posting, and reconciliation',
      purpose: 'High-integrity fiscal tracking enforcing immutable transaction recording and currency precision.',
      confirmedBoundaries: [
        'Strict immutability: posted invoices and journal entries cannot be silently deleted.',
        'Multi-currency support with configurable tenant base currency.',
        'Tenant-scoped chart of accounts.'
      ],
      pendingDecisions: [
        { decision: 'Tax Calculation Engine', why: 'Jurisdiction and tax compliance rules', options: 'Manual tax rates vs automated external tax API' },
        { decision: 'Fiscal Period Locking', why: 'Prevents retroactive tampering', options: 'Strict monthly closing lock vs open adjustments' },
        { decision: 'Payment Gateway Integration', why: 'Security and PCI compliance', options: 'Stripe/Adyen hosted checkout vs manual wire logging' }
      ],
      plannedEntities: ['Account', 'JournalEntry', 'Invoice', 'InvoiceLine', 'PaymentRecord', 'TaxRate']
    },
    reports: {
      title: 'Reports & Dashboards',
      badge: 'Reporting',
      phase: 'Phase 7 Module Specification',
      description: 'Executive cross-module reporting, data aggregation, and compliance exports',
      purpose: 'Deliver authorized operational insights and performance trends while preserving tenant isolation.',
      confirmedBoundaries: [
        'All reporting queries inherit EF Core Global Query Filters.',
        'No cross-tenant data aggregation permitted.',
        'Role-scoped visibility on financial and HR reports.'
      ],
      pendingDecisions: [
        { decision: 'Data Refresh Cadence', why: 'Database load and performance strategy', options: 'Real-time query vs read-replica materialized cache' },
        { decision: 'Export Formats', why: 'Client reporting requirements', options: 'CSV, Excel, and PDF generators' },
        { decision: 'Custom Report Builder', why: 'Flexibility vs security risk', options: 'Curated standard reports vs user-built queries' }
      ],
      plannedEntities: ['ReportDefinition', 'ScheduledReport', 'ReportExportHistory', 'DashboardWidget']
    }
  };

  constructor(private route: ActivatedRoute) {}

  public ngOnInit(): void {
    this.route.data.subscribe(data => {
      const moduleKey = data['moduleKey'] || 'crm';
      this.currentSpec = this.specs[moduleKey] || this.specs['crm'];
    });
  }
}
