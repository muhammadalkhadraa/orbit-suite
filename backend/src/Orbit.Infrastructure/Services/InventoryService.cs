using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Orbit.Application.Common;
using Orbit.Application.Common.Exceptions;
using Orbit.Application.Interfaces;
using Orbit.Application.Modules.Inventory;
using Orbit.Application.Modules.Inventory.Dtos;
using Orbit.Domain.Entities;
using Orbit.Domain.Enums;

namespace Orbit.Infrastructure.Services;

public class InventoryService : IInventoryService
{
    private readonly IApplicationDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAuditService _auditService;

    public InventoryService(
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

    public async Task<PagedResponse<ProductDto>> GetProductsAsync(ProductFilterRequest filter, CancellationToken cancellationToken = default)
    {
        var query = _context.Products
            .Include(p => p.Inventories)
                .ThenInclude(i => i.Branch)
            .AsQueryable();

        if (filter.Category.HasValue)
        {
            query = query.Where(p => p.Category == filter.Category.Value);
        }

        if (filter.IsActive.HasValue)
        {
            query = query.Where(p => p.IsActive == filter.IsActive.Value);
        }

        if (filter.BranchId.HasValue)
        {
            query = query.Where(p => p.Inventories.Any(i => i.BranchId == filter.BranchId.Value));
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.Trim().ToLower();
            query = query.Where(p =>
                p.Sku.ToLower().Contains(s) ||
                p.Name.ToLower().Contains(s) ||
                (p.Description != null && p.Description.ToLower().Contains(s)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var skip = (filter.PageNumber - 1) * filter.PageSize;

        var items = await query
            .OrderBy(p => p.Name)
            .Skip(skip)
            .Take(filter.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(MapToProductDto).ToList();

        if (filter.IsLowStock.HasValue)
        {
            dtos = dtos.Where(d => d.IsLowStock == filter.IsLowStock.Value).ToList();
        }

        return new PagedResponse<ProductDto>(dtos, totalCount, filter.PageNumber, filter.PageSize);
    }

    public async Task<ProductDto> GetProductByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var product = await _context.Products
            .Include(p => p.Inventories)
                .ThenInclude(i => i.Branch)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (product == null)
        {
            throw new NotFoundException($"Product with ID '{id}' was not found.");
        }

        return MapToProductDto(product);
    }

    public async Task<ProductDto> GetProductBySkuAsync(string sku, CancellationToken cancellationToken = default)
    {
        var cleanSku = sku.Trim().ToLower();
        var product = await _context.Products
            .Include(p => p.Inventories)
                .ThenInclude(i => i.Branch)
            .FirstOrDefaultAsync(p => p.Sku.ToLower() == cleanSku, cancellationToken);

        if (product == null)
        {
            throw new NotFoundException($"Product with SKU '{sku}' was not found.");
        }

        return MapToProductDto(product);
    }

    public async Task<ProductDto> CreateProductAsync(CreateProductRequest request, CancellationToken cancellationToken = default)
    {
        EnforceCatalogWritePermission();

        if (string.IsNullOrWhiteSpace(request.Sku))
        {
            throw new ValidationException("SKU is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ValidationException("Product name is required.");
        }

        var skuNormalized = request.Sku.Trim().ToUpperInvariant();
        var exists = await _context.Products.AnyAsync(p => p.Sku.ToUpper() == skuNormalized, cancellationToken);
        if (exists)
        {
            throw new ValidationException($"A product with SKU '{request.Sku.Trim()}' already exists.");
        }

        var product = new Product
        {
            Sku = skuNormalized,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            Category = request.Category,
            UnitOfMeasure = string.IsNullOrWhiteSpace(request.UnitOfMeasure) ? "pcs" : request.UnitOfMeasure.Trim(),
            UnitPrice = request.UnitPrice,
            UnitCost = request.UnitCost,
            ReorderLevel = request.ReorderLevel,
            IsActive = true
        };

        _context.Products.Add(product);

        // Optional initial inventory stock intake
        if (request.InitialQuantity.HasValue && request.InitialQuantity.Value > 0 && request.InitialBranchId.HasValue)
        {
            var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == request.InitialBranchId.Value, cancellationToken);
            if (branch == null)
            {
                throw new NotFoundException($"Branch with ID '{request.InitialBranchId.Value}' was not found.");
            }

            var inventory = new ProductInventory
            {
                Product = product,
                Branch = branch,
                QuantityOnHand = request.InitialQuantity.Value,
                QuantityReserved = 0,
                AisleBinLocation = request.AisleBinLocation?.Trim()
            };

            _context.ProductInventories.Add(inventory);

            var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
            var movement = new StockMovement
            {
                Product = product,
                Branch = branch,
                Type = StockMovementType.Receipt,
                Quantity = request.InitialQuantity.Value,
                UnitCost = request.UnitCost,
                ReferenceNumber = $"INIT-{skuNormalized}",
                Reason = "Initial inventory intake",
                PerformedByEmployeeId = currentEmployee?.Id,
                TimestampUtc = DateTime.UtcNow
            };

            _context.StockMovements.Add(movement);
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            action: "CreateProduct",
            entityName: nameof(Product),
            entityId: product.Id.ToString(),
            details: $"Created product '{product.Name}' (SKU: {product.Sku})",
            cancellationToken: cancellationToken);

        return await GetProductByIdAsync(product.Id, cancellationToken);
    }

    public async Task<ProductDto> UpdateProductAsync(Guid id, UpdateProductRequest request, CancellationToken cancellationToken = default)
    {
        EnforceCatalogWritePermission();

        var product = await _context.Products
            .Include(p => p.Inventories)
                .ThenInclude(i => i.Branch)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (product == null)
        {
            throw new NotFoundException($"Product with ID '{id}' was not found.");
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ValidationException("Product name is required.");
        }

        product.Name = request.Name.Trim();
        product.Description = request.Description?.Trim();
        product.Category = request.Category;
        product.UnitOfMeasure = string.IsNullOrWhiteSpace(request.UnitOfMeasure) ? "pcs" : request.UnitOfMeasure.Trim();
        product.UnitPrice = request.UnitPrice;
        product.UnitCost = request.UnitCost;
        product.ReorderLevel = request.ReorderLevel;
        product.IsActive = request.IsActive;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            action: "UpdateProduct",
            entityName: nameof(Product),
            entityId: product.Id.ToString(),
            details: $"Updated product '{product.Name}' (SKU: {product.Sku})",
            cancellationToken: cancellationToken);

        return MapToProductDto(product);
    }

    public async Task DeleteProductAsync(Guid id, CancellationToken cancellationToken = default)
    {
        EnforceCatalogWritePermission();

        var product = await _context.Products
            .Include(p => p.Inventories)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (product == null)
        {
            throw new NotFoundException($"Product with ID '{id}' was not found.");
        }

        var hasMovements = await _context.StockMovements.AnyAsync(m => m.ProductId == id, cancellationToken);
        var totalStock = product.Inventories.Sum(i => i.QuantityOnHand);

        // If product has ledger history or on-hand stock, soft-deactivate to preserve audit trail
        if (hasMovements || totalStock > 0)
        {
            product.IsActive = false;
        }
        else
        {
            _context.Products.Remove(product);
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            action: hasMovements || totalStock > 0 ? "DeactivateProduct" : "DeleteProduct",
            entityName: nameof(Product),
            entityId: product.Id.ToString(),
            details: $"Deactivated/Deleted product '{product.Name}' (SKU: {product.Sku})",
            cancellationToken: cancellationToken);
    }

    public async Task<StockMovementDto> AdjustStockAsync(AdjustStockRequest request, CancellationToken cancellationToken = default)
    {
        if (request.Quantity <= 0)
        {
            throw new ValidationException("Adjustment quantity must be greater than zero.");
        }

        var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == request.ProductId, cancellationToken);
        if (product == null)
        {
            throw new NotFoundException($"Product with ID '{request.ProductId}' was not found.");
        }

        var sourceBranch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == request.BranchId, cancellationToken);
        if (sourceBranch == null)
        {
            throw new NotFoundException($"Branch with ID '{request.BranchId}' was not found.");
        }

        var inventory = await _context.ProductInventories
            .FirstOrDefaultAsync(i => i.ProductId == request.ProductId && i.BranchId == request.BranchId, cancellationToken);

        if (inventory == null)
        {
            inventory = new ProductInventory
            {
                ProductId = request.ProductId,
                BranchId = request.BranchId,
                QuantityOnHand = 0,
                QuantityReserved = 0,
                AisleBinLocation = request.AisleBinLocation?.Trim()
            };
            _context.ProductInventories.Add(inventory);
        }

        if (!string.IsNullOrWhiteSpace(request.AisleBinLocation))
        {
            inventory.AisleBinLocation = request.AisleBinLocation.Trim();
        }

        Branch? destinationBranch = null;

        // Apply Stock Math according to Movement Type
        switch (request.Type)
        {
            case StockMovementType.Receipt:
            case StockMovementType.AdjustmentIn:
                inventory.QuantityOnHand += request.Quantity;
                break;

            case StockMovementType.AdjustmentOut:
            case StockMovementType.SaleShipment:
            case StockMovementType.Scrap:
                if (inventory.QuantityOnHand < request.Quantity)
                {
                    throw new ValidationException($"Insufficient stock on hand at '{sourceBranch.Name}'. Available: {inventory.QuantityOnHand}, Requested: {request.Quantity}.");
                }
                inventory.QuantityOnHand -= request.Quantity;
                break;

            case StockMovementType.Transfer:
                if (!request.DestinationBranchId.HasValue || request.DestinationBranchId.Value == Guid.Empty)
                {
                    throw new ValidationException("Destination branch is required for stock transfers.");
                }

                if (request.DestinationBranchId.Value == request.BranchId)
                {
                    throw new ValidationException("Source and destination branch cannot be the same for a transfer.");
                }

                destinationBranch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == request.DestinationBranchId.Value, cancellationToken);
                if (destinationBranch == null)
                {
                    throw new NotFoundException($"Destination branch with ID '{request.DestinationBranchId.Value}' was not found.");
                }

                if (inventory.QuantityOnHand < request.Quantity)
                {
                    throw new ValidationException($"Insufficient stock on hand at '{sourceBranch.Name}' for transfer. Available: {inventory.QuantityOnHand}, Requested: {request.Quantity}.");
                }

                // Deduct from source branch
                inventory.QuantityOnHand -= request.Quantity;

                // Add to destination branch
                var destInventory = await _context.ProductInventories
                    .FirstOrDefaultAsync(i => i.ProductId == request.ProductId && i.BranchId == destinationBranch.Id, cancellationToken);

                if (destInventory == null)
                {
                    destInventory = new ProductInventory
                    {
                        ProductId = request.ProductId,
                        BranchId = destinationBranch.Id,
                        QuantityOnHand = request.Quantity,
                        QuantityReserved = 0
                    };
                    _context.ProductInventories.Add(destInventory);
                }
                else
                {
                    destInventory.QuantityOnHand += request.Quantity;
                }
                break;

            default:
                throw new ValidationException($"Unsupported stock movement type: {request.Type}");
        }

        var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);

        var movement = new StockMovement
        {
            ProductId = product.Id,
            BranchId = sourceBranch.Id,
            DestinationBranchId = destinationBranch?.Id,
            Type = request.Type,
            Quantity = request.Quantity,
            UnitCost = request.UnitCost ?? product.UnitCost,
            ReferenceNumber = request.ReferenceNumber?.Trim(),
            Reason = request.Reason?.Trim(),
            PerformedByEmployeeId = currentEmployee?.Id,
            TimestampUtc = DateTime.UtcNow
        };

        _context.StockMovements.Add(movement);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            action: $"StockMovement:{request.Type}",
            entityName: nameof(StockMovement),
            entityId: movement.Id.ToString(),
            details: $"{request.Type} of {request.Quantity} {product.UnitOfMeasure} for SKU '{product.Sku}' at '{sourceBranch.Name}'",
            cancellationToken: cancellationToken);

        return new StockMovementDto
        {
            Id = movement.Id,
            ProductId = product.Id,
            ProductName = product.Name,
            ProductSku = product.Sku,
            BranchId = sourceBranch.Id,
            BranchName = sourceBranch.Name,
            DestinationBranchId = destinationBranch?.Id,
            DestinationBranchName = destinationBranch?.Name,
            Type = movement.Type,
            Quantity = movement.Quantity,
            UnitCost = movement.UnitCost,
            ReferenceNumber = movement.ReferenceNumber,
            Reason = movement.Reason,
            PerformedByEmployeeId = currentEmployee?.Id,
            PerformedByEmployeeName = currentEmployee != null ? $"{currentEmployee.FirstName} {currentEmployee.LastName}".Trim() : null,
            TimestampUtc = movement.TimestampUtc
        };
    }

    public async Task<List<ProductInventoryDto>> GetProductInventoriesAsync(Guid productId, CancellationToken cancellationToken = default)
    {
        var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == productId, cancellationToken);
        if (product == null)
        {
            throw new NotFoundException($"Product with ID '{productId}' was not found.");
        }

        var inventories = await _context.ProductInventories
            .Include(i => i.Branch)
            .Where(i => i.ProductId == productId)
            .ToListAsync(cancellationToken);

        return inventories.Select(i => new ProductInventoryDto
        {
            Id = i.Id,
            ProductId = i.ProductId,
            ProductName = product.Name,
            ProductSku = product.Sku,
            BranchId = i.BranchId,
            BranchName = i.Branch?.Name ?? string.Empty,
            BranchCode = i.Branch?.Code ?? string.Empty,
            QuantityOnHand = i.QuantityOnHand,
            QuantityReserved = i.QuantityReserved,
            AisleBinLocation = i.AisleBinLocation,
            IsLowStock = i.QuantityOnHand <= product.ReorderLevel
        }).ToList();
    }

    public async Task<PagedResponse<StockMovementDto>> GetStockMovementsAsync(StockMovementFilterRequest filter, CancellationToken cancellationToken = default)
    {
        var query = _context.StockMovements
            .Include(m => m.Product)
            .Include(m => m.Branch)
            .Include(m => m.DestinationBranch)
            .Include(m => m.PerformedByEmployee)
            .AsQueryable();

        if (filter.ProductId.HasValue)
        {
            query = query.Where(m => m.ProductId == filter.ProductId.Value);
        }

        if (filter.BranchId.HasValue)
        {
            query = query.Where(m => m.BranchId == filter.BranchId.Value || m.DestinationBranchId == filter.BranchId.Value);
        }

        if (filter.Type.HasValue)
        {
            query = query.Where(m => m.Type == filter.Type.Value);
        }

        if (filter.FromDateUtc.HasValue)
        {
            query = query.Where(m => m.TimestampUtc >= filter.FromDateUtc.Value);
        }

        if (filter.ToDateUtc.HasValue)
        {
            query = query.Where(m => m.TimestampUtc <= filter.ToDateUtc.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.Trim().ToLower();
            query = query.Where(m =>
                m.Product.Sku.ToLower().Contains(s) ||
                m.Product.Name.ToLower().Contains(s) ||
                (m.ReferenceNumber != null && m.ReferenceNumber.ToLower().Contains(s)) ||
                (m.Reason != null && m.Reason.ToLower().Contains(s)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var skip = (filter.PageNumber - 1) * filter.PageSize;

        var items = await query
            .OrderByDescending(m => m.TimestampUtc)
            .Skip(skip)
            .Take(filter.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(m => new StockMovementDto
        {
            Id = m.Id,
            ProductId = m.ProductId,
            ProductName = m.Product?.Name ?? string.Empty,
            ProductSku = m.Product?.Sku ?? string.Empty,
            BranchId = m.BranchId,
            BranchName = m.Branch?.Name ?? string.Empty,
            DestinationBranchId = m.DestinationBranchId,
            DestinationBranchName = m.DestinationBranch?.Name,
            Type = m.Type,
            Quantity = m.Quantity,
            UnitCost = m.UnitCost,
            ReferenceNumber = m.ReferenceNumber,
            Reason = m.Reason,
            PerformedByEmployeeId = m.PerformedByEmployeeId,
            PerformedByEmployeeName = m.PerformedByEmployee != null ? $"{m.PerformedByEmployee.FirstName} {m.PerformedByEmployee.LastName}".Trim() : null,
            TimestampUtc = m.TimestampUtc
        }).ToList();

        return new PagedResponse<StockMovementDto>(dtos, totalCount, filter.PageNumber, filter.PageSize);
    }

    public async Task<InventoryMetricsDto> GetInventoryMetricsAsync(CancellationToken cancellationToken = default)
    {
        var products = await _context.Products
            .Include(p => p.Inventories)
            .ToListAsync(cancellationToken);

        var movementsCount = await _context.StockMovements.CountAsync(cancellationToken);

        var totalProducts = products.Count;
        var activeProducts = products.Count(p => p.IsActive);
        var lowStockCount = products.Count(p => p.IsActive && p.Inventories.Sum(i => i.QuantityOnHand) <= p.ReorderLevel && p.Inventories.Sum(i => i.QuantityOnHand) > 0);
        var outOfStockCount = products.Count(p => p.IsActive && p.Inventories.Sum(i => i.QuantityOnHand) <= 0);

        var totalValuation = products.Sum(p => p.Inventories.Sum(i => i.QuantityOnHand) * p.UnitCost);
        var totalUnits = products.Sum(p => p.Inventories.Sum(i => i.QuantityOnHand));

        return new InventoryMetricsDto
        {
            TotalProductsCount = totalProducts,
            ActiveProductsCount = activeProducts,
            LowStockProductsCount = lowStockCount,
            OutOfStockProductsCount = outOfStockCount,
            TotalInventoryValuation = totalValuation,
            TotalUnitsOnHand = totalUnits,
            RecentMovementsCount = movementsCount
        };
    }

    private void EnforceCatalogWritePermission()
    {
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;
        if (role == TenantRole.Employee)
        {
            throw new ForbiddenAccessException("Employees do not have administrative permission to modify the product catalog.");
        }
    }

    private static ProductDto MapToProductDto(Product p)
    {
        var totalOnHand = p.Inventories.Sum(i => i.QuantityOnHand);
        var totalReserved = p.Inventories.Sum(i => i.QuantityReserved);

        return new ProductDto
        {
            Id = p.Id,
            TenantId = p.TenantId,
            Sku = p.Sku,
            Name = p.Name,
            Description = p.Description,
            Category = p.Category,
            UnitOfMeasure = p.UnitOfMeasure,
            UnitPrice = p.UnitPrice,
            UnitCost = p.UnitCost,
            ReorderLevel = p.ReorderLevel,
            IsActive = p.IsActive,
            TotalQuantityOnHand = totalOnHand,
            TotalQuantityReserved = totalReserved,
            BranchInventories = p.Inventories.Select(i => new ProductInventoryDto
            {
                Id = i.Id,
                ProductId = i.ProductId,
                ProductName = p.Name,
                ProductSku = p.Sku,
                BranchId = i.BranchId,
                BranchName = i.Branch?.Name ?? string.Empty,
                BranchCode = i.Branch?.Code ?? string.Empty,
                QuantityOnHand = i.QuantityOnHand,
                QuantityReserved = i.QuantityReserved,
                AisleBinLocation = i.AisleBinLocation,
                IsLowStock = i.QuantityOnHand <= p.ReorderLevel
            }).ToList(),
            CreatedAtUtc = p.CreatedAtUtc,
            UpdatedAtUtc = p.UpdatedAtUtc
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
