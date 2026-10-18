import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TasksComponent } from './tasks.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TaskItem } from '../../core/models/models';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { of } from 'rxjs';

describe('TasksComponent', () => {
  let component: TasksComponent;
  let fixture: ComponentFixture<TasksComponent>;
  let apiService: ApiService;
  let authService: AuthService;

  const createDummyTask = (id: string, title: string, status: any): TaskItem => ({
    id,
    tenantId: 'tenant-1',
    title,
    description: 'Test task description',
    status,
    priority: 'High',
    createdAtUtc: new Date().toISOString()
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TasksComponent, HttpClientTestingModule],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(TasksComponent);
    component = fixture.componentInstance;
    apiService = TestBed.inject(ApiService);
    authService = TestBed.inject(AuthService);
    fixture.detectChanges();
  });

  it('should create the tasks component', () => {
    expect(component).toBeTruthy();
  });

  it('should render header and active permission banner', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Task & Project Governance');
    expect(compiled.querySelector('.role-scope-banner')).toBeTruthy();
  });

  it('should filter tasks by Kanban lane status', () => {
    component.tasks = [
      createDummyTask('tsk-1', 'Write tests', 'Todo'),
      createDummyTask('tsk-2', 'Refactor models', 'InProgress'),
      createDummyTask('tsk-3', 'Review security', 'InReview'),
      createDummyTask('tsk-4', 'Deploy release', 'Done')
    ];

    expect(component.getTasksByStatus('Todo').length).toBe(1);
    expect(component.getTasksByStatus('InProgress').length).toBe(1);
    expect(component.getTasksByStatus('InReview').length).toBe(1);
    expect(component.getTasksByStatus('Done').length).toBe(1);
  });

  it('should toggle create task modal', () => {
    component.openCreateModal();
    expect(component.showModal).toBeTrue();
    expect(component.newTaskPriority).toBe('Medium');

    component.closeModal();
    expect(component.showModal).toBeFalse();
  });

  it('should evaluate canDelete permissions correctly based on currentRole', () => {
    spyOnProperty(authService, 'currentRole', 'get').and.returnValue('Owner');
    expect(component.canDelete()).toBeTrue();

    (Object.getOwnPropertyDescriptor(authService, 'currentRole')?.get as jasmine.Spy).and.returnValue('Manager');
    expect(component.canDelete()).toBeTrue();

    (Object.getOwnPropertyDescriptor(authService, 'currentRole')?.get as jasmine.Spy).and.returnValue('Employee');
    expect(component.canDelete()).toBeFalse();
  });

  it('should return correct CSS classes for priority badges and role badges', () => {
    expect(component.getPriorityBadge('Urgent')).toBe('badge-rose');
    expect(component.getPriorityBadge('High')).toBe('badge-amber');
    expect(component.getPriorityBadge('Medium')).toBe('badge-indigo');
    expect(component.getPriorityBadge('Low')).toBe('badge-cyan');

    expect(component.getRoleBadgeClass('Owner')).toBe('badge-violet');
    expect(component.getRoleBadgeClass('Admin')).toBe('badge-indigo');
    expect(component.getRoleBadgeClass('Manager')).toBe('badge-cyan');
    expect(component.getRoleBadgeClass('Employee')).toBe('badge-emerald');
  });

  it('should submit task creation and reload tasks list', () => {
    spyOn(apiService, 'createTask').and.returnValue(of({
      success: true,
      data: createDummyTask('tsk-new', 'Implement OAuth2 PKCE', 'Todo')
    }));
    spyOn(component, 'loadTasks');

    component.openCreateModal();
    component.newTaskTitle = 'Implement OAuth2 PKCE';
    component.newTaskDescription = 'Harden authorization flow with code challenge';
    component.newTaskPriority = 'High';

    component.submitCreateTask();

    expect(apiService.createTask).toHaveBeenCalledWith(jasmine.objectContaining({
      title: 'Implement OAuth2 PKCE',
      description: 'Harden authorization flow with code challenge',
      priority: 'High'
    }));
    expect(component.showModal).toBeFalse();
    expect(component.loadTasks).toHaveBeenCalled();
  });

  it('should update task status via apiService and reload tasks', () => {
    spyOn(apiService, 'updateTaskStatus').and.returnValue(of({
      success: true,
      data: createDummyTask('tsk-1', 'Write tests', 'InProgress')
    }));
    spyOn(component, 'loadTasks');

    component.updateStatus('tsk-1', 'InProgress');

    expect(apiService.updateTaskStatus).toHaveBeenCalledWith('tsk-1', 'InProgress');
    expect(component.loadTasks).toHaveBeenCalled();
  });
});
