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
      providers: [provideRouter([])]
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
    expect(component.newBranchName).toBe('');

    component.openDeptModal();
    expect(component.showDeptModal).toBeTrue();
    expect(component.newDeptName).toBe('');

    component.closeModals();
    expect(component.showBranchModal).toBeFalse();
    expect(component.showDeptModal).toBeFalse();
  });

  it('should evaluate canManage role permissions', () => {
    spyOnProperty(authService, 'currentRole', 'get').and.returnValue('Owner');
    expect(component.canManage()).toBeTrue();

    (Object.getOwnPropertyDescriptor(authService, 'currentRole')?.get as jasmine.Spy).and.returnValue('Admin');
    expect(component.canManage()).toBeTrue();

    (Object.getOwnPropertyDescriptor(authService, 'currentRole')?.get as jasmine.Spy).and.returnValue('Employee');
    expect(component.canManage()).toBeFalse();
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

    component.submitCreateBranch();

    expect(apiService.createBranch).toHaveBeenCalledWith({
      name: 'Asia-Pacific Hub',
      code: 'APAC-SGP',
      city: 'Singapore',
      country: 'Singapore'
    });
    expect(component.showBranchModal).toBeFalse();
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

    component.submitCreateDept();

    expect(apiService.createDepartment).toHaveBeenCalledWith({
      name: 'Research & Innovation',
      code: 'RND',
      description: 'Applied AI & Systems Engineering'
    });
    expect(component.showDeptModal).toBeFalse();
    expect(component.loadData).toHaveBeenCalled();
  });
});
