using System;
using System.Collections.Generic;
using Orbit.Domain.Common;

namespace Orbit.Domain.Entities;

public class Branch : BaseEntity, ITenantScopedEntity
{
    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Country { get; set; }
    public string? Phone { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<EmployeeProfile> Employees { get; set; } = new List<EmployeeProfile>();
}
