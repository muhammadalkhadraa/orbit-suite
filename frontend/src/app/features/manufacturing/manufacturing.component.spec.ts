import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ManufacturingComponent } from './manufacturing.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

describe('ManufacturingComponent', () => {
  let component: ManufacturingComponent;
  let fixture: ComponentFixture<ManufacturingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManufacturingComponent, HttpClientTestingModule],
      providers: [provideRouter([])]
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

  it('should toggle create work order and create BOM modals', () => {
    component.openCreateWoModal();
    expect(component.showCreateWoModal).toBeTrue();
    component.showCreateWoModal = false;
    expect(component.showCreateWoModal).toBeFalse();

    component.openCreateBomModal();
    expect(component.showCreateBomModal).toBeTrue();
    component.showCreateBomModal = false;
    expect(component.showCreateBomModal).toBeFalse();
  });
});
