import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FinanceComponent } from './finance.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Invoice, PaymentRecord } from '../../core/models/models';
import { of } from 'rxjs';

describe('FinanceComponent', () => {
  let component: FinanceComponent;
  let fixture: ComponentFixture<FinanceComponent>;

  const createDummyPayment = (overrides?: Partial<PaymentRecord>): PaymentRecord => ({
    id: 'pay-1',
    invoiceId: 'inv-1',
    paymentNumber: 'REC-2026-001',
    amount: 5000,
    paymentDateUtc: '2026-02-01T12:00:00Z',
    method: 'BankTransfer',
    methodName: 'Bank Transfer',
    referenceNumber: 'WIRE-99881',
    notes: 'Partial settlement',
    recordedByEmployeeName: 'Finance Lead',
    ...overrides
  });

  const createDummyInvoice = (overrides?: Partial<Invoice>): Invoice => ({
    id: 'inv-1',
    tenantId: 't-1',
    invoiceNumber: 'INV-2026-001',
    customerId: 'cust-1',
    customerName: 'Apex Dynamics',
    customerEmail: 'billing@apexdynamics.com',
    dealTitle: 'Enterprise Cloud',
    issueDateUtc: '2026-01-15T00:00:00Z',
    dueDateUtc: '2026-02-15T00:00:00Z',
    status: 'Issued',
    statusName: 'Issued',
    currency: 'USD',
    subtotal: 10000,
    taxRate: 10,
    taxAmount: 1000,
    discountAmount: 0,
    totalAmount: 11000,
    amountPaid: 5000,
    balanceDue: 6000,
    isOverdue: false,
    items: [],
    payments: [createDummyPayment()],
    createdAtUtc: '2026-01-15T10:00:00Z',
    ...overrides
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinanceComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            activeTenant$: of({ id: 't-1', name: 'Apex Global', slug: 'apex', role: 'Owner' }),
            currentRole: 'Owner'
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FinanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the finance component', () => {
    expect(component).toBeTruthy();
  });

  it('should default to invoices tab upon initialization', () => {
    expect(component.activeTab).toBe('invoices');
  });

  it('should toggle between invoices and payments tabs', () => {
    component.activeTab = 'payments';
    expect(component.activeTab).toBe('payments');

    component.activeTab = 'invoices';
    expect(component.activeTab).toBe('invoices');
  });

  it('should evaluate canManageInvoices correctly based on role', () => {
    component.currentRole = 'Owner';
    expect(component.canManageInvoices).toBeTrue();

    component.currentRole = 'Manager';
    expect(component.canManageInvoices).toBeTrue();

    component.currentRole = 'Admin';
    expect(component.canManageInvoices).toBeTrue();

    component.currentRole = 'Employee';
    expect(component.canManageInvoices).toBeFalse();
  });

  it('should toggle create invoice and preview modals', () => {
    component.openCreateModal();
    expect(component.showCreateModal).toBeTrue();
    component.showCreateModal = false;
    expect(component.showCreateModal).toBeFalse();

    const inv = createDummyInvoice();
    component.viewInvoiceDetails(inv);
    expect(component.showPreviewModal).toBeTrue();
    expect(component.previewInvoice).toBe(inv);
  });

  it('should calculate payment progress correctly', () => {
    const inv = createDummyInvoice({ totalAmount: 10000, amountPaid: 2500 });
    expect(component.getPaymentProgress(inv)).toBe(25);

    const zeroInv = createDummyInvoice({ totalAmount: 0, amountPaid: 0 });
    expect(component.getPaymentProgress(zeroInv)).toBe(0);
  });

  it('should filter invoices by search query, status, and customer', () => {
    component.invoices = [
      createDummyInvoice({ id: 'inv-1', invoiceNumber: 'INV-101', customerName: 'Apex', status: 'Issued', customerId: 'c-1' }),
      createDummyInvoice({ id: 'inv-2', invoiceNumber: 'INV-202', customerName: 'Zenith', status: 'Paid', customerId: 'c-2' }),
      createDummyInvoice({ id: 'inv-3', invoiceNumber: 'INV-303', customerName: 'Omega', status: 'Draft', customerId: 'c-3' })
    ];

    component.searchQuery = 'Zenith';
    component.applyFilters();
    expect(component.filteredInvoices.length).toBe(1);
    expect(component.filteredInvoices[0].id).toBe('inv-2');

    component.searchQuery = '';
    component.statusFilter = 'Draft';
    component.applyFilters();
    expect(component.filteredInvoices.length).toBe(1);
    expect(component.filteredInvoices[0].id).toBe('inv-3');

    component.statusFilter = '';
    component.customerFilter = 'c-1';
    component.applyFilters();
    expect(component.filteredInvoices.length).toBe(1);
    expect(component.filteredInvoices[0].id).toBe('inv-1');
  });

  it('should export invoices to CSV in invoices tab', () => {
    component.activeTab = 'invoices';
    component.filteredInvoices = [
      createDummyInvoice({ invoiceNumber: 'INV-EXP-01' })
    ];

    spyOn(document, 'createElement').and.callThrough();
    component.exportFinanceCsv();
    expect(document.createElement).toHaveBeenCalledWith('a');
  });

  it('should export payments ledger to CSV in payments tab', () => {
    component.activeTab = 'payments';
    component.invoices = [
      createDummyInvoice({
        invoiceNumber: 'INV-EXP-02',
        payments: [createDummyPayment({ paymentNumber: 'PAY-EXP-01' })]
      })
    ];

    spyOn(document, 'createElement').and.callThrough();
    component.exportFinanceCsv();
    expect(document.createElement).toHaveBeenCalledWith('a');
  });

  it('should trigger window.print when printInvoice is called', () => {
    spyOn(window, 'print');
    component.printInvoice();
    expect(window.print).toHaveBeenCalled();
  });
});

