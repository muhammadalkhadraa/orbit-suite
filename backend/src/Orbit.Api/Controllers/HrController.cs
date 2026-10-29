using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Orbit.Application.Common;
using Orbit.Application.Modules.Hr;
using Orbit.Application.Modules.Hr.Dtos;

namespace Orbit.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/hr")]
public class HrController : ControllerBase
{
    private readonly IHrService _hrService;

    public HrController(IHrService hrService)
    {
        _hrService = hrService;
    }

    [HttpGet("metrics")]
    public async Task<ActionResult<ApiResponse<HrMetricsDto>>> GetHrMetrics(CancellationToken cancellationToken)
    {
        var result = await _hrService.GetHrMetricsAsync(cancellationToken);
        return Ok(ApiResponse<HrMetricsDto>.Ok(result));
    }

    #region Leave Requests

    [HttpGet("leaves")]
    public async Task<ActionResult<ApiResponse<PagedResponse<LeaveRequestDto>>>> GetLeaveRequests(
        [FromQuery] LeaveRequestFilterRequest filter,
        CancellationToken cancellationToken)
    {
        var result = await _hrService.GetLeaveRequestsAsync(filter, cancellationToken);
        return Ok(ApiResponse<PagedResponse<LeaveRequestDto>>.Ok(result));
    }

    [HttpGet("leaves/{id}")]
    public async Task<ActionResult<ApiResponse<LeaveRequestDto>>> GetLeaveRequestById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _hrService.GetLeaveRequestByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<LeaveRequestDto>.Ok(result));
    }

    [HttpPost("leaves")]
    public async Task<ActionResult<ApiResponse<LeaveRequestDto>>> SubmitLeaveRequest(
        [FromBody] CreateLeaveRequestRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _hrService.SubmitLeaveRequestAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetLeaveRequestById), new { id = result.Id }, ApiResponse<LeaveRequestDto>.Ok(result, "Leave request submitted successfully."));
    }

    [HttpPatch("leaves/{id}/action")]
    public async Task<ActionResult<ApiResponse<LeaveRequestDto>>> ActionLeaveRequest(
        Guid id,
        [FromBody] ActionLeaveRequestRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _hrService.ActionLeaveRequestAsync(id, request, cancellationToken);
        return Ok(ApiResponse<LeaveRequestDto>.Ok(result, $"Leave request {result.Status.ToString().ToLower()} successfully."));
    }

    [HttpDelete("leaves/{id}")]
    public async Task<ActionResult<ApiResponse<string>>> CancelLeaveRequest(Guid id, CancellationToken cancellationToken)
    {
        await _hrService.CancelLeaveRequestAsync(id, cancellationToken);
        return Ok(ApiResponse<string>.Ok(string.Empty, "Leave request cancelled successfully."));
    }

    [HttpGet("vacation-balance")]
    public async Task<ActionResult<ApiResponse<EmployeeVacationBalanceDto>>> GetVacationBalance(
        [FromQuery] Guid? employeeId,
        CancellationToken cancellationToken)
    {
        var result = await _hrService.GetVacationBalanceAsync(employeeId, cancellationToken);
        return Ok(ApiResponse<EmployeeVacationBalanceDto>.Ok(result));
    }

    [HttpGet("employee-profile/{employeeId}")]
    public async Task<ActionResult<ApiResponse<EmployeeSalaryProfileDto>>> GetEmployeeSalaryProfile(
        Guid employeeId,
        [FromQuery] int? year,
        [FromQuery] int? month,
        CancellationToken cancellationToken)
    {
        var result = await _hrService.GetEmployeeSalaryProfileAsync(employeeId, year, month, cancellationToken);
        return Ok(ApiResponse<EmployeeSalaryProfileDto>.Ok(result));
    }

    #endregion

    #region Attendance

    [HttpGet("attendance")]
    public async Task<ActionResult<ApiResponse<PagedResponse<AttendanceLogDto>>>> GetAttendanceLogs(
        [FromQuery] AttendanceFilterRequest filter,
        CancellationToken cancellationToken)
    {
        var result = await _hrService.GetAttendanceLogsAsync(filter, cancellationToken);
        return Ok(ApiResponse<PagedResponse<AttendanceLogDto>>.Ok(result));
    }

    [HttpGet("attendance/today")]
    public async Task<ActionResult<ApiResponse<AttendanceLogDto?>>> GetTodayAttendance(CancellationToken cancellationToken)
    {
        var result = await _hrService.GetTodayAttendanceAsync(cancellationToken);
        return Ok(ApiResponse<AttendanceLogDto?>.Ok(result));
    }

    [HttpPost("attendance/check-in")]
    public async Task<ActionResult<ApiResponse<AttendanceLogDto>>> CheckIn(
        [FromBody] CheckInRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _hrService.CheckInAsync(request, cancellationToken);
        return Ok(ApiResponse<AttendanceLogDto>.Ok(result, "Checked in successfully."));
    }

    [HttpPost("attendance/check-out")]
    public async Task<ActionResult<ApiResponse<AttendanceLogDto>>> CheckOut(
        [FromBody] CheckOutRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _hrService.CheckOutAsync(request, cancellationToken);
        return Ok(ApiResponse<AttendanceLogDto>.Ok(result, "Checked out successfully."));
    }

    [HttpPost("attendance/record")]
    public async Task<ActionResult<ApiResponse<AttendanceLogDto>>> RecordAttendance(
        [FromBody] RecordAttendanceRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _hrService.RecordAttendanceAsync(request, cancellationToken);
        return Ok(ApiResponse<AttendanceLogDto>.Ok(result, "Attendance record saved successfully."));
    }

    #endregion

    #region Shift Schedules

    [HttpGet("shifts")]
    public async Task<ActionResult<ApiResponse<List<ShiftScheduleDto>>>> GetShiftSchedules(
        [FromQuery] Guid? employeeId,
        CancellationToken cancellationToken)
    {
        var result = await _hrService.GetShiftSchedulesAsync(employeeId, cancellationToken);
        return Ok(ApiResponse<List<ShiftScheduleDto>>.Ok(result));
    }

    [HttpPost("shifts")]
    public async Task<ActionResult<ApiResponse<ShiftScheduleDto>>> CreateShiftSchedule(
        [FromBody] CreateShiftScheduleRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _hrService.CreateShiftScheduleAsync(request, cancellationToken);
        return Ok(ApiResponse<ShiftScheduleDto>.Ok(result, "Shift schedule created successfully."));
    }

    [HttpPut("shifts/{id}")]
    public async Task<ActionResult<ApiResponse<ShiftScheduleDto>>> UpdateShiftSchedule(
        Guid id,
        [FromBody] UpdateShiftScheduleRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _hrService.UpdateShiftScheduleAsync(id, request, cancellationToken);
        return Ok(ApiResponse<ShiftScheduleDto>.Ok(result, "Shift schedule updated successfully."));
    }

    [HttpDelete("shifts/{id}")]
    public async Task<ActionResult<ApiResponse<string>>> DeleteShiftSchedule(Guid id, CancellationToken cancellationToken)
    {
        await _hrService.DeleteShiftScheduleAsync(id, cancellationToken);
        return Ok(ApiResponse<string>.Ok(string.Empty, "Shift schedule deleted successfully."));
    }

    #endregion
}
