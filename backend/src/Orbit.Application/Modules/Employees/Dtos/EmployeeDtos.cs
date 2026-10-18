using System;
using System.Collections.Generic;

namespace Orbit.Application.Modules.Employees.Dtos;

public class EmployeeSummaryDto
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string? UserId { get; set; }
    public string EmployeeNumber { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName => $"{FirstName} {LastName}".Trim();
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string JobTitle { get; set; } = string.Empty;
    public Guid? BranchId { get; set; }
    public string? BranchName { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public Guid? ReportsToEmployeeId { get; set; }
    public string? ReportsToName { get; set; }
    public bool IsActive { get; set; }
    public DateTime? HireDateUtc { get; set; }
}

public class CreateEmployeeRequest
{
    public string EmployeeNumber { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string JobTitle { get; set; } = string.Empty;
    public Guid? BranchId { get; set; }
    public Guid? DepartmentId { get; set; }
    public Guid? ReportsToEmployeeId { get; set; }
    public DateTime? HireDateUtc { get; set; }
    public bool CreateLoginAccount { get; set; }
    public string? InitialPassword { get; set; }
}

public class UpdateEmployeeRequest
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string JobTitle { get; set; } = string.Empty;
    public Guid? BranchId { get; set; }
    public Guid? DepartmentId { get; set; }
    public Guid? ReportsToEmployeeId { get; set; }
    public bool IsActive { get; set; }
    public DateTime? HireDateUtc { get; set; }
}
