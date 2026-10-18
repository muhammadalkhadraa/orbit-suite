import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrmComponent } from './crm.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

describe('CrmComponent', () => {
  let component: CrmComponent;
  let fixture: ComponentFixture<CrmComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrmComponent, HttpClientTestingModule],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(CrmComponent);
    component = fixture.componentInstance;
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
});
