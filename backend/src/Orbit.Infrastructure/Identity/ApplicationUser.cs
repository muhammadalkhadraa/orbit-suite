using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Identity;
using Orbit.Domain.Entities;

namespace Orbit.Infrastructure.Identity;

public class ApplicationUser : IdentityUser
{
    public string FullName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<TenantMembership> Memberships { get; set; } = new List<TenantMembership>();
}
