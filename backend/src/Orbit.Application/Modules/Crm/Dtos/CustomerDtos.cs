using System;
using Orbit.Domain.Enums;

namespace Orbit.Application.Modules.Crm.Dtos;

public class CustomerDto
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Website { get; set; }
    public string? Industry { get; set; }
    public CustomerStatus Status { get; set; }
    public Guid? AssignedEmployeeId { get; set; }
    public string? AssignedEmployeeName { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}

public class CreateCustomerRequest
{
    public string CompanyName { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Website { get; set; }
    public string? Industry { get; set; }
    public CustomerStatus Status { get; set; } = CustomerStatus.Lead;
    public Guid? AssignedEmployeeId { get; set; }
    public string? Notes { get; set; }
}

public class UpdateCustomerRequest
{
    public string CompanyName { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Website { get; set; }
    public string? Industry { get; set; }
    public CustomerStatus Status { get; set; }
    public Guid? AssignedEmployeeId { get; set; }
    public string? Notes { get; set; }
}

public class CustomerFilterRequest
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public CustomerStatus? Status { get; set; }
    public Guid? AssignedEmployeeId { get; set; }
    public string? Search { get; set; }
}
