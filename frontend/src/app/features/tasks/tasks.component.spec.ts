import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TasksComponent } from './tasks.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TaskItem } from '../../core/models/models';

describe('TasksComponent', () => {
  let component: TasksComponent;
  let fixture: ComponentFixture<TasksComponent>;

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
});
