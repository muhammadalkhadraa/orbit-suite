import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportsComponent } from './reports.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

describe('ReportsComponent', () => {
  let component: ReportsComponent;
  let fixture: ComponentFixture<ReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsComponent, HttpClientTestingModule],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the reports component', () => {
    expect(component).toBeTruthy();
  });

  it('should default to overview tab upon initialization', () => {
    expect(component.activeTab).toBe('overview');
  });

  it('should switch between domain tabs', () => {
    component.activeTab = 'financial';
    expect(component.activeTab).toBe('financial');

    component.activeTab = 'sales';
    expect(component.activeTab).toBe('sales');

    component.activeTab = 'exports';
    expect(component.activeTab).toBe('exports');

    component.activeTab = 'overview';
    expect(component.activeTab).toBe('overview');
  });

  it('should initialize default export request configuration', () => {
    expect(component.exportRequest.reportType).toBe('FinancialSummary');
    expect(component.exportRequest.format).toBe('Csv');
  });
});
