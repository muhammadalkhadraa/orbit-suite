import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrmComponent } from './crm.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { Customer, Deal } from '../../core/models/models';
import { of } from 'rxjs';

describe('CrmComponent', () => {
  let component: CrmComponent;
  let fixture: ComponentFixture<CrmComponent>;
  let apiService: ApiService;

  const createDummyCustomer = (overrides?: Partial<Customer>): Customer => ({
    id: 'cust-1',
    tenantId: 't-1',
    companyName: 'Apex Dynamics',
    contactPerson: 'Alex Mercer',
    email: 'alex@apexdynamics.com',
    phone: '+1-555-0100',
    website: 'https://apexdynamics.com',
    industry: 'Enterprise Software',
    status: 'ActiveCustomer',
    assignedEmployeeId: 'emp-1',
    assignedEmployeeName: 'Sarah Connor',
    createdAtUtc: '2026-01-15T10:00:00Z',
    ...overrides
  });

  const createDummyDeal = (overrides?: Partial<Deal>): Deal => ({
    id: 'deal-1',
    tenantId: 't-1',
    title: 'Global Cloud Modernization',
    customerId: 'cust-1',
    customerName: 'Apex Dynamics',
    assignedEmployeeId: 'emp-1',
    assignedEmployeeName: 'Sarah Connor',
    amount: 150000,
    currency: 'USD',
    stage: 'Qualified',
    stageName: 'Qualified',
    probability: 40,
    expectedCloseDateUtc: '2026-12-31',
    createdAtUtc: '2026-01-20T10:00:00Z',
    ...overrides
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrmComponent, HttpClientTestingModule],
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

    fixture = TestBed.createComponent(CrmComponent);
    component = fixture.componentInstance;
    apiService = TestBed.inject(ApiService);
    fixture.detectChanges();
  });

  it('should create the CRM component', () => {
    expect(component).toBeTruthy();
  });

  it('should default to PIPELINE view upon initialization', () => {
    expect(component.activeView).toBe('PIPELINE');
  });

  it('should toggle between PIPELINE and ACCOUNTS views', () => {
    component.activeView = 'ACCOUNTS';
    expect(component.activeView).toBe('ACCOUNTS');

    component.activeView = 'PIPELINE';
    expect(component.activeView).toBe('PIPELINE');
  });

  it('should have 6 calibrated stages in pipelineStages', () => {
    expect(component.pipelineStages.length).toBe(6);
    expect(component.pipelineStages[0].key).toBe('Lead');
    expect(component.pipelineStages[4].key).toBe('ClosedWon');
    expect(component.pipelineStages[5].key).toBe('ClosedLost');
  });

  it('should toggle customer and deal creation modals', () => {
    component.openCreateCustomerModal();
    expect(component.showCustomerModal).toBeTrue();
    component.closeCustomerModal();
    expect(component.showCustomerModal).toBeFalse();

    component.openCreateDealModal();
    expect(component.showDealModal).toBeTrue();
    component.closeDealModal();
    expect(component.showDealModal).toBeFalse();
  });

  it('should filter deals by search query and sales rep', () => {
    component.deals = [
      createDummyDeal({ id: 'deal-1', title: 'ERP Migration', customerName: 'Apex', assignedEmployeeId: 'emp-1' }),
      createDummyDeal({ id: 'deal-2', title: 'Security Audit', customerName: 'Zenith', assignedEmployeeId: 'emp-2' })
    ];

    component.dealSearchQuery = 'ERP';
    component.applyDealFilters();
    expect(component.filteredDeals.length).toBe(1);
    expect(component.filteredDeals[0].id).toBe('deal-1');

    component.dealSearchQuery = '';
    component.dealSelectedEmployeeId = 'emp-2';
    component.applyDealFilters();
    expect(component.filteredDeals.length).toBe(1);
    expect(component.filteredDeals[0].id).toBe('deal-2');
  });

  it('should filter customers by status tab and search query', () => {
    component.customers = [
      createDummyCustomer({ id: 'cust-1', companyName: 'Apex Dynamics', status: 'ActiveCustomer' }),
      createDummyCustomer({ id: 'cust-2', companyName: 'Beta Robotics', status: 'Lead' })
    ];

    component.selectedTab = 'Lead';
    component.applyFilters();
    expect(component.filteredCustomers.length).toBe(1);
    expect(component.filteredCustomers[0].id).toBe('cust-2');

    component.selectedTab = 'ALL';
    component.searchQuery = 'Dynamics';
    component.applyFilters();
    expect(component.filteredCustomers.length).toBe(1);
    expect(component.filteredCustomers[0].id).toBe('cust-1');
  });

  it('should advance deal stage through pipeline', () => {
    const deal = createDummyDeal({ id: 'deal-1', stage: 'Qualified' });
    spyOn(apiService, 'updateDealStage').and.returnValue(of({ success: true, data: deal }));
    spyOn(component, 'loadDeals');
    spyOn(component, 'loadDealMetrics');

    component.advanceDealStage(deal);
    expect(apiService.updateDealStage).toHaveBeenCalledWith('deal-1', 'Proposal');
    expect(component.loadDeals).toHaveBeenCalled();
    expect(component.loadDealMetrics).toHaveBeenCalled();
  });

  it('should quick mark deal as won', () => {
    const deal = createDummyDeal({ id: 'deal-1', stage: 'Negotiation' });
    spyOn(apiService, 'updateDealStage').and.returnValue(of({ success: true, data: deal }));
    spyOn(component, 'loadDeals');
    spyOn(component, 'loadDealMetrics');

    component.quickMarkWon(deal);
    expect(apiService.updateDealStage).toHaveBeenCalledWith('deal-1', 'ClosedWon', 100);
    expect(component.loadDeals).toHaveBeenCalled();
  });

  it('should prompt confirmation and delete deal', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(apiService, 'deleteDeal').and.returnValue(of({ success: true, data: null }));
    spyOn(component, 'loadDeals');
    spyOn(component, 'loadDealMetrics');

    component.deleteDeal('deal-1');
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this deal opportunity?');
    expect(apiService.deleteDeal).toHaveBeenCalledWith('deal-1');
    expect(component.loadDeals).toHaveBeenCalled();
  });

  it('should prompt confirmation and delete customer', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(apiService, 'deleteCustomer').and.returnValue(of({ success: true, data: null }));
    spyOn(component, 'loadCustomers');

    component.deleteCustomer('cust-1');
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this customer account?');
    expect(apiService.deleteCustomer).toHaveBeenCalledWith('cust-1');
    expect(component.loadCustomers).toHaveBeenCalled();
  });

  it('should export pipeline deals to CSV in PIPELINE view', () => {
    component.activeView = 'PIPELINE';
    component.filteredDeals = [
      createDummyDeal({
        id: 'deal-1',
        title: 'Cloud Infrastructure Expansion',
        customerName: 'Apex Dynamics',
        amount: 85000,
        currency: 'USD',
        stage: 'Proposal',
        probability: 60
      })
    ];

    spyOn(document, 'createElement').and.callThrough();
    component.exportCrmToCsv();
    expect(document.createElement).toHaveBeenCalledWith('a');
  });

  it('should export customer accounts to CSV in ACCOUNTS view', () => {
    component.activeView = 'ACCOUNTS';
    component.filteredCustomers = [
      createDummyCustomer({
        id: 'cust-1',
        companyName: 'Apex Dynamics',
        contactPerson: 'Alex Mercer',
        industry: 'Software'
      })
    ];

    spyOn(document, 'createElement').and.callThrough();
    component.exportCrmToCsv();
    expect(document.createElement).toHaveBeenCalledWith('a');
  });
});

