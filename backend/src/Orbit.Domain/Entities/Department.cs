using System;
using System.Collections.Generic;
using Orbit.Domain.Common;

namespace Orbit.Domain.Entities;

public class Department : BaseEntity, ITenantScopedEntity
{
    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<EmployeeProfile> Employees { get; set; } = new List<EmployeeProfile>();
    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
}
