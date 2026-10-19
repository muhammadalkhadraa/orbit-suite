import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrganizationComponent } from './organization.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { of } from 'rxjs';

describe('OrganizationComponent', () => {
  let component: OrganizationComponent;
  let fixture: ComponentFixture<OrganizationComponent>;
  let apiService: ApiService;
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganizationComponent, HttpClientTestingModule],
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

    fixture = TestBed.createComponent(OrganizationComponent);
    component = fixture.componentInstance;
    apiService = TestBed.inject(ApiService);
    authService = TestBed.inject(AuthService);
    fixture.detectChanges();
  });

  it('should create the organization component', () => {
    expect(component).toBeTruthy();
  });

  it('should default to branches tab upon initialization', () => {
    expect(component.activeTab).toBe('branches');
  });

  it('should toggle between branches and departments tabs', () => {
    component.activeTab = 'departments';
    expect(component.activeTab).toBe('departments');

    component.activeTab = 'branches';
    expect(component.activeTab).toBe('branches');
  });

  it('should toggle branch and department creation modals and close via closeModals', () => {
    component.openBranchModal();
    expect(component.showBranchModal).toBeTrue();
    expect(component.isEditingBranch).toBeFalse();
    expect(component.newBranchName).toBe('');

    component.openDeptModal();
    expect(component.showDeptModal).toBeTrue();
    expect(component.isEditingDept).toBeFalse();
    expect(component.newDeptName).toBe('');

    component.closeModals();
    expect(component.showBranchModal).toBeFalse();
    expect(component.showDeptModal).toBeFalse();
  });

  it('should evaluate canManage role permissions', () => {
    (authService as any).currentRole = 'Owner';
    expect(component.canManage()).toBeTrue();

    (authService as any).currentRole = 'Admin';
    expect(component.canManage()).toBeTrue();

    (authService as any).currentRole = 'Employee';
    expect(component.canManage()).toBeFalse();
  });

  it('should filter branches by search query and active status', () => {
    component.branches = [
      {
        id: 'br-1',
        tenantId: 't-1',
        name: 'Headquarters Campus',
        code: 'HQ-SF',
        city: 'San Francisco',
        country: 'USA',
        isActive: true,
        employeeCount: 42
      },
      {
        id: 'br-2',
        tenantId: 't-1',
        name: 'London Engineering Hub',
        code: 'LON-UK',
        city: 'London',
        country: 'United Kingdom',
        isActive: false,
        employeeCount: 15
      }
    ];

    component.searchQuery = 'London';
    expect(component.getFilteredBranches().length).toBe(1);
    expect(component.getFilteredBranches()[0].code).toBe('LON-UK');

    component.searchQuery = '';
    component.statusFilter = 'Active';
    expect(component.getFilteredBranches().length).toBe(1);
    expect(component.getFilteredBranches()[0].code).toBe('HQ-SF');

    component.statusFilter = 'Inactive';
    expect(component.getFilteredBranches().length).toBe(1);
    expect(component.getFilteredBranches()[0].code).toBe('LON-UK');

    component.statusFilter = 'ALL';
    expect(component.getFilteredBranches().length).toBe(2);
  });

  it('should filter departments by search query and active status', () => {
    component.departments = [
      {
        id: 'dp-1',
        tenantId: 't-1',
        name: 'Global Operations',
        code: 'OPS',
        description: 'Supply chain and logistics management',
        isActive: true,
        employeeCount: 20
      },
      {
        id: 'dp-2',
        tenantId: 't-1',
        name: 'Legacy R&D',
        code: 'LRD',
        description: 'Archived initiatives',
        isActive: false,
        employeeCount: 0
      }
    ];

    component.searchQuery = 'Supply';
    expect(component.getFilteredDepartments().length).toBe(1);
    expect(component.getFilteredDepartments()[0].code).toBe('OPS');

    component.searchQuery = '';
    component.statusFilter = 'Active';
    expect(component.getFilteredDepartments().length).toBe(1);
    expect(component.getFilteredDepartments()[0].code).toBe('OPS');

    component.statusFilter = 'Inactive';
    expect(component.getFilteredDepartments().length).toBe(1);
    expect(component.getFilteredDepartments()[0].code).toBe('LRD');

    component.statusFilter = 'ALL';
    expect(component.getFilteredDepartments().length).toBe(2);
  });

  it('should submit branch creation and reload organization data', () => {
    spyOn(apiService, 'createBranch').and.returnValue(of({
      success: true,
      data: {
        id: 'br-new',
        tenantId: 't-1',
        name: 'Asia-Pacific Hub',
        code: 'APAC-SGP',
        city: 'Singapore',
        country: 'Singapore',
        isActive: true,
        employeeCount: 0
      }
    }));
    spyOn(component, 'loadData');

    component.openBranchModal();
    component.newBranchName = 'Asia-Pacific Hub';
    component.newBranchCode = 'APAC-SGP';
    component.newBranchCity = 'Singapore';
    component.newBranchCountry = 'Singapore';

    component.submitBranchForm();

    expect(apiService.createBranch).toHaveBeenCalledWith({
      name: 'Asia-Pacific Hub',
      code: 'APAC-SGP',
      city: 'Singapore',
      country: 'Singapore'
    });
    expect(component.showBranchModal).toBeFalse();
    expect(component.loadData).toHaveBeenCalled();
  });

  it('should open edit branch modal and submit update request', () => {
    const branch = {
      id: 'br-hq',
      tenantId: 't-1',
      name: 'HQ Campus',
      code: 'HQ-SF',
      city: 'San Francisco',
      country: 'USA',
      isActive: true,
      employeeCount: 50
    };

    spyOn(apiService, 'updateBranch').and.returnValue(of({
      success: true,
      data: branch
    }));
    spyOn(component, 'loadData');

    component.openEditBranchModal(branch);
    expect(component.showBranchModal).toBeTrue();
    expect(component.isEditingBranch).toBeTrue();
    expect(component.editingBranchId).toBe('br-hq');
    expect(component.newBranchName).toBe('HQ Campus');

    component.newBranchName = 'Global HQ Innovation Campus';
    component.submitBranchForm();

    expect(apiService.updateBranch).toHaveBeenCalledWith('br-hq', jasmine.objectContaining({
      name: 'Global HQ Innovation Campus'
    }));
    expect(component.showBranchModal).toBeFalse();
    expect(component.loadData).toHaveBeenCalled();
  });

  it('should prompt confirmation and delete branch', () => {
    const branch = {
      id: 'br-del',
      tenantId: 't-1',
      name: 'Temporary Warehouse',
      code: 'TEMP-WH',
      city: 'Austin',
      country: 'USA',
      isActive: true,
      employeeCount: 0
    };

    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(apiService, 'deleteBranch').and.returnValue(of({ success: true, data: null }));
    spyOn(component, 'loadData');

    component.confirmDeleteBranch(branch);
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete branch Temporary Warehouse (TEMP-WH)?');
    expect(apiService.deleteBranch).toHaveBeenCalledWith('br-del');
    expect(component.loadData).toHaveBeenCalled();
  });

  it('should submit department creation and reload organization data', () => {
    spyOn(apiService, 'createDepartment').and.returnValue(of({
      success: true,
      data: {
        id: 'dp-new',
        tenantId: 't-1',
        name: 'Research & Innovation',
        code: 'RND',
        description: 'Applied AI & Systems Engineering',
        isActive: true,
        employeeCount: 0
      }
    }));
    spyOn(component, 'loadData');

    component.openDeptModal();
    component.newDeptName = 'Research & Innovation';
    component.newDeptCode = 'RND';
    component.newDeptDesc = 'Applied AI & Systems Engineering';

    component.submitDeptForm();

    expect(apiService.createDepartment).toHaveBeenCalledWith({
      name: 'Research & Innovation',
      code: 'RND',
      description: 'Applied AI & Systems Engineering'
    });
    expect(component.showDeptModal).toBeFalse();
    expect(component.loadData).toHaveBeenCalled();
  });

  it('should open edit department modal and submit update request', () => {
    const dept = {
      id: 'dp-qa',
      tenantId: 't-1',
      name: 'Quality Assurance',
      code: 'QA',
      description: 'System verification',
      isActive: true,
      employeeCount: 8
    };

    spyOn(apiService, 'updateDepartment').and.returnValue(of({
      success: true,
      data: dept
    }));
    spyOn(component, 'loadData');

    component.openEditDeptModal(dept);
    expect(component.showDeptModal).toBeTrue();
    expect(component.isEditingDept).toBeTrue();
    expect(component.editingDeptId).toBe('dp-qa');

    component.newDeptDesc = 'Enterprise ISO-9001 quality audits';
    component.submitDeptForm();

    expect(apiService.updateDepartment).toHaveBeenCalledWith('dp-qa', jasmine.objectContaining({
      description: 'Enterprise ISO-9001 quality audits'
    }));
    expect(component.showDeptModal).toBeFalse();
    expect(component.loadData).toHaveBeenCalled();
  });

  it('should prompt confirmation and delete department', () => {
    const dept = {
      id: 'dp-legacy',
      tenantId: 't-1',
      name: 'Legacy Systems',
      code: 'LEGACY',
      description: 'Decommissioned stack',
      isActive: false,
      employeeCount: 0
    };

    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(apiService, 'deleteDepartment').and.returnValue(of({ success: true, data: null }));
    spyOn(component, 'loadData');

    component.confirmDeleteDept(dept);
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete department Legacy Systems (LEGACY)?');
    expect(apiService.deleteDepartment).toHaveBeenCalledWith('dp-legacy');
    expect(component.loadData).toHaveBeenCalled();
  });

  it('should export branches and departments to CSV format', () => {
    component.branches = [
      {
        id: 'br-1',
        tenantId: 't-1',
        name: 'Headquarters',
        code: 'HQ',
        city: 'San Francisco',
        country: 'USA',
        isActive: true,
        employeeCount: 25
      }
    ];

    spyOn(document, 'createElement').and.callThrough();

    // Export branches
    component.activeTab = 'branches';
    component.exportToCsv();
    expect(document.createElement).toHaveBeenCalledWith('a');

    // Export departments
    component.activeTab = 'departments';
    component.exportToCsv();
    expect(document.createElement).toHaveBeenCalledWith('a');
  });
});
