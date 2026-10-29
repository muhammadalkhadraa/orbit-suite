using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Orbit.Application.Common;
using Orbit.Application.Modules.Hr.Dtos;

namespace Orbit.Application.Modules.Hr;

public interface IHrService
{
    // Leave Requests
    Task<PagedResponse<LeaveRequestDto>> GetLeaveRequestsAsync(LeaveRequestFilterRequest filter, CancellationToken cancellationToken = default);
    Task<LeaveRequestDto> GetLeaveRequestByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<LeaveRequestDto> SubmitLeaveRequestAsync(CreateLeaveRequestRequest request, CancellationToken cancellationToken = default);
    Task<LeaveRequestDto> ActionLeaveRequestAsync(Guid id, ActionLeaveRequestRequest request, CancellationToken cancellationToken = default);
    Task CancelLeaveRequestAsync(Guid id, CancellationToken cancellationToken = default);
    Task<EmployeeVacationBalanceDto> GetVacationBalanceAsync(Guid? employeeId = null, CancellationToken cancellationToken = default);

    // Attendance
    Task<PagedResponse<AttendanceLogDto>> GetAttendanceLogsAsync(AttendanceFilterRequest filter, CancellationToken cancellationToken = default);
    Task<AttendanceLogDto?> GetTodayAttendanceAsync(CancellationToken cancellationToken = default);
    Task<AttendanceLogDto> CheckInAsync(CheckInRequest request, CancellationToken cancellationToken = default);
    Task<AttendanceLogDto> CheckOutAsync(CheckOutRequest request, CancellationToken cancellationToken = default);
    Task<AttendanceLogDto> RecordAttendanceAsync(RecordAttendanceRequest request, CancellationToken cancellationToken = default);

    // Shift Schedules
    Task<List<ShiftScheduleDto>> GetShiftSchedulesAsync(Guid? employeeId, CancellationToken cancellationToken = default);
    Task<ShiftScheduleDto> CreateShiftScheduleAsync(CreateShiftScheduleRequest request, CancellationToken cancellationToken = default);
    Task<ShiftScheduleDto> UpdateShiftScheduleAsync(Guid id, UpdateShiftScheduleRequest request, CancellationToken cancellationToken = default);
    Task DeleteShiftScheduleAsync(Guid id, CancellationToken cancellationToken = default);

    // Metrics & Employee Salary Profile
    Task<HrMetricsDto> GetHrMetricsAsync(CancellationToken cancellationToken = default);
    Task<EmployeeSalaryProfileDto> GetEmployeeSalaryProfileAsync(Guid employeeId, int? year = null, int? month = null, CancellationToken cancellationToken = default);
}
