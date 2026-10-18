import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InventoryComponent } from './inventory.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

describe('InventoryComponent', () => {
  let component: InventoryComponent;
  let fixture: ComponentFixture<InventoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryComponent, HttpClientTestingModule],
      providers: [provideRouter([])]
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
});
