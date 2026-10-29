using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Orbit.Application.Common;
using Orbit.Application.Interfaces;
using Orbit.Application.Modules.Hr.Dtos;

namespace Orbit.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/activity")]
public class ActivityController : ControllerBase
{
    private readonly IActivityService _activityService;

    public ActivityController(IActivityService activityService)
    {
        _activityService = activityService;
    }

    [HttpPost("action")]
    public async Task<ActionResult<ApiResponse<UserActivityStatusDto>>> ExecuteAction(
        [FromBody] ActivityActionRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _activityService.ExecuteActionAsync(request, cancellationToken);
            var message = request.Action?.ToLowerInvariant() switch
            {
                "start" => result.TotalWorkSeconds > 0
                    ? $"Shift resumed (Split Shift). Total worked so far: {result.TotalWorkSeconds / 3600.0:F1}h."
                    : (result.IsLate 
                        ? $"Work started at {result.WorkStartedAtUtc:HH:mm} UTC. Marked as Late ({result.LateMinutes} mins)."
                        : $"Work started on time at {result.WorkStartedAtUtc:HH:mm} UTC."),
                "break" => "Break started. Timer paused.",
                "resume" => result.HasExceededBreak 
                    ? $"Work resumed. Break limit exceeded (Fault: {result.FaultsCount})." 
                    : "Work resumed. Break ended.",
                "end" => $"Work session completed. Total worked: {result.TotalWorkSeconds / 3600.0:F1}h.",
                "pause-idle" or "idle" => "Work timer automatically paused due to 5 minutes of inactivity.",
                "resume-idle" => "Welcome back! Work timer resumed.",
                _ => "Action processed successfully."
            };

            return Ok(ApiResponse<UserActivityStatusDto>.Ok(result, message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<UserActivityStatusDto>.Fail(ex.Message, "ActivityActionFailed"));
        }
    }

    [HttpGet("my-status")]
    public async Task<ActionResult<ApiResponse<UserActivityStatusDto>>> GetMyStatus(CancellationToken cancellationToken)
    {
        var result = await _activityService.GetMyStatusAsync(cancellationToken);
        return Ok(ApiResponse<UserActivityStatusDto>.Ok(result));
    }

    [HttpGet("my-history")]
    public async Task<ActionResult<ApiResponse<List<LiveEmployeeActivityDto>>>> GetMyHistory(
        [FromQuery] int days = 30,
        CancellationToken cancellationToken = default)
    {
        var result = await _activityService.GetMyHistoryAsync(days, cancellationToken);
        return Ok(ApiResponse<List<LiveEmployeeActivityDto>>.Ok(result));
    }

    [HttpGet("live-monitor")]
    public async Task<ActionResult<ApiResponse<LiveMonitorResponse>>> GetLiveMonitor(CancellationToken cancellationToken)
    {
        var result = await _activityService.GetLiveMonitorAsync(cancellationToken);
        return Ok(ApiResponse<LiveMonitorResponse>.Ok(result));
    }

    [HttpGet("report")]
    public async Task<ActionResult<ApiResponse<ActivityReportResponse>>> GetActivityReport(
        [FromQuery] ActivityReportFilter filter,
        CancellationToken cancellationToken)
    {
        var result = await _activityService.GetActivityReportAsync(filter, cancellationToken);
        return Ok(ApiResponse<ActivityReportResponse>.Ok(result));
    }

    [HttpPost("heartbeat")]
    public async Task<ActionResult<ApiResponse<bool>>> Heartbeat(CancellationToken cancellationToken)
    {
        await _activityService.HeartbeatAsync(cancellationToken);
        return Ok(ApiResponse<bool>.Ok(true));
    }
}
