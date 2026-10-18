using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Orbit.Application.Common;
using Orbit.Application.Modules.Tasks;
using Orbit.Application.Modules.Tasks.Dtos;

namespace Orbit.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/tasks")]
public class TasksController : ControllerBase
{
    private readonly ITaskService _taskService;

    public TasksController(ITaskService taskService)
    {
        _taskService = taskService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResponse<TaskItemDto>>>> GetTasks(
        [FromQuery] TaskFilterRequest filter,
        CancellationToken cancellationToken)
    {
        var result = await _taskService.GetTasksAsync(filter, cancellationToken);
        return Ok(ApiResponse<PagedResponse<TaskItemDto>>.Ok(result));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<TaskItemDto>>> GetTaskById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _taskService.GetTaskByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<TaskItemDto>.Ok(result));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<TaskItemDto>>> CreateTask(
        [FromBody] CreateTaskRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _taskService.CreateTaskAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetTaskById), new { id = result.Id }, ApiResponse<TaskItemDto>.Ok(result, "Task created successfully."));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<TaskItemDto>>> UpdateTask(
        Guid id,
        [FromBody] UpdateTaskRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _taskService.UpdateTaskAsync(id, request, cancellationToken);
        return Ok(ApiResponse<TaskItemDto>.Ok(result, "Task updated successfully."));
    }

    [HttpPatch("{id}/status")]
    public async Task<ActionResult<ApiResponse<TaskItemDto>>> UpdateTaskStatus(
        Guid id,
        [FromBody] UpdateTaskStatusRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _taskService.UpdateTaskStatusAsync(id, request, cancellationToken);
        return Ok(ApiResponse<TaskItemDto>.Ok(result, "Task status updated successfully."));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteTask(Guid id, CancellationToken cancellationToken)
    {
        await _taskService.DeleteTaskAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(null, "Task deleted successfully."));
    }
}
