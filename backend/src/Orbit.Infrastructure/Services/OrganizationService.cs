using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Orbit.Application.Common.Exceptions;
using Orbit.Application.Interfaces;
using Orbit.Application.Modules.Organization;
using Orbit.Application.Modules.Organization.Dtos;
using Orbit.Domain.Entities;

namespace Orbit.Infrastructure.Services;

public class OrganizationService : IOrganizationService
{
    private readonly IApplicationDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly IAuditService _auditService;

    public OrganizationService(
        IApplicationDbContext context,
        ITenantContext tenantContext,
        IAuditService auditService)
    {
        _context = context;
        _tenantContext = tenantContext;
        _auditService = auditService;
    }

    public async Task<TenantDetailsDto> GetCurrentTenantDetailsAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireCurrentTenantId();
        var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);
        if (tenant == null) throw new NotFoundException(nameof(Tenant), tenantId);

        var branchCount = await _context.Branches.CountAsync(cancellationToken);
        var deptCount = await _context.Departments.CountAsync(cancellationToken);
        var empCount = await _context.Employees.CountAsync(cancellationToken);

        return new TenantDetailsDto
        {
            Id = tenant.Id,
            Name = tenant.Name,
            Slug = tenant.Slug,
            Status = tenant.Status.ToString(),
            Industry = tenant.Industry,
            TimeZoneId = tenant.TimeZoneId,
            CurrencyCode = tenant.CurrencyCode,
            BranchCount = branchCount,
            DepartmentCount = deptCount,
            EmployeeCount = empCount,
            CreatedAtUtc = tenant.CreatedAtUtc
        };
    }

    public async Task<TenantDetailsDto> UpdateTenantAsync(UpdateTenantRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireCurrentTenantId();
        var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);
        if (tenant == null) throw new NotFoundException(nameof(Tenant), tenantId);

        tenant.Name = request.Name;
        tenant.Industry = request.Industry;
        tenant.TimeZoneId = request.TimeZoneId;
        tenant.CurrencyCode = request.CurrencyCode;

        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("Update", nameof(Tenant), tenant.Id.ToString(), request, cancellationToken);

        return await GetCurrentTenantDetailsAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<BranchDto>> GetBranchesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Branches
            .Select(b => new BranchDto
            {
                Id = b.Id,
                TenantId = b.TenantId,
                Name = b.Name,
                Code = b.Code,
                Address = b.Address,
                City = b.City,
                Country = b.Country,
                Phone = b.Phone,
                IsActive = b.IsActive,
                EmployeeCount = b.Employees.Count
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<BranchDto> GetBranchByIdAsync(Guid branchId, CancellationToken cancellationToken = default)
    {
        var branch = await _context.Branches
            .Where(b => b.Id == branchId)
            .Select(b => new BranchDto
            {
                Id = b.Id,
                TenantId = b.TenantId,
                Name = b.Name,
                Code = b.Code,
                Address = b.Address,
                City = b.City,
                Country = b.Country,
                Phone = b.Phone,
                IsActive = b.IsActive,
                EmployeeCount = b.Employees.Count
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (branch == null) throw new NotFoundException(nameof(Branch), branchId);
        return branch;
    }

    public async Task<BranchDto> CreateBranchAsync(CreateBranchRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireCurrentTenantId();

        var existingCode = await _context.Branches.AnyAsync(b => b.Code == request.Code, cancellationToken);
        if (existingCode)
            throw new ValidationException(new Dictionary<string, string[]> { { "Code", new[] { "Branch code already exists." } } });

        var branch = new Branch
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = request.Name,
            Code = request.Code.ToUpperInvariant(),
            Address = request.Address,
            City = request.City,
            Country = request.Country,
            Phone = request.Phone,
            IsActive = true
        };

        _context.Branches.Add(branch);
        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("Create", nameof(Branch), branch.Id.ToString(), request, cancellationToken);

        return await GetBranchByIdAsync(branch.Id, cancellationToken);
    }

    public async Task<BranchDto> UpdateBranchAsync(Guid branchId, UpdateBranchRequest request, CancellationToken cancellationToken = default)
    {
        var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == branchId, cancellationToken);
        if (branch == null) throw new NotFoundException(nameof(Branch), branchId);

        branch.Name = request.Name;
        branch.Code = request.Code.ToUpperInvariant();
        branch.Address = request.Address;
        branch.City = request.City;
        branch.Country = request.Country;
        branch.Phone = request.Phone;
        branch.IsActive = request.IsActive;

        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("Update", nameof(Branch), branch.Id.ToString(), request, cancellationToken);

        return await GetBranchByIdAsync(branch.Id, cancellationToken);
    }

    public async Task DeleteBranchAsync(Guid branchId, CancellationToken cancellationToken = default)
    {
        var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == branchId, cancellationToken);
        if (branch == null) throw new NotFoundException(nameof(Branch), branchId);

        _context.Branches.Remove(branch);
        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("Delete", nameof(Branch), branchId.ToString(), null, cancellationToken);
    }

    public async Task<IReadOnlyList<DepartmentDto>> GetDepartmentsAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Departments
            .Select(d => new DepartmentDto
            {
                Id = d.Id,
                TenantId = d.TenantId,
                Name = d.Name,
                Code = d.Code,
                Description = d.Description,
                IsActive = d.IsActive,
                EmployeeCount = d.Employees.Count
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<DepartmentDto> GetDepartmentByIdAsync(Guid departmentId, CancellationToken cancellationToken = default)
    {
        var dept = await _context.Departments
            .Where(d => d.Id == departmentId)
            .Select(d => new DepartmentDto
            {
                Id = d.Id,
                TenantId = d.TenantId,
                Name = d.Name,
                Code = d.Code,
                Description = d.Description,
                IsActive = d.IsActive,
                EmployeeCount = d.Employees.Count
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (dept == null) throw new NotFoundException(nameof(Department), departmentId);
        return dept;
    }

    public async Task<DepartmentDto> CreateDepartmentAsync(CreateDepartmentRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireCurrentTenantId();

        var existingCode = await _context.Departments.AnyAsync(d => d.Code == request.Code, cancellationToken);
        if (existingCode)
            throw new ValidationException(new Dictionary<string, string[]> { { "Code", new[] { "Department code already exists." } } });

        var dept = new Department
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = request.Name,
            Code = request.Code.ToUpperInvariant(),
            Description = request.Description,
            IsActive = true
        };

        _context.Departments.Add(dept);
        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("Create", nameof(Department), dept.Id.ToString(), request, cancellationToken);

        return await GetDepartmentByIdAsync(dept.Id, cancellationToken);
    }

    public async Task<DepartmentDto> UpdateDepartmentAsync(Guid departmentId, UpdateDepartmentRequest request, CancellationToken cancellationToken = default)
    {
        var dept = await _context.Departments.FirstOrDefaultAsync(d => d.Id == departmentId, cancellationToken);
        if (dept == null) throw new NotFoundException(nameof(Department), departmentId);

        dept.Name = request.Name;
        dept.Code = request.Code.ToUpperInvariant();
        dept.Description = request.Description;
        dept.IsActive = request.IsActive;

        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("Update", nameof(Department), dept.Id.ToString(), request, cancellationToken);

        return await GetDepartmentByIdAsync(dept.Id, cancellationToken);
    }

    public async Task DeleteDepartmentAsync(Guid departmentId, CancellationToken cancellationToken = default)
    {
        var dept = await _context.Departments.FirstOrDefaultAsync(d => d.Id == departmentId, cancellationToken);
        if (dept == null) throw new NotFoundException(nameof(Department), departmentId);

        _context.Departments.Remove(dept);
        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("Delete", nameof(Department), departmentId.ToString(), null, cancellationToken);
    }

    private Guid RequireCurrentTenantId()
    {
        if (!_tenantContext.CurrentTenantId.HasValue || _tenantContext.CurrentTenantId.Value == Guid.Empty)
            throw new TenantAccessDeniedException("Active tenant context is required.");

        return _tenantContext.CurrentTenantId.Value;
    }
}
