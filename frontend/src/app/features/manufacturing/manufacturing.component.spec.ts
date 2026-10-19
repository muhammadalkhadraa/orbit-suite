import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ManufacturingComponent } from './manufacturing.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { WorkOrder, BillOfMaterials } from '../../core/models/models';
import { of } from 'rxjs';

describe('ManufacturingComponent', () => {
  let component: ManufacturingComponent;
  let fixture: ComponentFixture<ManufacturingComponent>;

  const createDummyWorkOrder = (overrides?: Partial<WorkOrder>): WorkOrder => ({
    id: 'wo-1',
    tenantId: 't-1',
    orderNumber: 'WO-2026-001',
    productId: 'prod-1',
    productSku: 'SKU-FG-100',
    productName: 'Commercial Solar Inverter',
    branchId: 'br-1',
    branchName: 'Assembly Plant 1',
    assignedEmployeeId: 'emp-1',
    assignedEmployeeName: 'Marcus Vance',
    quantityTarget: 50,
    quantityProduced: 25,
    progressPercentage: 50,
    status: 'InProgress',
    statusName: 'In Progress',
    priority: 'High',
    priorityName: 'High Priority',
    isOverdue: false,
    dueDateUtc: '2026-03-31T00:00:00Z',
    createdAtUtc: '2026-01-20T10:00:00Z',
    ...overrides
  });

  const createDummyBom = (overrides?: Partial<BillOfMaterials>): BillOfMaterials => ({
    id: 'bom-1',
    tenantId: 't-1',
    bomNumber: 'BOM-2026-001',
    name: 'Solar Inverter Assembly v1',
    productId: 'prod-1',
    productSku: 'SKU-FG-100',
    productName: 'Commercial Solar Inverter',
    version: 'v1.0',
    isActive: true,
    items: [],
    createdAtUtc: '2026-01-10T10:00:00Z',
    ...overrides
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManufacturingComponent, HttpClientTestingModule],
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

    fixture = TestBed.createComponent(ManufacturingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the manufacturing component', () => {
    expect(component).toBeTruthy();
  });

  it('should default to orders tab upon initialization', () => {
    expect(component.activeTab).toBe('orders');
  });

  it('should switch between orders, boms, and operations tabs', () => {
    component.activeTab = 'boms';
    expect(component.activeTab).toBe('boms');

    component.activeTab = 'operations';
    expect(component.activeTab).toBe('operations');

    component.activeTab = 'orders';
    expect(component.activeTab).toBe('orders');
  });

  it('should evaluate canManageManufacturing based on current role', () => {
    component.currentRole = 'Owner';
    expect(component.canManageManufacturing).toBeTrue();

    component.currentRole = 'Manager';
    expect(component.canManageManufacturing).toBeTrue();

    component.currentRole = 'Admin';
    expect(component.canManageManufacturing).toBeTrue();

    component.currentRole = 'Employee';
    expect(component.canManageManufacturing).toBeFalse();
  });

  it('should toggle create work order, create BOM, and preview modals', () => {
    component.openCreateWoModal();
    expect(component.showCreateWoModal).toBeTrue();
    component.showCreateWoModal = false;
    expect(component.showCreateWoModal).toBeFalse();

    component.openCreateBomModal();
    expect(component.showCreateBomModal).toBeTrue();
    component.showCreateBomModal = false;
    expect(component.showCreateBomModal).toBeFalse();

    const wo = createDummyWorkOrder();
    component.viewWorkOrderDetails(wo);
    expect(component.showPreviewModal).toBeTrue();
    expect(component.previewWo).toBe(wo);
  });

  it('should filter work orders by search query, status, priority, and branch', () => {
    component.workOrders = [
      createDummyWorkOrder({ id: 'wo-1', orderNumber: 'WO-101', productName: 'Solar Inverter', status: 'InProgress', priority: 'High', branchId: 'br-1' }),
      createDummyWorkOrder({ id: 'wo-2', orderNumber: 'WO-202', productName: 'Battery Pack', status: 'Completed', priority: 'Low', branchId: 'br-2' }),
      createDummyWorkOrder({ id: 'wo-3', orderNumber: 'WO-303', productName: 'Wind Turbine', status: 'Planned', priority: 'Urgent', branchId: 'br-1' })
    ];

    component.searchQuery = 'Battery';
    component.applyFilters();
    expect(component.filteredWorkOrders.length).toBe(1);
    expect(component.filteredWorkOrders[0].id).toBe('wo-2');

    component.searchQuery = '';
    component.statusFilter = 'Planned';
    component.applyFilters();
    expect(component.filteredWorkOrders.length).toBe(1);
    expect(component.filteredWorkOrders[0].id).toBe('wo-3');

    component.statusFilter = 'ALL';
    component.priorityFilter = 'High';
    component.applyFilters();
    expect(component.filteredWorkOrders.length).toBe(1);
    expect(component.filteredWorkOrders[0].id).toBe('wo-1');

    component.priorityFilter = 'ALL';
    component.branchFilter = 'br-2';
    component.applyFilters();
    expect(component.filteredWorkOrders.length).toBe(1);
    expect(component.filteredWorkOrders[0].id).toBe('wo-2');
  });

  it('should export work orders to CSV in orders mode', () => {
    component.activeTab = 'orders';
    component.filteredWorkOrders = [
      createDummyWorkOrder({ orderNumber: 'WO-EXP-01' })
    ];

    spyOn(document, 'createElement').and.callThrough();
    component.exportManufacturingCsv();
    expect(document.createElement).toHaveBeenCalledWith('a');
  });

  it('should export bill of materials to CSV in boms mode', () => {
    component.activeTab = 'boms';
    component.boms = [
      createDummyBom({ bomNumber: 'BOM-EXP-01' })
    ];

    spyOn(document, 'createElement').and.callThrough();
    component.exportManufacturingCsv();
    expect(document.createElement).toHaveBeenCalledWith('a');
  });
});

