import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportsComponent } from './reports.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { ReportExport } from '../../core/models/models';
import { of } from 'rxjs';

describe('ReportsComponent', () => {
  let component: ReportsComponent;
  let fixture: ComponentFixture<ReportsComponent>;
  let apiService: ApiService;

  const createDummyExport = (overrides?: Partial<ReportExport>): ReportExport => ({
    id: 'exp-1',
    title: 'Financial Summary Report',
    reportType: 'FinancialSummary',
    format: 'Csv',
    fileName: 'financial_summary_2026.csv',
    mimeType: 'text/csv',
    content: 'Header1,Header2\nVal1,Val2',
    recordCount: 42,
    fileSizeKb: 12.5,
    generatedAtUtc: '2026-03-01T10:00:00Z',
    ...overrides
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsComponent, HttpClientTestingModule],
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

    fixture = TestBed.createComponent(ReportsComponent);
    component = fixture.componentInstance;
    apiService = TestBed.inject(ApiService);
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

  it('should execute report export and trigger download', () => {
    const dummyExport = createDummyExport();
    spyOn(apiService, 'exportReport').and.returnValue(of({ success: true, data: dummyExport }));
    spyOn(component, 'triggerDownload');
    spyOn(component, 'loadExportHistory');

    component.submitExport();
    expect(apiService.exportReport).toHaveBeenCalledWith(component.exportRequest);
    expect(component.lastExportResult).toBe(dummyExport);
    expect(component.triggerDownload).toHaveBeenCalledWith(dummyExport);
    expect(component.loadExportHistory).toHaveBeenCalled();
  });

  it('should trigger quickExport for target domain', () => {
    spyOn(component, 'submitExport');

    component.quickExport('SalesPipeline');
    expect(component.exportRequest.reportType).toBe('SalesPipeline');
    expect(component.exportRequest.format).toBe('Csv');
    expect(component.activeTab).toBe('exports');
    expect(component.submitExport).toHaveBeenCalled();
  });

  it('should calculate chart bar heights and funnel widths accurately', () => {
    expect(component.getBarHeight(25000, 50000)).toBe(50);
    expect(component.getBarHeight(0, 50000)).toBe(10); // Minimum clamp

    expect(component.getFunnelWidth(125000)).toBe(50);
  });

  it('should assign correct badge classes for roles and report types', () => {
    expect(component.getRoleBadgeClass('Owner')).toBe('badge-violet');
    expect(component.getRoleBadgeClass('Admin')).toBe('badge-indigo');
    expect(component.getRoleBadgeClass('Manager')).toBe('badge-cyan');
    expect(component.getRoleBadgeClass('Employee')).toBe('badge-emerald');

    expect(component.getReportTypeBadgeClass('FinancialSummary')).toBe('badge-emerald');
    expect(component.getReportTypeBadgeClass('SalesPipeline')).toBe('badge-indigo');
    expect(component.getReportTypeBadgeClass('SupportSla')).toBe('badge-amber');
  });
});

