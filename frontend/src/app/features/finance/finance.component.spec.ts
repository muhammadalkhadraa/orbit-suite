import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FinanceComponent } from './finance.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

describe('FinanceComponent', () => {
  let component: FinanceComponent;
  let fixture: ComponentFixture<FinanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinanceComponent, HttpClientTestingModule],
      providers: [provideRouter([])]
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

  it('should toggle create invoice modal', () => {
    component.openCreateModal();
    expect(component.showCreateModal).toBeTrue();
    component.showCreateModal = false;
    expect(component.showCreateModal).toBeFalse();
  });
});
