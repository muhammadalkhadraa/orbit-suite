import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'Orbit Suite — Enterprise Multi-Tenant Operating System',
    loadComponent: () => import('./layouts/marketing-layout/marketing-layout.component').then(m => m.MarketingLayoutComponent)
  },
  {
    path: 'login',
    title: 'Sign In | Orbit Business Suite',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    title: 'Register Organization | Orbit Business Suite',
    loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'app',
    loadComponent: () => import('./layouts/workspace-layout/workspace-layout.component').then(m => m.WorkspaceLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        title: 'Executive Dashboard | Orbit Suite',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'tasks',
        title: 'Tasks & Projects | Orbit Suite',
        loadComponent: () => import('./features/tasks/tasks.component').then(m => m.TasksComponent)
      },
      {
        path: 'employees',
        title: 'Employee Directory | Orbit Suite',
        loadComponent: () => import('./features/employees/employees.component').then(m => m.EmployeesComponent)
      },
      {
        path: 'organization',
        title: 'Organization Structure | Orbit Suite',
        loadComponent: () => import('./features/organization/organization.component').then(m => m.OrganizationComponent)
      },
      {
        path: 'crm',
        title: 'CRM & Sales Pipeline | Orbit Suite',
        loadComponent: () => import('./features/crm/crm.component').then(m => m.CrmComponent)
      },
      {
        path: 'support',
        title: 'Customer Support Desk | Orbit Suite',
        loadComponent: () => import('./features/support/support.component').then(m => m.SupportComponent)
      },
      {
        path: 'inventory',
        title: 'Inventory & Procurement | Orbit Suite',
        loadComponent: () => import('./features/inventory/inventory.component').then(m => m.InventoryComponent)
      },
      {
        path: 'manufacturing',
        title: 'Manufacturing & BOM | Orbit Suite',
        loadComponent: () => import('./features/manufacturing/manufacturing.component').then(m => m.ManufacturingComponent)
      },
      {
        path: 'hr',
        title: 'HR & Digital Attendance | Orbit Suite',
        loadComponent: () => import('./features/hr/hr.component').then(m => m.HrComponent)
      },
      {
        path: 'finance',
        title: 'Invoicing & Accounting | Orbit Suite',
        loadComponent: () => import('./features/finance/finance.component').then(m => m.FinanceComponent)
      },
      {
        path: 'reports',
        title: 'Reports & Analytics | Orbit Suite',
        loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent)
      },
      {
        path: 'audit',
        title: 'Audit Trail & Compliance | Orbit Suite',
        canActivate: [roleGuard],
        data: { roles: ['Owner', 'Admin', 'Manager'] },
        loadComponent: () => import('./features/audit/audit.component').then(m => m.AuditComponent)
      },
      {
        path: 'settings',
        title: 'Workspace Settings | Orbit Suite',
        canActivate: [roleGuard],
        data: { roles: ['Owner', 'Admin'] },
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
      },
      {
        path: 'billing',
        title: 'Plans & Billing | Orbit Suite',
        loadComponent: () => import('./features/billing/billing.component').then(m => m.BillingComponent)
      }
    ]
  },
  {
    path: '404',
    title: '404 Not Found | Orbit Suite',
    loadComponent: () => import('./features/not-found/not-found.component').then(m => m.NotFoundComponent)
  },
  {
    path: '**',
    title: '404 Not Found | Orbit Suite',
    loadComponent: () => import('./features/not-found/not-found.component').then(m => m.NotFoundComponent)
  }
];
