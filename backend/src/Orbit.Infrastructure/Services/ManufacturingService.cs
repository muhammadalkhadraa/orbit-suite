using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Orbit.Application.Common;
using Orbit.Application.Common.Exceptions;
using Orbit.Application.Interfaces;
using Orbit.Application.Modules.Manufacturing;
using Orbit.Application.Modules.Manufacturing.Dtos;
using Orbit.Domain.Entities;
using Orbit.Domain.Enums;

namespace Orbit.Infrastructure.Services;

public class ManufacturingService : IManufacturingService
{
    private readonly IApplicationDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAuditService _auditService;

    public ManufacturingService(
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

    public async Task<PagedResponse<WorkOrderDto>> GetWorkOrdersAsync(WorkOrderFilterRequest filter, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.CurrentTenantId ?? throw new UnauthorizedAccessException("Tenant context is required.");

        var query = _context.WorkOrders
            .Include(w => w.Product)
            .Include(w => w.BillOfMaterials)
            .Include(w => w.Branch)
            .Include(w => w.AssignedEmployee)
            .AsQueryable();

        // Role-based visibility scoping
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;
        if (role == TenantRole.Employee)
        {
            var emp = await _context.Employees
                .FirstOrDefaultAsync(e => e.UserId == _currentUserService.UserId, cancellationToken);

            if (emp != null)
            {
                query = query.Where(w => w.AssignedEmployeeId == emp.Id || (emp.BranchId.HasValue && w.BranchId == emp.BranchId.Value));
            }
        }

        if (filter.Status.HasValue)
        {
            query = query.Where(w => w.Status == filter.Status.Value);
        }

        if (filter.Priority.HasValue)
        {
            query = query.Where(w => w.Priority == filter.Priority.Value);
        }

        if (filter.BranchId.HasValue)
        {
            query = query.Where(w => w.BranchId == filter.BranchId.Value);
        }

        if (filter.ProductId.HasValue)
        {
            query = query.Where(w => w.ProductId == filter.ProductId.Value);
        }

        if (filter.AssignedEmployeeId.HasValue)
        {
            query = query.Where(w => w.AssignedEmployeeId == filter.AssignedEmployeeId.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.Trim().ToLower();
            query = query.Where(w =>
                w.OrderNumber.ToLower().Contains(s) ||
                w.Product.Name.ToLower().Contains(s) ||
                w.Product.Sku.ToLower().Contains(s) ||
                (w.Notes != null && w.Notes.ToLower().Contains(s)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var pageNumber = filter.PageNumber < 1 ? 1 : filter.PageNumber;
        var pageSize = filter.PageSize < 1 ? 20 : filter.PageSize;

        var items = await query
            .OrderByDescending(w => w.CreatedAtUtc)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(w => MapToWorkOrderDto(w))
            .ToListAsync(cancellationToken);

        return new PagedResponse<WorkOrderDto>(items, totalCount, pageNumber, pageSize);
    }

    public async Task<WorkOrderDto> GetWorkOrderByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var workOrder = await _context.WorkOrders
            .Include(w => w.Product)
            .Include(w => w.BillOfMaterials)
            .Include(w => w.Branch)
            .Include(w => w.AssignedEmployee)
            .FirstOrDefaultAsync(w => w.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Work order with ID {id} was not found.");

        return MapToWorkOrderDto(workOrder);
    }

    public async Task<WorkOrderDto> CreateWorkOrderAsync(CreateWorkOrderRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.CurrentTenantId ?? throw new UnauthorizedAccessException("Tenant context is required.");

        if (request.QuantityTarget <= 0)
        {
            throw new ValidationException("Target quantity must be greater than zero.");
        }

        var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == request.ProductId, cancellationToken)
            ?? throw new NotFoundException($"Product with ID {request.ProductId} was not found.");

        var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == request.BranchId, cancellationToken)
            ?? throw new NotFoundException($"Branch with ID {request.BranchId} was not found.");

        if (request.BillOfMaterialsId.HasValue)
        {
            var bomExists = await _context.BillsOfMaterials.AnyAsync(b => b.Id == request.BillOfMaterialsId.Value, cancellationToken);
            if (!bomExists)
            {
                throw new NotFoundException($"Bill of Materials with ID {request.BillOfMaterialsId.Value} was not found.");
            }
        }

        if (request.AssignedEmployeeId.HasValue)
        {
            var empExists = await _context.Employees.AnyAsync(e => e.Id == request.AssignedEmployeeId.Value, cancellationToken);
            if (!empExists)
            {
                throw new NotFoundException($"Employee with ID {request.AssignedEmployeeId.Value} was not found.");
            }
        }

        var count = await _context.WorkOrders.CountAsync(cancellationToken);
        var orderNumber = $"WO-{DateTime.UtcNow.Year}-{(count + 1):D4}";

        var workOrder = new WorkOrder
        {
            TenantId = tenantId,
            OrderNumber = orderNumber,
            ProductId = request.ProductId,
            BillOfMaterialsId = request.BillOfMaterialsId,
            BranchId = request.BranchId,
            AssignedEmployeeId = request.AssignedEmployeeId,
            QuantityTarget = request.QuantityTarget,
            QuantityProduced = 0,
            Status = WorkOrderStatus.Draft,
            Priority = request.Priority,
            StartDateUtc = request.StartDateUtc,
            DueDateUtc = request.DueDateUtc,
            Notes = request.Notes
        };

        _context.WorkOrders.Add(workOrder);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("CreateWorkOrder", "WorkOrder", workOrder.Id.ToString(), $"Created work order {orderNumber} for {product.Name}");

        return await GetWorkOrderByIdAsync(workOrder.Id, cancellationToken);
    }

    public async Task<WorkOrderDto> UpdateWorkOrderAsync(Guid id, UpdateWorkOrderRequest request, CancellationToken cancellationToken = default)
    {
        var workOrder = await _context.WorkOrders.FirstOrDefaultAsync(w => w.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Work order with ID {id} was not found.");

        if (workOrder.Status == WorkOrderStatus.Completed || workOrder.Status == WorkOrderStatus.Cancelled)
        {
            throw new InvalidOperationException($"Cannot update a work order in '{workOrder.Status}' status.");
        }

        if (request.QuantityTarget <= 0)
        {
            throw new ValidationException("Target quantity must be greater than zero.");
        }

        var branchExists = await _context.Branches.AnyAsync(b => b.Id == request.BranchId, cancellationToken);
        if (!branchExists)
        {
            throw new NotFoundException($"Branch with ID {request.BranchId} was not found.");
        }

        if (request.AssignedEmployeeId.HasValue)
        {
            var empExists = await _context.Employees.AnyAsync(e => e.Id == request.AssignedEmployeeId.Value, cancellationToken);
            if (!empExists)
            {
                throw new NotFoundException($"Employee with ID {request.AssignedEmployeeId.Value} was not found.");
            }
        }

        workOrder.BranchId = request.BranchId;
        workOrder.AssignedEmployeeId = request.AssignedEmployeeId;
        workOrder.QuantityTarget = request.QuantityTarget;
        workOrder.Priority = request.Priority;
        workOrder.StartDateUtc = request.StartDateUtc;
        workOrder.DueDateUtc = request.DueDateUtc;
        workOrder.Notes = request.Notes;

        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("UpdateWorkOrder", "WorkOrder", workOrder.Id.ToString(), $"Updated work order {workOrder.OrderNumber}");

        return await GetWorkOrderByIdAsync(workOrder.Id, cancellationToken);
    }

    public async Task<WorkOrderDto> UpdateWorkOrderStatusAsync(Guid id, UpdateWorkOrderStatusRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.CurrentTenantId ?? throw new UnauthorizedAccessException("Tenant context is required.");

        var workOrder = await _context.WorkOrders
            .Include(w => w.Product)
            .FirstOrDefaultAsync(w => w.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Work order with ID {id} was not found.");

        if (workOrder.Status == WorkOrderStatus.Completed && request.Status != WorkOrderStatus.Completed)
        {
            throw new InvalidOperationException("Cannot transition a completed work order back to an earlier status.");
        }

        if (workOrder.Status == WorkOrderStatus.Cancelled && request.Status != WorkOrderStatus.Cancelled)
        {
            throw new InvalidOperationException("Cannot reactivate a cancelled work order.");
        }

        var oldStatus = workOrder.Status;
        workOrder.Status = request.Status;

        if (request.Notes != null)
        {
            workOrder.Notes = request.Notes;
        }

        if (request.Status == WorkOrderStatus.InProgress && !workOrder.StartDateUtc.HasValue)
        {
            workOrder.StartDateUtc = DateTime.UtcNow;
        }

        if (request.Status == WorkOrderStatus.Completed)
        {
            workOrder.CompletedDateUtc = DateTime.UtcNow;
            var produced = request.QuantityProduced.HasValue && request.QuantityProduced.Value > 0
                ? request.QuantityProduced.Value
                : (workOrder.QuantityProduced > 0 ? workOrder.QuantityProduced : workOrder.QuantityTarget);

            workOrder.QuantityProduced = produced;

            // Yield finished product into branch inventory
            var branchInventory = await _context.ProductInventories
                .FirstOrDefaultAsync(pi => pi.ProductId == workOrder.ProductId && pi.BranchId == workOrder.BranchId, cancellationToken);

            if (branchInventory == null)
            {
                branchInventory = new ProductInventory
                {
                    TenantId = tenantId,
                    ProductId = workOrder.ProductId,
                    BranchId = workOrder.BranchId,
                    QuantityOnHand = produced,
                    QuantityReserved = 0
                };
                _context.ProductInventories.Add(branchInventory);
            }
            else
            {
                branchInventory.QuantityOnHand += produced;
            }

            // Create immutable stock movement ledger entry
            var movement = new StockMovement
            {
                TenantId = tenantId,
                ProductId = workOrder.ProductId,
                BranchId = workOrder.BranchId,
                Type = StockMovementType.Receipt,
                Quantity = produced,
                ReferenceNumber = workOrder.OrderNumber,
                Reason = $"Manufactured via Work Order {workOrder.OrderNumber}"
            };
            _context.StockMovements.Add(movement);
        }
        else if (request.QuantityProduced.HasValue)
        {
            workOrder.QuantityProduced = request.QuantityProduced.Value;
        }

        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("UpdateWorkOrderStatus", "WorkOrder", workOrder.Id.ToString(), $"Transitioned status from {oldStatus} to {workOrder.Status}");

        return await GetWorkOrderByIdAsync(workOrder.Id, cancellationToken);
    }

    public async Task DeleteWorkOrderAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var workOrder = await _context.WorkOrders.FirstOrDefaultAsync(w => w.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Work order with ID {id} was not found.");

        if (workOrder.Status != WorkOrderStatus.Draft)
        {
            throw new InvalidOperationException("Only draft work orders can be deleted. Cancel non-draft orders instead.");
        }

        _context.WorkOrders.Remove(workOrder);
        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("DeleteWorkOrder", "WorkOrder", id.ToString(), $"Deleted draft work order {workOrder.OrderNumber}");
    }

    public async Task<List<BillOfMaterialsDto>> GetBillsOfMaterialsAsync(CancellationToken cancellationToken = default)
    {
        var boms = await _context.BillsOfMaterials
            .Include(b => b.Product)
            .Include(b => b.Items)
                .ThenInclude(i => i.ComponentProduct)
            .OrderBy(b => b.BomNumber)
            .ToListAsync(cancellationToken);

        return boms.Select(b => MapToBomDto(b)).ToList();
    }

    public async Task<BillOfMaterialsDto> GetBomByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var bom = await _context.BillsOfMaterials
            .Include(b => b.Product)
            .Include(b => b.Items)
                .ThenInclude(i => i.ComponentProduct)
            .FirstOrDefaultAsync(b => b.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Bill of Materials with ID {id} was not found.");

        return MapToBomDto(bom);
    }

    public async Task<BillOfMaterialsDto> CreateBomAsync(CreateBomRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.CurrentTenantId ?? throw new UnauthorizedAccessException("Tenant context is required.");

        var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == request.ProductId, cancellationToken)
            ?? throw new NotFoundException($"Finished Product with ID {request.ProductId} was not found.");

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ValidationException("BOM Name is required.");
        }

        var count = await _context.BillsOfMaterials.CountAsync(cancellationToken);
        var bomNumber = $"BOM-{(count + 1):D4}";

        var bom = new BillOfMaterials
        {
            TenantId = tenantId,
            BomNumber = bomNumber,
            ProductId = request.ProductId,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            Version = string.IsNullOrWhiteSpace(request.Version) ? "v1.0" : request.Version.Trim(),
            IsActive = true
        };

        if (request.Items != null && request.Items.Count > 0)
        {
            foreach (var item in request.Items)
            {
                if (item.QuantityRequired <= 0)
                {
                    throw new ValidationException("BOM item quantity must be greater than zero.");
                }

                var compExists = await _context.Products.AnyAsync(p => p.Id == item.ComponentProductId, cancellationToken);
                if (!compExists)
                {
                    throw new NotFoundException($"Component product with ID {item.ComponentProductId} was not found.");
                }

                bom.Items.Add(new BomItem
                {
                    TenantId = tenantId,
                    ComponentProductId = item.ComponentProductId,
                    QuantityRequired = item.QuantityRequired,
                    UnitOfMeasure = string.IsNullOrWhiteSpace(item.UnitOfMeasure) ? "pcs" : item.UnitOfMeasure.Trim(),
                    Notes = item.Notes?.Trim()
                });
            }
        }

        _context.BillsOfMaterials.Add(bom);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("CreateBom", "BillOfMaterials", bom.Id.ToString(), $"Created {bomNumber} for {product.Name}");

        return await GetBomByIdAsync(bom.Id, cancellationToken);
    }

    public async Task<ManufacturingMetricsDto> GetManufacturingMetricsAsync(CancellationToken cancellationToken = default)
    {
        var workOrders = await _context.WorkOrders.ToListAsync(cancellationToken);

        var metrics = new ManufacturingMetricsDto
        {
            TotalWorkOrders = workOrders.Count,
            DraftCount = workOrders.Count(w => w.Status == WorkOrderStatus.Draft),
            PlannedCount = workOrders.Count(w => w.Status == WorkOrderStatus.Planned),
            InProgressCount = workOrders.Count(w => w.Status == WorkOrderStatus.InProgress),
            CompletedCount = workOrders.Count(w => w.Status == WorkOrderStatus.Completed),
            CancelledCount = workOrders.Count(w => w.Status == WorkOrderStatus.Cancelled),
            TotalUnitsTarget = workOrders.Sum(w => w.QuantityTarget),
            TotalUnitsProduced = workOrders.Sum(w => w.QuantityProduced)
        };

        return metrics;
    }

    private static WorkOrderDto MapToWorkOrderDto(WorkOrder w)
    {
        return new WorkOrderDto
        {
            Id = w.Id,
            TenantId = w.TenantId,
            OrderNumber = w.OrderNumber,
            ProductId = w.ProductId,
            ProductSku = w.Product?.Sku ?? string.Empty,
            ProductName = w.Product?.Name ?? string.Empty,
            BillOfMaterialsId = w.BillOfMaterialsId,
            BomNumber = w.BillOfMaterials?.BomNumber,
            BomName = w.BillOfMaterials?.Name,
            BranchId = w.BranchId,
            BranchName = w.Branch?.Name ?? string.Empty,
            AssignedEmployeeId = w.AssignedEmployeeId,
            AssignedEmployeeName = w.AssignedEmployee != null ? $"{w.AssignedEmployee.FirstName} {w.AssignedEmployee.LastName}".Trim() : null,
            QuantityTarget = w.QuantityTarget,
            QuantityProduced = w.QuantityProduced,
            Status = w.Status,
            Priority = w.Priority,
            StartDateUtc = w.StartDateUtc,
            DueDateUtc = w.DueDateUtc,
            CompletedDateUtc = w.CompletedDateUtc,
            Notes = w.Notes,
            CreatedAtUtc = w.CreatedAtUtc,
            UpdatedAtUtc = w.UpdatedAtUtc
        };
    }

    private static BillOfMaterialsDto MapToBomDto(BillOfMaterials b)
    {
        return new BillOfMaterialsDto
        {
            Id = b.Id,
            TenantId = b.TenantId,
            BomNumber = b.BomNumber,
            Name = b.Name,
            Description = b.Description,
            ProductId = b.ProductId,
            ProductSku = b.Product?.Sku ?? string.Empty,
            ProductName = b.Product?.Name ?? string.Empty,
            Version = b.Version,
            IsActive = b.IsActive,
            CreatedAtUtc = b.CreatedAtUtc,
            UpdatedAtUtc = b.UpdatedAtUtc,
            Items = b.Items?.Select(i => new BomItemDto
            {
                Id = i.Id,
                BillOfMaterialsId = i.BillOfMaterialsId,
                ComponentProductId = i.ComponentProductId,
                ComponentProductSku = i.ComponentProduct?.Sku ?? string.Empty,
                ComponentProductName = i.ComponentProduct?.Name ?? string.Empty,
                QuantityRequired = i.QuantityRequired,
                UnitOfMeasure = i.UnitOfMeasure,
                Notes = i.Notes
            }).ToList() ?? new()
        };
    }
}
