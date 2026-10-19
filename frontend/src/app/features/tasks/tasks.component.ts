import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
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
          <button (click)="openImportModal()" class="btn-secondary" title="Import Tasks & Sprints from CSV">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span>Import CSV</span>
          </button>
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

      <!-- Tasks Filter & Priority Toolbar -->
      <div class="tasks-toolbar glass-panel">
        <div class="search-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            placeholder="Search tasks by title, description, or assignee..." 
          />
        </div>

        <div class="priority-chips">
          <span class="chips-label">Priority:</span>
          <button 
            type="button" 
            class="chip-btn" 
            [class.active]="selectedPriority === 'All'" 
            (click)="setPriorityFilter('All')">
            All
          </button>
          <button 
            type="button" 
            class="chip-btn chip-urgent" 
            [class.active]="selectedPriority === 'Urgent'" 
            (click)="setPriorityFilter('Urgent')">
            Urgent
          </button>
          <button 
            type="button" 
            class="chip-btn chip-high" 
            [class.active]="selectedPriority === 'High'" 
            (click)="setPriorityFilter('High')">
            High
          </button>
          <button 
            type="button" 
            class="chip-btn chip-medium" 
            [class.active]="selectedPriority === 'Medium'" 
            (click)="setPriorityFilter('Medium')">
            Medium
          </button>
          <button 
            type="button" 
            class="chip-btn chip-low" 
            [class.active]="selectedPriority === 'Low'" 
            (click)="setPriorityFilter('Low')">
            Low
          </button>
        </div>

        <div class="toolbar-actions">
          <button (click)="exportTasksCsv()" class="btn-secondary btn-export" title="Download Tasks as CSV">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Export CSV</span>
          </button>
          <div class="task-metrics">
            <span class="metric-count">{{ getFilteredTasks().length }}</span> of {{ tasks.length }} tasks
          </div>
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

      <!-- MODAL: BULK CSV IMPORT TASKS & SPRINTS -->
      <div class="modal-backdrop" *ngIf="showImportModal" (click)="closeImportModal()">
        <div class="modal-card modal-import glass-panel-elevated" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <div class="badge badge-indigo" style="margin-bottom: 0.25rem;">Batch Ingestion Engine</div>
              <h2 class="font-heading-3">Import Tasks & Sprints from CSV</h2>
              <p class="font-caption text-muted">Bulk create backlog items, sprint tasks, and roadmap milestones from spreadsheet exports.</p>
            </div>
            <button (click)="closeImportModal()" class="modal-close-btn">✕</button>
          </div>

          <div class="modal-body import-body">
            <!-- Step 1: Template Download -->
            <div class="import-step glass-panel">
              <div class="step-num">1</div>
              <div class="step-content">
                <div class="step-title font-body-bold">Download Standard CSV Template</div>
                <p class="step-desc text-muted font-caption">Pre-configured schema with columns: Title, Description, Priority, Status, DueDate, AssigneeEmail.</p>
                <button type="button" (click)="downloadTemplate()" class="btn-secondary btn-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  <span>Download tasks-template.csv</span>
                </button>
              </div>
            </div>

            <!-- Step 2: Upload CSV -->
            <div class="import-step glass-panel">
              <div class="step-num">2</div>
              <div class="step-content">
                <div class="step-title font-body-bold">Upload CSV Callset</div>
                <div class="file-dropzone" (click)="fileInput.click()">
                  <input #fileInput type="file" accept=".csv" (change)="onFileSelected($event)" style="display: none;" />
                  <div class="dropzone-icon">📁</div>
                  <div class="dropzone-text" *ngIf="!importFileName">Click or drop a <strong>.csv</strong> file here</div>
                  <div class="dropzone-text text-emerald" *ngIf="importFileName">Selected: <strong>{{ importFileName }}</strong></div>
                  <span class="dropzone-sub text-muted">Supports RFC 4180 formatted CSV with commas or quotes</span>
                </div>
              </div>
            </div>

            <!-- Validation Errors -->
            <div *ngIf="importErrors.length > 0" class="import-errors-box">
              <div class="err-title font-caption text-danger" style="font-weight: 700;">Validation Notice</div>
              <ul class="error-list">
                <li *ngFor="let err of importErrors">{{ err }}</li>
              </ul>
            </div>

            <!-- Preview -->
            <div *ngIf="parsedRows.length > 0" class="preview-table-container glass-panel">
              <div class="preview-header">
                <span class="preview-title font-body-bold">Parsed Tasks Ready for Ingestion</span>
                <span class="badge badge-emerald">{{ parsedRows.length }} valid items</span>
              </div>
              <table class="preview-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Due Date</th>
                    <th>Assignee Email</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let row of parsedRows | slice:0:8">
                    <td class="font-bold">{{ row.title }}</td>
                    <td><span class="badge" [ngClass]="getPriorityBadge(row.priority)">{{ row.priority }}</span></td>
                    <td><span class="badge badge-indigo">{{ row.status }}</span></td>
                    <td class="text-muted">{{ row.dueDateUtc ? (row.dueDateUtc | slice:0:10) : 'None' }}</td>
                    <td class="text-muted">{{ row.assigneeEmail || 'Unassigned' }}</td>
                  </tr>
                </tbody>
              </table>
              <div *ngIf="parsedRows.length > 8" class="preview-more text-muted font-caption" style="margin-top: 0.5rem; text-align: center;">
                + {{ parsedRows.length - 8 }} more rows will be created in this batch
              </div>
            </div>

            <!-- Ingestion Progress -->
            <div *ngIf="isImporting" class="import-progress-box">
              <div class="progress-label">
                <span>Ingesting tasks into tenant database...</span>
                <span>{{ importProgress }}%</span>
              </div>
              <div class="progress-track">
                <div class="progress-bar-fill" [style.width.%]="importProgress"></div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" (click)="closeImportModal()" class="btn-secondary" [disabled]="isImporting">Cancel</button>
            <button type="button" *ngIf="parsedRows.length > 0 && !isImporting" (click)="resetImport()" class="btn-secondary">Clear</button>
            <button type="button" (click)="executeImport()" class="btn-primary" [disabled]="parsedRows.length === 0 || isImporting">
              <span>Execute Import ({{ parsedRows.length }})</span>
            </button>
          </div>
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

    // Tasks Toolbar
    .tasks-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.75rem 1.25rem;
      flex-wrap: wrap;

      .search-box {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex: 1;
        min-width: 220px;
        max-width: 340px;
        color: $text-muted;

        input {
          background: none;
          border: none;
          color: #ffffff;
          font-size: 0.875rem;
          width: 100%;
          outline: none;

          &::placeholder {
            color: $text-muted;
          }
        }
      }

      .priority-chips {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;

        .chips-label {
          font-size: 0.75rem;
          color: $text-muted;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-right: 0.25rem;
        }

        .chip-btn {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid $border-glass;
          color: $text-secondary;
          border-radius: 9999px;
          padding: 0.25rem 0.75rem;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all $transition-fast;

          &:hover {
            color: #ffffff;
            background: rgba(255, 255, 255, 0.08);
          }

          &.active {
            background: rgba(99, 102, 241, 0.25);
            border-color: $aurora-indigo;
            color: #a5b4fc;
            box-shadow: 0 0 10px rgba(99, 102, 241, 0.3);
          }

          &.chip-urgent.active {
            background: rgba(244, 63, 94, 0.25);
            border-color: $aurora-rose;
            color: #fda4af;
            box-shadow: 0 0 10px rgba(244, 63, 94, 0.3);
          }

          &.chip-high.active {
            background: rgba(245, 158, 11, 0.25);
            border-color: $aurora-amber;
            color: #fcd34d;
            box-shadow: 0 0 10px rgba(245, 158, 11, 0.3);
          }

          &.chip-medium.active {
            background: rgba(99, 102, 241, 0.25);
            border-color: $aurora-indigo;
            color: #a5b4fc;
            box-shadow: 0 0 10px rgba(99, 102, 241, 0.3);
          }

          &.chip-low.active {
            background: rgba(6, 182, 212, 0.25);
            border-color: $aurora-cyan;
            color: #67e8f9;
            box-shadow: 0 0 10px rgba(6, 182, 212, 0.3);
          }
        }
      }

      .toolbar-actions {
        display: flex;
        align-items: center;
        gap: 1rem;

        .btn-export {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.75rem;
          font-size: 0.75rem;
          font-weight: 500;
          border-radius: $radius-sm;
        }
      }

      .task-metrics {
        font-size: 0.8125rem;
        color: $text-muted;

        .metric-count {
          color: #ffffff;
          font-weight: 600;
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

    .modal-import {
      max-width: 640px;

      .import-body {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-top: 0.5rem;
      }

      .import-step {
        display: flex;
        gap: 1rem;
        padding: 1rem;

        .step-num {
          width: 28px;
          height: 28px;
          border-radius: $radius-full;
          background: rgba(99, 102, 241, 0.2);
          color: $aurora-indigo;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.85rem;
          flex-shrink: 0;
        }

        .step-content {
          flex: 1;

          .step-title {
            font-size: 0.875rem;
            margin-bottom: 0.25rem;
          }

          .step-desc {
            margin-bottom: 0.75rem;
          }
        }
      }

      .file-dropzone {
        padding: 1.25rem;
        border: 2px dashed rgba(255, 255, 255, 0.2);
        border-radius: $radius-md;
        background: rgba(0, 0, 0, 0.2);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all $transition-fast;

        &:hover {
          border-color: $aurora-indigo;
          background: rgba(99, 102, 241, 0.05);
        }

        .dropzone-icon {
          font-size: 1.75rem;
          margin-bottom: 0.25rem;
        }

        .dropzone-text {
          font-size: 0.875rem;
        }

        .dropzone-sub {
          font-size: 0.75rem;
          margin-top: 0.25rem;
        }
      }

      .import-errors-box {
        padding: 0.75rem 1rem;
        border-radius: $radius-md;
        background: rgba(244, 63, 94, 0.1);
        border: 1px solid rgba(244, 63, 94, 0.3);

        .error-list {
          margin: 0.25rem 0 0 1rem;
          font-size: 0.8rem;
          color: #fca5a5;
        }
      }

      .preview-table-container {
        padding: 0.75rem;
        border-radius: $radius-md;

        .preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .preview-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8rem;

          th {
            padding: 0.5rem;
            text-align: left;
            background: rgba(255, 255, 255, 0.05);
            color: $text-muted;
            border-bottom: 1px solid $border-glass;
          }

          td {
            padding: 0.5rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.03);
            color: $text-primary;
          }
        }
      }

      .import-progress-box {
        .progress-label {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          margin-bottom: 0.35rem;
          color: $text-muted;
        }

        .progress-track {
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;

          .progress-bar-fill {
            height: 100%;
            background: linear-gradient(90deg, $aurora-indigo, $aurora-emerald);
            transition: width 0.3s ease;
          }
        }
      }
    }
  `]
})
export class TasksComponent implements OnInit {
  public apiService = inject(ApiService);
  public authService = inject(AuthService);
  public toastService = inject(ToastService);

  public activeTenant$ = this.authService.activeTenant$;
  public tasks: TaskItem[] = [];
  public employees: Employee[] = [];
  public departments: Department[] = [];
  public searchQuery = '';
  public selectedPriority: 'All' | TaskPriority = 'All';

  public showModal = false;
  public newTaskTitle = '';
  public newTaskDescription = '';
  public newTaskPriority: TaskPriority = 'Medium';
  public newTaskDueDate = '';
  public newTaskAssigneeId = '';
  public newTaskDeptId = '';

  // Bulk CSV Import State
  public showImportModal = false;
  public importFileName = '';
  public parsedRows: any[] = [];
  public importErrors: string[] = [];
  public isImporting = false;
  public importProgress = 0;

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

  public getFilteredTasks(): TaskItem[] {
    let result = [...this.tasks];

    if (this.selectedPriority !== 'All') {
      result = result.filter(t => t.priority === this.selectedPriority);
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.assignedEmployeeName && t.assignedEmployeeName.toLowerCase().includes(q))
      );
    }

    return result;
  }

  public getTasksByStatus(status: TaskStatus): TaskItem[] {
    return this.getFilteredTasks().filter(t => t.status === status);
  }

  public setPriorityFilter(priority: 'All' | TaskPriority): void {
    this.selectedPriority = priority;
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

  public exportTasksCsv(): void {
    const headers = ['Task ID', 'Title', 'Priority', 'Status', 'Assignee', 'Department ID', 'Due Date', 'Created Date', 'Description'];
    const rows = this.getFilteredTasks().map(t => [
      `"${t.id}"`,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${t.priority}"`,
      `"${t.status}"`,
      `"${(t.assignedEmployeeName || 'Unassigned').replace(/"/g, '""')}"`,
      `"${t.departmentId || 'None'}"`,
      `"${t.dueDateUtc ? t.dueDateUtc.slice(0, 10) : 'None'}"`,
      `"${t.createdAtUtc ? t.createdAtUtc.slice(0, 10) : ''}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `orbit-tasks-${this.selectedPriority.toLowerCase()}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- BULK CSV IMPORT ENGINE ---
  public openImportModal(): void {
    this.showImportModal = true;
    this.resetImport();
  }

  public closeImportModal(): void {
    this.showImportModal = false;
    this.resetImport();
  }

  public resetImport(): void {
    this.importFileName = '';
    this.parsedRows = [];
    this.importErrors = [];
    this.isImporting = false;
    this.importProgress = 0;
  }

  public downloadTemplate(): void {
    const header = 'Title,Description,Priority,Status,DueDate,AssigneeEmail\n';
    const sample = 'Implement OAuth2 SSO,Integrate SAML/OIDC enterprise single sign-on,Urgent,Todo,2026-11-01,alex@apex.com\nSetup Database Replication,Configure read-replicas in secondary region,High,InProgress,2026-11-15,david@apex.com\nAudit Security Controls,Annual SOC2 compliance policy inspection,Medium,Todo,2026-12-01,marcus@apex.com';
    this.downloadCsvFile(header + sample, 'tasks-template.csv');
  }

  public downloadCsvFile(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  public onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    this.importFileName = file.name;
    this.importErrors = [];
    this.parsedRows = [];

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      this.parseCsvContent(text);
    };
    reader.readAsText(file);
  }

  public parseCsvContent(text: string): void {
    if (!text || !text.trim()) {
      this.importErrors.push('The selected CSV file is empty.');
      return;
    }

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) {
      this.importErrors.push('CSV must contain a header row and at least one data record.');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
    const titleIdx = headers.findIndex(h => h.includes('title') || h.includes('task'));
    const descIdx = headers.findIndex(h => h.includes('desc'));
    const priorityIdx = headers.findIndex(h => h.includes('priority'));
    const statusIdx = headers.findIndex(h => h.includes('status'));
    const dateIdx = headers.findIndex(h => h.includes('due') || h.includes('date'));
    const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('assignee'));

    if (titleIdx === -1) {
      this.importErrors.push('Missing required column: Title');
      return;
    }

    const validPriorities = ['Low', 'Medium', 'High', 'Urgent'];
    const validStatuses = ['Todo', 'InProgress', 'InReview', 'Done'];

    const parsed: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
      if (row.length === 0 || !row[titleIdx]) continue;

      let priority: TaskPriority = 'Medium';
      if (priorityIdx !== -1 && row[priorityIdx]) {
        const found = validPriorities.find(p => p.toLowerCase() === row[priorityIdx].toLowerCase());
        if (found) priority = found as TaskPriority;
      }

      let status: TaskStatus = 'Todo';
      if (statusIdx !== -1 && row[statusIdx]) {
        const found = validStatuses.find(s => s.toLowerCase() === row[statusIdx].toLowerCase());
        if (found) status = found as TaskStatus;
      }

      const assigneeEmail = emailIdx !== -1 ? row[emailIdx] : '';
      let assignedEmployeeId: string | undefined = undefined;
      let assignedEmployeeName: string | undefined = undefined;
      if (assigneeEmail && this.employees.length > 0) {
        const matched = this.employees.find(e => e.email.toLowerCase() === assigneeEmail.toLowerCase());
        if (matched) {
          assignedEmployeeId = matched.id;
          assignedEmployeeName = matched.fullName;
        }
      }

      parsed.push({
        title: row[titleIdx],
        description: descIdx !== -1 ? row[descIdx] : '',
        priority,
        status,
        dueDateUtc: dateIdx !== -1 && row[dateIdx] ? new Date(row[dateIdx]).toISOString() : undefined,
        assignedEmployeeId,
        assignedEmployeeName,
        assigneeEmail
      });
    }

    if (parsed.length === 0) {
      this.importErrors.push('No valid task records could be extracted from CSV.');
    } else {
      this.parsedRows = parsed;
    }
  }

  public executeImport(): void {
    if (this.parsedRows.length === 0 || this.isImporting) return;
    this.isImporting = true;
    this.importProgress = 10;

    let completed = 0;
    const total = this.parsedRows.length;

    const processNext = (index: number) => {
      if (index >= total) {
        this.isImporting = false;
        this.importProgress = 100;
        this.showImportModal = false;
        this.toastService.success('CSV Import Completed', `Successfully ingested ${total} tasks into backlog.`);
        this.loadTasks();
        this.resetImport();
        return;
      }

      const item = this.parsedRows[index];
      this.apiService.createTask({
        title: item.title,
        description: item.description,
        priority: item.priority,
        dueDateUtc: item.dueDateUtc,
        assignedEmployeeId: item.assignedEmployeeId
      }).subscribe({
        next: () => {
          completed++;
          this.importProgress = Math.round((completed / total) * 100);
          processNext(index + 1);
        },
        error: () => {
          completed++;
          this.importProgress = Math.round((completed / total) * 100);
          processNext(index + 1);
        }
      });
    };

    processNext(0);
  }
}
