import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrganizationComponent } from './organization.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

describe('OrganizationComponent', () => {
  let component: OrganizationComponent;
  let fixture: ComponentFixture<OrganizationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganizationComponent, HttpClientTestingModule],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(OrganizationComponent);
    component = fixture.componentInstance;
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

  it('should toggle branch and department creation modals', () => {
    component.openBranchModal();
    expect(component.showBranchModal).toBeTrue();
    component.showBranchModal = false;
    expect(component.showBranchModal).toBeFalse();

    component.openDeptModal();
    expect(component.showDeptModal).toBeTrue();
    component.showDeptModal = false;
    expect(component.showDeptModal).toBeFalse();
  });
});
