using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Orbit.Application.Common;
using Orbit.Application.Common.Exceptions;
using Orbit.Application.Interfaces;
using Orbit.Application.Modules.Crm;
using Orbit.Application.Modules.Crm.Dtos;
using Orbit.Domain.Entities;
using Orbit.Domain.Enums;

namespace Orbit.Infrastructure.Services;

public class CustomerService : ICustomerService
{
    private readonly IApplicationDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAuditService _auditService;

    public CustomerService(
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

    public async Task<PagedResponse<CustomerDto>> GetCustomersAsync(CustomerFilterRequest filter, CancellationToken cancellationToken = default)
    {
        var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;

        var query = _context.Customers
            .Include(c => c.AssignedEmployee)
            .AsQueryable();

        // Enforce Confirmed Role-Scoped Customer Visibility
        if (role == TenantRole.Employee)
        {
            var empId = currentEmployee?.Id ?? Guid.Empty;
            query = query.Where(c => c.AssignedEmployeeId == empId);
        }
        else if (role == TenantRole.Manager)
        {
            var managerId = currentEmployee?.Id ?? Guid.Empty;
            query = query.Where(c =>
                c.AssignedEmployeeId == managerId ||
                (c.AssignedEmployee != null && c.AssignedEmployee.ReportsToEmployeeId == managerId));
        }
        // Owner and Admin can view all tenant customers (scoping remains enforced via EF Core TenantId filter)

        // Apply filters
        if (filter.Status.HasValue)
        {
            query = query.Where(c => c.Status == filter.Status.Value);
        }

        if (filter.AssignedEmployeeId.HasValue)
        {
            query = query.Where(c => c.AssignedEmployeeId == filter.AssignedEmployeeId.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.Trim().ToLower();
            query = query.Where(c =>
                c.CompanyName.ToLower().Contains(s) ||
                (c.ContactPerson != null && c.ContactPerson.ToLower().Contains(s)) ||
                (c.Email != null && c.Email.ToLower().Contains(s)) ||
                (c.Industry != null && c.Industry.ToLower().Contains(s)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var skip = (filter.PageNumber - 1) * filter.PageSize;

        var items = await query
            .OrderByDescending(c => c.CreatedAtUtc)
            .Skip(skip)
            .Take(filter.PageSize)
            .Select(c => new CustomerDto
            {
                Id = c.Id,
                TenantId = c.TenantId,
                CompanyName = c.CompanyName,
                ContactPerson = c.ContactPerson,
                Email = c.Email,
                Phone = c.Phone,
                Website = c.Website,
                Industry = c.Industry,
                Status = c.Status,
                AssignedEmployeeId = c.AssignedEmployeeId,
                AssignedEmployeeName = c.AssignedEmployee != null ? $"{c.AssignedEmployee.FirstName} {c.AssignedEmployee.LastName}".Trim() : null,
                Notes = c.Notes,
                CreatedAtUtc = c.CreatedAtUtc,
                UpdatedAtUtc = c.UpdatedAtUtc
            })
            .ToListAsync(cancellationToken);

        return PagedResponse<CustomerDto>.Create(items, totalCount, filter.PageNumber, filter.PageSize);
    }

    public async Task<CustomerDto> GetCustomerByIdAsync(Guid customerId, CancellationToken cancellationToken = default)
    {
        var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;

        var customer = await _context.Customers
            .Include(c => c.AssignedEmployee)
            .FirstOrDefaultAsync(c => c.Id == customerId, cancellationToken);

        if (customer == null)
        {
            throw new NotFoundException(nameof(Customer), customerId);
        }

        // Validate Role-Scoped Access
        if (role == TenantRole.Employee)
        {
            var empId = currentEmployee?.Id ?? Guid.Empty;
            if (customer.AssignedEmployeeId != empId)
            {
                throw new ForbiddenAccessException("You do not have permission to access this customer account.");
            }
        }
        else if (role == TenantRole.Manager)
        {
            var managerId = currentEmployee?.Id ?? Guid.Empty;
            var isDirectReport = customer.AssignedEmployee != null && customer.AssignedEmployee.ReportsToEmployeeId == managerId;
            if (customer.AssignedEmployeeId != managerId && !isDirectReport)
            {
                throw new ForbiddenAccessException("You do not have permission to access customer accounts outside your team scope.");
            }
        }

        return new CustomerDto
        {
            Id = customer.Id,
            TenantId = customer.TenantId,
            CompanyName = customer.CompanyName,
            ContactPerson = customer.ContactPerson,
            Email = customer.Email,
            Phone = customer.Phone,
            Website = customer.Website,
            Industry = customer.Industry,
            Status = customer.Status,
            AssignedEmployeeId = customer.AssignedEmployeeId,
            AssignedEmployeeName = customer.AssignedEmployee != null ? $"{customer.AssignedEmployee.FirstName} {customer.AssignedEmployee.LastName}".Trim() : null,
            Notes = customer.Notes,
            CreatedAtUtc = customer.CreatedAtUtc,
            UpdatedAtUtc = customer.UpdatedAtUtc
        };
    }

    public async Task<CustomerDto> CreateCustomerAsync(CreateCustomerRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.CompanyName))
        {
            throw new ValidationException("CompanyName", "Company name is required.");
        }

        var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;

        // If employee doesn't explicitly choose an assignee, default to assigning to themselves
        var assignedId = request.AssignedEmployeeId;
        if (!assignedId.HasValue && role == TenantRole.Employee && currentEmployee != null)
        {
            assignedId = currentEmployee.Id;
        }

        var customer = new Customer
        {
            Id = Guid.NewGuid(),
            CompanyName = request.CompanyName.Trim(),
            ContactPerson = request.ContactPerson?.Trim(),
            Email = request.Email?.Trim(),
            Phone = request.Phone?.Trim(),
            Website = request.Website?.Trim(),
            Industry = request.Industry?.Trim(),
            Status = request.Status,
            AssignedEmployeeId = assignedId,
            Notes = request.Notes?.Trim(),
            CreatedBy = _currentUserService.Email ?? _currentUserService.UserId ?? "System"
        };

        _context.Customers.Add(customer);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "Created Customer",
            nameof(Customer),
            customer.Id.ToString(),
            $"Created customer '{customer.CompanyName}' (Status: {customer.Status})",
            cancellationToken);

        return await GetCustomerByIdAsync(customer.Id, cancellationToken);
    }

    public async Task<CustomerDto> UpdateCustomerAsync(Guid customerId, UpdateCustomerRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.CompanyName))
        {
            throw new ValidationException("CompanyName", "Company name is required.");
        }

        var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;

        var customer = await _context.Customers
            .Include(c => c.AssignedEmployee)
            .FirstOrDefaultAsync(c => c.Id == customerId, cancellationToken);

        if (customer == null)
        {
            throw new NotFoundException(nameof(Customer), customerId);
        }

        // Verify update permissions
        if (role == TenantRole.Employee)
        {
            var empId = currentEmployee?.Id ?? Guid.Empty;
            if (customer.AssignedEmployeeId != empId)
            {
                throw new ForbiddenAccessException("Employees can only modify customer accounts assigned to them.");
            }
        }

        customer.CompanyName = request.CompanyName.Trim();
        customer.ContactPerson = request.ContactPerson?.Trim();
        customer.Email = request.Email?.Trim();
        customer.Phone = request.Phone?.Trim();
        customer.Website = request.Website?.Trim();
        customer.Industry = request.Industry?.Trim();
        customer.Status = request.Status;
        customer.AssignedEmployeeId = request.AssignedEmployeeId;
        customer.Notes = request.Notes?.Trim();
        customer.UpdatedBy = _currentUserService.Email ?? _currentUserService.UserId;
        customer.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "Updated Customer",
            nameof(Customer),
            customer.Id.ToString(),
            $"Updated customer '{customer.CompanyName}' (Status: {customer.Status})",
            cancellationToken);

        return await GetCustomerByIdAsync(customer.Id, cancellationToken);
    }

    public async Task DeleteCustomerAsync(Guid customerId, CancellationToken cancellationToken = default)
    {
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;
        if (role == TenantRole.Employee)
        {
            throw new ForbiddenAccessException("Employees are not authorized to delete customer records.");
        }

        var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Id == customerId, cancellationToken);
        if (customer == null)
        {
            throw new NotFoundException(nameof(Customer), customerId);
        }

        _context.Customers.Remove(customer);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "Deleted Customer",
            nameof(Customer),
            customer.Id.ToString(),
            $"Deleted customer '{customer.CompanyName}'",
            cancellationToken);
    }

    private async Task<EmployeeProfile?> GetCurrentEmployeeAsync(CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (string.IsNullOrEmpty(userId)) return null;

        return await _context.Employees
            .FirstOrDefaultAsync(e => e.UserId == userId, cancellationToken);
    }
}
