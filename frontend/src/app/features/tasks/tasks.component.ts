import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { TaskItem, TaskPriority, TaskStatus, Employee, Department } from '../../core/models/models';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="tasks-page">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <div class="badge badge-emerald" style="margin-bottom: 0.5rem;">Phase 6 Primary Workflow</div>
          <h1 class="font-heading-2">Task & Project Governance</h1>
          <p class="font-caption">Cryptographically scoped work item management according to verified role hierarchies</p>
        </div>
        <div class="header-actions">
          <button (click)="openCreateModal()" class="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>Create Task</span>
          </button>
        </div>
      </div>

      <!-- Confirmed Role Visibility Banner -->
      <div class="role-scope-banner glass-panel">
        <div class="scope-icon">🔒</div>
        <div class="scope-details">
          <div class="scope-title">
            ACTIVE PERMISSION SCOPE: <span class="badge" [ngClass]="getRoleBadgeClass(currentRole)">{{ currentRole }}</span>
          </div>
          <p class="scope-explanation" [ngSwitch]="currentRole">
            <span *ngSwitchCase="'Owner'">
              <strong>Full Tenant Oversight:</strong> As Company Owner, you have complete cross-departmental visibility and authority over all tasks within {{ (activeTenant$ | async)?.name }}.
            </span>
            <span *ngSwitchCase="'Admin'">
              <strong>Administrative Oversight:</strong> As Administrator, you can view, create, assign, and delete tasks across all branches and departments.
            </span>
            <span *ngSwitchCase="'Manager'">
              <strong>Team & Department Oversight:</strong> In accordance with confirmed specifications, you can inspect and supervise work items belonging to yourself, your direct reports (e.g. David Lee), and your department.
            </span>
            <span *ngSwitchCase="'Employee'">
              <strong>Personal Scope (Zero Leakage):</strong> Enforcing confirmed privacy rules, you can solely view tasks assigned to you or created by you. Cross-employee work items are strictly hidden.
            </span>
            <span *ngSwitchDefault>
              Scoped access active.
            </span>
          </p>
        </div>
      </div>

      <!-- Kanban Board Lanes -->
      <div class="kanban-board">
        <!-- Lane: Todo -->
        <div class="kanban-lane glass-panel">
          <div class="lane-header">
            <div class="lane-title-group">
              <span class="lane-indicator todo"></span>
              <span class="lane-title">TO DO</span>
            </div>
            <span class="lane-count">{{ getTasksByStatus('Todo').length }}</span>
          </div>
          <div class="lane-tasks">
            <div *ngFor="let task of getTasksByStatus('Todo')" class="task-card glass-panel-elevated">
              <div class="task-card-top">
                <span class="badge" [ngClass]="getPriorityBadge(task.priority)">{{ task.priority }}</span>
                <button *ngIf="canDelete()" (click)="deleteTask(task.id)" class="btn-card-del" title="Delete Task">✕</button>
              </div>
              <h3 class="task-card-title">{{ task.title }}</h3>
              <p class="task-card-desc" *ngIf="task.description">{{ task.description }}</p>
              <div class="task-card-meta">
                <span class="assignee-badge">👤 {{ task.assignedEmployeeName || 'Unassigned' }}</span>
                <span class="date-badge" *ngIf="task.dueDateUtc">📅 {{ task.dueDateUtc | slice:0:10 }}</span>
              </div>
              <div class="task-card-actions">
                <button (click)="updateStatus(task.id, 'InProgress')" class="btn-action">
                  <span>Start Work →</span>
                </button>
              </div>
            </div>
            <div *ngIf="getTasksByStatus('Todo').length === 0" class="empty-lane">No tasks in queue</div>
          </div>
        </div>

        <!-- Lane: In Progress -->
        <div class="kanban-lane glass-panel">
          <div class="lane-header">
            <div class="lane-title-group">
              <span class="lane-indicator inprogress"></span>
              <span class="lane-title">IN PROGRESS</span>
            </div>
            <span class="lane-count">{{ getTasksByStatus('InProgress').length }}</span>
          </div>
          <div class="lane-tasks">
            <div *ngFor="let task of getTasksByStatus('InProgress')" class="task-card glass-panel-elevated">
              <div class="task-card-top">
                <span class="badge" [ngClass]="getPriorityBadge(task.priority)">{{ task.priority }}</span>
                <button *ngIf="canDelete()" (click)="deleteTask(task.id)" class="btn-card-del" title="Delete Task">✕</button>
              </div>
              <h3 class="task-card-title">{{ task.title }}</h3>
              <p class="task-card-desc" *ngIf="task.description">{{ task.description }}</p>
              <div class="task-card-meta">
                <span class="assignee-badge">👤 {{ task.assignedEmployeeName || 'Unassigned' }}</span>
                <span class="date-badge" *ngIf="task.dueDateUtc">📅 {{ task.dueDateUtc | slice:0:10 }}</span>
              </div>
              <div class="task-card-actions">
                <button (click)="updateStatus(task.id, 'InReview')" class="btn-action">
                  <span>Submit for Review →</span>
                </button>
              </div>
            </div>
            <div *ngIf="getTasksByStatus('InProgress').length === 0" class="empty-lane">No active work in progress</div>
          </div>
        </div>

        <!-- Lane: In Review -->
        <div class="kanban-lane glass-panel">
          <div class="lane-header">
            <div class="lane-title-group">
              <span class="lane-indicator inreview"></span>
              <span class="lane-title">IN REVIEW</span>
            </div>
            <span class="lane-count">{{ getTasksByStatus('InReview').length }}</span>
          </div>
          <div class="lane-tasks">
            <div *ngFor="let task of getTasksByStatus('InReview')" class="task-card glass-panel-elevated">
              <div class="task-card-top">
                <span class="badge" [ngClass]="getPriorityBadge(task.priority)">{{ task.priority }}</span>
                <button *ngIf="canDelete()" (click)="deleteTask(task.id)" class="btn-card-del" title="Delete Task">✕</button>
              </div>
              <h3 class="task-card-title">{{ task.title }}</h3>
              <p class="task-card-desc" *ngIf="task.description">{{ task.description }}</p>
              <div class="task-card-meta">
                <span class="assignee-badge">👤 {{ task.assignedEmployeeName || 'Unassigned' }}</span>
                <span class="date-badge" *ngIf="task.dueDateUtc">📅 {{ task.dueDateUtc | slice:0:10 }}</span>
              </div>
              <div class="task-card-actions">
                <button (click)="updateStatus(task.id, 'Done')" class="btn-action btn-action-success">
                  <span>Approve & Complete ✓</span>
                </button>
              </div>
            </div>
            <div *ngIf="getTasksByStatus('InReview').length === 0" class="empty-lane">No tasks awaiting review</div>
          </div>
        </div>

        <!-- Lane: Done -->
        <div class="kanban-lane glass-panel">
          <div class="lane-header">
            <div class="lane-title-group">
              <span class="lane-indicator done"></span>
              <span class="lane-title">COMPLETED</span>
            </div>
            <span class="lane-count">{{ getTasksByStatus('Done').length }}</span>
          </div>
          <div class="lane-tasks">
            <div *ngFor="let task of getTasksByStatus('Done')" class="task-card glass-panel-elevated task-done">
              <div class="task-card-top">
                <span class="badge badge-emerald">Done</span>
                <button *ngIf="canDelete()" (click)="deleteTask(task.id)" class="btn-card-del" title="Delete Task">✕</button>
              </div>
              <h3 class="task-card-title completed-title">{{ task.title }}</h3>
              <div class="task-card-meta">
                <span class="assignee-badge">👤 {{ task.assignedEmployeeName }}</span>
                <span class="date-badge" *ngIf="task.completedAtUtc">Finished: {{ task.completedAtUtc | slice:0:10 }}</span>
              </div>
            </div>
            <div *ngIf="getTasksByStatus('Done').length === 0" class="empty-lane">No completed tasks yet</div>
          </div>
        </div>
      </div>

      <!-- Create Task Modal Dialog -->
      <div class="modal-overlay" *ngIf="showModal" (click)="closeModal()">
        <div class="modal-dialog glass-panel-elevated" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2 class="font-heading-3">Create New Task</h2>
            <button class="modal-close-btn" (click)="closeModal()">✕</button>
          </div>

          <form (ngSubmit)="submitCreateTask()" class="modal-body">
            <div class="form-group">
              <label for="taskTitle">Task Title *</label>
              <input id="taskTitle" type="text" [(ngModel)]="newTaskTitle" name="title" placeholder="e.g. Conduct ISO Quality Inspection" required />
            </div>

            <div class="form-group">
              <label for="taskDesc">Description / Acceptance Criteria</label>
              <textarea id="taskDesc" rows="3" [(ngModel)]="newTaskDescription" name="description" placeholder="Specify deliverables, standards, and required checks..."></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="taskPriority">Priority</label>
                <select id="taskPriority" [(ngModel)]="newTaskPriority" name="priority">
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <div class="form-group">
                <label for="taskDueDate">Target Due Date</label>
                <input id="taskDueDate" type="date" [(ngModel)]="newTaskDueDate" name="dueDate" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="taskAssignee">Assignee</label>
                <select id="taskAssignee" [(ngModel)]="newTaskAssigneeId" name="assignee">
                  <option [value]="''">Unassigned</option>
                  <option *ngFor="let emp of employees" [value]="emp.id">
                    {{ emp.fullName }} ({{ emp.jobTitle }})
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label for="taskDept">Department</label>
                <select id="taskDept" [(ngModel)]="newTaskDeptId" name="department">
                  <option [value]="''">General / None</option>
                  <option *ngFor="let dept of departments" [value]="dept.id">
                    {{ dept.name }} ({{ dept.code }})
                  </option>
                </select>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" (click)="closeModal()" class="btn-secondary">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="!newTaskTitle">Create Task</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @use 'styles/variables' as *;
    @use 'styles/mixins' as *;

    .tasks-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;

      @include responsive-sm {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
    }

    // Role Scope Banner
    .role-scope-banner {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.25rem 1.5rem;
      border-color: rgba(99, 102, 241, 0.3);
      background: rgba(17, 24, 39, 0.7);

      .scope-icon {
        font-size: 1.5rem;
      }

      .scope-details {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;

        .scope-title {
          font-size: 0.75rem;
          font-weight: 700;
          color: #a5b4fc;
          letter-spacing: 0.05em;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .scope-explanation {
          font-size: 0.8125rem;
          color: $text-secondary;
          line-height: 1.5;

          strong {
            color: #ffffff;
          }
        }
      }
    }

    // Kanban Board
    .kanban-board {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.25rem;
      align-items: start;

      @include responsive-lg {
        grid-template-columns: repeat(2, 1fr);
      }

      @include responsive-sm {
        grid-template-columns: 1fr;
      }
    }

    .kanban-lane {
      padding: 1rem;
      min-height: 500px;
      display: flex;
      flex-direction: column;

      .lane-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 0.875rem;
        margin-bottom: 0.875rem;
        border-bottom: 1px solid $border-glass;

        .lane-title-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;

          .lane-indicator {
            width: 8px;
            height: 8px;
            border-radius: 50%;

            &.todo { background: $text-muted; }
            &.inprogress { background: $aurora-indigo; box-shadow: 0 0 6px $aurora-indigo; }
            &.inreview { background: $aurora-amber; }
            &.done { background: $aurora-emerald; }
          }

          .lane-title {
            font-size: 0.75rem;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: 0.06em;
          }
        }

        .lane-count {
          font-size: 0.75rem;
          font-weight: 600;
          color: $text-muted;
          background: rgba(255, 255, 255, 0.06);
          padding: 0.125rem 0.5rem;
          border-radius: $radius-full;
        }
      }

      .lane-tasks {
        display: flex;
        flex-direction: column;
        gap: 0.875rem;
      }

      .empty-lane {
        padding: 3rem 1rem;
        text-align: center;
        color: $text-muted;
        font-size: 0.75rem;
        border: 1px dashed $border-glass;
        border-radius: $radius-md;
      }
    }

    // Task Card
    .task-card {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      transition: all $transition-fast;

      &:hover {
        border-color: $border-glass-hover;
        transform: translateY(-2px);
      }

      &.task-done {
        opacity: 0.75;
      }

      .task-card-top {
        display: flex;
        align-items: center;
        justify-content: space-between;

        .btn-card-del {
          background: none;
          border: none;
          color: $text-muted;
          font-size: 0.875rem;
          cursor: pointer;

          &:hover {
            color: $aurora-rose;
          }
        }
      }

      .task-card-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: #ffffff;
        line-height: 1.35;

        &.completed-title {
          text-decoration: line-through;
          color: $text-muted;
        }
      }

      .task-card-desc {
        font-size: 0.75rem;
        color: $text-secondary;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .task-card-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 0.6875rem;
        color: $text-muted;
        margin-top: 0.25rem;
      }

      .task-card-actions {
        margin-top: 0.5rem;
        padding-top: 0.5rem;
        border-top: 1px solid $border-glass;

        .btn-action {
          width: 100%;
          padding: 0.375rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: #a5b4fc;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.25);
          border-radius: $radius-sm;
          cursor: pointer;
          transition: all $transition-fast;

          &:hover {
            background: rgba(99, 102, 241, 0.2);
            color: #ffffff;
          }

          &.btn-action-success {
            color: #6ee7b7;
            background: rgba(16, 185, 129, 0.1);
            border-color: rgba(16, 185, 129, 0.3);

            &:hover {
              background: rgba(16, 185, 129, 0.2);
              color: #ffffff;
            }
          }
        }
      }
    }

    // Modal
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      z-index: 100;
    }

    .modal-dialog {
      width: 100%;
      max-width: 520px;
      padding: 1.75rem;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;

      .modal-close-btn {
        background: none;
        border: none;
        color: $text-muted;
        font-size: 1.125rem;
        cursor: pointer;

        &:hover {
          color: #ffffff;
        }
      }
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }
  `]
})
export class TasksComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);

  public activeTenant$ = this.authService.activeTenant$;
  public tasks: TaskItem[] = [];
  public employees: Employee[] = [];
  public departments: Department[] = [];

  public showModal = false;
  public newTaskTitle = '';
  public newTaskDescription = '';
  public newTaskPriority: TaskPriority = 'Medium';
  public newTaskDueDate = '';
  public newTaskAssigneeId = '';
  public newTaskDeptId = '';

  constructor() {}

  public get currentRole(): string {
    return this.authService.currentRole || 'Employee';
  }

  public ngOnInit(): void {
    this.loadTasks();
    this.apiService.getEmployees().subscribe(res => {
      if (res.data) this.employees = res.data.data;
    });
    this.apiService.getDepartments().subscribe(res => {
      if (res.data) this.departments = res.data;
    });
  }

  public loadTasks(): void {
    this.apiService.getTasks().subscribe(res => {
      if (res.data) this.tasks = res.data.data;
    });
  }

  public getTasksByStatus(status: TaskStatus): TaskItem[] {
    return this.tasks.filter(t => t.status === status);
  }

  public openCreateModal(): void {
    this.newTaskTitle = '';
    this.newTaskDescription = '';
    this.newTaskPriority = 'Medium';
    this.newTaskDueDate = '';
    this.newTaskAssigneeId = '';
    this.newTaskDeptId = '';
    this.showModal = true;
  }

  public closeModal(): void {
    this.showModal = false;
  }

  public submitCreateTask(): void {
    if (!this.newTaskTitle) return;

    this.apiService.createTask({
      title: this.newTaskTitle,
      description: this.newTaskDescription,
      priority: this.newTaskPriority,
      dueDateUtc: this.newTaskDueDate || undefined,
      assignedEmployeeId: this.newTaskAssigneeId || undefined,
      departmentId: this.newTaskDeptId || undefined
    }).subscribe(() => {
      this.closeModal();
      this.loadTasks();
    });
  }

  public updateStatus(taskId: string, status: TaskStatus): void {
    this.apiService.updateTaskStatus(taskId, status).subscribe(() => {
      this.loadTasks();
    });
  }

  public deleteTask(taskId: string): void {
    if (!confirm('Are you sure you want to delete this task?')) return;
    this.apiService.deleteTask(taskId).subscribe(() => {
      this.loadTasks();
    });
  }

  public canDelete(): boolean {
    return this.currentRole === 'Owner' || this.currentRole === 'Admin' || this.currentRole === 'Manager';
  }

  public getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'Owner': return 'badge-violet';
      case 'Admin': return 'badge-indigo';
      case 'Manager': return 'badge-cyan';
      case 'Employee': return 'badge-emerald';
      default: return 'badge-indigo';
    }
  }

  public getPriorityBadge(priority: TaskPriority): string {
    switch (priority) {
      case 'Urgent': return 'badge-rose';
      case 'High': return 'badge-amber';
      case 'Medium': return 'badge-indigo';
      case 'Low': return 'badge-cyan';
      default: return 'badge-indigo';
    }
  }
}
