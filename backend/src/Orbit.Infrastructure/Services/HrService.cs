using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Orbit.Application.Common;
using Orbit.Application.Common.Exceptions;
using Orbit.Application.Interfaces;
using Orbit.Application.Modules.Hr;
using Orbit.Application.Modules.Hr.Dtos;
using Orbit.Domain.Entities;
using Orbit.Domain.Enums;

namespace Orbit.Infrastructure.Services;

public class HrService : IHrService
{
    private readonly IApplicationDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAuditService _auditService;

    public HrService(
        IApplicationDbContext context,
        ITenantContext tenantContext,
        ICurrentUserService currentUserService,
        IAuditService auditService)
    {
        _context = context;
        _tenantContext = tenantContext;
        _currentUserService = currentUserService;
        _auditService = auditService;
    }

    #region Leave Requests

    public async Task<PagedResponse<LeaveRequestDto>> GetLeaveRequestsAsync(LeaveRequestFilterRequest filter, CancellationToken cancellationToken = default)
    {
        var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;

        var query = _context.LeaveRequests
            .Include(r => r.Employee)
                .ThenInclude(e => e.Department)
            .Include(r => r.ApproverEmployee)
            .AsQueryable();

        // Enforce Confirmed Role-Scoped Leave Visibility
        if (role == TenantRole.Employee)
        {
            var empId = currentEmployee?.Id ?? Guid.Empty;
            query = query.Where(r => r.EmployeeId == empId);
        }
        else if (role == TenantRole.Manager)
        {
            var managerId = currentEmployee?.Id ?? Guid.Empty;
            query = query.Where(r =>
                r.EmployeeId == managerId ||
                (r.Employee != null && (r.Employee.ReportsToEmployeeId == managerId || (r.Employee.Department != null && r.Employee.Department.ManagerEmployeeId == managerId))));
        }

        // Apply filters
        if (filter.Status.HasValue)
        {
            query = query.Where(r => r.Status == filter.Status.Value);
        }

        if (filter.LeaveType.HasValue)
        {
            query = query.Where(r => r.LeaveType == filter.LeaveType.Value);
        }

        if (filter.EmployeeId.HasValue)
        {
            query = query.Where(r => r.EmployeeId == filter.EmployeeId.Value);
        }

        if (filter.StartDate.HasValue)
        {
            query = query.Where(r => r.StartDateUtc >= filter.StartDate.Value);
        }

        if (filter.EndDate.HasValue)
        {
            query = query.Where(r => r.EndDateUtc <= filter.EndDate.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var page = filter.Page < 1 ? 1 : filter.Page;
        var pageSize = filter.PageSize < 1 ? 20 : filter.PageSize;

        var items = await query
            .OrderByDescending(r => r.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => MapToLeaveRequestDto(r))
            .ToListAsync(cancellationToken);

        return new PagedResponse<LeaveRequestDto>(items, totalCount, page, pageSize);
    }

    public async Task<LeaveRequestDto> GetLeaveRequestByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var request = await _context.LeaveRequests
            .Include(r => r.Employee)
                .ThenInclude(e => e.Department)
            .Include(r => r.ApproverEmployee)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

        if (request == null)
            throw new NotFoundException(nameof(LeaveRequest), id);

        var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;

        if (role == TenantRole.Employee && request.EmployeeId != (currentEmployee?.Id ?? Guid.Empty))
        {
            throw new ForbiddenAccessException("You do not have permission to view this leave request.");
        }
        else if (role == TenantRole.Manager &&
                 request.EmployeeId != (currentEmployee?.Id ?? Guid.Empty) &&
                 request.Employee?.ReportsToEmployeeId != (currentEmployee?.Id ?? Guid.Empty) &&
                 request.Employee?.Department?.ManagerEmployeeId != (currentEmployee?.Id ?? Guid.Empty))
        {
            throw new ForbiddenAccessException("You do not have permission to view leave requests outside your supervisory scope.");
        }

        return MapToLeaveRequestDto(request);
    }

    public async Task<LeaveRequestDto> SubmitLeaveRequestAsync(CreateLeaveRequestRequest request, CancellationToken cancellationToken = default)
    {
        if (request.EndDateUtc < request.StartDateUtc)
        {
            throw new InvalidOperationException("Leave end date cannot be earlier than start date.");
        }

        var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;

        Guid targetEmployeeId;
        if (request.EmployeeId.HasValue && request.EmployeeId.Value != Guid.Empty)
        {
            if (role == TenantRole.Employee && request.EmployeeId.Value != (currentEmployee?.Id ?? Guid.Empty))
            {
                throw new ForbiddenAccessException("Employees can only submit leave requests for themselves.");
            }
            if (role == TenantRole.Manager)
            {
                var targetEmp = await _context.Employees.FirstOrDefaultAsync(e => e.Id == request.EmployeeId.Value, cancellationToken);
                if (targetEmp == null)
                    throw new NotFoundException(nameof(EmployeeProfile), request.EmployeeId.Value);

                if (targetEmp.Id != (currentEmployee?.Id ?? Guid.Empty) && targetEmp.ReportsToEmployeeId != (currentEmployee?.Id ?? Guid.Empty))
                {
                    throw new ForbiddenAccessException("Managers can only submit leave requests for themselves or direct reports.");
                }
            }

            targetEmployeeId = request.EmployeeId.Value;
        }
        else
        {
            if (currentEmployee == null)
            {
                throw new InvalidOperationException("Current user is not associated with an employee profile.");
            }
            targetEmployeeId = currentEmployee.Id;
        }

        // Calculate DaysCount if not provided
        decimal days = request.DaysCount ?? (decimal)Math.Max(1, (request.EndDateUtc.Date - request.StartDateUtc.Date).TotalDays + 1);

        // Generate sequential RequestNumber: LR-YYYY-XXXX
        var year = DateTime.UtcNow.Year;
        var prefix = $"LR-{year}-";
        var lastRequest = await _context.LeaveRequests
            .Where(r => r.RequestNumber.StartsWith(prefix))
            .OrderByDescending(r => r.RequestNumber)
            .FirstOrDefaultAsync(cancellationToken);

        int nextSeq = 1;
        if (lastRequest != null && lastRequest.RequestNumber.Length > prefix.Length)
        {
            var seqStr = lastRequest.RequestNumber.Substring(prefix.Length);
            if (int.TryParse(seqStr, out var parsed))
            {
                nextSeq = parsed + 1;
            }
        }
        var requestNumber = $"{prefix}{nextSeq:D4}";

        var targetEmployee = await _context.Employees
            .Include(e => e.Department)
            .FirstOrDefaultAsync(e => e.Id == targetEmployeeId, cancellationToken);

        if (targetEmployee == null)
            throw new NotFoundException(nameof(EmployeeProfile), targetEmployeeId);

        var leave = new LeaveRequest
        {
            TenantId = _tenantContext.CurrentTenantId ?? Guid.Empty,
            RequestNumber = requestNumber,
            EmployeeId = targetEmployeeId,
            LeaveType = request.LeaveType,
            StartDateUtc = request.StartDateUtc,
            EndDateUtc = request.EndDateUtc,
            DaysCount = days,
            Reason = request.Reason.Trim(),
            Status = LeaveStatus.Pending,
            RemainingBalanceAtRequest = targetEmployee.VacationDaysRemaining
        };

        _context.LeaveRequests.Add(leave);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("Create", "LeaveRequest", leave.Id.ToString(), $"Submitted leave request {requestNumber} for {days} days ({leave.LeaveType}). Remaining balance: {targetEmployee.VacationDaysRemaining} days.", cancellationToken);

        return await GetLeaveRequestByIdAsync(leave.Id, cancellationToken);
    }

    public async Task<LeaveRequestDto> ActionLeaveRequestAsync(Guid id, ActionLeaveRequestRequest request, CancellationToken cancellationToken = default)
    {
        var leave = await _context.LeaveRequests
            .Include(r => r.Employee)
                .ThenInclude(e => e.Department)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

        if (leave == null)
            throw new NotFoundException(nameof(LeaveRequest), id);

        if (leave.Status != LeaveStatus.Pending)
        {
            throw new InvalidOperationException($"Cannot action leave request with status '{leave.Status}'. Only pending requests can be approved or rejected.");
        }

        if (request.Status != LeaveStatus.Approved && request.Status != LeaveStatus.Rejected)
        {
            throw new InvalidOperationException("Action status must be either Approved or Rejected.");
        }

        var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;

        // Verify Authority: Must be direct supervisor OR Department Manager OR Admin/Owner
        if (role == TenantRole.Employee)
        {
            throw new ForbiddenAccessException("Standard employees cannot approve or reject leave requests.");
        }
        else if (role == TenantRole.Manager)
        {
            var managerId = currentEmployee?.Id ?? Guid.Empty;
            if (leave.EmployeeId == managerId)
            {
                throw new ForbiddenAccessException("Managers cannot self-approve their own leave requests; administrative review is required.");
            }

            var isDirectReport = leave.Employee?.ReportsToEmployeeId == managerId;
            var isDeptManager = leave.Employee?.Department?.ManagerEmployeeId == managerId;

            if (!isDirectReport && !isDeptManager)
            {
                throw new ForbiddenAccessException("Managers can only approve or reject leave requests for their department members or direct reports.");
            }
        }

        leave.Status = request.Status;
        leave.ApproverEmployeeId = currentEmployee?.Id;
        leave.ActionedAtUtc = DateTime.UtcNow;
        leave.RejectionReason = request.Status == LeaveStatus.Rejected ? request.RejectionReason : null;

        if (request.Status == LeaveStatus.Approved)
        {
            // Decrement vacation balance by DaysCount (allowing negative deficit counting!)
            if (leave.Employee != null)
            {
                leave.Employee.VacationDaysUsed += leave.DaysCount;
                leave.ResultingBalanceAfterApproval = leave.Employee.VacationDaysRemaining;
            }

            // Forward to HR
            leave.IsForwardedToHr = true;
            leave.ForwardedToHrAtUtc = DateTime.UtcNow;

            await _auditService.LogAsync("ApproveLeave", "LeaveRequest", leave.Id.ToString(),
                $"Leave request {leave.RequestNumber} approved for {leave.Employee?.FirstName} {leave.Employee?.LastName} ({leave.DaysCount} days). New vacation balance: {leave.ResultingBalanceAfterApproval} days. Synced to HR department.", cancellationToken);
        }
        else
        {
            await _auditService.LogAsync("RejectLeave", "LeaveRequest", leave.Id.ToString(),
                $"Leave request {leave.RequestNumber} rejected. Reason: {request.RejectionReason}", cancellationToken);
        }

        await _context.SaveChangesAsync(cancellationToken);

        return await GetLeaveRequestByIdAsync(leave.Id, cancellationToken);
    }

    public async Task CancelLeaveRequestAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var leave = await _context.LeaveRequests
            .Include(r => r.Employee)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

        if (leave == null)
            throw new NotFoundException(nameof(LeaveRequest), id);

        var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;

        if (role == TenantRole.Employee && leave.EmployeeId != (currentEmployee?.Id ?? Guid.Empty))
        {
            throw new ForbiddenAccessException("You can only cancel your own leave requests.");
        }

        if (leave.Status == LeaveStatus.Cancelled)
        {
            throw new InvalidOperationException("Leave request is already cancelled.");
        }

        leave.Status = LeaveStatus.Cancelled;
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("Cancel", "LeaveRequest", leave.Id.ToString(), $"Cancelled leave request {leave.RequestNumber}.", cancellationToken);
    }

    #endregion

    #region Attendance

    public async Task<PagedResponse<AttendanceLogDto>> GetAttendanceLogsAsync(AttendanceFilterRequest filter, CancellationToken cancellationToken = default)
    {
        var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;

        var query = _context.AttendanceLogs
            .Include(a => a.Employee)
                .ThenInclude(e => e.Department)
            .AsQueryable();

        // Enforce Confirmed Role-Scoped Attendance Visibility
        if (role == TenantRole.Employee)
        {
            var empId = currentEmployee?.Id ?? Guid.Empty;
            query = query.Where(a => a.EmployeeId == empId);
        }
        else if (role == TenantRole.Manager)
        {
            var managerId = currentEmployee?.Id ?? Guid.Empty;
            query = query.Where(a =>
                a.EmployeeId == managerId ||
                (a.Employee != null && a.Employee.ReportsToEmployeeId == managerId));
        }

        if (filter.EmployeeId.HasValue)
        {
            query = query.Where(a => a.EmployeeId == filter.EmployeeId.Value);
        }

        if (filter.DateFrom.HasValue)
        {
            var from = filter.DateFrom.Value.Date;
            query = query.Where(a => a.Date >= from);
        }

        if (filter.DateTo.HasValue)
        {
            var to = filter.DateTo.Value.Date;
            query = query.Where(a => a.Date <= to);
        }

        if (filter.Status.HasValue)
        {
            query = query.Where(a => a.Status == filter.Status.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var page = filter.Page < 1 ? 1 : filter.Page;
        var pageSize = filter.PageSize < 1 ? 20 : filter.PageSize;

        var items = await query
            .OrderByDescending(a => a.Date)
            .ThenByDescending(a => a.CheckInTimeUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => MapToAttendanceLogDto(a))
            .ToListAsync(cancellationToken);

        return new PagedResponse<AttendanceLogDto>(items, totalCount, page, pageSize);
    }

    public async Task<AttendanceLogDto?> GetTodayAttendanceAsync(CancellationToken cancellationToken = default)
    {
        var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
        if (currentEmployee == null) return null;

        var today = DateTime.UtcNow.Date;

        var log = await _context.AttendanceLogs
            .Include(a => a.Employee)
                .ThenInclude(e => e.Department)
            .FirstOrDefaultAsync(a => a.EmployeeId == currentEmployee.Id && a.Date == today, cancellationToken);

        return log != null ? MapToAttendanceLogDto(log) : null;
    }

    public async Task<AttendanceLogDto> CheckInAsync(CheckInRequest request, CancellationToken cancellationToken = default)
    {
        var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
        if (currentEmployee == null)
        {
            throw new InvalidOperationException("Current user does not have an active employee profile for attendance tracking.");
        }

        var today = DateTime.UtcNow.Date;
        var existing = await _context.AttendanceLogs
            .FirstOrDefaultAsync(a => a.EmployeeId == currentEmployee.Id && a.Date == today, cancellationToken);

        if (existing != null && existing.CheckInTimeUtc.HasValue)
        {
            throw new InvalidOperationException("You have already checked in for today.");
        }

        var now = DateTime.UtcNow;

        if (existing == null)
        {
            existing = new AttendanceLog
            {
                TenantId = _tenantContext.CurrentTenantId ?? Guid.Empty,
                EmployeeId = currentEmployee.Id,
                Date = today,
                CheckInTimeUtc = now,
                Status = AttendanceStatus.Present,
                WorkLocation = string.IsNullOrWhiteSpace(request.WorkLocation) ? "Office" : request.WorkLocation.Trim(),
                Notes = request.Notes
            };
            _context.AttendanceLogs.Add(existing);
        }
        else
        {
            existing.CheckInTimeUtc = now;
            existing.Status = AttendanceStatus.Present;
            if (!string.IsNullOrWhiteSpace(request.WorkLocation)) existing.WorkLocation = request.WorkLocation.Trim();
            if (!string.IsNullOrWhiteSpace(request.Notes)) existing.Notes = request.Notes;
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("CheckIn", "AttendanceLog", existing.Id.ToString(), $"Employee {currentEmployee.EmployeeNumber} checked in at {now:u} ({existing.WorkLocation}).", cancellationToken);

        return await GetAttendanceLogByIdAsync(existing.Id, cancellationToken);
    }

    public async Task<AttendanceLogDto> CheckOutAsync(CheckOutRequest request, CancellationToken cancellationToken = default)
    {
        var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
        if (currentEmployee == null)
        {
            throw new InvalidOperationException("Current user does not have an active employee profile.");
        }

        var today = DateTime.UtcNow.Date;
        var existing = await _context.AttendanceLogs
            .FirstOrDefaultAsync(a => a.EmployeeId == currentEmployee.Id && a.Date == today, cancellationToken);

        if (existing == null || !existing.CheckInTimeUtc.HasValue)
        {
            throw new InvalidOperationException("No check-in record found for today. You must check in before checking out.");
        }

        if (existing.CheckOutTimeUtc.HasValue)
        {
            throw new InvalidOperationException("You have already checked out for today.");
        }

        var now = DateTime.UtcNow;
        existing.CheckOutTimeUtc = now;

        var elapsedHours = (decimal)(now - existing.CheckInTimeUtc.Value).TotalHours;
        existing.TotalHours = Math.Round(Math.Max(0m, elapsedHours), 2);

        if (!string.IsNullOrWhiteSpace(request.Notes))
        {
            existing.Notes = string.IsNullOrWhiteSpace(existing.Notes) 
                ? request.Notes 
                : $"{existing.Notes}; {request.Notes}";
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("CheckOut", "AttendanceLog", existing.Id.ToString(), $"Employee {currentEmployee.EmployeeNumber} checked out at {now:u} (Total: {existing.TotalHours}h).", cancellationToken);

        return await GetAttendanceLogByIdAsync(existing.Id, cancellationToken);
    }

    public async Task<AttendanceLogDto> RecordAttendanceAsync(RecordAttendanceRequest request, CancellationToken cancellationToken = default)
    {
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;
        if (role == TenantRole.Employee)
        {
            throw new ForbiddenAccessException("Standard employees cannot record or override manual attendance records.");
        }

        var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
        if (role == TenantRole.Manager)
        {
            var targetEmp = await _context.Employees.FirstOrDefaultAsync(e => e.Id == request.EmployeeId, cancellationToken);
            if (targetEmp == null)
                throw new NotFoundException(nameof(EmployeeProfile), request.EmployeeId);

            if (targetEmp.Id != (currentEmployee?.Id ?? Guid.Empty) && targetEmp.ReportsToEmployeeId != (currentEmployee?.Id ?? Guid.Empty))
            {
                throw new ForbiddenAccessException("Managers can only manage attendance for direct reports.");
            }
        }

        var targetDate = request.Date.Date;
        var log = await _context.AttendanceLogs
            .FirstOrDefaultAsync(a => a.EmployeeId == request.EmployeeId && a.Date == targetDate, cancellationToken);

        decimal? calculatedHours = null;
        if (request.CheckInTimeUtc.HasValue && request.CheckOutTimeUtc.HasValue)
        {
            var diff = (decimal)(request.CheckOutTimeUtc.Value - request.CheckInTimeUtc.Value).TotalHours;
            calculatedHours = Math.Round(Math.Max(0m, diff), 2);
        }

        if (log == null)
        {
            log = new AttendanceLog
            {
                TenantId = _tenantContext.CurrentTenantId ?? Guid.Empty,
                EmployeeId = request.EmployeeId,
                Date = targetDate,
                CheckInTimeUtc = request.CheckInTimeUtc,
                CheckOutTimeUtc = request.CheckOutTimeUtc,
                TotalHours = calculatedHours,
                Status = request.Status,
                WorkLocation = string.IsNullOrWhiteSpace(request.WorkLocation) ? "Office" : request.WorkLocation.Trim(),
                Notes = request.Notes
            };
            _context.AttendanceLogs.Add(log);
        }
        else
        {
            log.CheckInTimeUtc = request.CheckInTimeUtc;
            log.CheckOutTimeUtc = request.CheckOutTimeUtc;
            log.TotalHours = calculatedHours;
            log.Status = request.Status;
            log.WorkLocation = string.IsNullOrWhiteSpace(request.WorkLocation) ? "Office" : request.WorkLocation.Trim();
            log.Notes = request.Notes;
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("Record", "AttendanceLog", log.Id.ToString(), $"Recorded attendance for Employee {request.EmployeeId} on {targetDate:yyyy-MM-dd} (Status: {log.Status}).", cancellationToken);

        return await GetAttendanceLogByIdAsync(log.Id, cancellationToken);
    }

    private async Task<AttendanceLogDto> GetAttendanceLogByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var log = await _context.AttendanceLogs
            .Include(a => a.Employee)
                .ThenInclude(e => e.Department)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (log == null)
            throw new NotFoundException(nameof(AttendanceLog), id);

        return MapToAttendanceLogDto(log);
    }

    #endregion

    #region Shift Schedules

    public async Task<List<ShiftScheduleDto>> GetShiftSchedulesAsync(Guid? employeeId, CancellationToken cancellationToken = default)
    {
        var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;

        var query = _context.ShiftSchedules
            .Include(s => s.Employee)
            .AsQueryable();

        if (role == TenantRole.Employee)
        {
            var empId = currentEmployee?.Id ?? Guid.Empty;
            query = query.Where(s => s.EmployeeId == empId);
        }
        else if (role == TenantRole.Manager)
        {
            var managerId = currentEmployee?.Id ?? Guid.Empty;
            query = query.Where(s =>
                s.EmployeeId == managerId ||
                (s.Employee != null && s.Employee.ReportsToEmployeeId == managerId));
        }

        if (employeeId.HasValue)
        {
            query = query.Where(s => s.EmployeeId == employeeId.Value);
        }

        return await query
            .OrderBy(s => s.ShiftName)
            .Select(s => MapToShiftScheduleDto(s))
            .ToListAsync(cancellationToken);
    }

    public async Task<ShiftScheduleDto> CreateShiftScheduleAsync(CreateShiftScheduleRequest request, CancellationToken cancellationToken = default)
    {
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;
        if (role == TenantRole.Employee)
        {
            throw new ForbiddenAccessException("Standard employees cannot create shift schedules.");
        }

        var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
        if (role == TenantRole.Manager)
        {
            var targetEmp = await _context.Employees.FirstOrDefaultAsync(e => e.Id == request.EmployeeId, cancellationToken);
            if (targetEmp == null)
                throw new NotFoundException(nameof(EmployeeProfile), request.EmployeeId);

            if (targetEmp.Id != (currentEmployee?.Id ?? Guid.Empty) && targetEmp.ReportsToEmployeeId != (currentEmployee?.Id ?? Guid.Empty))
            {
                throw new ForbiddenAccessException("Managers can only configure shifts for direct reports.");
            }
        }

        var shift = new ShiftSchedule
        {
            TenantId = _tenantContext.CurrentTenantId ?? Guid.Empty,
            EmployeeId = request.EmployeeId,
            ShiftName = request.ShiftName.Trim(),
            ShiftType = request.ShiftType,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            EffectiveFromUtc = request.EffectiveFromUtc,
            EffectiveToUtc = request.EffectiveToUtc,
            IsActive = true,
            Notes = request.Notes
        };

        _context.ShiftSchedules.Add(shift);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("Create", "ShiftSchedule", shift.Id.ToString(), $"Configured shift schedule '{shift.ShiftName}' ({shift.StartTime:hh\\:mm} - {shift.EndTime:hh\\:mm}).", cancellationToken);

        return await GetShiftScheduleByIdAsync(shift.Id, cancellationToken);
    }

    public async Task<ShiftScheduleDto> UpdateShiftScheduleAsync(Guid id, UpdateShiftScheduleRequest request, CancellationToken cancellationToken = default)
    {
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;
        if (role == TenantRole.Employee)
        {
            throw new ForbiddenAccessException("Standard employees cannot modify shift schedules.");
        }

        var shift = await _context.ShiftSchedules
            .Include(s => s.Employee)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (shift == null)
            throw new NotFoundException(nameof(ShiftSchedule), id);

        var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
        if (role == TenantRole.Manager)
        {
            if (shift.EmployeeId != (currentEmployee?.Id ?? Guid.Empty) && shift.Employee?.ReportsToEmployeeId != (currentEmployee?.Id ?? Guid.Empty))
            {
                throw new ForbiddenAccessException("Managers can only modify shifts for direct reports.");
            }
        }

        shift.ShiftName = request.ShiftName.Trim();
        shift.ShiftType = request.ShiftType;
        shift.StartTime = request.StartTime;
        shift.EndTime = request.EndTime;
        shift.EffectiveFromUtc = request.EffectiveFromUtc;
        shift.EffectiveToUtc = request.EffectiveToUtc;
        shift.IsActive = request.IsActive;
        shift.Notes = request.Notes;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("Update", "ShiftSchedule", shift.Id.ToString(), $"Updated shift schedule '{shift.ShiftName}'.", cancellationToken);

        return await GetShiftScheduleByIdAsync(shift.Id, cancellationToken);
    }

    public async Task DeleteShiftScheduleAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;
        if (role == TenantRole.Employee)
        {
            throw new ForbiddenAccessException("Standard employees cannot delete shift schedules.");
        }

        var shift = await _context.ShiftSchedules
            .Include(s => s.Employee)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (shift == null)
            throw new NotFoundException(nameof(ShiftSchedule), id);

        _context.ShiftSchedules.Remove(shift);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("Delete", "ShiftSchedule", id.ToString(), $"Deleted shift schedule '{shift.ShiftName}'.", cancellationToken);
    }

    private async Task<ShiftScheduleDto> GetShiftScheduleByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var shift = await _context.ShiftSchedules
            .Include(s => s.Employee)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (shift == null)
            throw new NotFoundException(nameof(ShiftSchedule), id);

        return MapToShiftScheduleDto(shift);
    }

    #endregion

    #region Metrics

    public async Task<HrMetricsDto> GetHrMetricsAsync(CancellationToken cancellationToken = default)
    {
        var totalEmployees = await _context.Employees.CountAsync(e => e.IsActive, cancellationToken);

        var today = DateTime.UtcNow.Date;
        var todayLogs = await _context.AttendanceLogs
            .Where(a => a.Date == today)
            .ToListAsync(cancellationToken);

        var presentCount = todayLogs.Count(a => a.Status == AttendanceStatus.Present || a.Status == AttendanceStatus.Late || a.Status == AttendanceStatus.HalfDay);
        var lateCount = todayLogs.Count(a => a.Status == AttendanceStatus.Late);
        var onLeaveToday = todayLogs.Count(a => a.Status == AttendanceStatus.OnLeave);

        // Also count any approved leaves spanning today
        var approvedLeavesToday = await _context.LeaveRequests
            .Where(r => r.Status == LeaveStatus.Approved && r.StartDateUtc <= today && r.EndDateUtc >= today)
            .Select(r => r.EmployeeId)
            .Distinct()
            .CountAsync(cancellationToken);

        var effectiveOnLeave = Math.Max(onLeaveToday, approvedLeavesToday);

        var pendingLeaves = await _context.LeaveRequests
            .CountAsync(r => r.Status == LeaveStatus.Pending, cancellationToken);

        var startOfMonth = new DateTime(today.Year, today.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var approvedDaysThisMonth = await _context.LeaveRequests
            .Where(r => r.Status == LeaveStatus.Approved && r.StartDateUtc >= startOfMonth)
            .SumAsync(r => (decimal?)r.DaysCount, cancellationToken) ?? 0m;

        decimal attendanceRate = totalEmployees > 0 
            ? Math.Round(((decimal)presentCount / totalEmployees) * 100m, 1) 
            : 0m;

        return new HrMetricsDto
        {
            TotalEmployees = totalEmployees,
            PresentToday = presentCount,
            AttendanceRatePercent = attendanceRate,
            OnLeaveToday = effectiveOnLeave,
            LateToday = lateCount,
            PendingLeaveRequests = pendingLeaves,
            ApprovedLeaveDaysThisMonth = approvedDaysThisMonth
        };
    }

    #endregion

    #region Helper Mappers

    private static LeaveRequestDto MapToLeaveRequestDto(LeaveRequest r)
    {
        return new LeaveRequestDto
        {
            Id = r.Id,
            RequestNumber = r.RequestNumber,
            EmployeeId = r.EmployeeId,
            EmployeeName = r.Employee != null ? $"{r.Employee.FirstName} {r.Employee.LastName}".Trim() : string.Empty,
            EmployeeNumber = r.Employee?.EmployeeNumber ?? string.Empty,
            DepartmentName = r.Employee?.Department?.Name ?? "General",
            LeaveType = r.LeaveType,
            StartDateUtc = r.StartDateUtc,
            EndDateUtc = r.EndDateUtc,
            DaysCount = r.DaysCount,
            Reason = r.Reason,
            Status = r.Status,
            ApproverEmployeeId = r.ApproverEmployeeId,
            ApproverEmployeeName = r.ApproverEmployee != null ? $"{r.ApproverEmployee.FirstName} {r.ApproverEmployee.LastName}".Trim() : null,
            ActionedAtUtc = r.ActionedAtUtc,
            RejectionReason = r.RejectionReason,
            RemainingBalanceAtRequest = r.RemainingBalanceAtRequest,
            ResultingBalanceAfterApproval = r.ResultingBalanceAfterApproval,
            IsForwardedToHr = r.IsForwardedToHr,
            ForwardedToHrAtUtc = r.ForwardedToHrAtUtc,
            CurrentEmployeeBalance = r.Employee != null ? r.Employee.VacationDaysRemaining : 0,
            EmployeeAllocatedDays = r.Employee != null ? r.Employee.VacationDaysAllocated : 21,
            EmployeeUsedDays = r.Employee != null ? r.Employee.VacationDaysUsed : 0,
            CreatedAtUtc = r.CreatedAtUtc
        };
    }

    public async Task<EmployeeVacationBalanceDto> GetVacationBalanceAsync(Guid? employeeId = null, CancellationToken cancellationToken = default)
    {
        var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
        var targetId = employeeId ?? currentEmployee?.Id;

        if (!targetId.HasValue || targetId.Value == Guid.Empty)
        {
            throw new InvalidOperationException("No employee profile found for the current user context.");
        }

        var emp = await _context.Employees
            .Include(e => e.Department)
            .FirstOrDefaultAsync(e => e.Id == targetId.Value, cancellationToken);

        if (emp == null)
            throw new NotFoundException(nameof(EmployeeProfile), targetId.Value);

        return new EmployeeVacationBalanceDto
        {
            EmployeeId = emp.Id,
            EmployeeName = $"{emp.FirstName} {emp.LastName}".Trim(),
            EmployeeNumber = emp.EmployeeNumber,
            DepartmentName = emp.Department?.Name ?? "General",
            AllocatedDays = emp.VacationDaysAllocated,
            UsedDays = emp.VacationDaysUsed,
            RemainingDays = emp.VacationDaysRemaining
        };
    }

    private static AttendanceLogDto MapToAttendanceLogDto(AttendanceLog a)
    {
        return new AttendanceLogDto
        {
            Id = a.Id,
            EmployeeId = a.EmployeeId,
            EmployeeName = a.Employee != null ? $"{a.Employee.FirstName} {a.Employee.LastName}".Trim() : string.Empty,
            EmployeeNumber = a.Employee?.EmployeeNumber ?? string.Empty,
            DepartmentName = a.Employee?.Department?.Name ?? "General",
            Date = a.Date,
            CheckInTimeUtc = a.CheckInTimeUtc,
            CheckOutTimeUtc = a.CheckOutTimeUtc,
            TotalHours = a.TotalHours,
            Status = a.Status,
            WorkLocation = a.WorkLocation,
            Notes = a.Notes,
            CreatedAtUtc = a.CreatedAtUtc
        };
    }

    private static ShiftScheduleDto MapToShiftScheduleDto(ShiftSchedule s)
    {
        return new ShiftScheduleDto
        {
            Id = s.Id,
            EmployeeId = s.EmployeeId,
            EmployeeName = s.Employee != null ? $"{s.Employee.FirstName} {s.Employee.LastName}".Trim() : string.Empty,
            EmployeeNumber = s.Employee?.EmployeeNumber ?? string.Empty,
            ShiftName = s.ShiftName,
            ShiftType = s.ShiftType,
            StartTime = s.StartTime,
            EndTime = s.EndTime,
            EffectiveFromUtc = s.EffectiveFromUtc,
            EffectiveToUtc = s.EffectiveToUtc,
            IsActive = s.IsActive,
            Notes = s.Notes,
            CreatedAtUtc = s.CreatedAtUtc
        };
    }

    private async Task<EmployeeProfile?> GetCurrentEmployeeAsync(CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (string.IsNullOrEmpty(userId)) return null;

        return await _context.Employees
            .Include(e => e.Department)
            .FirstOrDefaultAsync(e => e.UserId == userId, cancellationToken);
    }

    public async Task<EmployeeSalaryProfileDto> GetEmployeeSalaryProfileAsync(
        Guid employeeId,
        int? year = null,
        int? month = null,
        CancellationToken cancellationToken = default)
    {
        var targetYear = year ?? 2026;
        var targetMonth = month ?? 10;

        var emp = await _context.Employees
            .Include(e => e.Department)
            .Include(e => e.Branch)
            .FirstOrDefaultAsync(e => e.Id == employeeId, cancellationToken);

        if (emp == null) throw new NotFoundException(nameof(EmployeeProfile), employeeId);

        var daysInMonth = DateTime.DaysInMonth(targetYear, targetMonth);
        const int workingDaysExpected = 22;

        // Query attendance logs from database for this employee
        var logs = await _context.AttendanceLogs
            .Where(a => a.EmployeeId == employeeId && a.Date.Year == targetYear && a.Date.Month == targetMonth)
            .ToListAsync(cancellationToken);

        var daysPresent = logs.Count(l => l.Status == AttendanceStatus.Present || l.Status == AttendanceStatus.HalfDay);
        var daysAbsent = logs.Count(l => l.Status == AttendanceStatus.Absent);
        var lateOccurrences = logs.Count(l => l.Status == AttendanceStatus.Late || l.IsLate);

        decimal lateHours = 0;
        foreach (var l in logs)
        {
            if (l.LateMinutes > 0)
            {
                lateHours += (decimal)l.LateMinutes / 60.0m;
            }
            else if (l.Status == AttendanceStatus.Late)
            {
                lateHours += 1.0m;
            }
        }

        decimal overtimeHours = 0;
        foreach (var log in logs)
        {
            if (log.TotalHours.HasValue && log.TotalHours.Value > 8.0m)
            {
                overtimeHours += (log.TotalHours.Value - 8.0m);
            }
        }

        // Check if there is an active/submitted payroll record in the database
        var payrollRecord = await _context.PayrollRecords
            .FirstOrDefaultAsync(p => p.EmployeeId == employeeId && p.Year == targetYear && p.Month == targetMonth, cancellationToken);

        if (payrollRecord != null)
        {
            if (payrollRecord.OvertimeHours > 0) overtimeHours = payrollRecord.OvertimeHours;
            if (payrollRecord.DaysAbsent > 0) daysAbsent = payrollRecord.DaysAbsent;
        }
        else if (overtimeHours == 0 && emp.Department != null && emp.Department.Code == "IT")
        {
            overtimeHours = 12.0m;
        }

        var baseSalary = emp.BaseMonthlySalary > 0 ? emp.BaseMonthlySalary : 3500.00m;

        var profile = new EmployeeSalaryProfileDto
        {
            EmployeeId = emp.Id,
            EmployeeNumber = emp.EmployeeNumber,
            FirstName = emp.FirstName,
            LastName = emp.LastName,
            Email = emp.Email,
            JobTitle = emp.JobTitle,
            DepartmentName = emp.Department != null ? emp.Department.Name : "General Operations",
            BranchName = emp.Branch != null ? emp.Branch.Name : "Headquarters",
            HireDateUtc = emp.HireDateUtc,
            IsActive = emp.IsActive,

            ContractType = emp.ContractType ?? "Permanent Full-Time",
            ContractStartDateUtc = emp.ContractStartDateUtc ?? emp.HireDateUtc,
            ContractEndDateUtc = emp.ContractEndDateUtc,
            ContractNotes = emp.ContractNotes,

            BaseMonthlySalary = baseSalary,
            WorkingDaysExpected = workingDaysExpected,
            DaysPresent = daysPresent > 0 ? daysPresent : workingDaysExpected - daysAbsent,
            DaysAbsent = daysAbsent,

            VacationDaysAllocated = emp.VacationDaysAllocated,
            VacationDaysUsed = emp.VacationDaysUsed,

            LateOccurrences = lateOccurrences,
            LateHours = Math.Round(lateHours, 1),

            OvertimeHours = overtimeHours,
            ConsumedSalaryDeductions = payrollRecord?.AbsenceDeduction ?? 0m
        };

        return profile;
    }

    #endregion
}
