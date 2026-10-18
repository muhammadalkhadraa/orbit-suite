using System.Collections.Generic;
using Orbit.Domain.Common;
using Orbit.Domain.Enums;

namespace Orbit.Domain.Entities;

public class Tenant : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public TenantStatus Status { get; set; } = TenantStatus.Active;
    public string? Industry { get; set; }
    public string? TimeZoneId { get; set; }
    public string? CurrencyCode { get; set; } = "USD";

    // Navigation collections
    public ICollection<TenantMembership> Memberships { get; set; } = new List<TenantMembership>();
    public ICollection<Branch> Branches { get; set; } = new List<Branch>();
    public ICollection<Department> Departments { get; set; } = new List<Department>();
    public ICollection<EmployeeProfile> Employees { get; set; } = new List<EmployeeProfile>();
    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
}
