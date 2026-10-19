import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TasksComponent } from './tasks.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TaskItem, TaskPriority } from '../../core/models/models';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { of } from 'rxjs';

describe('TasksComponent', () => {
  let component: TasksComponent;
  let fixture: ComponentFixture<TasksComponent>;
  let apiService: ApiService;
  let authService: AuthService;

  const createDummyTask = (id: string, title: string, status: any, priority: TaskPriority = 'High', assignee = 'Alex Mercer'): TaskItem => ({
    id,
    tenantId: 'tenant-1',
    title,
    description: `Description for ${title}`,
    status,
    priority,
    assignedEmployeeName: assignee,
    createdAtUtc: new Date().toISOString()
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TasksComponent, HttpClientTestingModule],
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

  it('should filter tasks by search query across title, description, and assignee', () => {
    component.tasks = [
      createDummyTask('tsk-1', 'Implement OAuth2 PKCE', 'Todo', 'Urgent', 'David Lee'),
      createDummyTask('tsk-2', 'Optimize database indices', 'Todo', 'Medium', 'Sarah Jenkins'),
      createDummyTask('tsk-3', 'Design Dark Aurora UI', 'InProgress', 'High', 'Elena Rostova')
    ];

    component.searchQuery = 'OAuth2';
    expect(component.getFilteredTasks().length).toBe(1);
    expect(component.getFilteredTasks()[0].id).toBe('tsk-1');

    component.searchQuery = 'Sarah';
    expect(component.getFilteredTasks().length).toBe(1);
    expect(component.getFilteredTasks()[0].id).toBe('tsk-2');

    component.searchQuery = '';
    expect(component.getFilteredTasks().length).toBe(3);
  });

  it('should filter tasks by priority chip selection', () => {
    component.tasks = [
      createDummyTask('tsk-1', 'Emergency Hotfix', 'Todo', 'Urgent'),
      createDummyTask('tsk-2', 'Q3 Roadmapping', 'Todo', 'High'),
      createDummyTask('tsk-3', 'Clean CSS Variables', 'InProgress', 'Low')
    ];

    expect(component.selectedPriority).toBe('All');
    expect(component.getFilteredTasks().length).toBe(3);

    component.setPriorityFilter('Urgent');
    expect(component.selectedPriority).toBe('Urgent');
    expect(component.getFilteredTasks().length).toBe(1);
    expect(component.getTasksByStatus('Todo').length).toBe(1);

    component.setPriorityFilter('Low');
    expect(component.getFilteredTasks().length).toBe(1);
    expect(component.getTasksByStatus('InProgress').length).toBe(1);
    expect(component.getTasksByStatus('Todo').length).toBe(0);

    component.setPriorityFilter('All');
    expect(component.getFilteredTasks().length).toBe(3);
  });

  it('should toggle create task modal', () => {
    component.openCreateModal();
    expect(component.showModal).toBeTrue();
    expect(component.newTaskPriority).toBe('Medium');

    component.closeModal();
    expect(component.showModal).toBeFalse();
  });

  it('should evaluate canDelete permissions correctly based on currentRole', () => {
    spyOnProperty(component, 'currentRole', 'get').and.returnValue('Owner');
    expect(component.canDelete()).toBeTrue();

    (Object.getOwnPropertyDescriptor(component, 'currentRole')?.get as jasmine.Spy).and.returnValue('Manager');
    expect(component.canDelete()).toBeTrue();

    (Object.getOwnPropertyDescriptor(component, 'currentRole')?.get as jasmine.Spy).and.returnValue('Employee');
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

  it('should delete task when confirmed by user', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(apiService, 'deleteTask').and.returnValue(of({ success: true, data: null }));
    spyOn(component, 'loadTasks');

    component.deleteTask('tsk-99');

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this task?');
    expect(apiService.deleteTask).toHaveBeenCalledWith('tsk-99');
    expect(component.loadTasks).toHaveBeenCalled();
  });

  it('should not delete task if user cancels confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    spyOn(apiService, 'deleteTask');

    component.deleteTask('tsk-99');

    expect(apiService.deleteTask).not.toHaveBeenCalled();
  });

  it('should export filtered tasks to CSV format', () => {
    component.tasks = [
      createDummyTask('tsk-1', 'Audit trail compliance', 'Todo', 'Urgent', 'Alex Vance')
    ];
    spyOn(document, 'createElement').and.callThrough();

    component.exportTasksCsv();

    expect(document.createElement).toHaveBeenCalledWith('a');
  });

  it('should manage import modal lifecycle and reset import state', () => {
    component.openImportModal();
    expect(component.showImportModal).toBeTrue();
    expect(component.parsedRows.length).toBe(0);

    component.importFileName = 'sprint-tasks.csv';
    component.parsedRows = [{ title: 'Fix bug' }];
    component.importErrors = ['Some error'];

    component.closeImportModal();
    expect(component.showImportModal).toBeFalse();
    expect(component.importFileName).toBe('');
    expect(component.parsedRows.length).toBe(0);
    expect(component.importErrors.length).toBe(0);
  });

  it('should download CSV tasks template with standard headers', () => {
    spyOn(component, 'downloadCsvFile');
    component.downloadTemplate();
    expect(component.downloadCsvFile).toHaveBeenCalledWith(
      jasmine.stringMatching(/Title,Description,Priority,Status,DueDate,AssigneeEmail/),
      'tasks-template.csv'
    );
  });

  it('should parse valid CSV text and match assignee email if present', () => {
    component.employees = [
      {
        id: 'emp-10',
        tenantId: 'tenant-1',
        employeeNumber: 'EMP-010',
        firstName: 'Sarah',
        lastName: 'Vance',
        fullName: 'Sarah Vance',
        email: 'sarah@apex.com',
        jobTitle: 'Lead Architect',
        departmentId: 'd1',
        branchId: 'b1',
        isActive: true
      }
    ];

    const validCsv = `Title,Description,Priority,Status,DueDate,AssigneeEmail
Deploy Redis Cluster,Setup Redis replication across nodes,High,InProgress,2026-11-01,sarah@apex.com
Migrate to PostgreSQL,Update connection pool settings,Urgent,Todo,2026-11-15,unknown@apex.com`;

    component.parseCsvContent(validCsv);

    expect(component.importErrors.length).toBe(0);
    expect(component.parsedRows.length).toBe(2);
    expect(component.parsedRows[0].title).toBe('Deploy Redis Cluster');
    expect(component.parsedRows[0].priority).toBe('High');
    expect(component.parsedRows[0].status).toBe('InProgress');
    expect(component.parsedRows[0].assignedEmployeeId).toBe('emp-10');
    expect(component.parsedRows[0].assignedEmployeeName).toBe('Sarah Vance');

    expect(component.parsedRows[1].title).toBe('Migrate to PostgreSQL');
    expect(component.parsedRows[1].assignedEmployeeId).toBeUndefined();
  });

  it('should reject invalid or empty CSV input', () => {
    component.parseCsvContent('');
    expect(component.importErrors).toContain('The selected CSV file is empty.');

    component.importErrors = [];
    component.parseCsvContent('HeaderOnly\n');
    expect(component.importErrors).toContain('CSV must contain a header row and at least one data record.');

    component.importErrors = [];
    component.parseCsvContent('InvalidCol1,InvalidCol2\nVal1,Val2');
    expect(component.importErrors).toContain('Missing required column: Title');
  });

  it('should execute import batch and invoke createTask sequentially', () => {
    spyOn(apiService, 'createTask').and.returnValue(of({
      success: true,
      data: createDummyTask('tsk-new', 'Task item', 'Todo')
    }));
    spyOn(component, 'loadTasks');
    spyOn(component.toastService, 'success');

    component.parsedRows = [
      { title: 'Task 1', description: 'Desc 1', priority: 'High', status: 'Todo' },
      { title: 'Task 2', description: 'Desc 2', priority: 'Medium', status: 'InProgress' }
    ];

    component.executeImport();

    expect(apiService.createTask).toHaveBeenCalledTimes(2);
    expect(component.isImporting).toBeFalse();
    expect(component.showImportModal).toBeFalse();
    expect(component.parsedRows.length).toBe(0);
    expect(component.toastService.success).toHaveBeenCalled();
    expect(component.loadTasks).toHaveBeenCalled();
  });
});
