using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Orbit.Application.Common;
using Orbit.Application.Common.Exceptions;
using Orbit.Application.Interfaces;
using Orbit.Application.Modules.Employees;
using Orbit.Application.Modules.Employees.Dtos;
using Orbit.Domain.Entities;
using Orbit.Domain.Enums;
using Orbit.Infrastructure.Identity;

namespace Orbit.Infrastructure.Services;

public class EmployeeService : IEmployeeService
{
    private readonly IApplicationDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IAuditService _auditService;

    public EmployeeService(
        IApplicationDbContext context,
        ITenantContext tenantContext,
        UserManager<ApplicationUser> userManager,
        IAuditService auditService)
    {
        _context = context;
        _tenantContext = tenantContext;
        _userManager = userManager;
        _auditService = auditService;
    }

    public async Task<PagedResponse<EmployeeSummaryDto>> GetEmployeesAsync(
        int pageNumber,
        int pageSize,
        string? search = null,
        Guid? departmentId = null,
        Guid? branchId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Employees
            .Include(e => e.Department)
            .Include(e => e.Branch)
            .Include(e => e.ReportsTo)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(e =>
                e.FirstName.ToLower().Contains(s) ||
                e.LastName.ToLower().Contains(s) ||
                e.Email.ToLower().Contains(s) ||
                e.EmployeeNumber.ToLower().Contains(s) ||
                e.JobTitle.ToLower().Contains(s));
        }

        if (departmentId.HasValue)
        {
            query = query.Where(e => e.DepartmentId == departmentId.Value);
        }

        if (branchId.HasValue)
        {
            query = query.Where(e => e.BranchId == branchId.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var skip = (pageNumber - 1) * pageSize;

        var items = await query
            .OrderBy(e => e.LastName)
            .ThenBy(e => e.FirstName)
            .Skip(skip)
            .Take(pageSize)
            .Select(e => new EmployeeSummaryDto
            {
                Id = e.Id,
                TenantId = e.TenantId,
                UserId = e.UserId,
                EmployeeNumber = e.EmployeeNumber,
                FirstName = e.FirstName,
                LastName = e.LastName,
                Email = e.Email,
                Phone = e.Phone,
                JobTitle = e.JobTitle,
                BranchId = e.BranchId,
                BranchName = e.Branch != null ? e.Branch.Name : null,
                DepartmentId = e.DepartmentId,
                DepartmentName = e.Department != null ? e.Department.Name : null,
                ReportsToEmployeeId = e.ReportsToEmployeeId,
                ReportsToName = e.ReportsTo != null ? $"{e.ReportsTo.FirstName} {e.ReportsTo.LastName}".Trim() : null,
                IsActive = e.IsActive,
                HireDateUtc = e.HireDateUtc,
                BaseSalary = e.BaseMonthlySalary,
                HourlyRate = e.HourlyRate,
                OvertimeRate = e.OvertimeRate,
                ContractType = e.ContractType,
                ContractStartDateUtc = e.ContractStartDateUtc,
                ContractEndDateUtc = e.ContractEndDateUtc,
                ContractNotes = e.ContractNotes,
                VacationDaysAllocated = e.VacationDaysAllocated,
                VacationDaysRemaining = e.VacationDaysRemaining
            })
            .ToListAsync(cancellationToken);

        return new PagedResponse<EmployeeSummaryDto>(items, totalCount, pageNumber, pageSize);
    }

    public async Task<EmployeeSummaryDto> GetEmployeeByIdAsync(Guid employeeId, CancellationToken cancellationToken = default)
    {
        var employee = await _context.Employees
            .Include(e => e.Department)
            .Include(e => e.Branch)
            .Include(e => e.ReportsTo)
            .Where(e => e.Id == employeeId)
            .Select(e => new EmployeeSummaryDto
            {
                Id = e.Id,
                TenantId = e.TenantId,
                UserId = e.UserId,
                EmployeeNumber = e.EmployeeNumber,
                FirstName = e.FirstName,
                LastName = e.LastName,
                Email = e.Email,
                Phone = e.Phone,
                JobTitle = e.JobTitle,
                BranchId = e.BranchId,
                BranchName = e.Branch != null ? e.Branch.Name : null,
                DepartmentId = e.DepartmentId,
                DepartmentName = e.Department != null ? e.Department.Name : null,
                ReportsToEmployeeId = e.ReportsToEmployeeId,
                ReportsToName = e.ReportsTo != null ? $"{e.ReportsTo.FirstName} {e.ReportsTo.LastName}".Trim() : null,
                IsActive = e.IsActive,
                HireDateUtc = e.HireDateUtc,
                BaseSalary = e.BaseMonthlySalary,
                HourlyRate = e.HourlyRate,
                OvertimeRate = e.OvertimeRate,
                ContractType = e.ContractType,
                ContractStartDateUtc = e.ContractStartDateUtc,
                ContractEndDateUtc = e.ContractEndDateUtc,
                ContractNotes = e.ContractNotes,
                VacationDaysAllocated = e.VacationDaysAllocated,
                VacationDaysRemaining = e.VacationDaysRemaining
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (employee == null) throw new NotFoundException(nameof(EmployeeProfile), employeeId);
        return employee;
    }

    public async Task<EmployeeSummaryDto> CreateEmployeeAsync(CreateEmployeeRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireCurrentTenantId();

        var existingNumber = await _context.Employees.AnyAsync(e => e.EmployeeNumber == request.EmployeeNumber, cancellationToken);
        if (existingNumber)
            throw new ValidationException(new Dictionary<string, string[]> { { "EmployeeNumber", new[] { "Employee number is already assigned." } } });

        string? createdUserId = null;

        // If requested to create login account
        if (request.CreateLoginAccount)
        {
            var user = await _userManager.FindByEmailAsync(request.Email);
            if (user == null)
            {
                user = new ApplicationUser
                {
                    UserName = request.Email,
                    Email = request.Email,
                    FullName = $"{request.FirstName} {request.LastName}".Trim(),
                    IsActive = true
                };
                var password = string.IsNullOrWhiteSpace(request.InitialPassword) ? "OrbitInitialPassword123!" : request.InitialPassword;
                var createResult = await _userManager.CreateAsync(user, password);
                if (!createResult.Succeeded)
                {
                    var errors = createResult.Errors.ToDictionary(e => e.Code, e => new[] { e.Description });
                    throw new ValidationException(errors);
                }
            }

            var membershipExists = await _context.TenantMemberships
                .AnyAsync(m => m.TenantId == tenantId && m.UserId == user.Id, cancellationToken);

            if (!membershipExists)
            {
                // IT personnel receive Admin clearance across all screens; other staff are standard Employees
                var assignedRole = TenantRole.Employee;
                if (request.DepartmentId.HasValue)
                {
                    var dept = await _context.Departments.FirstOrDefaultAsync(d => d.Id == request.DepartmentId.Value, cancellationToken);
                    if (dept != null && (dept.Code == "IT" || dept.Name.ToLower().Contains("information technology")))
                    {
                        assignedRole = TenantRole.Admin;
                    }
                }

                var membership = new TenantMembership
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    UserId = user.Id,
                    Role = assignedRole,
                    Status = MembershipStatus.Active,
                    JoinedAtUtc = DateTime.UtcNow
                };
                _context.TenantMemberships.Add(membership);
            }

            createdUserId = user.Id;
        }

        var baseSalary = request.BaseSalary > 0 ? request.BaseSalary : 3500.00m;
        // Formula specified: Day price = Salary / 30, Hour price = Day price / 9
        var dailyRate = Math.Round(baseSalary / 30.0m, 2);
        var hourlyRate = request.HourlyRate > 0 ? request.HourlyRate : Math.Round(dailyRate / 9.0m, 2);
        var overtimeRate = request.OvertimeRate > 0 ? request.OvertimeRate : Math.Round(hourlyRate * 1.5m, 2);

        var employee = new EmployeeProfile
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            UserId = createdUserId,
            EmployeeNumber = request.EmployeeNumber,
            FirstName = request.FirstName,
            LastName = request.LastName,
            Email = request.Email,
            Phone = request.Phone,
            JobTitle = request.JobTitle,
            BranchId = request.BranchId,
            DepartmentId = request.DepartmentId,
            ReportsToEmployeeId = request.ReportsToEmployeeId,
            HireDateUtc = request.HireDateUtc ?? DateTime.UtcNow,
            IsActive = true,
            ContractType = string.IsNullOrWhiteSpace(request.ContractType) ? "Permanent Full-Time" : request.ContractType,
            ContractStartDateUtc = request.ContractStartDateUtc ?? request.HireDateUtc ?? DateTime.UtcNow,
            ContractEndDateUtc = request.ContractEndDateUtc,
            ContractNotes = request.ContractNotes,
            BaseMonthlySalary = baseSalary,
            HourlyRate = hourlyRate,
            OvertimeRate = overtimeRate,
            VacationDaysAllocated = request.VacationDaysAllocated > 0 ? request.VacationDaysAllocated : 21
        };

        _context.Employees.Add(employee);
        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("Create", nameof(EmployeeProfile), employee.Id.ToString(), request, cancellationToken);

        return await GetEmployeeByIdAsync(employee.Id, cancellationToken);
    }

    public async Task<EmployeeSummaryDto> UpdateEmployeeAsync(Guid employeeId, UpdateEmployeeRequest request, CancellationToken cancellationToken = default)
    {
        var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == employeeId, cancellationToken);
        if (employee == null) throw new NotFoundException(nameof(EmployeeProfile), employeeId);

        employee.FirstName = request.FirstName;
        employee.LastName = request.LastName;
        employee.Email = request.Email;
        employee.Phone = request.Phone;
        employee.JobTitle = request.JobTitle;
        employee.BranchId = request.BranchId;
        employee.DepartmentId = request.DepartmentId;
        employee.ReportsToEmployeeId = request.ReportsToEmployeeId;
        employee.IsActive = request.IsActive;
        employee.HireDateUtc = request.HireDateUtc;

        if (request.BaseSalary > 0)
        {
            employee.BaseMonthlySalary = request.BaseSalary;
            var dRate = Math.Round(request.BaseSalary / 30.0m, 2);
            employee.HourlyRate = request.HourlyRate > 0 ? request.HourlyRate : Math.Round(dRate / 9.0m, 2);
            employee.OvertimeRate = request.OvertimeRate > 0 ? request.OvertimeRate : Math.Round(employee.HourlyRate * 1.5m, 2);
        }
        else
        {
            if (request.HourlyRate > 0) employee.HourlyRate = request.HourlyRate;
            if (request.OvertimeRate > 0) employee.OvertimeRate = request.OvertimeRate;
        }

        if (!string.IsNullOrWhiteSpace(request.ContractType)) employee.ContractType = request.ContractType;
        if (request.ContractStartDateUtc.HasValue) employee.ContractStartDateUtc = request.ContractStartDateUtc;
        if (request.ContractEndDateUtc.HasValue) employee.ContractEndDateUtc = request.ContractEndDateUtc;
        if (request.ContractNotes != null) employee.ContractNotes = request.ContractNotes;
        if (request.VacationDaysAllocated > 0) employee.VacationDaysAllocated = request.VacationDaysAllocated;

        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("Update", nameof(EmployeeProfile), employee.Id.ToString(), request, cancellationToken);

        return await GetEmployeeByIdAsync(employee.Id, cancellationToken);
    }

    public async Task DeleteEmployeeAsync(Guid employeeId, CancellationToken cancellationToken = default)
    {
        var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == employeeId, cancellationToken);
        if (employee == null) throw new NotFoundException(nameof(EmployeeProfile), employeeId);

        _context.Employees.Remove(employee);
        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("Delete", nameof(EmployeeProfile), employeeId.ToString(), null, cancellationToken);
    }

    private Guid RequireCurrentTenantId()
    {
        if (!_tenantContext.CurrentTenantId.HasValue || _tenantContext.CurrentTenantId.Value == Guid.Empty)
            throw new TenantAccessDeniedException("Active tenant context is required.");

        return _tenantContext.CurrentTenantId.Value;
    }
}
