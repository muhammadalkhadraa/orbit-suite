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

public class DealService : IDealService
{
    private readonly IApplicationDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAuditService _auditService;

    public DealService(
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

    public async Task<PagedResponse<DealDto>> GetDealsAsync(DealFilterRequest filter, CancellationToken cancellationToken = default)
    {
        var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;

        var query = _context.Deals
            .Include(d => d.Customer)
            .Include(d => d.AssignedEmployee)
            .AsQueryable();

        // Enforce Confirmed Role-Scoped Deal Visibility
        if (role == TenantRole.Employee)
        {
            var empId = currentEmployee?.Id ?? Guid.Empty;
            query = query.Where(d => d.AssignedEmployeeId == empId);
        }
        else if (role == TenantRole.Manager)
        {
            var managerId = currentEmployee?.Id ?? Guid.Empty;
            query = query.Where(d =>
                d.AssignedEmployeeId == managerId ||
                (d.AssignedEmployee != null && d.AssignedEmployee.ReportsToEmployeeId == managerId));
        }

        // Apply filters
        if (filter.Stage.HasValue)
        {
            query = query.Where(d => d.Stage == filter.Stage.Value);
        }

        if (filter.CustomerId.HasValue)
        {
            query = query.Where(d => d.CustomerId == filter.CustomerId.Value);
        }

        if (filter.AssignedEmployeeId.HasValue)
        {
            query = query.Where(d => d.AssignedEmployeeId == filter.AssignedEmployeeId.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.Trim().ToLower();
            query = query.Where(d =>
                d.Title.ToLower().Contains(s) ||
                d.Customer.CompanyName.ToLower().Contains(s));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var skip = (filter.PageNumber - 1) * filter.PageSize;

        var items = await query
            .OrderByDescending(d => d.CreatedAtUtc)
            .Skip(skip)
            .Take(filter.PageSize)
            .Select(d => new DealDto
            {
                Id = d.Id,
                TenantId = d.TenantId,
                Title = d.Title,
                CustomerId = d.CustomerId,
                CustomerName = d.Customer.CompanyName,
                AssignedEmployeeId = d.AssignedEmployeeId,
                AssignedEmployeeName = d.AssignedEmployee != null ? $"{d.AssignedEmployee.FirstName} {d.AssignedEmployee.LastName}".Trim() : null,
                Amount = d.Amount,
                Currency = d.Currency,
                Stage = d.Stage,
                Probability = d.Probability,
                ExpectedCloseDateUtc = d.ExpectedCloseDateUtc,
                ClosedAtUtc = d.ClosedAtUtc,
                LostReason = d.LostReason,
                Notes = d.Notes,
                CreatedAtUtc = d.CreatedAtUtc,
                UpdatedAtUtc = d.UpdatedAtUtc
            })
            .ToListAsync(cancellationToken);

        return PagedResponse<DealDto>.Create(items, totalCount, filter.PageNumber, filter.PageSize);
    }

    public async Task<DealDto> GetDealByIdAsync(Guid dealId, CancellationToken cancellationToken = default)
    {
        var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;

        var deal = await _context.Deals
            .Include(d => d.Customer)
            .Include(d => d.AssignedEmployee)
            .FirstOrDefaultAsync(d => d.Id == dealId, cancellationToken);

        if (deal == null)
        {
            throw new NotFoundException(nameof(Deal), dealId);
        }

        // Validate Role-Scoped Access
        if (role == TenantRole.Employee)
        {
            var empId = currentEmployee?.Id ?? Guid.Empty;
            if (deal.AssignedEmployeeId != empId)
            {
                throw new ForbiddenAccessException("You do not have permission to view this deal.");
            }
        }
        else if (role == TenantRole.Manager)
        {
            var managerId = currentEmployee?.Id ?? Guid.Empty;
            var isDirectReport = deal.AssignedEmployee != null && deal.AssignedEmployee.ReportsToEmployeeId == managerId;
            if (deal.AssignedEmployeeId != managerId && !isDirectReport)
            {
                throw new ForbiddenAccessException("You do not have permission to access deals outside your team scope.");
            }
        }

        return MapToDto(deal);
    }

    public async Task<DealDto> CreateDealAsync(CreateDealRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            throw new ValidationException("Title", "Deal title is required.");
        }

        if (request.CustomerId == Guid.Empty)
        {
            throw new ValidationException("CustomerId", "Associated customer account is required.");
        }

        var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Id == request.CustomerId, cancellationToken);
        if (customer == null)
        {
            throw new NotFoundException(nameof(Customer), request.CustomerId);
        }

        var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;

        var assignedId = request.AssignedEmployeeId;
        if (!assignedId.HasValue && role == TenantRole.Employee && currentEmployee != null)
        {
            assignedId = currentEmployee.Id;
        }

        // Determine initial probability
        var probability = request.Probability ?? GetDefaultProbabilityForStage(request.Stage);

        var deal = new Deal
        {
            Id = Guid.NewGuid(),
            Title = request.Title.Trim(),
            CustomerId = request.CustomerId,
            AssignedEmployeeId = assignedId,
            Amount = request.Amount,
            Currency = string.IsNullOrWhiteSpace(request.Currency) ? "USD" : request.Currency.Trim().ToUpperInvariant(),
            Stage = request.Stage,
            Probability = probability,
            ExpectedCloseDateUtc = request.ExpectedCloseDateUtc,
            Notes = request.Notes?.Trim(),
            CreatedBy = _currentUserService.Email ?? _currentUserService.UserId ?? "System"
        };

        if (deal.Stage == DealStage.ClosedWon)
        {
            deal.ClosedAtUtc = DateTime.UtcNow;
            deal.Probability = 100;
        }
        else if (deal.Stage == DealStage.ClosedLost)
        {
            deal.ClosedAtUtc = DateTime.UtcNow;
            deal.Probability = 0;
        }

        _context.Deals.Add(deal);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "Created Deal",
            nameof(Deal),
            deal.Id.ToString(),
            $"Created deal '{deal.Title}' for customer '{customer.CompanyName}' (Stage: {deal.Stage}, Value: {deal.Amount} {deal.Currency})",
            cancellationToken);

        return await GetDealByIdAsync(deal.Id, cancellationToken);
    }

    public async Task<DealDto> UpdateDealAsync(Guid dealId, UpdateDealRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            throw new ValidationException("Title", "Deal title is required.");
        }

        var deal = await _context.Deals
            .Include(d => d.Customer)
            .Include(d => d.AssignedEmployee)
            .FirstOrDefaultAsync(d => d.Id == dealId, cancellationToken);

        if (deal == null)
        {
            throw new NotFoundException(nameof(Deal), dealId);
        }

        await ValidateModifyPermissionAsync(deal, cancellationToken);

        deal.Title = request.Title.Trim();
        deal.CustomerId = request.CustomerId;
        deal.AssignedEmployeeId = request.AssignedEmployeeId;
        deal.Amount = request.Amount;
        deal.Currency = string.IsNullOrWhiteSpace(request.Currency) ? "USD" : request.Currency.Trim().ToUpperInvariant();
        deal.Stage = request.Stage;
        deal.Probability = request.Probability;
        deal.ExpectedCloseDateUtc = request.ExpectedCloseDateUtc;
        deal.LostReason = request.LostReason?.Trim();
        deal.Notes = request.Notes?.Trim();
        deal.UpdatedBy = _currentUserService.Email ?? _currentUserService.UserId;
        deal.UpdatedAtUtc = DateTime.UtcNow;

        if (deal.Stage == DealStage.ClosedWon)
        {
            deal.ClosedAtUtc ??= DateTime.UtcNow;
            deal.Probability = 100;
            deal.LostReason = null;
        }
        else if (deal.Stage == DealStage.ClosedLost)
        {
            deal.ClosedAtUtc ??= DateTime.UtcNow;
            deal.Probability = 0;
        }
        else
        {
            deal.ClosedAtUtc = null;
            deal.LostReason = null;
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "Updated Deal",
            nameof(Deal),
            deal.Id.ToString(),
            $"Updated deal '{deal.Title}' (Stage: {deal.Stage}, Value: {deal.Amount} {deal.Currency})",
            cancellationToken);

        return await GetDealByIdAsync(deal.Id, cancellationToken);
    }

    public async Task<DealDto> UpdateDealStageAsync(Guid dealId, UpdateDealStageRequest request, CancellationToken cancellationToken = default)
    {
        var deal = await _context.Deals
            .Include(d => d.Customer)
            .Include(d => d.AssignedEmployee)
            .FirstOrDefaultAsync(d => d.Id == dealId, cancellationToken);

        if (deal == null)
        {
            throw new NotFoundException(nameof(Deal), dealId);
        }

        await ValidateModifyPermissionAsync(deal, cancellationToken);

        var oldStage = deal.Stage;
        deal.Stage = request.Stage;
        deal.Probability = request.Probability ?? GetDefaultProbabilityForStage(request.Stage);
        deal.UpdatedAtUtc = DateTime.UtcNow;
        deal.UpdatedBy = _currentUserService.Email ?? _currentUserService.UserId;

        if (request.Stage == DealStage.ClosedWon)
        {
            deal.ClosedAtUtc = DateTime.UtcNow;
            deal.Probability = 100;
            deal.LostReason = null;
        }
        else if (request.Stage == DealStage.ClosedLost)
        {
            deal.ClosedAtUtc = DateTime.UtcNow;
            deal.Probability = 0;
            deal.LostReason = request.LostReason ?? "Closed Lost";
        }
        else
        {
            deal.ClosedAtUtc = null;
            deal.LostReason = null;
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "Transitioned Deal Stage",
            nameof(Deal),
            deal.Id.ToString(),
            $"Transitioned deal '{deal.Title}' from {oldStage} to {deal.Stage}",
            cancellationToken);

        return await GetDealByIdAsync(deal.Id, cancellationToken);
    }

    public async Task DeleteDealAsync(Guid dealId, CancellationToken cancellationToken = default)
    {
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;
        if (role == TenantRole.Employee)
        {
            throw new ForbiddenAccessException("Employees are not authorized to delete deal opportunities.");
        }

        var deal = await _context.Deals
            .Include(d => d.AssignedEmployee)
            .FirstOrDefaultAsync(d => d.Id == dealId, cancellationToken);

        if (deal == null)
        {
            throw new NotFoundException(nameof(Deal), dealId);
        }

        if (role == TenantRole.Manager)
        {
            var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
            var managerId = currentEmployee?.Id ?? Guid.Empty;
            var isDirectReport = deal.AssignedEmployee != null && deal.AssignedEmployee.ReportsToEmployeeId == managerId;
            if (deal.AssignedEmployeeId != managerId && !isDirectReport)
            {
                throw new ForbiddenAccessException("Managers can only delete deals within their team scope.");
            }
        }

        _context.Deals.Remove(deal);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "Deleted Deal",
            nameof(Deal),
            deal.Id.ToString(),
            $"Deleted deal '{deal.Title}'",
            cancellationToken);
    }

    public async Task<DealMetricsDto> GetDealMetricsAsync(CancellationToken cancellationToken = default)
    {
        var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;

        var query = _context.Deals.AsQueryable();

        if (role == TenantRole.Employee)
        {
            var empId = currentEmployee?.Id ?? Guid.Empty;
            query = query.Where(d => d.AssignedEmployeeId == empId);
        }
        else if (role == TenantRole.Manager)
        {
            var managerId = currentEmployee?.Id ?? Guid.Empty;
            query = query.Where(d =>
                d.AssignedEmployeeId == managerId ||
                (d.AssignedEmployee != null && d.AssignedEmployee.ReportsToEmployeeId == managerId));
        }

        var deals = await query.ToListAsync(cancellationToken);

        var openDeals = deals.Where(d => d.Stage != DealStage.ClosedWon && d.Stage != DealStage.ClosedLost).ToList();
        var wonDeals = deals.Where(d => d.Stage == DealStage.ClosedWon).ToList();
        var lostDeals = deals.Where(d => d.Stage == DealStage.ClosedLost).ToList();

        var totalPipeline = openDeals.Sum(d => d.Amount);
        var weightedPipeline = openDeals.Sum(d => d.Amount * (d.Probability / 100m));
        var wonValue = wonDeals.Sum(d => d.Amount);
        var lostValue = lostDeals.Sum(d => d.Amount);

        var closedCount = wonDeals.Count + lostDeals.Count;
        var winRate = closedCount > 0 ? (double)wonDeals.Count / closedCount * 100.0 : 0.0;

        return new DealMetricsDto
        {
            TotalPipelineValue = totalPipeline,
            WeightedPipelineValue = weightedPipeline,
            WonValue = wonValue,
            LostValue = lostValue,
            OpenDealsCount = openDeals.Count,
            WonDealsCount = wonDeals.Count,
            LostDealsCount = lostDeals.Count,
            TotalDealsCount = deals.Count,
            WinRatePercentage = Math.Round(winRate, 1)
        };
    }

    private async Task ValidateModifyPermissionAsync(Deal deal, CancellationToken cancellationToken)
    {
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;
        if (role == TenantRole.Employee)
        {
            var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
            var empId = currentEmployee?.Id ?? Guid.Empty;
            if (deal.AssignedEmployeeId != empId)
            {
                throw new ForbiddenAccessException("Employees can only modify deals assigned to them.");
            }
        }
        else if (role == TenantRole.Manager)
        {
            var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
            var managerId = currentEmployee?.Id ?? Guid.Empty;
            var isDirectReport = deal.AssignedEmployee != null && deal.AssignedEmployee.ReportsToEmployeeId == managerId;
            if (deal.AssignedEmployeeId != managerId && !isDirectReport)
            {
                throw new ForbiddenAccessException("Managers can only modify deals within their team scope.");
            }
        }
    }

    private static int GetDefaultProbabilityForStage(DealStage stage) => stage switch
    {
        DealStage.Lead => 20,
        DealStage.Qualified => 40,
        DealStage.Proposal => 60,
        DealStage.Negotiation => 80,
        DealStage.ClosedWon => 100,
        DealStage.ClosedLost => 0,
        _ => 20
    };

    private static DealDto MapToDto(Deal deal)
    {
        return new DealDto
        {
            Id = deal.Id,
            TenantId = deal.TenantId,
            Title = deal.Title,
            CustomerId = deal.CustomerId,
            CustomerName = deal.Customer?.CompanyName ?? string.Empty,
            AssignedEmployeeId = deal.AssignedEmployeeId,
            AssignedEmployeeName = deal.AssignedEmployee != null ? $"{deal.AssignedEmployee.FirstName} {deal.AssignedEmployee.LastName}".Trim() : null,
            Amount = deal.Amount,
            Currency = deal.Currency,
            Stage = deal.Stage,
            Probability = deal.Probability,
            ExpectedCloseDateUtc = deal.ExpectedCloseDateUtc,
            ClosedAtUtc = deal.ClosedAtUtc,
            LostReason = deal.LostReason,
            Notes = deal.Notes,
            CreatedAtUtc = deal.CreatedAtUtc,
            UpdatedAtUtc = deal.UpdatedAtUtc
        };
    }

    private async Task<EmployeeProfile?> GetCurrentEmployeeAsync(CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (string.IsNullOrEmpty(userId)) return null;

        return await _context.Employees
            .FirstOrDefaultAsync(e => e.UserId == userId, cancellationToken);
    }
}
