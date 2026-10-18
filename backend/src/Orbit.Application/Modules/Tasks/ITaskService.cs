using System;
using System.Threading;
using System.Threading.Tasks;
using Orbit.Application.Common;
using Orbit.Application.Modules.Tasks.Dtos;

namespace Orbit.Application.Modules.Tasks;

public interface ITaskService
{
    Task<PagedResponse<TaskItemDto>> GetTasksAsync(TaskFilterRequest filter, CancellationToken cancellationToken = default);
    Task<TaskItemDto> GetTaskByIdAsync(Guid taskId, CancellationToken cancellationToken = default);
    Task<TaskItemDto> CreateTaskAsync(CreateTaskRequest request, CancellationToken cancellationToken = default);
    Task<TaskItemDto> UpdateTaskAsync(Guid taskId, UpdateTaskRequest request, CancellationToken cancellationToken = default);
    Task<TaskItemDto> UpdateTaskStatusAsync(Guid taskId, UpdateTaskStatusRequest request, CancellationToken cancellationToken = default);
    Task DeleteTaskAsync(Guid taskId, CancellationToken cancellationToken = default);
}
