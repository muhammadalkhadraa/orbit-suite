import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SupportComponent } from './support.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { SupportTicket } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { of } from 'rxjs';

describe('SupportComponent', () => {
  let component: SupportComponent;
  let fixture: ComponentFixture<SupportComponent>;
  let apiService: ApiService;

  const createDummyTicket = (overrides?: Partial<SupportTicket>): SupportTicket => ({
    id: 't-1',
    tenantId: 'tenant-1',
    ticketNumber: 'TCK-1001',
    subject: 'API Gateway Timeout',
    description: 'Encountered 504 on sync',
    category: 'Technical',
    categoryName: 'Technical',
    priority: 'High',
    priorityName: 'High',
    status: 'Open',
    statusName: 'Open',
    customerId: 'c-1',
    customerName: 'Acme Corp',
    commentsCount: 0,
    comments: [],
    createdAtUtc: new Date().toISOString(),
    ...overrides
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupportComponent, HttpClientTestingModule],
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

    fixture = TestBed.createComponent(SupportComponent);
    component = fixture.componentInstance;
    apiService = TestBed.inject(ApiService);
    fixture.detectChanges();
  });

  it('should create the support component', () => {
    expect(component).toBeTruthy();
  });

  it('should render header title and permission scope banner', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Customer Support & Incident Desk');
    expect(compiled.querySelector('.role-scope-banner')).toBeTruthy();
  });

  it('should filter tickets by status tab', () => {
    component.tickets = [
      createDummyTicket({ id: 't-1', ticketNumber: 'TCK-1001', status: 'Open', statusName: 'Open' }),
      createDummyTicket({ id: 't-2', ticketNumber: 'TCK-1002', status: 'Resolved', statusName: 'Resolved' })
    ];

    component.selectStatusTab('Open');
    expect(component.selectedTab).toBe('Open');
    expect(component.filteredTickets.length).toBe(1);
    expect(component.filteredTickets[0].ticketNumber).toBe('TCK-1001');

    component.selectStatusTab('Resolved');
    expect(component.filteredTickets.length).toBe(1);
    expect(component.filteredTickets[0].ticketNumber).toBe('TCK-1002');

    component.selectStatusTab('ALL');
    expect(component.filteredTickets.length).toBe(2);
  });

  it('should search tickets by keyword', () => {
    component.tickets = [
      createDummyTicket({
        id: 't-1',
        ticketNumber: 'TCK-1001',
        subject: 'Database Replication Lag',
        customerName: 'Starlight Dynamics'
      })
    ];

    component.searchQuery = 'Replication';
    component.applyFilters();
    expect(component.filteredTickets.length).toBe(1);

    component.searchQuery = 'NonExistentXYZ';
    component.applyFilters();
    expect(component.filteredTickets.length).toBe(0);
  });

  it('should filter tickets by priority and category', () => {
    component.tickets = [
      createDummyTicket({ id: 't-1', priority: 'Urgent', category: 'Technical' }),
      createDummyTicket({ id: 't-2', priority: 'Low', category: 'Billing' })
    ];

    component.selectedPriority = 'Urgent';
    component.applyFilters();
    expect(component.filteredTickets.length).toBe(1);
    expect(component.filteredTickets[0].id).toBe('t-1');

    component.selectedPriority = 'ALL';
    component.selectedCategory = 'Billing';
    component.applyFilters();
    expect(component.filteredTickets.length).toBe(1);
    expect(component.filteredTickets[0].id).toBe('t-2');
  });

  it('should open and close ticket detail modal', () => {
    const dummyTicket = createDummyTicket({
      id: 't-1',
      ticketNumber: 'TCK-1001',
      subject: 'System Check'
    });

    component.openDetailModal(dummyTicket);
    expect(component.showDetailModal).toBeTrue();
    expect(component.selectedTicket).toEqual(dummyTicket);

    component.closeDetailModal();
    expect(component.showDetailModal).toBeFalse();
    expect(component.selectedTicket).toBeNull();
  });

  it('should prompt confirmation and delete ticket', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(apiService, 'deleteTicket').and.returnValue(of({ success: true, data: null }));
    spyOn(component, 'loadTickets');
    spyOn(component, 'loadMetrics');

    component.deleteTicket('t-1');
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this support ticket?');
    expect(apiService.deleteTicket).toHaveBeenCalledWith('t-1');
    expect(component.loadTickets).toHaveBeenCalled();
    expect(component.loadMetrics).toHaveBeenCalled();
  });

  it('should export filtered support tickets to CSV format', () => {
    component.filteredTickets = [
      createDummyTicket({
        id: 't-1',
        ticketNumber: 'TCK-1001',
        subject: 'Database Failover',
        customerName: 'Starlight Corp'
      })
    ];

    spyOn(document, 'createElement').and.callThrough();
    component.exportToCsv();
    expect(document.createElement).toHaveBeenCalledWith('a');
  });
});
