import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InventoryComponent } from './inventory.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Product, StockMovement } from '../../core/models/models';
import { of } from 'rxjs';

describe('InventoryComponent', () => {
  let component: InventoryComponent;
  let fixture: ComponentFixture<InventoryComponent>;

  const createDummyProduct = (overrides?: Partial<Product>): Product => ({
    id: 'prod-1',
    tenantId: 't-1',
    sku: 'SKU-CORE-100',
    name: 'Industrial Router Gateway',
    description: 'High-availability IoT gateway',
    category: 'Hardware',
    categoryName: 'Hardware',
    unitOfMeasure: 'pcs',
    unitPrice: 599,
    unitCost: 350,
    reorderLevel: 10,
    isActive: true,
    totalQuantityOnHand: 25,
    totalQuantityReserved: 5,
    totalQuantityAvailable: 20,
    isLowStock: false,
    inventoryValuation: 8750,
    branchInventories: [
      {
        id: 'pi-1',
        productId: 'prod-1',
        productName: 'Industrial Router Gateway',
        productSku: 'SKU-CORE-100',
        branchId: 'br-1',
        branchName: 'Main Warehouse',
        branchCode: 'MW-01',
        quantityOnHand: 25,
        quantityReserved: 5,
        quantityAvailable: 20,
        isLowStock: false
      }
    ],
    createdAtUtc: '2026-01-10T10:00:00Z',
    ...overrides
  });

  const createDummyMovement = (overrides?: Partial<StockMovement>): StockMovement => ({
    id: 'sm-1',
    productId: 'prod-1',
    productName: 'Industrial Router Gateway',
    productSku: 'SKU-CORE-100',
    branchId: 'br-1',
    branchName: 'Main Warehouse',
    type: 'Receipt',
    typeName: 'Stock Receipt',
    quantity: 50,
    unitCost: 350,
    totalCost: 17500,
    referenceNumber: 'PO-9901',
    reason: 'Initial supplier shipment',
    performedByEmployeeId: 'emp-1',
    performedByEmployeeName: 'Logistics Lead',
    timestampUtc: '2026-01-15T09:00:00Z',
    ...overrides
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryComponent, HttpClientTestingModule],
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

    fixture = TestBed.createComponent(InventoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the inventory component', () => {
    expect(component).toBeTruthy();
  });

  it('should default to catalog tab upon initialization', () => {
    expect(component.activeTab).toBe('catalog');
  });

  it('should switch between catalog, ledger, and branches tabs', () => {
    component.activeTab = 'ledger';
    expect(component.activeTab).toBe('ledger');

    component.activeTab = 'branches';
    expect(component.activeTab).toBe('branches');

    component.activeTab = 'catalog';
    expect(component.activeTab).toBe('catalog');
  });

  it('should define standard product categories and movement types', () => {
    expect(component.categories).toContain('Hardware');
    expect(component.categories).toContain('FinishedGoods');
    expect(component.movementTypes).toContain('Receipt');
    expect(component.movementTypes).toContain('Transfer');
  });

  it('should toggle create and adjust stock modals', () => {
    component.openCreateModal();
    expect(component.showCreateModal).toBeTrue();
    component.showCreateModal = false;
    expect(component.showCreateModal).toBeFalse();

    component.openAdjustModal();
    expect(component.showAdjustModal).toBeTrue();
    component.showAdjustModal = false;
    expect(component.showAdjustModal).toBeFalse();
  });

  it('should filter products by search query, category, and stock level', () => {
    component.products = [
      createDummyProduct({ id: 'prod-1', sku: 'SKU-001', name: 'Alpha Sensor', category: 'Electronics', totalQuantityOnHand: 50, isLowStock: false }),
      createDummyProduct({ id: 'prod-2', sku: 'SKU-002', name: 'Beta Cable', category: 'Hardware', totalQuantityOnHand: 2, isLowStock: true }),
      createDummyProduct({ id: 'prod-3', sku: 'SKU-003', name: 'Gamma Mount', category: 'Hardware', totalQuantityOnHand: 0, isLowStock: true })
    ];

    component.searchQuery = 'Alpha';
    component.applyFilters();
    expect(component.filteredProducts.length).toBe(1);
    expect(component.filteredProducts[0].id).toBe('prod-1');

    component.searchQuery = '';
    component.selectedCategory = 'Hardware';
    component.applyFilters();
    expect(component.filteredProducts.length).toBe(2);

    component.stockFilter = 'out_of_stock';
    component.applyFilters();
    expect(component.filteredProducts.length).toBe(1);
    expect(component.filteredProducts[0].id).toBe('prod-3');

    component.stockFilter = 'low_stock';
    component.applyFilters();
    expect(component.filteredProducts.length).toBe(1);
    expect(component.filteredProducts[0].id).toBe('prod-2');
  });

  it('should filter movements in ledger view by search query and movement type', () => {
    component.movements = [
      createDummyMovement({ id: 'sm-1', productName: 'Sensor A', type: 'Receipt', referenceNumber: 'REF-101' }),
      createDummyMovement({ id: 'sm-2', productName: 'Cable B', type: 'Scrap', referenceNumber: 'REF-202' })
    ];

    component.ledgerSearchQuery = 'REF-101';
    component.applyLedgerFilters();
    expect(component.filteredMovements.length).toBe(1);
    expect(component.filteredMovements[0].id).toBe('sm-1');

    component.ledgerSearchQuery = '';
    component.selectedMovementType = 'Scrap';
    component.applyLedgerFilters();
    expect(component.filteredMovements.length).toBe(1);
    expect(component.filteredMovements[0].id).toBe('sm-2');
  });

  it('should export catalog products to CSV in catalog mode', () => {
    component.activeTab = 'catalog';
    component.filteredProducts = [
      createDummyProduct({ sku: 'EXP-101', name: 'Export Product' })
    ];

    spyOn(document, 'createElement').and.callThrough();
    component.exportInventoryCsv();
    expect(document.createElement).toHaveBeenCalledWith('a');
  });

  it('should export stock movement ledger to CSV in ledger mode', () => {
    component.activeTab = 'ledger';
    component.filteredMovements = [
      createDummyMovement({ referenceNumber: 'EXP-MOV-900', productName: 'Ledger Item' })
    ];

    spyOn(document, 'createElement').and.callThrough();
    component.exportInventoryCsv();
    expect(document.createElement).toHaveBeenCalledWith('a');
  });
});

